import type { CrearProyecto } from "../useCase/CrearProyecto";
import { ScaffoldNoExiste } from "../../domain/error/ErroresProyecto";
import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import { crearClase } from "../../domain/service/CrearClase";
import type { CatalogoScaffolds } from "../../infrastructure/scaffold/CatalogoScaffolds";

export class CrearProyectoImpl implements CrearProyecto {
  private readonly repositorio: ProyectoRepository;
  private readonly catalogoScaffolds: CatalogoScaffolds;

  constructor(
    repositorio: ProyectoRepository,
    catalogoScaffolds: CatalogoScaffolds,
  ) {
    this.repositorio = repositorio;
    this.catalogoScaffolds = catalogoScaffolds;
  }

  async ejecutar(entrada: {
    titulo: string;
    scaffoldId: string | null;
  }) {
    const scaffold = entrada.scaffoldId
      ? this.catalogoScaffolds.obtener(entrada.scaffoldId) ?? null
      : null;
    if (entrada.scaffoldId && !scaffold) {
      throw new ScaffoldNoExiste(`No existe el scaffold ${entrada.scaffoldId}`);
    }

    const clase = crearClase(entrada.titulo, scaffold);
    const carpeta = await this.repositorio.crear(clase);
    return { carpeta, clase };
  }
}
