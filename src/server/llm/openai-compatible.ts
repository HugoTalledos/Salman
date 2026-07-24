import type { PeticionLLM, ProveedorLLM } from "./tipos";

/**
 * Proveedor para cualquier API compatible con el formato chat/completions de
 * OpenAI: OpenAI, Ollama, LM Studio, etc. Configuración:
 *
 *   SALMAN_LLM=openai
 *   SALMAN_LLM_MODELO=<obligatorio, p. ej. "gpt-5.2" o "llama3.3">
 *   SALMAN_LLM_URL=<base, default https://api.openai.com/v1>
 *   OPENAI_API_KEY=<si el servicio la exige; Ollama local no la necesita>
 */
export function crearProveedorOpenAICompatible(): ProveedorLLM {
  const base = (process.env.SALMAN_LLM_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const modelo = process.env.SALMAN_LLM_MODELO;
  if (!modelo) {
    throw new Error(
      "Con SALMAN_LLM=openai debes indicar el modelo en SALMAN_LLM_MODELO",
    );
  }
  const clave = process.env.OPENAI_API_KEY;

  return {
    id: "openai-compatible",
    async completar({ sistema, mensajes }: PeticionLLM): Promise<string> {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(clave ? { authorization: `Bearer ${clave}` } : {}),
        },
        body: JSON.stringify({
          model: modelo,
          messages: [
            { role: "system", content: sistema },
            ...mensajes.map((m) => ({
              role: m.rol === "usuario" ? "user" : "assistant",
              content: m.contenido,
            })),
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`El proveedor LLM respondió ${res.status}: ${await res.text()}`);
      }
      const datos = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return datos.choices?.[0]?.message?.content ?? "";
    },
  };
}
