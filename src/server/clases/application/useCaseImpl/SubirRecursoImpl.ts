import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import { validarMetadatosRecurso } from "../../domain/service/ValidarMetadatosRecurso";
import type { SubirRecurso } from "../useCase/SubirRecurso";

export class SubirRecursoImpl implements SubirRecurso {
  private readonly repositorio: ProyectoRepository;

  constructor(repositorio: ProyectoRepository) {
    this.repositorio = repositorio;
  }

  async ejecutar(
    entrada: Parameters<SubirRecurso["ejecutar"]>[0],
  ): Promise<{ recurso: string }> {
    const nombre = validarMetadatosRecurso({
      nombre: entrada.nombre,
      byteLength: entrada.datos.byteLength,
    });
    const recurso = await this.repositorio.escribirRecursoUnico(
      entrada.carpeta,
      nombre,
      entrada.datos,
    );

    return { recurso: `recursos/${recurso}` };
  }
}
