import { Hono } from "hono";
import { z } from "zod";
import { CompilarProyectoImpl } from "./clases/application/useCaseImpl/CompilarProyectoImpl";
import { CrearProyectoImpl } from "./clases/application/useCaseImpl/CrearProyectoImpl";
import { GuardarProyectoImpl } from "./clases/application/useCaseImpl/GuardarProyectoImpl";
import { ListarProyectosImpl } from "./clases/application/useCaseImpl/ListarProyectosImpl";
import { ListarRecursosImpl } from "./clases/application/useCaseImpl/ListarRecursosImpl";
import { ObtenerProyectoImpl } from "./clases/application/useCaseImpl/ObtenerProyectoImpl";
import { ObtenerRecursoImpl } from "./clases/application/useCaseImpl/ObtenerRecursoImpl";
import { SubirRecursoImpl } from "./clases/application/useCaseImpl/SubirRecursoImpl";
import { CompiladorHtml } from "./clases/infrastructure/compiler/CompiladorHtml";
import { crearRutasClases } from "./clases/infrastructure/http/RutasClases";
import { crearRutasRecursos } from "./clases/infrastructure/http/RutasRecursos";
import { ProyectoFileSystemRepository } from "./clases/infrastructure/persistence/ProyectoFileSystemRepository";
import { catalogoScaffolds } from "./clases/infrastructure/scaffold/CatalogoScaffolds";
import { obtenerProveedorLLM, type ProveedorLLM } from "./llm";
import { obtenerRespuestaAsistente } from "./respuesta-asistente";
import { ErrorStore, leerProyecto } from "./store";

/**
 * API local de proyectos. La UI nunca toca el filesystem: todo pasa por aquí.
 * `base` se inyecta para que las pruebas usen un directorio temporal.
 */

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
  const repositorio = new ProyectoFileSystemRepository(base);
  const compilador = new CompiladorHtml();
  const crearProyecto = new CrearProyectoImpl(repositorio, catalogoScaffolds);
  const listarProyectos = new ListarProyectosImpl(repositorio);
  const obtenerProyecto = new ObtenerProyectoImpl(repositorio);
  const guardarProyecto = new GuardarProyectoImpl(repositorio);
  const compilarProyecto = new CompilarProyectoImpl(repositorio, compilador);
  const subirRecurso = new SubirRecursoImpl(repositorio);
  const listarRecursos = new ListarRecursosImpl(repositorio);
  const obtenerRecurso = new ObtenerRecursoImpl(repositorio);

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

  app.route(
    "/",
    crearRutasClases({
      crearProyecto,
      listarProyectos,
      obtenerProyecto,
      guardarProyecto,
      compilarProyecto,
      listarScaffolds: () => catalogoScaffolds.listar(),
    }),
  );
  app.route(
    "/",
    crearRutasRecursos({
      subirRecurso,
      listarRecursos,
      obtenerRecurso,
    }),
  );

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

  return app;
}
