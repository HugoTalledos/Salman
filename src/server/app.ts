import { Hono } from "hono";
import { z } from "zod";
import { ARCHIVO_POR_TARGET, compilarClase } from "../compiler/compilar";
import { crearClase, obtenerScaffold, scaffolds } from "../scaffolds";
import { ClaseSalman } from "../schema/clase";
import { obtenerProveedorLLM, type ProveedorLLM } from "./llm";
import { obtenerRespuestaAsistente } from "./respuesta-asistente";
import {
  crearProyecto,
  ErrorStore,
  escribirRecurso,
  escribirRecursoUnico,
  guardarProyecto,
  leerProyecto,
  leerRecurso,
  listarProyectos,
  listarRecursos,
  nombreCarpeta,
} from "./store";

const EXTENSIONES_IMAGEN = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const TAMANO_MAXIMO = 10 * 1024 * 1024;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

/**
 * API local de proyectos. La UI nunca toca el filesystem: todo pasa por aquí.
 * `base` se inyecta para que las pruebas usen un directorio temporal.
 */

/** Cuerpo de POST /api/proyectos. `scaffoldId: null` crea una clase en blanco. */
const CuerpoCrear = z.object({
  titulo: z.string().trim().min(1, "El título es obligatorio"),
  scaffoldId: z.string().nullable(),
});

const CuerpoAsistente = z.object({
  mensajes: z
    .array(
      z.object({
        rol: z.enum(["usuario", "asistente"]),
        contenido: z.string().min(1),
        /** IDs de bloques del fuente que el profesor señala en este mensaje. */
        bloques: z.array(z.uuid()).max(10).optional(),
      }),
    )
    .min(1)
    .max(60),
});

