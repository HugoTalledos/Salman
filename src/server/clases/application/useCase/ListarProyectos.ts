import type { ResumenProyecto } from "../../domain/repository/ProyectoRepository";

export interface ListarProyectos {
  ejecutar(): Promise<ResumenProyecto[]>;
}
