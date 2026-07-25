import type { TargetCompilacion } from "../../domain/service/CompiladorClase";

export const ARCHIVO_POR_TARGET: Record<TargetCompilacion, string> = {
  guia: "guia-del-profesor.html",
  material: "material-del-alumno.html",
};

export interface CompilarProyecto {
  ejecutar(carpeta: string): Promise<{
    archivos: Record<TargetCompilacion, string>;
  }>;
}
