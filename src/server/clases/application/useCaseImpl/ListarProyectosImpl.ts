import type { ListarProyectos } from "../useCase/ListarProyectos";
import type {
  ProyectoRepository,
  ResumenProyecto,
} from "../../domain/repository/ProyectoRepository";

export class ListarProyectosImpl implements ListarProyectos {
  private readonly repositorio: ProyectoRepository;

  constructor(repositorio: ProyectoRepository) {
    this.repositorio = repositorio;
  }

  ejecutar(): Promise<ResumenProyecto[]> {
    return this.repositorio.listar();
  }
}
