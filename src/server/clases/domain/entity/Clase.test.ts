import { describe, expect, it } from "vitest";
import { claseEjemplo } from "../../../../testing/fixtures";
import { ClaseSalman, escribirClase, leerClase } from "./Clase";

describe("ClaseSalman", () => {
  it("acepta una clase completa válida", () => {
    expect(ClaseSalman.parse(claseEjemplo)).toEqual(claseEjemplo);
  });

  it("acepta una clase sin bloques (todas las fases borradas)", () => {
    expect(() =>
      ClaseSalman.parse({ ...claseEjemplo, bloques: [] }),
    ).not.toThrow();
  });

  it("acepta una clase en blanco: sin scaffold y sin metadatos", () => {
    expect(() =>
      ClaseSalman.parse({ ...claseEjemplo, scaffold: null, metadatos: {} }),
    ).not.toThrow();
  });

  it("rechaza una nota dirigida al material del alumno", () => {
    const bloques = [
      { id: claseEjemplo.bloques[1].id, tipo: "nota", target: "material", contenido: "x" },
    ];
    expect(() => ClaseSalman.parse({ ...claseEjemplo, bloques })).toThrow();
  });

  it("rechaza fases anidadas dentro de fases", () => {
    const fase = claseEjemplo.bloques[0];
    const bloques = [{ ...fase, bloques: [fase] }];
    expect(() => ClaseSalman.parse({ ...claseEjemplo, bloques })).toThrow();
  });

  it("rechaza un target desconocido", () => {
    const bloques = [
      { id: claseEjemplo.bloques[1].id, tipo: "texto", target: "pizarra", contenido: "x" },
    ];
    expect(() => ClaseSalman.parse({ ...claseEjemplo, bloques })).toThrow();
  });

  it("rechaza un documento que no es formato salman o tiene otra versión", () => {
    expect(() => ClaseSalman.parse({ ...claseEjemplo, formato: "docx" })).toThrow();
    expect(() => ClaseSalman.parse({ ...claseEjemplo, version: 2 })).toThrow();
  });

  it("sobrevive el viaje completo escribir → leer sin pérdida", () => {
    expect(leerClase(escribirClase(claseEjemplo))).toEqual(claseEjemplo);
  });

  it("escribe JSON con pretty-print y salto de línea final", () => {
    const texto = escribirClase(claseEjemplo);
    expect(texto).toMatch(/^\{\n {2}"formato": "salman",\n/);
    expect(texto.endsWith("\n")).toBe(true);
  });
});
