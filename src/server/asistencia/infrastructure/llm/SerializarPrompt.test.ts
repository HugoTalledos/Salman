import { describe, expect, it } from "vitest";
import { claseEjemplo } from "../../../../testing/fixtures";
import { POLITICA_ASISTENTE } from "../../domain/policy/PoliticaAsistente";
import { serializadorPrompt } from "./SerializarPrompt";

describe("serializadorPrompt", () => {
  it("serializa título, criterio pedagógico, reglas, ancla y fuente completo", () => {
    const prompt = serializadorPrompt.serializar(
      POLITICA_ASISTENTE,
      claseEjemplo,
    );

    expect(prompt).toContain("Eres el Asistente Salman");
    expect(prompt).toContain(`scaffold «${claseEjemplo.scaffold?.nombre}»`);
    expect(prompt).toContain(
      `modelo pedagógico: ${claseEjemplo.scaffold?.modelo}`,
    );
    expect(prompt).toContain(
      "Responde SIEMPRE en español, con lenguaje claro y cercano",
    );
    expect(prompt).toContain("exactamente tres alternativas");
    expect(prompt).toContain("exactamente un bloque nuevo");
    expect(prompt).toContain("máximo 100 caracteres");
    expect(prompt).toContain("nunca edites, elimines ni muevas bloques existentes");
    expect(prompt).toContain(
      `"anclaId":"${claseEjemplo.bloques[0].id}"`,
    );
    expect(prompt).toContain(
      `\`\`\`json\n${JSON.stringify(claseEjemplo, null, 2)}\n\`\`\``,
    );
  });

  it("conserva el criterio y la restricción de ejemplo para una clase en blanco", () => {
    const claseEnBlanco = {
      ...claseEjemplo,
      titulo: "Clase libre",
      scaffold: null,
      bloques: [],
    };

    const prompt = serializadorPrompt.serializar(
      POLITICA_ASISTENTE,
      claseEnBlanco,
    );

    expect(prompt).toContain(
      "La clase se creó en blanco, sin scaffold: no asumas ningún modelo pedagógico",
    );
    expect(prompt).toContain(
      "No hay anclas en el fuente: responde de forma informativa",
    );
    expect(prompt).toContain(
      `\`\`\`json\n${JSON.stringify(claseEnBlanco, null, 2)}\n\`\`\``,
    );
  });
});
