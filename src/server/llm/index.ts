import { crearProveedorAnthropic } from "./anthropic";
import { crearProveedorOpenAICompatible } from "./openai-compatible";
import type { ProveedorLLM } from "./tipos";

export type { MensajeLLM, PeticionLLM, ProveedorLLM } from "./tipos";

/**
 * Resuelve el proveedor configurado. SALMAN_LLM: "anthropic" (default) u
 * "openai" (cualquier API compatible con chat/completions). Lanza un error
 * con instrucciones si la configuración está incompleta.
 */
export function obtenerProveedorLLM(): ProveedorLLM {
  const cual = process.env.SALMAN_LLM ?? "anthropic";
  switch (cual) {
    case "anthropic":
      return crearProveedorAnthropic();
    case "openai":
      return crearProveedorOpenAICompatible();
    default:
      throw new Error(
        `Proveedor LLM desconocido: «${cual}». Valores válidos: anthropic, openai`,
      );
  }
}
