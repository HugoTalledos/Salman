import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const raizSrc = path.resolve(import.meta.dirname, "..");
const dependenciasProhibidas = ["hono", "node:fs", "@anthropic-ai/sdk"];
const objetivosLegacy = [
  "schema/clase",
  "scaffolds",
  "compiler",
  "asistente",
  "server/store",
  "server/asistente",
  "server/respuesta-asistente",
  "server/llm",
];

interface ImportEncontrado {
  archivo: string;
  linea: number;
  modulo: string;
}

function listarFuentes(directorio: string): string[] {
  return fs.readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) return listarFuentes(ruta);
    return /\.[cm]?[jt]sx?$/.test(entrada.name) ? [ruta] : [];
  });
}

function extraerImports(archivo: string): ImportEncontrado[] {
  const fuente = fs.readFileSync(archivo, "utf8");
  const patrones = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  return patrones.flatMap((patron) =>
    Array.from(fuente.matchAll(patron), (coincidencia) => ({
      archivo: path.relative(raizSrc, archivo),
      linea: fuente.slice(0, coincidencia.index).split("\n").length,
      modulo: coincidencia[1],
    })),
  );
}

function estaEnCapa(archivo: string, capa: "domain" | "application"): boolean {
  return archivo.split(path.sep).includes(capa);
}

function resolverImport(importado: ImportEncontrado): string | null {
  if (!importado.modulo.startsWith(".")) return null;
  return path.normalize(
    path.resolve(raizSrc, path.dirname(importado.archivo), importado.modulo),
  );
}

function describir(importado: ImportEncontrado): string {
  return `${importado.archivo}:${importado.linea} -> ${importado.modulo}`;
}

const imports = listarFuentes(raizSrc).flatMap(extraerImports);

describe("límites arquitectónicos", () => {
  it("mantiene domain y application libres de frameworks e infraestructura externa", () => {
    const infracciones = imports.filter(
      ({ archivo, modulo }) =>
        (estaEnCapa(archivo, "domain") || estaEnCapa(archivo, "application")) &&
        dependenciasProhibidas.some(
          (dependencia) =>
            modulo === dependencia || modulo.startsWith(`${dependencia}/`),
        ),
    );

    expect(infracciones.map(describir)).toEqual([]);
  });

  it("impide que application dependa de infrastructure", () => {
    const infracciones = imports.filter((importado) => {
      if (!estaEnCapa(importado.archivo, "application")) return false;
      if (importado.modulo.split("/").includes("infrastructure")) return true;
      const objetivo = resolverImport(importado);
      return objetivo?.split(path.sep).includes("infrastructure") ?? false;
    });

    expect(infracciones.map(describir)).toEqual([]);
  });

  it("impide reintroducir imports a las fachadas legacy", () => {
    const infracciones = imports.filter((importado) => {
      const objetivo = resolverImport(importado);
      if (objetivo === null) return false;
      const relativo = path.relative(raizSrc, objetivo).split(path.sep).join("/");
      return objetivosLegacy.some(
        (legacy) => relativo === legacy || relativo.startsWith(`${legacy}/`),
      );
    });

    expect(infracciones.map(describir)).toEqual([]);
  });
});
