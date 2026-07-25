import type { RespuestaAsistente } from "../../domain/entity/RespuestaAsistente";

export interface MensajeConsulta {
  rol: "usuario" | "asistente";
  contenido: string;
  bloques?: string[];
}

export interface ResponderConsulta {
  ejecutar(entrada: {
    carpeta: string;
    mensajes: MensajeConsulta[];
  }): Promise<RespuestaAsistente>;
}
