import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import type {
  CompiladorClase,
  TargetCompilacion,
} from "../../domain/service/CompiladorClase";
import {
  ARCHIVO_POR_TARGET,
  type CompilarProyecto,
} from "../useCase/CompilarProyecto";

const TARGETS: TargetCompilacion[] = ["guia", "material"];

export class CompilarProyectoImpl implements CompilarProyecto {
  private readonly repositorio: ProyectoRepository;
  private readonly compilador: CompiladorClase;

  constructor(
    repositorio: ProyectoRepository,
    compilador: CompiladorClase,
  ) {
    this.repositorio = repositorio;
    this.compilador = compilador;
  }

  async ejecutar(
    carpeta: string,
  ): Promise<{ archivos: Record<TargetCompilacion, string> }> {
    const clase = await this.repositorio.obtener(carpeta);

    for (const target of TARGETS) {
      await this.repositorio.escribirRecurso(
        carpeta,
        ARCHIVO_POR_TARGET[target],
        this.compilador.compilar(clase, target),
      );
    }

    return { archivos: ARCHIVO_POR_TARGET };
  }
}
