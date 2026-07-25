import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import { RecursoInvalido } from "../../domain/error/RecursoInvalido";
import type { SubirRecurso } from "../useCase/SubirRecurso";

const TAMANO_MAXIMO = 10 * 1024 * 1024;
const EXTENSIONES_PERMITIDAS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
]);

function sanearTallo(tallo: string): string {
  const saneado = tallo
    .replace(/[/\\:]/g, " ")
    .split("\0")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");

  return saneado || "Clase sin título";
}

export class SubirRecursoImpl implements SubirRecurso {
  private readonly repositorio: ProyectoRepository;

  constructor(repositorio: ProyectoRepository) {
    this.repositorio = repositorio;
  }

  async ejecutar(
    entrada: Parameters<SubirRecurso["ejecutar"]>[0],
  ): Promise<{ recurso: string }> {
    const indiceExtension = entrada.nombre.lastIndexOf(".");
    const extension =
      indiceExtension >= 0
        ? entrada.nombre.slice(indiceExtension).toLowerCase()
        : "";

    if (!EXTENSIONES_PERMITIDAS.has(extension)) {
      throw new RecursoInvalido("La extensión del recurso no está permitida");
    }
    if (entrada.datos.byteLength > TAMANO_MAXIMO) {
      throw new RecursoInvalido("El recurso excede el tamaño máximo de 10 MiB");
    }

    const tallo = entrada.nombre.slice(0, indiceExtension);
    const nombre = `${sanearTallo(tallo)}${extension}`;
    const recurso = await this.repositorio.escribirRecursoUnico(
      entrada.carpeta,
      nombre,
      entrada.datos,
    );

    return { recurso: `recursos/${recurso}` };
  }
}
