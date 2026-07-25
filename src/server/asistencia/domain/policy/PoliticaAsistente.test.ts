import { describe, expect, it } from "vitest";
import { claseEjemplo } from "../../../../testing/fixtures";
import {
  obtenerCriterioPedagogico,
  obtenerEjemploPermitido,
  POLITICA_ASISTENTE,
} from "./PoliticaAsistente";

describe("POLITICA_ASISTENTE", () => {
  it("expone los límites semánticos del asistente", () => {
    expect(POLITICA_ASISTENTE).toEqual({
      idioma: "es",
      maximoCaracteresContenido: 100,
      cantidadAlternativas: 3,
      permiteEditar: false,
      permiteEliminar: false,
      permiteMover: false,
    });
    expect(Object.isFrozen(POLITICA_ASISTENTE)).toBe(true);
  });

  it("conserva el criterio pedagógico de una clase con scaffold", () => {
    expect(obtenerCriterioPedagogico(claseEjemplo)).toEqual({
      tipo: "scaffold",
      nombre: claseEjemplo.scaffold?.nombre,
      modelo: claseEjemplo.scaffold?.modelo,
      metodo: claseEjemplo.scaffold?.metodo,
    });
  });

  it("distingue una clase en blanco sin asumir criterio pedagógico", () => {
    expect(
      obtenerCriterioPedagogico({
        ...claseEjemplo,
        scaffold: null,
        bloques: [],
      }),
    ).toEqual({ tipo: "clase-en-blanco" });
  });

  it("permite un ejemplo accionable solo cuando existe un ancla raíz", () => {
    expect(obtenerEjemploPermitido(claseEjemplo)).toEqual({
      tipo: "accionable",
      anclaId: claseEjemplo.bloques[0].id,
    });
    expect(
      obtenerEjemploPermitido({ ...claseEjemplo, bloques: [] }),
    ).toEqual({ tipo: "informativo-sin-ancla" });
  });
});