export interface OpcionesApp {
  /**
   * Proveedor LLM del asistente. Sin especificar se resuelve de la
   * configuración (SALMAN_LLM) al primer uso; `null` desactiva el asistente
   * (útil en pruebas).
   */
  llm?: ProveedorLLM | null;
}
export function crearApp(base: string, opciones: OpcionesApp = {}): Hono {
  const app = new Hono();

  // El proveedor se resuelve perezosamente para que el servidor arranque
  // sin credenciales: el error se informa al usar el asistente, no antes.
  let llm = opciones.llm;
  let errorLLM: string | null = null;
  const obtenerLLM = (): ProveedorLLM | null => {
    if (llm !== undefined) return llm;
    try {
      llm = obtenerProveedorLLM();
    } catch (err) {
      llm = null;
      errorLLM = (err as Error).message;
    }
    return llm;
  };

  app.onError((err, c) => {
    if (err instanceof ErrorStore) {
      return c.json(
        { error: err.message },
        err.codigo === "no-existe" ? 404 : 400,
      );
    }
    if (err instanceof z.ZodError) {
      return c.json({ error: "Documento inválido", detalles: err.issues }, 400);
    }
    console.error(err);
    return c.json({ error: "Error interno" }, 500);
  });

  app.get("/api/scaffolds", (c) => {
    return c.json({
      scaffolds: scaffolds.map(({ id, nombre, version, descripcion, modelo, metodo }) => ({
        id,
        nombre,
        version,
        descripcion,
        modelo,
        metodo,
      })),
    });
  });

  app.get("/api/proyectos", async (c) => {
    return c.json({ proyectos: await listarProyectos(base) });
  });

  app.post("/api/proyectos", async (c) => {
    const { titulo, scaffoldId } = CuerpoCrear.parse(await c.req.json());
    const scaffold = scaffoldId === null ? null : obtenerScaffold(scaffoldId);
    if (scaffold === undefined) {
      return c.json({ error: `Scaffold desconocido: ${scaffoldId}` }, 400);
    }
    const clase = crearClase(titulo, scaffold);
    const carpeta = await crearProyecto(base, clase);
    return c.json({ carpeta, clase }, 201);
  });

  app.get("/api/proyectos/:carpeta", async (c) => {
    const clase = await leerProyecto(base, c.req.param("carpeta"));
    return c.json({ clase });
  });

  /** Compila el fuente EN DISCO a sus dos artefactos dentro de recursos/. */
  app.post("/api/proyectos/:carpeta/compilar", async (c) => {
    const carpeta = c.req.param("carpeta");
    const clase = await leerProyecto(base, carpeta);
    for (const doc of ["guia", "material"] as const) {
      await escribirRecurso(
        base,
        carpeta,
        ARCHIVO_POR_TARGET[doc],
        compilarClase(clase, doc),
      );
    }
    return c.json({ archivos: ARCHIVO_POR_TARGET });
  });

  /** Sube una imagen a recursos/. Multipart con el campo "archivo". */
  app.post("/api/proyectos/:carpeta/recursos", async (c) => {
    const { archivo } = await c.req.parseBody();
    if (!(archivo instanceof File)) {
      return c.json({ error: "Falta el campo «archivo»" }, 400);
    }
    if (archivo.size > TAMANO_MAXIMO) {
      return c.json({ error: "La imagen supera los 10 MB" }, 400);
    }
    const punto = archivo.name.lastIndexOf(".");
    const extension = punto > 0 ? archivo.name.slice(punto).toLowerCase() : "";
    if (!EXTENSIONES_IMAGEN.has(extension)) {
      return c.json(
        { error: `Solo se aceptan imágenes (${[...EXTENSIONES_IMAGEN].join(", ")})` },
        400,
      );
    }
    // el saneador de títulos sirve igual para el tallo del nombre de archivo
    const tallo = nombreCarpeta(archivo.name.slice(0, punto));
    const nombre = await escribirRecursoUnico(
      base,
      c.req.param("carpeta"),
      `${tallo}${extension}`,
      new Uint8Array(await archivo.arrayBuffer()),
    );
    return c.json({ recurso: `recursos/${nombre}` }, 201);
  });

  app.get("/api/proyectos/:carpeta/recursos", async (c) => {
    return c.json({ archivos: await listarRecursos(base, c.req.param("carpeta")) });
  });

  /** Conversación con el Asistente Salman sobre el fuente EN DISCO. */
  app.post("/api/proyectos/:carpeta/asistente", async (c) => {
    const proveedor = obtenerLLM();
    if (!proveedor) {
      return c.json(
        {
          error:
            errorLLM ??
            "El asistente no está configurado. Define ANTHROPIC_API_KEY (o SALMAN_LLM=openai con su configuración) y reinicia el servidor.",
        },
        503,
      );
    }
    const { mensajes } = CuerpoAsistente.parse(await c.req.json());
    const clase = await leerProyecto(base, c.req.param("carpeta"));
    // Los bloques señalados se anotan dentro del turno correspondiente para
    // que la referencia sobreviva en el historial de mensajes siguientes.
    const mensajesLLM = mensajes.map(({ rol, contenido, bloques }) =>
      rol === "usuario" && bloques?.length
        ? {
            rol,
            contenido: `[El profesor señala los bloques con id: ${bloques.join(", ")}]\n${contenido}`,
          }
        : { rol, contenido },
    );
    try {
      const respuesta = await obtenerRespuestaAsistente(proveedor, clase, mensajesLLM);
      return c.json(respuesta);
    } catch (err) {
      console.error("Error del proveedor LLM:", err);
      return c.json(
        { error: `El asistente no pudo responder: ${(err as Error).message}` },
        502,
      );
    }
  });

  app.get("/api/proyectos/:carpeta/recursos/:archivo", async (c) => {
    const archivo = c.req.param("archivo");
    const datos = await leerRecurso(base, c.req.param("carpeta"), archivo);
    const extension = archivo.slice(archivo.lastIndexOf(".")).toLowerCase();
    return c.body(new Uint8Array(datos), 200, {
      "content-type": MIME[extension] ?? "application/octet-stream",
    });
  });

  app.put("/api/proyectos/:carpeta", async (c) => {
    const clase = ClaseSalman.parse(await c.req.json());
    const guardada = { ...clase, modificado: new Date().toISOString() };
    await guardarProyecto(base, c.req.param("carpeta"), guardada);
    return c.json({ clase: guardada });
  });

  return app;
}
