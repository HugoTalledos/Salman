import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claseEjemplo } from "../testing/fixtures";
import {
  crearProyecto,
  guardarProyecto,
  leerProyecto,
  listarProyectos,
  nombreCarpeta,
} from "./store";

let base: string;

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "salman-store-"));
});

afterEach(async () => {
  await fs.rm(base, { recursive: true, force: true });
});

describe("nombreCarpeta", () => {
  it("limpia separadores de ruta y espacios", () => {
    expect(nombreCarpeta("  Fracciones: parte/todo \\ repaso  ")).toBe(
      "Fracciones parte todo repaso",
    );
  });

  it("no produce nombres vacíos ni ocultos", () => {
    expect(nombreCarpeta("///")).toBe("Clase sin título");
    expect(nombreCarpeta("...sigilosa")).toBe("sigilosa");
  });
});

describe("store", () => {
  it("crea un proyecto con clase.salman y recursos/", async () => {
    const carpeta = await crearProyecto(base, claseEjemplo);
    expect(carpeta).toBe("Los estados del agua");
    const stats = await fs.stat(path.join(base, carpeta, "recursos"));
    expect(stats.isDirectory()).toBe(true);
    expect(await leerProyecto(base, carpeta)).toEqual(claseEjemplo);
  });

  it("resuelve colisiones de nombre con sufijo", async () => {
    await crearProyecto(base, claseEjemplo);
    const segunda = await crearProyecto(base, claseEjemplo);
    expect(segunda).toBe("Los estados del agua (2)");
  });

  it("lista los proyectos ignorando carpetas ajenas o corruptas", async () => {
    await crearProyecto(base, claseEjemplo);
    await fs.mkdir(path.join(base, "no soy un proyecto"));
    await fs.mkdir(path.join(base, "corrupta"));
    await fs.writeFile(path.join(base, "corrupta", "clase.salman"), "{no json");
    const lista = await listarProyectos(base);
    expect(lista).toEqual([
      {
        carpeta: "Los estados del agua",
        titulo: "Los estados del agua",
        modificado: claseEjemplo.modificado,
        scaffold: "Inicio / Desarrollo / Cierre",
      },
    ]);
  });

  it("devuelve lista vacía si la base no existe todavía", async () => {
    expect(await listarProyectos(path.join(base, "inexistente"))).toEqual([]);
  });

  it("guarda cambios sobre un proyecto existente", async () => {
    const carpeta = await crearProyecto(base, claseEjemplo);
    const editada = { ...claseEjemplo, titulo: "Otro título", bloques: [] };
    await guardarProyecto(base, carpeta, editada);
    expect(await leerProyecto(base, carpeta)).toEqual(editada);
  });

  it("rechaza guardar en un proyecto que no existe", async () => {
    await expect(guardarProyecto(base, "fantasma", claseEjemplo)).rejects.toThrow(
      /No existe/,
    );
  });

  it("rechaza identificadores con path traversal", async () => {
    for (const malicioso of ["../fuera", "a/b", "..", ".oculta"]) {
      await expect(leerProyecto(base, malicioso)).rejects.toThrow(/inválido/);
    }
  });
});
