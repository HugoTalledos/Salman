import type { ProveedorLLM } from "../shared/llm/application/port/ProveedorLLM";
import { configurarProveedorLLM } from "../shared/llm/infrastructure/ConfigurarProveedor";

export type {
  MensajeLLM,
  PeticionLLM,
  ProveedorLLM,
} from "../shared/llm/application/port/ProveedorLLM";
export { configurarProveedorLLM } from "../shared/llm/infrastructure/ConfigurarProveedor";

/**
 * Resuelve el proveedor configurado. SALMAN_LLM: "anthropic" (default) u
 * "openai" (cualquier API compatible con chat/completions). Lanza un error
 * con instrucciones si la configuración está incompleta.
 */
export function obtenerProveedorLLM(): ProveedorLLM {
  return configurarProveedorLLM();
}
