import { Hono } from "hono";
import { z } from "zod";
import type { ResponderConsulta } from "../../application/useCase/ResponderConsulta";
import {
  NombreProyectoInvalido,
  ProyectoNoExiste,
} from "../../../clases/domain/error/ErroresProyecto";

const CuerpoAsistente = z.object({
  mensajes: z
    .array(
      z.object({
        rol: z.enum(["usuario", "asistente"]),
        contenido: z.string().min(1),
        bloques: z.array(z.uuid()).max(10).optional(),
      }),
    )
    .min(1)
    .max(60),
});

export const MENSAJE_ASISTENTE_NO_CONFIGURADO =
  "El asistente no está configurado. Define ANTHROPIC_API_KEY " +
  "(o SALMAN_LLM=openai con su configuración) y reinicia el servidor.";

export interface DependenciasRutasAsistencia {
  obtenerResponderConsulta(): ResponderConsulta | null;
  obtenerErrorConfiguracion(): string;
}

export function crearRutasAsistencia(
  dependencias: DependenciasRutasAsistencia,
): Hono {
  const rutas = new Hono();

  rutas.onError((error, contexto) => {
    if (error instanceof z.ZodError) {
      return contexto.json(
        { error: "Documento inválido", detalles: error.issues },
        400,
      );
    }
    console.error(error);
    return contexto.json({ error: "Error interno" }, 500);
  });

  rutas.post("/api/proyectos/:carpeta/asistente", async (contexto) => {
    const responderConsulta = dependencias.obtenerResponderConsulta();
    if (!responderConsulta) {
      return contexto.json(
        { error: dependencias.obtenerErrorConfiguracion() },
        503,
      );
    }

    const { mensajes } = CuerpoAsistente.parse(await contexto.req.json());
    try {
      const respuesta = await responderConsulta.ejecutar({
        carpeta: contexto.req.param("carpeta"),
        mensajes,
      });
      return contexto.json(respuesta);
    } catch (error) {
      if (error instanceof ProyectoNoExiste) {
        return contexto.json({ error: error.message }, 404);
      }
      if (error instanceof NombreProyectoInvalido) {
        return contexto.json({ error: error.message }, 400);
      }
      if (error instanceof z.ZodError) {
        return contexto.json(
          { error: "Documento inválido", detalles: error.issues },
          400,
        );
      }
      console.error("Error del proveedor LLM:", error);
      return contexto.json(
        {
          error:
            `El asistente no pudo responder: ${(error as Error).message}`,
        },
        502,
      );
    }
  });

  return rutas;
}
