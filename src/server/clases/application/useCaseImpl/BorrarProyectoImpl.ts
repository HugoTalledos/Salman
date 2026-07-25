import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import type { BorrarProyecto } from "../useCase/BorrarProyecto";

export class BorrarProyectoImpl implements BorrarProyecto {
  constructor(private readonly repositorio: ProyectoRepository) {}

  async ejecutar(carpeta: string): Promise<void> {
    await this.repositorio.borrar(carpeta);
  }
}
