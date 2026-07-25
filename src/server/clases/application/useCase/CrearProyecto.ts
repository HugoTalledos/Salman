import type { ClaseSalman } from "../../domain/entity/Clase";

export interface CrearProyecto {
  ejecutar(entrada: {
    titulo: string;
    scaffoldId: string | null;
  }): Promise<{ carpeta: string; clase: ClaseSalman }>;
}
