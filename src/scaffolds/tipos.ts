import type { Bloque } from "../schema/clase";

/**
 * Definición de un scaffold. Los scaffolds los creamos nosotros (no el
 * profesor) y actúan UNA sola vez: al crear la clase generan la semilla de
 * bloques y estampan su identidad. Después de ese instante nada vuelve a
 * validarse contra ellos — la semilla es sugerencia editable, jamás regla.
 */
export interface DefinicionScaffold {
  id: string;
  nombre: string;
  version: number;
  /** Para la pantalla de creación. */
  descripcion: string;
  /** Modelo pedagógico, p. ej. "socioconstructivista". */
  modelo?: string;
  /** Método de enseñanza, p. ej. "PBL". */
  metodo?: string;
  /** Genera la semilla: bloques con IDs frescos en cada invocación. */
  semilla(): Bloque[];
}
