import { POLITICA_ASISTENTE } from "./asistencia/domain/policy/PoliticaAsistente";
import { serializadorPrompt } from "./asistencia/infrastructure/llm/SerializarPrompt";
import type { ClaseSalman } from "./clases/domain/entity/Clase";

/**
 * Construye las instrucciones de sistema del Asistente Salman para una clase.
 * El asistente recibe el fuente completo y razona con el criterio pedagógico
 * del scaffold que originó la clase (regla del producto: la identidad del
 * scaffold existe exactamente para esto).
 */
export function construirSistema(clase: ClaseSalman): string {
  return serializadorPrompt.serializar(POLITICA_ASISTENTE, clase);
}
