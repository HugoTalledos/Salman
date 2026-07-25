import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claseEjemplo } from "../../../../testing/fixtures";
import {
  nombreCarpeta,
  ProyectoFileSystemRepository,
} from "./ProyectoFileSystemRepository";

let base: string;
let repositorio: ProyectoFileSystemRepository;

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "salman-store-"));
  repositorio = new ProyectoFileSystemRepository(base);
});

afterEach(async () => {
  await fs.rm(base, { recursive: true, force: true });
});

describe("ProyectoFileSystemRepository", () => {
  it("crea un proyecto con clase.salman y recursos/", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    expect(carpeta).toBe("Los estados del agua");
    const stats = await fs.stat(path.join(base, carpeta, "recursos"));
    expect(stats.isDirectory()).toBe(true);
    expect(await repositorio.obtener(carpeta)).toEqual(claseEjemplo);
  });

  it("resuelve colisiones de nombre con sufijo", async () => {
    await repositorio.crear(claseEjemplo);
    const segunda = await repositorio.crear(claseEjemplo);
    expect(segunda).toBe("Los estados del agua (2)");
  });

  it("lista los proyectos ignorando carpetas ajenas o corruptas", async () => {
    await repositorio.crear(claseEjemplo);
    await fs.mkdir(path.join(base, "no soy un proyecto"));
    await fs.mkdir(path.join(base, "corrupta"));
    await fs.writeFile(path.join(base, "corrupta", "clase.salman"), "{no json");
    expect(await repositorio.listar()).toEqual([
      {
        carpeta: "Los estados del agua",
        titulo: "Los estados del agua",
        modificado: claseEjemplo.modificado,
        scaffold: "Inicio / Desarrollo / Cierre",
      },
    ]);
  });

  it("devuelve lista vacía si la base no existe todavía", async () => {
    const inexistente = new ProyectoFileSystemRepository(path.join(base, "inexistente"));
    expect(await inexistente.listar()).toEqual([]);
  });

  it("guarda cambios sobre un proyecto existente", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    const editada = { ...claseEjemplo, titulo: "Otro título", bloques: [] };
    await repositorio.guardar(carpeta, editada);
    expect(await repositorio.obtener(carpeta)).toEqual(editada);
  });

  it("rechaza guardar en un proyecto que no existe", async () => {
    await expect(repositorio.guardar("fantasma", claseEjemplo)).rejects.toThrow(/No existe/);
  });

  it("borra el proyecto completo con sus recursos", async () => {
    const carpeta = await repositorio.crear(claseEjemplo);
    await repositorio.escribirRecurso(carpeta, "mapa.png", new Uint8Array([1]));

    await repositorio.borrar(carpeta);

    await expect(fs.access(path.join(base, carpeta))).rejects.toThrow();
    await expect(repositorio.obtener(carpeta)).rejects.toThrow(/No existe/);
  });

  it("rechaza borrar proyectos inexistentes o identificadores inseguros", async () => {
    await expect(repositorio.borrar("fantasma")).rejects.toThrow(/No existe/);
    await expect(repositorio.borrar("../fuera")).rejects.toThrow(/inválido/);
  });

  it("rechaza identificadores con path traversal", async () => {
    for (const malicioso of ["../fuera", "a/b", "..", ".oculta"]) {
      await expect(repositorio.obtener(malicioso)).rejects.toThrow(/inválido/);
    }
  });
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
