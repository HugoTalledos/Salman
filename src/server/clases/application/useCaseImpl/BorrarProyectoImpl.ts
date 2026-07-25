import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import type { BorrarProyecto } from "../useCase/BorrarProyecto";

export class BorrarProyectoImpl implements BorrarProyecto {
  private readonly repositorio: ProyectoRepository;

  constructor(repositorio: ProyectoRepository) {
    this.repositorio = repositorio;
  }

  async ejecutar(carpeta: string): Promise<void> {
    await this.repositorio.borrar(carpeta);
  }
}
