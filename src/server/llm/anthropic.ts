import Anthropic from "@anthropic-ai/sdk";
import type { PeticionLLM, ProveedorLLM } from "./tipos";

const MODELO_POR_DEFECTO = "claude-opus-4-8";

/**
 * Proveedor Anthropic (el default de Salman). Credenciales: el SDK resuelve
 * ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN o un perfil de `ant auth login`.
 * Modelo configurable con SALMAN_LLM_MODELO.
 */
export function crearProveedorAnthropic(): ProveedorLLM {
  const cliente = new Anthropic();
  const modelo = process.env.SALMAN_LLM_MODELO ?? MODELO_POR_DEFECTO;

  return {
    id: "anthropic",
    async completar({ sistema, mensajes }: PeticionLLM): Promise<string> {
      let respuesta;
      try {
        respuesta = await crear(cliente, modelo, sistema, mensajes);
      } catch (err) {
        if (
          err instanceof Anthropic.AuthenticationError ||
          /authentication|api.?key/i.test((err as Error).message)
        ) {
          throw new Error(
            "falta la credencial de Anthropic. Define ANTHROPIC_API_KEY en el entorno del servidor y reinícialo (o cambia de proveedor con SALMAN_LLM=openai).",
          );
        }
        throw err;
      }
      if (respuesta.stop_reason === "refusal") {
        return "No puedo ayudar con esa petición. ¿Intentamos plantearla de otra forma?";
      }
      return respuesta.content
        .filter((bloque) => bloque.type === "text")
        .map((bloque) => bloque.text)
        .join("\n");
    },
  };
}

function crear(
  cliente: Anthropic,
  modelo: string,
  sistema: string,
  mensajes: PeticionLLM["mensajes"],
) {
  return cliente.messages.create({
    model: modelo,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: sistema,
    messages: mensajes.map((m) => ({
      role: m.rol === "usuario" ? ("user" as const) : ("assistant" as const),
      content: m.contenido,
    })),
  });
}
