import type { ClaseSalman, MetadatosClase } from "../../domain/entity/Clase";

export interface CrearProyecto {
  ejecutar(entrada: {
    titulo: string;
    scaffoldId: string | null;
    metadatos: MetadatosClase;
  }): Promise<{ carpeta: string; clase: ClaseSalman }>;
}
