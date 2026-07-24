import { describe, expect, it } from "vitest";
import type { AccionAsistente } from "../asistente/acciones";
import { editorDesdeClase } from "../mapping/mapeo";
import { claseEjemplo } from "../testing/fixtures";
import { aplicarAccion, describirUbicacion } from "./aplicarAccion";

const ids = {
  accion: "2a2b3c4d-0000-4000-8000-000000000001",
  texto: "3a2b3c4d-0000-4000-8000-000000000001",
  textoDos: "3a2b3c4d-0000-4000-8000-000000000002",
  fase: "3a2b3c4d-0000-4000-8000-000000000003",
  hijo: "3a2b3c4d-0000-4000-8000-000000000004",
  ausente: "9a2b3c4d-0000-4000-8000-000000000001",
};

function accion(
  ubicacion: AccionAsistente["ubicacion"],
  bloques: AccionAsistente["bloques"] = [{
    id: ids.texto,
    tipo: "texto",
    target: "material",
    contenido: "Nueva actividad.",
  }],
): AccionAsistente {
  return {
    id: ids.accion,
    titulo: "Añadir actividad",
    beneficio: "Refuerza el objetivo.",
    ubicacion,
    bloques,
  };
}

describe("aplicarAccion", () => {
  it("inserta después de un ancla de raíz sin mutar los bloques existentes", () => {
    const documento = editorDesdeClase(claseEjemplo.bloques);
    const antes = structuredClone(documento);
    const propuesta = accion({
      tipo: "raiz",
      anclaId: documento[0].id,
      posicion: "despues",
    });

    const resultado = aplicarAccion(documento, propuesta);

    expect(resultado).toMatchObject({ ok: true, primerId: ids.texto });
    if (resultado.ok) {
      expect(resultado.bloques.map((bloque) => bloque.id)).toEqual([
        documento[0].id,
        ids.texto,
        documento[1].id,
      ]);
      expect(resultado.bloques).toContainEqual(antes[0]);
      expect(resultado.bloques).toContainEqual(antes[1]);
    }
    expect(documento).toEqual(antes);
  });

  it("inserta al inicio de una fase", () => {
    const documento = editorDesdeClase(claseEjemplo.bloques);
    const propuesta = accion({
      tipo: "fase",
      faseId: documento[0].id,
      posicion: "inicio",
    });

    const resultado = aplicarAccion(documento, propuesta);

    expect(resultado).toMatchObject({ ok: true });
    if (resultado.ok) {
      expect(resultado.bloques[0].children.map((bloque) => bloque.id)).toEqual([
        ids.texto,
        documento[0].children[0].id,
        documento[0].children[1].id,
      ]);
    }
  });

  it("inserta al final de una fase", () => {
    const documento = editorDesdeClase(claseEjemplo.bloques);
    const propuesta = accion({
      tipo: "fase",
      faseId: documento[0].id,
      posicion: "final",
    });

    const resultado = aplicarAccion(documento, propuesta);

    expect(resultado).toMatchObject({ ok: true });
    if (resultado.ok) {
      expect(resultado.bloques[0].children.map((bloque) => bloque.id)).toEqual([
        documento[0].children[0].id,
        documento[0].children[1].id,
        ids.texto,
      ]);
    }
  });

  it("rechaza un ancla ausente sin buscar otra ubicación", () => {
    const documento = editorDesdeClase(claseEjemplo.bloques);
    const propuesta = accion({
      tipo: "raiz",
      anclaId: ids.ausente,
      posicion: "antes",
    });

    expect(aplicarAccion(documento, propuesta)).toEqual({
      ok: false,
      error: expect.any(String),
    });
  });

  it("rechaza una fase dentro de otra fase", () => {
    const documento = editorDesdeClase(claseEjemplo.bloques);
    const propuesta = accion(
      { tipo: "fase", faseId: documento[0].id, posicion: "final" },
      [{
        id: ids.fase,
        tipo: "fase",
        target: "ambos",
        titulo: "Cierre",
        bloques: [],
      }],
    );

    expect(aplicarAccion(documento, propuesta)).toEqual({
      ok: false,
      error: expect.any(String),
    });
  });

  it("rechaza IDs duplicados en el documento vivo y en la propuesta", () => {
    const documento = editorDesdeClase(claseEjemplo.bloques);
    const enDocumento = accion(
      { tipo: "fase", faseId: documento[0].id, posicion: "final" },
      [{
        id: documento[0].children[0].id,
        tipo: "texto",
        target: "material",
        contenido: "Repite un ID vivo.",
      }],
    );
    const enPropuesta = accion(
      { tipo: "fase", faseId: documento[0].id, posicion: "final" },
      [
        {
          id: ids.texto,
          tipo: "texto",
          target: "material",
          contenido: "Primer bloque.",
        },
        {
          id: ids.texto,
          tipo: "nota",
          target: "guia",
          contenido: "Segundo bloque con el mismo ID.",
        },
      ],
    );

    expect(aplicarAccion(documento, enDocumento)).toEqual({
      ok: false,
      error: expect.any(String),
    });
    expect(aplicarAccion(documento, enPropuesta)).toEqual({
      ok: false,
      error: expect.any(String),
    });
  });
});

describe("describirUbicacion", () => {
  it("describe una inserción al final de una fase", () => {
    const documento = editorDesdeClase(claseEjemplo.bloques);
    const propuesta = accion({
      tipo: "fase",
      faseId: documento[0].id,
      posicion: "final",
    });

    expect(describirUbicacion(documento, propuesta)).toBe(
      "Al final de la fase «Inicio»",
    );
  });
});
