import type { RespuestaAsistente } from "../asistente/acciones";
import type { ClaseSalman } from "../schema/clase";
import type { MensajeLLM, ProveedorLLM } from "./llm/tipos";
import { responderConsultaSobreClase } from "./asistencia/application/useCaseImpl/ResponderConsultaImpl";
import { serializadorPrompt } from "./asistencia/infrastructure/llm/SerializarPrompt";

export async function obtenerRespuestaAsistente(
  proveedor: ProveedorLLM,
  clase: ClaseSalman,
  mensajes: MensajeLLM[],
): Promise<RespuestaAsistente> {
  return responderConsultaSobreClase(
    proveedor,
    clase,
    mensajes,
    serializadorPrompt,
  );
}
