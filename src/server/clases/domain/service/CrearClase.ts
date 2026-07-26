import { ClaseSalman, VERSION_ACTUAL } from "../entity/Clase";
import type { MetadatosClase } from "../entity/Clase";
import type { DefinicionScaffold } from "../entity/Scaffold";

export function crearClase(
  titulo: string,
  scaffold: DefinicionScaffold | null,
  metadatos: MetadatosClase = {},
): ClaseSalman {
  const ahora = new Date().toISOString();
  return ClaseSalman.parse({
    formato: "salman",
    version: VERSION_ACTUAL,
    id: crypto.randomUUID(),
    titulo,
    metadatos,
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
