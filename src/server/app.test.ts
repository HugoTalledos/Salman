import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { claseEjemplo } from "../testing/fixtures";
import { crearApp } from "./app";
import { crearProyecto, leerProyecto } from "./store";

let base: string;
let app: Hono;

/** res.json() tipado para las aserciones (fetch devuelve unknown). */
const json = <T>(res: Response) => res.json() as Promise<T>;
type RespuestaClase = { carpeta: string; clase: typeof claseEjemplo };

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "salman-app-"));
  app = crearApp(base);
});

afterEach(async () => {
  await fs.rm(base, { recursive: true, force: true });
});

describe("API de proyectos", () => {
  it("GET /api/proyectos lista los proyectos", async () => {
    await crearProyecto(base, claseEjemplo);
    const res = await app.request("/api/proyectos");
    expect(res.status).toBe(200);
    const { proyectos } = await json<{ proyectos: { titulo: string }[] }>(res);
    expect(proyectos).toHaveLength(1);
    expect(proyectos[0].titulo).toBe("Los estados del agua");
  });

  it("GET /api/proyectos/:carpeta devuelve el fuente", async () => {
    const carpeta = await crearProyecto(base, claseEjemplo);
    const res = await app.request(`/api/proyectos/${encodeURIComponent(carpeta)}`);
    expect(res.status).toBe(200);
    expect((await json<RespuestaClase>(res)).clase).toEqual(claseEjemplo);
  });

  it("GET de un proyecto inexistente responde 404", async () => {
    const res = await app.request("/api/proyectos/fantasma");
    expect(res.status).toBe(404);
  });

  it("PUT guarda y actualiza la fecha de modificación", async () => {
    const carpeta = await crearProyecto(base, claseEjemplo);
    const editada = { ...claseEjemplo, titulo: "Título nuevo" };
    const res = await app.request(`/api/proyectos/${encodeURIComponent(carpeta)}`, {
      method: "PUT",
      body: JSON.stringify(editada),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(200);
    const enDisco = await leerProyecto(base, carpeta);
    expect(enDisco.titulo).toBe("Título nuevo");
    expect(enDisco.modificado > claseEjemplo.modificado).toBe(true);
  });

  it("PUT con un documento que viola el esquema responde 400 y no toca el disco", async () => {
    const carpeta = await crearProyecto(base, claseEjemplo);
    const invalida = { ...claseEjemplo, bloques: [{ tipo: "sorpresa" }] };
    const res = await app.request(`/api/proyectos/${encodeURIComponent(carpeta)}`, {
      method: "PUT",
      body: JSON.stringify(invalida),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(400);
    expect(await leerProyecto(base, carpeta)).toEqual(claseEjemplo);
  });

  it("GET /api/scaffolds lista el catálogo sin exponer la semilla", async () => {
    const res = await app.request("/api/scaffolds");
    expect(res.status).toBe(200);
    const { scaffolds } = await json<{ scaffolds: Record<string, unknown>[] }>(res);
    expect(scaffolds).toHaveLength(1);
    expect(scaffolds[0].id).toBe("inicio-desarrollo-cierre");
    expect(scaffolds[0]).not.toHaveProperty("semilla");
  });

  it("POST crea un proyecto desde scaffold: carpeta en disco y semilla poblada", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({ titulo: "Fracciones", scaffoldId: "inicio-desarrollo-cierre" }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(201);
    const { carpeta, clase } = await json<RespuestaClase>(res);
    expect(carpeta).toBe("Fracciones");
    expect(clase.bloques).toHaveLength(3);
    expect(await leerProyecto(base, carpeta)).toEqual(clase);
  });

  it("POST con scaffoldId null crea una clase en blanco", async () => {
    const res = await app.request("/api/proyectos", {
      method: "POST",
      body: JSON.stringify({ titulo: "Libre", scaffoldId: null }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(201);
    const { clase } = await json<RespuestaClase>(res);
    expect(clase.scaffold).toBeNull();
    expect(clase.bloques).toEqual([]);
  });

  it("POST con scaffold desconocido o título vacío responde 400", async () => {
    for (const body of [
      { titulo: "X", scaffoldId: "no-existe" },
      { titulo: "   ", scaffoldId: null },
    ]) {
      const res = await app.request("/api/proyectos", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      });
      expect(res.status).toBe(400);
    }
  });

  it("POST compilar genera los dos artefactos en recursos/ y se sirven por GET", async () => {
    const carpeta = await crearProyecto(base, claseEjemplo);
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
    const carpeta = await crearProyecto(base, { ...claseEjemplo, bloques: [] });
    const res = await app.request(
      `/api/proyectos/${encodeURIComponent(carpeta)}/compilar`,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
  });

  it("GET de un recurso inexistente responde 404 y con traversal 400", async () => {
    const carpeta = await crearProyecto(base, claseEjemplo);
    const ruta = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`;
    expect((await app.request(`${ruta}/nada.png`)).status).toBe(404);
    expect((await app.request(`${ruta}/..%2Fclase.salman`)).status).toBe(400);
  });

  it("POST recursos sube una imagen, evita colisiones y la sirve por GET", async () => {
    const carpeta = await crearProyecto(base, claseEjemplo);
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
    const carpeta = await crearProyecto(base, claseEjemplo);
    const ruta = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`;

    const forma = new FormData();
    forma.append("archivo", new File(["#!/bin/sh"], "script.sh"));
    expect((await app.request(ruta, { method: "POST", body: forma })).status).toBe(400);

    const vacia = new FormData();
    vacia.append("archivo", "no soy un archivo");
    expect((await app.request(ruta, { method: "POST", body: vacia })).status).toBe(400);
  });

  it("PUT con identificador con path traversal responde 400", async () => {
    const res = await app.request("/api/proyectos/..%2Ffuera", {
      method: "PUT",
      body: JSON.stringify(claseEjemplo),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("GET recursos lista los archivos del proyecto ordenados", async () => {
    const carpeta = await crearProyecto(base, claseEjemplo);
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

describe("Asistente Salman", () => {
  const preguntar = (aplicacion: Hono, carpeta: string, contenido = "¿Qué opinas?") =>
    aplicacion.request(`/api/proyectos/${encodeURIComponent(carpeta)}/asistente`, {
      method: "POST",
      body: JSON.stringify({ mensajes: [{ rol: "usuario", contenido }] }),
      headers: { "content-type": "application/json" },
    });

  it("entrega el fuente y el criterio pedagógico al proveedor y devuelve la respuesta estructurada", async () => {
    const sistemas: string[] = [];
    const conFake = crearApp(base, {
      llm: {
        id: "fake",
        async completar({ sistema }) {
          sistemas.push(sistema);
          return JSON.stringify({
            tipo: "informativa",
            mensaje: "La clase está bien secuenciada.",
          });
        },
      },
    });
    const carpeta = await crearProyecto(base, claseEjemplo);
    const res = await preguntar(conFake, carpeta);
    expect(res.status).toBe(200);
    expect(await json<object>(res)).toEqual({
      tipo: "informativa",
      mensaje: "La clase está bien secuenciada.",
    });
    expect(sistemas[0]).toContain("Los estados del agua");
    expect(sistemas[0]).toContain("socioconstructivista");
    expect(sistemas[0]).toContain("NUNCA asumas que existe una fase");
  });

  it("devuelve las tres acciones propuestas por el modelo", async () => {
    const conFake = crearApp(base, {
      llm: {
        id: "fake",
        async completar() {
          return JSON.stringify({
            tipo: "accionable",
            mensaje: "Estas mejoras harán más explícito el cierre.",
            acciones: [
              {
                id: "1a2b3c4d-0000-4000-8000-000000000010",
                titulo: "Recuperar aprendizajes",
                beneficio: "Consolida lo aprendido.",
                ubicacion: {
                  tipo: "raiz",
                  anclaId: "1a2b3c4d-0000-4000-8000-000000000001",
                  posicion: "despues",
                },
                bloques: [
                  {
                    id: "1a2b3c4d-0000-4000-8000-000000000011",
                    tipo: "texto",
                    target: "material",
                    contenido: "Escribe un aprendizaje que conservas.",
                  },
                ],
              },
              {
                id: "1a2b3c4d-0000-4000-8000-000000000012",
                titulo: "Cerrar en parejas",
                beneficio: "Favorece la verbalización.",
                ubicacion: {
                  tipo: "raiz",
                  anclaId: "1a2b3c4d-0000-4000-8000-000000000001",
                  posicion: "antes",
                },
                bloques: [
                  {
                    id: "1a2b3c4d-0000-4000-8000-000000000013",
                    tipo: "nota",
                    target: "guia",
                    contenido: "Escucha dos conclusiones por pareja.",
                  },
                ],
              },
              {
                id: "1a2b3c4d-0000-4000-8000-000000000014",
                titulo: "Anticipar la siguiente clase",
                beneficio: "Da continuidad al proceso.",
                ubicacion: {
                  tipo: "raiz",
                  anclaId: "1a2b3c4d-0000-4000-8000-000000000001",
                  posicion: "despues",
                },
                bloques: [
                  {
                    id: "1a2b3c4d-0000-4000-8000-000000000015",
                    tipo: "texto",
                    target: "material",
                    contenido: "Formula una pregunta para la próxima clase.",
                  },
                ],
              },
            ],
          });
        },
      },
    });
    const carpeta = await crearProyecto(base, claseEjemplo);
    const res = await preguntar(conFake, carpeta);
    expect(res.status).toBe(200);
    expect((await json<{ acciones: unknown[] }>(res)).acciones).toHaveLength(3);
  });

  it("anota los bloques señalados dentro del turno del profesor", async () => {
    const recibidos: { rol: string; contenido: string }[][] = [];
    const conFake = crearApp(base, {
      llm: {
        id: "fake",
        async completar({ mensajes }) {
          recibidos.push(mensajes);
          return JSON.stringify({ tipo: "informativa", mensaje: "ok" });
        },
      },
    });
    const carpeta = await crearProyecto(base, claseEjemplo);
    const idNota = "1a2b3c4d-0000-4000-8000-000000000002";
    const res = await conFake.request(
      `/api/proyectos/${encodeURIComponent(carpeta)}/asistente`,
      {
        method: "POST",
        body: JSON.stringify({
          mensajes: [
            { rol: "usuario", contenido: "¿Mejoras esta nota?", bloques: [idNota] },
          ],
        }),
        headers: { "content-type": "application/json" },
      },
    );
    expect(res.status).toBe(200);
    expect(recibidos[0][0].contenido).toBe(
      `[El profesor señala los bloques con id: ${idNota}]\n¿Mejoras esta nota?`,
    );
  });

  it("sin proveedor configurado responde 503 con instrucciones", async () => {
    const sinLLM = crearApp(base, { llm: null });
    const carpeta = await crearProyecto(base, claseEjemplo);
    const res = await preguntar(sinLLM, carpeta);
    expect(res.status).toBe(503);
    expect((await json<{ error: string }>(res)).error).toBeTruthy();
  });

  it("valida el cuerpo y la existencia del proyecto", async () => {
    const conFake = crearApp(base, {
      llm: { id: "fake", completar: async () => "ok" },
    });
    const sinMensajes = await conFake.request("/api/proyectos/x/asistente", {
      method: "POST",
      body: JSON.stringify({ mensajes: [] }),
      headers: { "content-type": "application/json" },
    });
    expect(sinMensajes.status).toBe(400);
    expect((await preguntar(conFake, "fantasma")).status).toBe(404);
  });

  it("si el proveedor falla responde 502 con el motivo", async () => {
    const roto = crearApp(base, {
      llm: {
        id: "fake",
        completar: async () => {
          throw new Error("sin cuota");
        },
      },
    });
    const carpeta = await crearProyecto(base, claseEjemplo);
    const res = await preguntar(roto, carpeta);
    expect(res.status).toBe(502);
    expect((await json<{ error: string }>(res)).error).toContain("sin cuota");
  });

  it("si los dos intentos no tienen respuesta estructurada válida responde 502", async () => {
    const invalido = crearApp(base, {
      llm: { id: "fake", completar: async () => "no es JSON" },
    });
    const carpeta = await crearProyecto(base, claseEjemplo);
    const res = await preguntar(invalido, carpeta);
    expect(res.status).toBe(502);
    expect((await json<{ error: string }>(res)).error).toContain(
      "respuesta estructurada válida",
    );
  });
});
