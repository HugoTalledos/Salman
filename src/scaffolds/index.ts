import { ClaseSalman, VERSION_ACTUAL } from "../schema/clase";
import { inicioDesarrolloCierre } from "./inicio-desarrollo-cierre";
import type { DefinicionScaffold } from "./tipos";

export type { DefinicionScaffold } from "./tipos";

/** Catálogo de scaffolds disponibles. La "Clase en blanco" no es un scaffold:
 *  es la ausencia de uno (`scaffold: null`, sin semilla). */
export const scaffolds: DefinicionScaffold[] = [inicioDesarrolloCierre];

export function obtenerScaffold(id: string): DefinicionScaffold | undefined {
  return scaffolds.find((s) => s.id === id);
}

/**
 * Crea el fuente de una clase nueva. Único punto donde el scaffold actúa:
 * genera la semilla y estampa su identidad. Con `scaffold: null` se crea
 * una clase en blanco.
 */
export function crearClase(
  titulo: string,
  scaffold: DefinicionScaffold | null,
): ClaseSalman {
  const ahora = new Date().toISOString();
  return ClaseSalman.parse({
    formato: "salman",
    version: VERSION_ACTUAL,
    id: crypto.randomUUID(),
    titulo,
    metadatos: {},
    scaffold: scaffold
      ? {
          id: scaffold.id,
          nombre: scaffold.nombre,
          version: scaffold.version,
          modelo: scaffold.modelo,
          metodo: scaffold.metodo,
        }
      : null,
    creado: ahora,
    modificado: ahora,
    bloques: scaffold ? scaffold.semilla() : [],
  });
}
