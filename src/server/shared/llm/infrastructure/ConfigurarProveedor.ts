import type { ProveedorLLM } from "../application/port/ProveedorLLM";
import { crearProveedorAnthropic } from "./provider/Anthropic";
import { crearProveedorOpenAICompatible } from "./provider/OpenAICompatible";

export function configurarProveedorLLM(
  entorno: NodeJS.ProcessEnv = process.env,
): ProveedorLLM {
  const cual = entorno.SALMAN_LLM ?? "anthropic";
  switch (cual) {
    case "anthropic":
      return crearProveedorAnthropic(entorno);
    case "openai":
      return crearProveedorOpenAICompatible(entorno);
    default:
      throw new Error(
        `Proveedor LLM desconocido: «${cual}». Valores válidos: anthropic, openai`,
      );
  }
}
