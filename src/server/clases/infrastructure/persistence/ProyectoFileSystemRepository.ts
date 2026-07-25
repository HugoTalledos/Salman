import { promises as fs } from "node:fs";
import path from "node:path";
import {
  NombreProyectoInvalido,
  ProyectoNoExiste,
  RecursoNoExiste,
} from "../../domain/error/ErroresProyecto";
import { escribirClase, leerClase } from "../../domain/entity/Clase";
import type { ClaseSalman } from "../../domain/entity/Clase";
import type {
  ProyectoRepository,
  ResumenProyecto,
} from "../../domain/repository/ProyectoRepository";

export const ARCHIVO_CLASE = "clase.salman";
export const CARPETA_RECURSOS = "recursos";

/** Nombre de carpeta seguro derivado del título de la clase. */
export function nombreCarpeta(titulo: string): string {
  const limpio = titulo
    .replace(/[/\\:]/g, " ")
    .replaceAll(String.fromCharCode(0), " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  return limpio || "Clase sin título";
}

function validarNombreSimple(nombre: string): void {
  if (
    nombre !== path.basename(nombre) ||
    nombre === "" ||
    nombre === ".." ||
    nombre.startsWith(".")
  ) {
    throw new NombreProyectoInvalido(`Nombre inválido: ${nombre}`);
  }
}

export class ProyectoFileSystemRepository implements ProyectoRepository {
  private readonly base: string;

  constructor(base: string) {
    this.base = base;
  }

  async listar(): Promise<ResumenProyecto[]> {
    let entradas;
    try {
      entradas = await fs.readdir(this.base, { withFileTypes: true });
    } catch {
      return [];
    }

    const resumenes: ResumenProyecto[] = [];
    for (const entrada of entradas) {
      if (!entrada.isDirectory()) continue;
      try {
        const clase = await this.obtener(entrada.name);
        resumenes.push({
          carpeta: entrada.name,
          titulo: clase.titulo,
          modificado: clase.modificado,
          scaffold: clase.scaffold?.nombre ?? null,
        });
      } catch {
        continue;
      }
    }
    resumenes.sort((a, b) => b.modificado.localeCompare(a.modificado));
    return resumenes;
  }

  async obtener(carpeta: string): Promise<ClaseSalman> {
    validarNombreSimple(carpeta);
    const ruta = path.join(this.base, carpeta, ARCHIVO_CLASE);
    let json: string;
    try {
      json = await fs.readFile(ruta, "utf8");
    } catch {
      throw new ProyectoNoExiste(`No existe ${ruta}`);
    }
    return leerClase(json);
  }

  async crear(clase: ClaseSalman): Promise<string> {
    await fs.mkdir(this.base, { recursive: true });
    const nombre = nombreCarpeta(clase.titulo);
    let carpeta = nombre;
    for (let n = 2; ; n++) {
      try {
        await fs.mkdir(path.join(this.base, carpeta));
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        carpeta = `${nombre} (${n})`;
      }
    }
    await fs.mkdir(path.join(this.base, carpeta, CARPETA_RECURSOS));
    await this.guardar(carpeta, clase);
    return carpeta;
  }

  async guardar(carpeta: string, clase: ClaseSalman): Promise<void> {
    validarNombreSimple(carpeta);
    const directorio = path.join(this.base, carpeta);
    try {
      await fs.access(directorio);
    } catch {
      throw new ProyectoNoExiste(`No existe el proyecto ${carpeta}`);
    }
    await fs.writeFile(path.join(directorio, ARCHIVO_CLASE), escribirClase(clase), "utf8");
  }

  async borrar(carpeta: string): Promise<void> {
    validarNombreSimple(carpeta);
    await this.verificarProyecto(carpeta);
    await fs.rm(path.join(this.base, carpeta), { recursive: true });
  }

  async escribirRecurso(
    carpeta: string,
    nombre: string,
    datos: string | Uint8Array,
  ): Promise<void> {
    validarNombreSimple(carpeta);
    validarNombreSimple(nombre);
    await this.verificarProyecto(carpeta);
    const directorio = path.join(this.base, carpeta, CARPETA_RECURSOS);
    await fs.mkdir(directorio, { recursive: true });
    await fs.writeFile(path.join(directorio, nombre), datos);
  }

  async escribirRecursoUnico(
    carpeta: string,
    nombre: string,
    datos: Uint8Array,
  ): Promise<string> {
    validarNombreSimple(carpeta);
    validarNombreSimple(nombre);
    await this.verificarProyecto(carpeta);
    const directorio = path.join(this.base, carpeta, CARPETA_RECURSOS);
    await fs.mkdir(directorio, { recursive: true });

    const punto = nombre.lastIndexOf(".");
    const tallo = punto > 0 ? nombre.slice(0, punto) : nombre;
    const extension = punto > 0 ? nombre.slice(punto) : "";
    let final = nombre;
    for (let n = 2; ; n++) {
      try {
        await fs.writeFile(path.join(directorio, final), datos, { flag: "wx" });
        return final;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        final = `${tallo} (${n})${extension}`;
      }
    }
  }

  async listarRecursos(carpeta: string): Promise<string[]> {
    validarNombreSimple(carpeta);
    await this.verificarProyecto(carpeta);
    try {
      const entradas = await fs.readdir(path.join(this.base, carpeta, CARPETA_RECURSOS), {
        withFileTypes: true,
      });
      return entradas
        .filter((entrada) => entrada.isFile() && !entrada.name.startsWith("."))
        .map((entrada) => entrada.name)
        .sort((a, b) => a.localeCompare(b, "es"));
    } catch {
      return [];
    }
  }

  async leerRecurso(carpeta: string, nombre: string): Promise<Uint8Array> {
    validarNombreSimple(carpeta);
    validarNombreSimple(nombre);
    try {
      return await fs.readFile(path.join(this.base, carpeta, CARPETA_RECURSOS, nombre));
    } catch {
      throw new RecursoNoExiste(`No existe el recurso ${nombre}`);
    }
  }

  private async verificarProyecto(carpeta: string): Promise<void> {
    try {
      await fs.access(path.join(this.base, carpeta, ARCHIVO_CLASE));
    } catch {
      throw new ProyectoNoExiste(`No existe el proyecto ${carpeta}`);
    }
  }
}
