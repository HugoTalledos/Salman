import { z } from "zod";

/**
 * Esquema de `clase.salman` — el fuente de una clase.
 *
 * Este es el contrato del producto. El editor es una vista de esto
 * (nunca al revés) y el compilador lee esto sin asumir estructura:
 * cualquier combinación de bloques que pase este esquema es válida.
 */

export const FORMATO = "salman" as const;
export const VERSION_ACTUAL = 1 as const;

// ---------------------------------------------------------------------------
// Target de compilación
// ---------------------------------------------------------------------------

export const Target = z.enum(["guia", "material", "ambos"]);
export type Target = z.infer<typeof Target>;

// ---------------------------------------------------------------------------
// Bloques
//
// Todo es un bloque, incluida la fase. Cada bloque declara su propio target;
// no hay herencia en tiempo de lectura: lo que está guardado es lo que vale.
// El contenido textual es siempre Markdown (CommonMark + tablas GFM), nunca
// un árbol del editor.
// ---------------------------------------------------------------------------

const bloqueBase = {
  id: z.uuid(),
};

/** Texto libre en Markdown. El bloque de trabajo por defecto. */
export const BloqueTexto = z.object({
  ...bloqueBase,
  tipo: z.literal("texto"),
  target: Target,
  contenido: z.string(),
});
export type BloqueTexto = z.infer<typeof BloqueTexto>;

/**
 * Nota de facilitación: qué decir, qué preguntar, a qué estar atento.
 * Su target es fijo por definición — una nota al profesor no tiene
 * sentido en el material del alumno, y el esquema lo garantiza.
 */
export const BloqueNota = z.object({
  ...bloqueBase,
  tipo: z.literal("nota"),
  target: z.literal("guia"),
  contenido: z.string(),
});
export type BloqueNota = z.infer<typeof BloqueNota>;

/** Imagen referenciada por ruta relativa a la carpeta del proyecto. */
export const BloqueImagen = z.object({
  ...bloqueBase,
  tipo: z.literal("imagen"),
  target: Target,
  /** p. ej. "recursos/mapa.png" */
  recurso: z.string().min(1),
  alt: z.string().optional(),
  pie: z.string().optional(),
});
export type BloqueImagen = z.infer<typeof BloqueImagen>;

/** Bloques que pueden vivir dentro de una fase (las fases no se anidan). */
export const BloqueHijo = z.discriminatedUnion("tipo", [
  BloqueTexto,
  BloqueNota,
  BloqueImagen,
]);
export type BloqueHijo = z.infer<typeof BloqueHijo>;

/**
 * Fase: un bloque contenedor de un solo nivel. Se renombra, se mueve o se
 * borra como cualquier otro bloque; mover/borrar la fase arrastra sus hijos.
 * Su target aplica a la fase misma (título, duración); cada hijo lleva el suyo.
 */
export const BloqueFase = z.object({
  ...bloqueBase,
  tipo: z.literal("fase"),
  target: Target,
  titulo: z.string(),
  duracionMinutos: z.number().int().positive().optional(),
  bloques: z.array(BloqueHijo),
});
export type BloqueFase = z.infer<typeof BloqueFase>;

/** Cualquier bloque de nivel superior. Pueden convivir fases y bloques sueltos. */
export const Bloque = z.discriminatedUnion("tipo", [
  BloqueFase,
  BloqueTexto,
  BloqueNota,
  BloqueImagen,
]);
export type Bloque = z.infer<typeof Bloque>;

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

/** Metadatos de la clase. Todos opcionales: el compilador imprime lo que haya. */
export const MetadatosClase = z.object({
  materia: z.string().optional(),
  grado: z.string().optional(),
  duracionMinutos: z.number().int().positive().optional(),
  objetivos: z.array(z.string()).optional(),
});
export type MetadatosClase = z.infer<typeof MetadatosClase>;

/**
 * Identidad del scaffold que originó la clase. Solo memoria, nunca regla:
 * nada vuelve a validarse contra el scaffold después de la creación.
 * `null` para una clase creada en blanco.
 *
 * El modelo y el método vienen definidos por el scaffold (los scaffolds los
 * creamos nosotros); se estampan aquí al crear la clase y el editor no los
 * expone para edición.
 */
export const IdentidadScaffold = z.object({
  id: z.string(),
  nombre: z.string(),
  version: z.number().int(),
  /** Modelo pedagógico del scaffold, p. ej. "socioconstructivista". */
  modelo: z.string().optional(),
  /** Método de enseñanza del scaffold, p. ej. "PBL". */
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

// ---------------------------------------------------------------------------
// Lectura y escritura
// ---------------------------------------------------------------------------

/** Parsea y valida el contenido de un archivo clase.salman. */
export function leerClase(json: string): ClaseSalman {
  return ClaseSalman.parse(JSON.parse(json));
}

/** Serializa una clase a JSON con pretty-print (formato en disco). */
export function escribirClase(clase: ClaseSalman): string {
  return JSON.stringify(ClaseSalman.parse(clase), null, 2) + "\n";
}
