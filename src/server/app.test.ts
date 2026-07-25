import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { claseEjemplo } from "../testing/fixtures";
import { crearApp } from "./app";
import { ProyectoFileSystemRepository } from "./clases/infrastructure/persistence/ProyectoFileSystemRepository";

let base: string;

/** res.json() tipado para las aserciones (fetch devuelve unknown). */
const json = <T>(res: Response) => res.json() as Promise<T>;

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "salman-app-"));
});

afterEach(async () => {
  await fs.rm(base, { recursive: true, force: true });
});

describe("Composición de clases", () => {
  it("registra los routers de proyectos y recursos sobre la misma base", async () => {
    const app = crearApp(base, { llm: null });
    const carpeta = await new ProyectoFileSystemRepository(base).crear(
      claseEjemplo,
    );
    const proyecto = await app.request(
      `/api/proyectos/${encodeURIComponent(carpeta)}`,
    );
    const recursos = await app.request(
      `/api/proyectos/${encodeURIComponent(carpeta)}/recursos`,
    );

    expect(proyecto.status).toBe(200);
    expect(recursos.status).toBe(200);
    expect(await json<object>(recursos)).toEqual({ archivos: [] });
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
    expect(sistemas).toEqual([]);
    const carpeta = await new ProyectoFileSystemRepository(base).crear(
      claseEjemplo,
    );
    expect(sistemas).toEqual([]);
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
    const carpeta = await new ProyectoFileSystemRepository(base).crear(
      claseEjemplo,
    );
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
    const carpeta = await new ProyectoFileSystemRepository(base).crear(
      claseEjemplo,
    );
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
    const carpeta = await new ProyectoFileSystemRepository(base).crear(
      claseEjemplo,
    );
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
    const carpeta = await new ProyectoFileSystemRepository(base).crear(
      claseEjemplo,
    );
    const res = await preguntar(roto, carpeta);
    expect(res.status).toBe(502);
    expect((await json<{ error: string }>(res)).error).toContain("sin cuota");
  });

  it("si los dos intentos no tienen respuesta estructurada válida responde 502", async () => {
    const invalido = crearApp(base, {
      llm: { id: "fake", completar: async () => "no es JSON" },
    });
    const carpeta = await new ProyectoFileSystemRepository(base).crear(
      claseEjemplo,
    );
    const res = await preguntar(invalido, carpeta);
    expect(res.status).toBe(502);
    expect((await json<{ error: string }>(res)).error).toContain(
      "respuesta estructurada válida",
    );
  });
});
