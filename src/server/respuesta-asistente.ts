import {
  parsearRespuestaAsistente,
  type RespuestaAsistente,
} from "../asistente/acciones";
import type { ClaseSalman } from "../schema/clase";
import { construirSistema } from "./asistente";
import type { MensajeLLM, ProveedorLLM } from "./llm/tipos";

const MENSAJE_REPARACION =
  "Tu respuesta anterior no cumple el contrato. Devuelve únicamente JSON válido, " +
  "sin Markdown ni explicación, con exactamente tres acciones, exactamente un bloque " +
  "nuevo por acción, contenido de máximo 100 caracteres, UUID v4 nuevos y únicos para " +
  "cada acción y bloque, y anclas que sean IDs existentes del fuente. Conserva la " +
  "intención de la respuesta.";

export async function obtenerRespuestaAsistente(
  proveedor: ProveedorLLM,
  clase: ClaseSalman,
  mensajes: MensajeLLM[],
): Promise<RespuestaAsistente> {
  const sistema = construirSistema(clase);
  const salidaInicial = await proveedor.completar({
    sistema,
    mensajes,
    formato: "json",
  });

  try {
    return parsearRespuestaAsistente(salidaInicial);
  } catch {
    const salidaReparada = await proveedor.completar({
      sistema,
      formato: "json",
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
