import type { z } from "zod";

export interface MensajeLLM {
  rol: "usuario" | "asistente";
  contenido: string;
}

export interface EsquemaSalidaLLM {
  nombre: string;
  esquema: z.ZodType;
}

export interface PeticionLLM {
  sistema: string;
  mensajes: MensajeLLM[];
  formato?: "json";
  esquemaSalida?: EsquemaSalidaLLM;
}

export interface ProveedorLLM {
  id: string;
  completar(peticion: PeticionLLM): Promise<string>;
}
