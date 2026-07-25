import { describe, expect, it } from "vitest";
import {
  parsearRespuestaAsistente,
  RespuestaAsistenteSchema,
} from "./RespuestaAsistente";

const accion = (n: number) => ({
  id: `2a2b3c4d-0000-4000-8000-00000000000${n}`,
  titulo: `Alternativa ${n}`,
  beneficio: `Beneficio ${n}`,
  ubicacion: {
    tipo: "fase" as const,
    faseId: "1a2b3c4d-0000-4000-8000-000000000001",
    posicion: "final" as const,
  },
  bloques: [{
    id: `3a2b3c4d-0000-4000-8000-00000000000${n}`,
    tipo: "texto" as const,
    target: "material" as const,
    contenido: `Actividad ${n}`,
  }],
});

describe("RespuestaAsistenteSchema", () => {
  it("acepta JSON informativo válido", () => {
    expect(
      parsearRespuestaAsistente(
        JSON.stringify({
          tipo: "informativa",
          mensaje: "La secuencia es coherente.",
        }),
      ),
    ).toEqual({ tipo: "informativa", mensaje: "La secuencia es coherente." });
  });

  it("acepta exactamente tres acciones con targets de guía, material y ambos", () => {
    const acciones = [
      {
        ...accion(1),
        bloques: [{ ...accion(1).bloques[0], target: "guia" as const }],
      },
      accion(2),
      {
        ...accion(3),
        bloques: [{ ...accion(3).bloques[0], target: "ambos" as const }],
      },
    ];

    expect(
      RespuestaAsistenteSchema.parse({
        tipo: "accionable",
        mensaje: "Tres opciones",
        acciones,
      }),
    ).toMatchObject({ tipo: "accionable", acciones });
  });

  it("exige exactamente tres acciones", () => {
    expect(() =>
      RespuestaAsistenteSchema.parse({
        tipo: "accionable",
        mensaje: "Tres opciones",
        acciones: [accion(1), accion(2)],
      }),
    ).toThrow();
  });

  it("rechaza UUIDs inválidos en acciones, bloques y anclas", () => {
    const invalida = (cambio: Record<string, unknown>) =>
      RespuestaAsistenteSchema.safeParse({
        tipo: "accionable",
        mensaje: "Opciones",
        acciones: [{ ...accion(1), ...cambio }, accion(2), accion(3)],
      }).success;

    expect(invalida({ id: "accion-1" })).toBe(false);
    expect(invalida({
      bloques: [{ ...accion(1).bloques[0], id: "bloque-1" }],
    })).toBe(false);
    expect(invalida({
      ubicacion: { tipo: "raiz", anclaId: "bloque-existente", posicion: "antes" },
    })).toBe(false);
  });

  it("rechaza una acción sin bloques para agregar", () => {
    expect(() =>
      RespuestaAsistenteSchema.parse({
        tipo: "accionable",
        mensaje: "Opciones",
        acciones: [
          { ...accion(1), bloques: [] },
          accion(2),
          accion(3),
        ],
      }),
    ).toThrow();
  });

  it("rechaza IDs repetidos entre las alternativas", () => {
    expect(() =>
      RespuestaAsistenteSchema.parse({
        tipo: "accionable",
        mensaje: "Opciones",
        acciones: [
          accion(1),
          { ...accion(2), id: accion(1).id },
          accion(3),
        ],
      }),
    ).toThrow();
  });

  it("rechaza imágenes como bloques insertables", () => {
    expect(() =>
      RespuestaAsistenteSchema.parse({
        tipo: "accionable",
        mensaje: "Opciones",
        acciones: [
          accion(1),
          accion(2),
          {
            ...accion(3),
            bloques: [{
              id: crypto.randomUUID(),
              tipo: "imagen",
              target: "ambos",
              recurso: "mapa.png",
            }],
          },
        ],
      }),
    ).toThrow();
  });

  it("restringe las notas insertables al target guía", () => {
    expect(() =>
      RespuestaAsistenteSchema.parse({
        tipo: "accionable",
        mensaje: "Opciones",
        acciones: [
          accion(1),
          accion(2),
          {
            ...accion(3),
            bloques: [{
              id: crypto.randomUUID(),
              tipo: "nota",
              target: "material",
              contenido: "Solo para el profesor.",
            }],
          },
        ],
      }),
    ).toThrow();
  });

  it("impide insertar una fase dentro de otra fase", () => {
    expect(() =>
      RespuestaAsistenteSchema.parse({
        tipo: "accionable",
        mensaje: "Opciones",
        acciones: [
          accion(1),
          accion(2),
          {
            ...accion(3),
            bloques: [{
              id: crypto.randomUUID(),
              tipo: "fase",
              target: "ambos",
              titulo: "Cierre",
              bloques: [],
            }],
          },
        ],
      }),
    ).toThrow("No se puede insertar una fase dentro de otra fase.");
  });

  it("extrae JSON aunque venga dentro de un bloque markdown", () => {
    const valor = { tipo: "informativa", mensaje: "Respuesta" };

    expect(
      parsearRespuestaAsistente(`\`\`\`json\n${JSON.stringify(valor)}\n\`\`\``),
    ).toEqual(valor);
  });
});
