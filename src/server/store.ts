import os from "node:os";
import path from "node:path";
import type { ClaseSalman } from "./clases/domain/entity/Clase";
import {
  NombreProyectoInvalido,
  ProyectoNoExiste,
  RecursoNoExiste,
} from "./clases/domain/error/ErroresProyecto";
import {
  ARCHIVO_CLASE,
  CARPETA_RECURSOS,
  nombreCarpeta,
  ProyectoFileSystemRepository,
} from "./clases/infrastructure/persistence/ProyectoFileSystemRepository";

export { ARCHIVO_CLASE, CARPETA_RECURSOS, nombreCarpeta };
export type { ResumenProyecto } from "./clases/domain/repository/ProyectoRepository";

export function dirBasePorDefecto(): string {
  return path.join(os.homedir(), "Documents", "Salman");
}

/**
 * Fachada de compatibilidad para los consumidores HTTP actuales.
 * El repositorio expone errores de dominio; esta capa conserva los códigos y
 * mensajes de ErrorStore hasta que las rutas dependan directamente del puerto.
 */
export class ErrorStore extends Error {
  codigo: "carpeta-invalida" | "no-existe";

  constructor(codigo: "carpeta-invalida" | "no-existe", mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
  }
}

async function conCompatibilidad<T>(operacion: () => Promise<T>): Promise<T> {
  try {
    return await operacion();
  } catch (error) {
    if (error instanceof NombreProyectoInvalido) {
      throw new ErrorStore("carpeta-invalida", error.message);
    }
    if (error instanceof ProyectoNoExiste || error instanceof RecursoNoExiste) {
      throw new ErrorStore("no-existe", error.message);
    }
    throw error;
  }
}

export async function listarProyectos(base: string) {
  return conCompatibilidad(() => new ProyectoFileSystemRepository(base).listar());
}

export async function leerProyecto(base: string, carpeta: string) {
  return conCompatibilidad(() => new ProyectoFileSystemRepository(base).obtener(carpeta));
}

export async function guardarProyecto(base: string, carpeta: string, clase: ClaseSalman) {
  return conCompatibilidad(() => new ProyectoFileSystemRepository(base).guardar(carpeta, clase));
}

export async function escribirRecurso(
  base: string,
  carpeta: string,
  nombre: string,
  datos: string | Uint8Array,
) {
  return conCompatibilidad(() =>
    new ProyectoFileSystemRepository(base).escribirRecurso(carpeta, nombre, datos),
  );
}

export async function escribirRecursoUnico(
  base: string,
  carpeta: string,
  nombre: string,
  datos: Uint8Array,
) {
  return conCompatibilidad(() =>
    new ProyectoFileSystemRepository(base).escribirRecursoUnico(carpeta, nombre, datos),
  );
}

export async function listarRecursos(base: string, carpeta: string) {
  return conCompatibilidad(() => new ProyectoFileSystemRepository(base).listarRecursos(carpeta));
}

export async function leerRecurso(base: string, carpeta: string, nombre: string): Promise<Buffer> {
  const datos = await conCompatibilidad(() =>
    new ProyectoFileSystemRepository(base).leerRecurso(carpeta, nombre),
  );
  return Buffer.from(datos);
}

export async function crearProyecto(base: string, clase: ClaseSalman) {
  return conCompatibilidad(() => new ProyectoFileSystemRepository(base).crear(clase));
}
