import {
  parsearRespuestaAsistente,
  type RespuestaAsistente,
} from "../asistente/acciones";
import type { ClaseSalman } from "../schema/clase";
import { construirSistema } from "./asistente";
import type { MensajeLLM, ProveedorLLM } from "./llm/tipos";

const MENSAJE_REPARACION =
  "Tu respuesta anterior no cumple el contrato. Devuelve únicamente JSON válido, " +
  "sin Markdown ni explicación, y conserva la intención de la respuesta.";

export async function obtenerRespuestaAsistente(
  proveedor: ProveedorLLM,
  clase: ClaseSalman,
  mensajes: MensajeLLM[],
): Promise<RespuestaAsistente> {
  const sistema = construirSistema(clase);
  const salidaInicial = await proveedor.completar({ sistema, mensajes });

  try {
    return parsearRespuestaAsistente(salidaInicial);
  } catch {
    const salidaReparada = await proveedor.completar({
      sistema,
      mensajes: [
        ...mensajes,
        { rol: "asistente", contenido: salidaInicial },
        { rol: "usuario", contenido: MENSAJE_REPARACION },
      ],
    });

    try {
      return parsearRespuestaAsistente(salidaReparada);
    } catch {
      throw new Error("El modelo no produjo una respuesta estructurada válida");
    }
  }
}
