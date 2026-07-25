import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import type { ListarRecursos } from "../useCase/ListarRecursos";

export class ListarRecursosImpl implements ListarRecursos {
  private readonly repositorio: ProyectoRepository;

  constructor(repositorio: ProyectoRepository) {
    this.repositorio = repositorio;
  }

  ejecutar(carpeta: string): Promise<string[]> {
    return this.repositorio.listarRecursos(carpeta);
  }
}
