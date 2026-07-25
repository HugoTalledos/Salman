import type { GuardarProyecto } from "../useCase/GuardarProyecto";
import type { ClaseSalman } from "../../domain/entity/Clase";
import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";

export class GuardarProyectoImpl implements GuardarProyecto {
  private readonly repositorio: ProyectoRepository;

  constructor(repositorio: ProyectoRepository) {
    this.repositorio = repositorio;
  }

  async ejecutar(entrada: {
    carpeta: string;
    clase: ClaseSalman;
  }): Promise<ClaseSalman> {
    const clase = { ...entrada.clase, modificado: new Date().toISOString() };
    await this.repositorio.guardar(entrada.carpeta, clase);
    return clase;
  }
}
