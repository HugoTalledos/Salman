import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claseEjemplo } from "../../../../testing/fixtures";
import { CompilarProyectoImpl } from "../../application/useCaseImpl/CompilarProyectoImpl";
import { BorrarProyectoImpl } from "../../application/useCaseImpl/BorrarProyectoImpl";
import { CrearProyectoImpl } from "../../application/useCaseImpl/CrearProyectoImpl";
import { GuardarProyectoImpl } from "../../application/useCaseImpl/GuardarProyectoImpl";
import { ListarProyectosImpl } from "../../application/useCaseImpl/ListarProyectosImpl";
import { ListarRecursosImpl } from "../../application/useCaseImpl/ListarRecursosImpl";
import { ObtenerProyectoImpl } from "../../application/useCaseImpl/ObtenerProyectoImpl";
import { ObtenerRecursoImpl } from "../../application/useCaseImpl/ObtenerRecursoImpl";
import { SubirRecursoImpl } from "../../application/useCaseImpl/SubirRecursoImpl";
import { CompiladorHtml } from "../compiler/CompiladorHtml";
import { catalogoMetadatosClase } from "../catalogo/CatalogoMetadatosClaseEstatico";
import { ProyectoFileSystemRepository } from "../persistence/ProyectoFileSystemRepository";
import { catalogoScaffolds } from "../scaffold/CatalogoScaffolds";
import { crearRutasClases } from "./RutasClases";
import { crearRutasRecursos } from "./RutasRecursos";

let base: string;
let app: Hono;
let repositorio: ProyectoFileSystemRepository;

/** res.json() tipado para las aserciones (fetch devuelve unknown). */
const json = <T>(res: Response) => res.json() as Promise<T>;
type RespuestaClase = { carpeta: string; clase: typeof claseEjemplo };

function dependenciasClases(repositorio: ProyectoFileSystemRepository) {
  return {
    borrarProyecto: new BorrarProyectoImpl(repositorio),
    crearProyecto: new CrearProyectoImpl(repositorio, catalogoScaffolds),
    listarProyectos: new ListarProyectosImpl(repositorio),
    obtenerProyecto: new ObtenerProyectoImpl(repositorio),
    guardarProyecto: new GuardarProyectoImpl(repositorio),
    compilarProyecto: new CompilarProyectoImpl(repositorio, new CompiladorHtml()),
    listarScaffolds: () => catalogoScaffolds.listar(),
    catalogoMetadatos: catalogoMetadatosClase,
  };
}

function dependenciasRecursos(repositorio: ProyectoFileSystemRepository) {
  return {
    subirRecurso: new SubirRecursoImpl(repositorio),
    listarRecursos: new ListarRecursosImpl(repositorio),
    obtenerRecurso: new ObtenerRecursoImpl(repositorio),
  };
}

function crearAplicacionClases(
  baseProyectos: string,
): { app: Hono; repositorio: ProyectoFileSystemRepository } {
  const repositorio = new ProyectoFileSystemRepository(baseProyectos);
  const app = new Hono();

  app.route("/", crearRutasClases(dependenciasClases(repositorio)));
  app.route("/", crearRutasRecursos(dependenciasRecursos(repositorio)));

  return { app, repositorio };
}

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "salman-rutas-clases-"));
  ({ app, repositorio } = crearAplicacionClases(base));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(base, { recursive: true, force: true });
});

