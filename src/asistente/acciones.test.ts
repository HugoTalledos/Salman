import { describe, expect, it } from "vitest";
import { parsearRespuestaAsistente, RespuestaAsistenteSchema } from "./acciones";

const accion = (n: number) => ({
  id: `2a2b3c4d-0000-4000-8000-00000000000${n}`,
  titulo: `Alternativa ${n}`,
  beneficio: `Beneficio ${n}`,
  ubicacion: {
    tipo: "fase",
    faseId: "1a2b3c4d-0000-4000-8000-000000000001",
    posicion: "final",
  },
  bloques: [{
    id: `3a2b3c4d-0000-4000-8000-00000000000${n}`,
    tipo: "texto",
    target: "material",
    contenido: `Actividad ${n}`,
  }],
});

describe("RespuestaAsistenteSchema", () => {
  it("acepta texto informativo sin acciones", () => {
    expect(
      RespuestaAsistenteSchema.parse({
        tipo: "informativa",
        mensaje: "La secuencia es coherente.",
      }),
    ).toEqual({ tipo: "informativa", mensaje: "La secuencia es coherente." });
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

  it("rechaza imágenes y fases ubicadas dentro de una fase", () => {
    expect(() =>
      RespuestaAsistenteSchema.parse({
        tipo: "accionable",
        mensaje: "Opciones",
        acciones: [
          accion(1),
          accion(2),
          {
            ...accion(3),
            bloques: [
              {
                id: crypto.randomUUID(),
                tipo: "fase",
                target: "ambos",
                titulo: "Cierre",
                bloques: [],
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  it("extrae JSON aunque venga dentro de un bloque markdown", () => {
    const valor = { tipo: "informativa", mensaje: "Respuesta" };
    expect(
      parsearRespuestaAsistente(`\`\`\`json\n${JSON.stringify(valor)}\n\`\`\``),
    ).toEqual(valor);
  });
});
