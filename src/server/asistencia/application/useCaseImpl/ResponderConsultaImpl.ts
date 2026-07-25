import type { ProyectoRepository } from "../../../clases/domain/repository/ProyectoRepository";
import type { ClaseSalman } from "../../../clases/domain/entity/Clase";
import type { ProveedorLLM } from "../../../shared/llm/application/port/ProveedorLLM";
import type { SerializadorPrompt } from "../port/SerializadorPrompt";
import type {
  MensajeConsulta,
  ResponderConsulta,
} from "../useCase/ResponderConsulta";
import {
  parsearRespuestaAsistente,
  type RespuestaAsistente,
} from "../../domain/entity/RespuestaAsistente";
import { RespuestaLLMInvalida } from "../../domain/error/ErroresAsistencia";
import { POLITICA_ASISTENTE } from "../../domain/policy/PoliticaAsistente";

export const MENSAJE_REPARACION =
  "Tu respuesta anterior no cumple el contrato. Devuelve únicamente JSON válido, " +
  "sin Markdown ni explicación, con exactamente tres acciones, exactamente un bloque " +
  "nuevo por acción, contenido de máximo 100 caracteres, UUID v4 nuevos y únicos para " +
  "cada acción y bloque, y anclas que sean IDs existentes del fuente. Conserva la " +
  "intención de la respuesta.";

function anotarBloquesSeleccionados(
  mensajes: MensajeConsulta[],
): { rol: "usuario" | "asistente"; contenido: string }[] {
  return mensajes.map(({ rol, contenido, bloques }) =>
    rol === "usuario" && bloques?.length
      ? {
          rol,
          contenido:
            `[El profesor señala los bloques con id: ${bloques.join(", ")}]\n` +
            contenido,
        }
      : { rol, contenido },
  );
}

export async function responderConsultaSobreClase(
  proveedor: ProveedorLLM,
  clase: ClaseSalman,
  mensajesConsulta: MensajeConsulta[],
  serializador: SerializadorPrompt,
): Promise<RespuestaAsistente> {
  const sistema = serializador.serializar(POLITICA_ASISTENTE, clase);
  const mensajes = anotarBloquesSeleccionados(mensajesConsulta);
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
      mensajes: [
        ...mensajes,
        { rol: "asistente", contenido: salidaInicial },
        { rol: "usuario", contenido: MENSAJE_REPARACION },
      ],
      formato: "json",
    });

    try {
      return parsearRespuestaAsistente(salidaReparada);
    } catch {
      throw new RespuestaLLMInvalida(
        "El modelo no produjo una respuesta estructurada válida",
      );
    }
  }
}

export class ResponderConsultaImpl implements ResponderConsulta {
  private readonly repositorio: ProyectoRepository;
  private readonly proveedor: ProveedorLLM;
  private readonly serializador: SerializadorPrompt;

  constructor(
    repositorio: ProyectoRepository,
    proveedor: ProveedorLLM,
    serializador: SerializadorPrompt,
  ) {
    this.repositorio = repositorio;
    this.proveedor = proveedor;
    this.serializador = serializador;
  }

  async ejecutar(
    entrada: Parameters<ResponderConsulta["ejecutar"]>[0],
  ): Promise<RespuestaAsistente> {
    const clase = await this.repositorio.obtener(entrada.carpeta);
    return responderConsultaSobreClase(
      this.proveedor,
      clase,
      entrada.mensajes,
      this.serializador,
    );
  }
}
