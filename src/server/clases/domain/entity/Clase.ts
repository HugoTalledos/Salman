import { z } from "zod";

export const FORMATO = "salman" as const;
export const VERSION_ACTUAL = 1 as const;

export const Target = z.enum(["guia", "material", "ambos"]);
export type Target = z.infer<typeof Target>;

const bloqueBase = {
  id: z.uuid(),
};

export const BloqueTexto = z.object({
  ...bloqueBase,
  tipo: z.literal("texto"),
  target: Target,
  contenido: z.string(),
});
export type BloqueTexto = z.infer<typeof BloqueTexto>;

export const BloqueNota = z.object({
  ...bloqueBase,
  tipo: z.literal("nota"),
  target: z.literal("guia"),
  contenido: z.string(),
});
export type BloqueNota = z.infer<typeof BloqueNota>;

export const BloqueImagen = z.object({
  ...bloqueBase,
  tipo: z.literal("imagen"),
  target: Target,
  recurso: z.string().min(1),
  alt: z.string().optional(),
  pie: z.string().optional(),
});
export type BloqueImagen = z.infer<typeof BloqueImagen>;

export const BloqueHijo = z.discriminatedUnion("tipo", [
  BloqueTexto,
  BloqueNota,
  BloqueImagen,
]);
export type BloqueHijo = z.infer<typeof BloqueHijo>;

export const BloqueFase = z.object({
  ...bloqueBase,
  tipo: z.literal("fase"),
  target: Target,
  titulo: z.string(),
  duracionMinutos: z.number().int().positive().optional(),
  bloques: z.array(BloqueHijo),
});
export type BloqueFase = z.infer<typeof BloqueFase>;

export const Bloque = z.discriminatedUnion("tipo", [
  BloqueFase,
  BloqueTexto,
  BloqueNota,
  BloqueImagen,
]);
export type Bloque = z.infer<typeof Bloque>;

export const MetadatosClase = z.object({
  materia: z.string().optional(),
  grado: z.string().optional(),
  duracionMinutos: z.number().int().positive().optional(),
  objetivos: z.array(z.string()).optional(),
});
export type MetadatosClase = z.infer<typeof MetadatosClase>;

export const IdentidadScaffold = z.object({
  id: z.string(),
  nombre: z.string(),
  version: z.number().int(),
  modelo: z.string().optional(),
  metodo: z.string().optional(),
});
export type IdentidadScaffold = z.infer<typeof IdentidadScaffold>;

export const ClaseSalman = z.object({
  formato: z.literal(FORMATO),
  version: z.literal(VERSION_ACTUAL),
  id: z.uuid(),
  titulo: z.string(),
  metadatos: MetadatosClase,
  scaffold: IdentidadScaffold.nullable(),
  creado: z.iso.datetime(),
  modificado: z.iso.datetime(),
  bloques: z.array(Bloque),
});
export type ClaseSalman = z.infer<typeof ClaseSalman>;

export function leerClase(json: string): ClaseSalman {
  return ClaseSalman.parse(JSON.parse(json));
}

export function escribirClase(clase: ClaseSalman): string {
  return JSON.stringify(ClaseSalman.parse(clase), null, 2) + "\n";
}
