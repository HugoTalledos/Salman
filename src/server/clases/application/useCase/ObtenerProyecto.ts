import type { ClaseSalman } from "../../domain/entity/Clase";

export interface ObtenerProyecto {
  ejecutar(carpeta: string): Promise<ClaseSalman>;
}
