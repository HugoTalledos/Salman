/**
 * Capa de proveedores LLM. El asistente de Salman habla con esta interfaz,
 * nunca con un proveedor concreto: cambiar de proveedor es cuestión de
 * configuración (variable de entorno SALMAN_LLM), no de código.
 */

export interface MensajeLLM {
  rol: "usuario" | "asistente";
  contenido: string;
}

export interface PeticionLLM {
  /** Instrucciones de sistema (incluyen el fuente de la clase). */
  sistema: string;
  /** Historial de la conversación, alternando usuario/asistente. */
  mensajes: MensajeLLM[];
  /** Formato estructurado solicitado, si el proveedor ofrece soporte nativo. */
  formato?: "json";
}

export interface ProveedorLLM {
  id: string;
  /** Devuelve el texto de respuesta del modelo. */
  completar(peticion: PeticionLLM): Promise<string>;
}
