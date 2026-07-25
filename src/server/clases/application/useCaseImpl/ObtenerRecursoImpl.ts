import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import type { ObtenerRecurso } from "../useCase/ObtenerRecurso";

const TIPOS_CONTENIDO: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function obtenerExtension(nombre: string): string {
  const indice = nombre.lastIndexOf(".");
  return indice >= 0 ? nombre.slice(indice).toLowerCase() : "";
}

export class ObtenerRecursoImpl implements ObtenerRecurso {
  private readonly repositorio: ProyectoRepository;

  constructor(repositorio: ProyectoRepository) {
    this.repositorio = repositorio;
  }

  async ejecutar(
    carpeta: string,
    nombre: string,
  ): Promise<{ datos: Uint8Array; tipoContenido: string }> {
    const datos = await this.repositorio.leerRecurso(carpeta, nombre);
    const tipoContenido =
      TIPOS_CONTENIDO[obtenerExtension(nombre)] ?? "application/octet-stream";

    return { datos, tipoContenido };
  }
}