describe("API de proyectos", () => {
  const metadatosValidos = {
    materia: "Matemáticas",
    grado: "5.º",
    objetivos: [
      "Resolver problemas aplicando conceptos matemáticos",
      "Comparar fracciones en situaciones cotidianas",
    ],
  };

  it("GET /api/catalogos/clase expone materias y grados disponibles", async () => {
    expect(await json(await app.request("/api/catalogos/clase"))).toEqual({
      materias: expect.arrayContaining(["Matemáticas", "Ciencias Naturales"]),
      grados: ["Preescolar", "1.º", "2.º", "3.º", "4.º", "5.º", "6.º",
        "7.º", "8.º", "9.º", "10.º", "11.º"],
    });
  });

  it("GET /api/objetivos devuelve los objetivos de la materia consultada", async () => {
    const res = await app.request(
      "/api/objetivos?materia=Matem%C3%A1ticas&grado=5.%C2%BA&titulo=Fracciones",
    );

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({
      objetivos: [
        "Resolver problemas aplicando conceptos matemáticos",
        "Explicar procedimientos y justificar resultados",
        "Representar relaciones usando lenguaje matemático",
      ],
    });
  });

  it("GET /api/objetivos rechaza una materia desconocida", async () => {
    const res = await app.request("/api/objetivos?materia=Astronom%C3%ADa");

    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({
      error: "Documento inválido",
      detalles: [expect.objectContaining({ code: "custom" })],
    });
  });

  it("DELETE borra la clase y deja de listarla", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);

    const res = await app.request(`/api/proyectos/${encodeURIComponent(carpeta)}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect((await repositorio.listar())).toEqual([]);
  });

  it("DELETE de una clase inexistente responde 404", async () => {
    const res = await app.request("/api/proyectos/fantasma", { method: "DELETE" });

    expect(res.status).toBe(404);
    expect((await json<{ error: string }>(res)).error).toContain("No existe");
  });

  it("GET /api/proyectos lista los proyectos", async () => {
    await repositorio.crear(claseEjemplo);
    const res = await app.request("/api/proyectos");
    expect(res.status).toBe(200);
    const { proyectos } = await json<{ proyectos: { titulo: string }[] }>(res);
    expect(proyectos).toHaveLength(1);
    expect(proyectos[0].titulo).toBe("Los estados del agua");
  });

  it("GET /api/proyectos/:carpeta devuelve el fuente", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const res = await app.request(`/api/proyectos/${encodeURIComponent(carpeta)}`);
    expect(res.status).toBe(200);
    expect((await json<RespuestaClase>(res)).clase).toEqual(claseEjemplo);
  });

  it("GET de un proyecto inexistente responde 404", async () => {
    const res = await app.request("/api/proyectos/fantasma");
    expect(res.status).toBe(404);
    expect((await json<{ error: string }>(res)).error).toContain("No existe");
  });

  it("PUT guarda y actualiza la fecha de modificación", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const editada = { ...claseEjemplo, titulo: "Título nuevo" };
    const res = await app.request(`/api/proyectos/${encodeURIComponent(carpeta)}`, {
      method: "PUT",
      body: JSON.stringify(editada),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(200);
    const enDisco = await repositorio.obtener(carpeta);
    expect(enDisco.titulo).toBe("Título nuevo");
    expect(enDisco.modificado > claseEjemplo.modificado).toBe(true);
  });

  it("PUT con un documento inválido conserva el cuerpo detallado y no toca el disco", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const invalida = { ...claseEjemplo, bloques: [{ tipo: "sorpresa" }] };
    const res = await app.request(`/api/proyectos/${encodeURIComponent(carpeta)}`, {
      method: "PUT",
      body: JSON.stringify(invalida),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(400);
    expect(await json<object>(res)).toMatchObject({
      error: "Documento inválido",
      detalles: [{ path: ["bloques", 0, "tipo"] }],
    });
    expect(await repositorio.obtener(carpeta)).toEqual(claseEjemplo);
  });

  it("GET /api/scaffolds lista el catálogo sin exponer la semilla", async () => {
    const res = await app.request("/api/scaffolds");
    expect(res.status).toBe(200);
    const { scaffolds } = await json<{ scaffolds: Record<string, unknown>[] }>(res);
    expect(scaffolds).toHaveLength(1);
    expect(scaffolds[0].id).toBe("inicio-desarrollo-cierre");
    expect(scaffolds[0]).not.toHaveProperty("semilla");
  });

  it("POST crea un proyecto desde scaffold con metadatos persistidos", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({
        titulo: "Fracciones",
        scaffoldId: "inicio-desarrollo-cierre",
        metadatos: metadatosValidos,
      }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(201);
    const { carpeta, clase } = await json<RespuestaClase>(res);
    expect(carpeta).toBe("Fracciones");
    expect(clase.bloques).toHaveLength(3);
    expect(clase.metadatos).toEqual(metadatosValidos);
    expect(await repositorio.obtener(carpeta)).toEqual(clase);
  });

  it("POST con scaffoldId null crea una clase en blanco", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({
        titulo: "Libre",
        scaffoldId: null,
        metadatos: metadatosValidos,
      }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(201);
    const { clase } = await json<RespuestaClase>(res);
    expect(clase.scaffold).toBeNull();
    expect(clase.bloques).toEqual([]);
  });

  it("POST con scaffold desconocido conserva el error HTTP actual", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({
        titulo: "X",
        scaffoldId: "no-existe",
        metadatos: metadatosValidos,
      }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(400);
    expect(await json<object>(res)).toEqual({
      error: "Scaffold desconocido: no-existe",
    });
  });

  it("POST con título vacío responde 400 con detalles", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({ titulo: "   ", scaffoldId: null, metadatos: metadatosValidos }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(400);
    expect(await json<object>(res)).toMatchObject({
      error: "Documento inválido",
      detalles: [{ path: ["titulo"] }],
    });
  });

  it("POST rechaza una materia desconocida en los metadatos", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({
        titulo: "Constelaciones",
        scaffoldId: null,
        metadatos: { ...metadatosValidos, materia: "Astronomía" },
      }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(400);
  });

  it("POST rechaza un grado desconocido en los metadatos", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({
        titulo: "Fracciones",
        scaffoldId: null,
        metadatos: { ...metadatosValidos, grado: "12.º" },
      }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(400);
  });

  it("POST rechaza objetivos vacíos tras normalizarlos", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({
        titulo: "Fracciones",
        scaffoldId: null,
        metadatos: { ...metadatosValidos, objetivos: ["   "] },
      }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(400);
  });

  it("POST rechaza objetivos duplicados tras normalizarlos", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({
        titulo: "Fracciones",
        scaffoldId: null,
        metadatos: {
          ...metadatosValidos,
          objetivos: ["Comparar fracciones", "  Comparar fracciones  "],
        },
      }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(400);
  });

  it("POST compilar genera los dos artefactos en recursos/ y se sirven por GET", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const res = await app.request(
      `/api/proyectos/${encodeURIComponent(carpeta)}/compilar`,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
    expect(await json<{ archivos: object }>(res)).toEqual({
      archivos: {
        guia: "guia-del-profesor.html",
        material: "material-del-alumno.html",
      },
    });

    const guia = await app.request(
      `/api/proyectos/${encodeURIComponent(carpeta)}/recursos/guia-del-profesor.html`,
    );
    expect(guia.status).toBe(200);
    expect(guia.headers.get("content-type")).toContain("text/html");
    const html = await guia.text();
    expect(html).toContain("Guía del profesor");
    expect(html).toContain("¿dónde han visto hielo");

    const material = await app.request(
      `/api/proyectos/${encodeURIComponent(carpeta)}/recursos/material-del-alumno.html`,
    );
    expect(await material.text()).not.toContain("¿dónde han visto hielo");
  });

  it("compilar una clase sin bloques no falla (estructura arbitraria)", async () => {
    const carpeta = await repositorio.crear({ ...claseEjemplo, bloques: [] });
    const res = await app.request(
      `/api/proyectos/${encodeURIComponent(carpeta)}/compilar`,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
  });

  it("GET de un recurso inexistente responde 404 y con traversal 400", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const ruta = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`;
    expect((await app.request(`${ruta}/nada.png`)).status).toBe(404);
    expect((await app.request(`${ruta}/..%2Fclase.salman`)).status).toBe(400);
  });

  it("POST recursos sube una imagen, evita colisiones y la sirve por GET", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const ruta = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`;
    const subir = () => {
      const forma = new FormData();
      forma.append("archivo", new File([new Uint8Array([137, 80, 78, 71])], "Mapa del ciclo.png"));
      return app.request(ruta, { method: "POST", body: forma });
    };

    const primera = await subir();
    expect(primera.status).toBe(201);
    expect(await json<object>(primera)).toEqual({ recurso: "recursos/Mapa del ciclo.png" });

    const segunda = await subir();
    expect(await json<object>(segunda)).toEqual({
      recurso: "recursos/Mapa del ciclo (2).png",
    });

    const servida = await app.request(`${ruta}/${encodeURIComponent("Mapa del ciclo.png")}`);
    expect(servida.status).toBe(200);
    expect(servida.headers.get("content-type")).toBe("image/png");
  });

  it("POST recursos rechaza archivos que no son imagen y cuerpos sin archivo", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const ruta = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`;

    const forma = new FormData();
    forma.append("archivo", new File(["#!/bin/sh"], "script.sh"));
    const extensionInvalida = await app.request(ruta, { method: "POST", body: forma });
    expect(extensionInvalida.status).toBe(400);
    expect(await json<object>(extensionInvalida)).toEqual({
      error: "Solo se aceptan imágenes (.png, .jpg, .jpeg, .gif, .webp, .svg)",
    });

    const vacia = new FormData();
    vacia.append("archivo", "no soy un archivo");
    const sinArchivo = await app.request(ruta, { method: "POST", body: vacia });
    expect(sinArchivo.status).toBe(400);
    expect(await json<object>(sinArchivo)).toEqual({
      error: "Falta el campo «archivo»",
    });
  });

  it("POST recursos conserva el rechazo de nombres sin tallo y del límite de 10 MB", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const ruta = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`;
    const subir = (archivo: File) => {
      const forma = new FormData();
      forma.append("archivo", archivo);
      return app.request(ruta, { method: "POST", body: forma });
    };

    const sinTallo = await subir(new File([], ".png"));
    expect(sinTallo.status).toBe(400);
    expect(await json<object>(sinTallo)).toEqual({
      error: "Solo se aceptan imágenes (.png, .jpg, .jpeg, .gif, .webp, .svg)",
    });

    const demasiadoGrande = await subir(
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "grande.png"),
    );
    expect(demasiadoGrande.status).toBe(400);
    expect(await json<object>(demasiadoGrande)).toEqual({
      error: "La imagen supera los 10 MB",
    });
  });

  it("POST recursos prioriza el tamaño sobre una extensión inválida", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const ruta = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`;
    const forma = new FormData();
    forma.append(
      "archivo",
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "script.sh"),
    );

    const res = await app.request(ruta, { method: "POST", body: forma });

    expect(res.status).toBe(400);
    expect(await json<object>(res)).toEqual({
      error: "La imagen supera los 10 MB",
    });
  });

  it.each([
    [
      "un archivo mayor de 10 MiB",
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "grande.png"),
      "La imagen supera los 10 MB",
    ],
    [
      "un nombre sin tallo",
      new File([], ".png"),
      "Solo se aceptan imágenes (.png, .jpg, .jpeg, .gif, .webp, .svg)",
    ],
    [
      "una extensión no permitida",
      new File([], "script.sh"),
      "Solo se aceptan imágenes (.png, .jpg, .jpeg, .gif, .webp, .svg)",
    ],
  ])(
    "POST recursos no materializa %s",
    async (_caso, archivo, mensaje) => {
      const carpeta = await repositorio.crear(claseEjemplo);
      const ruta = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`;
      const arrayBuffer = vi
        .spyOn(File.prototype, "arrayBuffer")
        .mockRejectedValue(new Error("arrayBuffer no debe ejecutarse"));
      const forma = new FormData();
      forma.append("archivo", archivo);

      const res = await app.request(ruta, { method: "POST", body: forma });

      expect(res.status).toBe(400);
      expect(await json<object>(res)).toEqual({ error: mensaje });
      expect(arrayBuffer).not.toHaveBeenCalled();
    },
  );

  it("PUT con identificador con path traversal responde 400", async () => {
    const res = await app.request("/api/proyectos/..%2Ffuera", {
      method: "PUT",
      body: JSON.stringify(claseEjemplo),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("GET recursos lista los archivos del proyecto ordenados", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const ruta = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`;
    expect(await json<object>(await app.request(ruta))).toEqual({ archivos: [] });

    await app.request(`/api/proyectos/${encodeURIComponent(carpeta)}/compilar`, {
      method: "POST",
    });
    expect(await json<object>(await app.request(ruta))).toEqual({
      archivos: ["guia-del-profesor.html", "material-del-alumno.html"],
    });
  });
});

describe("errores HTTP", () => {
  it("convierte un error desconocido en el cuerpo 500 actual", async () => {
    const conFallo = new Hono();
    conFallo.route(
      "/",
      crearRutasClases({
        ...dependenciasClases(repositorio),
        listarProyectos: {
          ejecutar: async () => {
            throw new Error("detalle interno");
          },
        },
      }),
    );

    const res = await conFallo.request("/api/proyectos");

    expect(res.status).toBe(500);
    expect(await json<object>(res)).toEqual({ error: "Error interno" });
  });
});
