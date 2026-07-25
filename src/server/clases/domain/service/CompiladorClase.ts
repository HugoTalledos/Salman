import type { ClaseSalman } from "../entity/Clase";

export type TargetCompilacion = "guia" | "material";

export interface CompiladorClase {
  compilar(clase: ClaseSalman, target: TargetCompilacion): string;
}
