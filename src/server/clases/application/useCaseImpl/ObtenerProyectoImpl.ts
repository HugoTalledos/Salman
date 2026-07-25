import type { ObtenerProyecto } from "../useCase/ObtenerProyecto";
import type { ClaseSalman } from "../../domain/entity/Clase";
import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";

export class ObtenerProyectoImpl implements ObtenerProyecto {
  private readonly repositorio: ProyectoRepository;

  constructor(repositorio: ProyectoRepository) {
    this.repositorio = repositorio;
  }

  ejecutar(carpeta: string): Promise<ClaseSalman> {
    return this.repositorio.obtener(carpeta);
  }
}
