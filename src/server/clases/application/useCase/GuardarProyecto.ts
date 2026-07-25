import type { ClaseSalman } from "../../domain/entity/Clase";

export interface GuardarProyecto {
  ejecutar(entrada: {
    carpeta: string;
    clase: ClaseSalman;
  }): Promise<ClaseSalman>;
}
