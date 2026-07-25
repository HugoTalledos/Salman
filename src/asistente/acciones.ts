import { z } from "zod";
import { Target } from "../schema/clase";

const UbicacionRaiz = z.object({
  tipo: z.literal("raiz"),
  anclaId: z.uuid(),
  posicion: z.enum(["antes", "despues"]),
});

const UbicacionFase = z.object({
  tipo: z.literal("fase"),
  faseId: z.uuid(),
  posicion: z.enum(["inicio", "final"]),
});

export const UbicacionInsercionSchema = z.discriminatedUnion("tipo", [
  UbicacionRaiz,
  UbicacionFase,
]);
export type UbicacionInsercion = z.infer<typeof UbicacionInsercionSchema>;

const BloqueTextoInsertable = z.object({
  id: z.uuid(),
  tipo: z.literal("texto"),
  target: Target,
  contenido: z.string(),
});

const BloqueNotaInsertable = z.object({
  id: z.uuid(),
  tipo: z.literal("nota"),
  target: z.literal("guia"),
  contenido: z.string(),
});

const BloqueHojaInsertable = z.discriminatedUnion("tipo", [
  BloqueTextoInsertable,
  BloqueNotaInsertable,
]);

const BloqueFaseInsertable = z.object({
  id: z.uuid(),
  tipo: z.literal("fase"),
  target: Target,
  titulo: z.string(),
  duracionMinutos: z.number().int().positive().optional(),
  bloques: z.array(BloqueHojaInsertable),
});

export const BloqueInsertableSchema = z.discriminatedUnion("tipo", [
  BloqueTextoInsertable,
  BloqueNotaInsertable,
  BloqueFaseInsertable,
]);
export type BloqueInsertable = z.infer<typeof BloqueInsertableSchema>;

export const AccionAsistenteSchema = z
  .object({
    id: z.uuid(),
    titulo: z.string(),
    beneficio: z.string(),
    ubicacion: UbicacionInsercionSchema,
    bloques: z.array(BloqueInsertableSchema).min(1),
  })
  .superRefine((accion, contexto) => {
    if (
      accion.ubicacion.tipo === "fase" &&
      accion.bloques.some((bloque) => bloque.tipo === "fase")
    ) {
      contexto.addIssue({
        code: "custom",
        message: "No se puede insertar una fase dentro de otra fase.",
        path: ["bloques"],
      });
    }
  });
export type AccionAsistente = z.infer<typeof AccionAsistenteSchema>;

const RespuestaAccionableSchema = z
  .object({
    tipo: z.literal("accionable"),
    mensaje: z.string(),
    acciones: z.tuple([
      AccionAsistenteSchema,
      AccionAsistenteSchema,
      AccionAsistenteSchema,
    ]),
  })
  .superRefine((respuesta, contexto) => {
    const ids = respuesta.acciones.map((accion) => accion.id);
    if (new Set(ids).size !== ids.length) {
      contexto.addIssue({
        code: "custom",
        message: "Las acciones deben tener IDs únicos.",
        path: ["acciones"],
      });
    }
  });

export const RespuestaAsistenteSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("informativa"),
    mensaje: z.string(),
  }),
  RespuestaAccionableSchema,
]);
export type RespuestaAsistente = z.infer<typeof RespuestaAsistenteSchema>;

export function parsearRespuestaAsistente(texto: string): RespuestaAsistente {
  try {
    return RespuestaAsistenteSchema.parse(JSON.parse(texto));
  } catch {
    const bloqueJson = texto.match(/```json\s*\n([\s\S]*?)\n```/i);

    if (!bloqueJson) {
      return RespuestaAsistenteSchema.parse(JSON.parse(texto));
    }

    return RespuestaAsistenteSchema.parse(JSON.parse(bloqueJson[1]));
  }
}
