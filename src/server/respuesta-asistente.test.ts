import { describe, expect, it } from "vitest";
import { parsearRespuestaAsistente } from "../asistente/acciones";
import { claseEjemplo } from "../testing/fixtures";
import type { PeticionLLM, ProveedorLLM } from "./llm/tipos";
import { obtenerRespuestaAsistente } from "./respuesta-asistente";

function proveedorQueResponde(respuestas: string[]): ProveedorLLM & { peticiones: PeticionLLM[] } {
  const peticiones: PeticionLLM[] = [];
  return {
    id: "fake",
    peticiones,
    async completar(peticion) {
      peticiones.push(peticion);
      return respuestas.shift() ?? "";
    },
  };
}

describe("obtenerRespuestaAsistente", () => {
  it("devuelve la primera respuesta válida sin reintentar", async () => {
    const fake = proveedorQueResponde([
      JSON.stringify({ tipo: "informativa", mensaje: "Todo bien." }),
    ]);

    await expect(obtenerRespuestaAsistente(fake, claseEjemplo, [
      { rol: "usuario", contenido: "¿Está completa?" },
    ])).resolves.toEqual({ tipo: "informativa", mensaje: "Todo bien." });
    expect(fake.peticiones).toHaveLength(1);
    expect(fake.peticiones[0].sistema).toContain("Devuelve únicamente JSON válido");
    expect(fake.peticiones[0].sistema).toContain(
      `"anclaId":"${claseEjemplo.bloques[0].id}"`,
    );
    const ejemplo = fake.peticiones[0].sistema.match(
      /Una respuesta accionable[\s\S]*?Ejemplo válido: (\{.*\})\.\n\nEste es el fuente/,
    );
    const respuestaEjemplo = parsearRespuestaAsistente(ejemplo?.[1] ?? "");
    expect(respuestaEjemplo).toMatchObject({
      tipo: "accionable",
      acciones: [
        { bloques: [{ contenido: "Escribe una pregunta inicial sobre el tema." }] },
        { bloques: [{ contenido: "Observa qué ideas previas aparecen." }] },
        { bloques: [{ contenido: "Anota una idea que aprendiste hoy." }] },
      ],
    });
  });

  it("corrige una salida inválida una sola vez", async () => {
    const fake = proveedorQueResponde([
      "no es json",
      JSON.stringify({ tipo: "informativa", mensaje: "Corregida." }),
    ]);

    await expect(obtenerRespuestaAsistente(fake, claseEjemplo, [
      { rol: "usuario", contenido: "¿Está completa?" },
    ])).resolves.toMatchObject({ mensaje: "Corregida." });
    expect(fake.peticiones).toHaveLength(2);
    expect(fake.peticiones[1].mensajes).toEqual([
      { rol: "usuario", contenido: "¿Está completa?" },
      { rol: "asistente", contenido: "no es json" },
      {
        rol: "usuario",
        contenido:
          "Tu respuesta anterior no cumple el contrato. Devuelve únicamente JSON válido, " +
          "sin Markdown ni explicación, y conserva la intención de la respuesta.",
      },
    ]);
    expect(fake.peticiones[1].mensajes.at(-1)?.contenido)
      .toContain("Devuelve únicamente JSON válido");
  });

  it("falla después de dos salidas inválidas", async () => {
    const fake = proveedorQueResponde(["mal", "también mal"]);

    await expect(obtenerRespuestaAsistente(fake, claseEjemplo, [
      { rol: "usuario", contenido: "Sugiere una actividad" },
    ])).rejects.toThrow("respuesta estructurada válida");
    expect(fake.peticiones).toHaveLength(2);
  });
});
