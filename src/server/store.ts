import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ClaseSalman, escribirClase, leerClase } from "../schema/clase";

/**
 * Persistencia de proyectos en disco. Cada proyecto es una carpeta:
 *
 *   <base>/Nombre de la clase/
 *   ├── clase.salman      ← el fuente
 *   └── recursos/          ← materiales generados o subidos
 *
 * La carpeta (su nombre) es el identificador del proyecto en la API.
 * `base` siempre se recibe como parámetro para que las pruebas trabajen
 * sobre un directorio temporal.
 */

export const ARCHIVO_CLASE = "clase.salman";
export const CARPETA_RECURSOS = "recursos";

export function dirBasePorDefecto(): string {
  return path.join(os.homedir(), "Documents", "Salman");
}

export interface ResumenProyecto {
  carpeta: string;
  titulo: string;
  modificado: string;
  scaffold: string | null;
}

/** Nombre de carpeta seguro derivado del título de la clase. */
export function nombreCarpeta(titulo: string): string {
  const limpio = titulo
    .replace(/[/\\:\0]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  return limpio || "Clase sin título";
}

/** Rechaza identificadores que no sean un nombre simple de archivo o carpeta. */
function validarNombreSimple(nombre: string): void {
  if (
    nombre !== path.basename(nombre) ||
    nombre === "" ||
    nombre === ".." ||
    nombre.startsWith(".")
  ) {
    throw new ErrorStore("carpeta-invalida", `Nombre inválido: ${nombre}`);
  }
}

const validarCarpeta = validarNombreSimple;

export class ErrorStore extends Error {
  codigo: "carpeta-invalida" | "no-existe";

  constructor(codigo: "carpeta-invalida" | "no-existe", mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
  }
}

export async function listarProyectos(base: string): Promise<ResumenProyecto[]> {
  let entradas;
  try {
    entradas = await fs.readdir(base, { withFileTypes: true });
  } catch {
    return []; // la base aún no existe: no hay proyectos
  }
  const resumenes: ResumenProyecto[] = [];
  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;
    try {
      const clase = await leerProyecto(base, entrada.name);
      resumenes.push({
        carpeta: entrada.name,
        titulo: clase.titulo,
        modificado: clase.modificado,
        scaffold: clase.scaffold?.nombre ?? null,
      });
    } catch {
      continue; // carpeta ajena o corrupta: se ignora, no se rompe el listado
    }
  }
  resumenes.sort((a, b) => b.modificado.localeCompare(a.modificado));
  return resumenes;
}

export async function leerProyecto(base: string, carpeta: string): Promise<ClaseSalman> {
  validarCarpeta(carpeta);
  const ruta = path.join(base, carpeta, ARCHIVO_CLASE);
  let json: string;
  try {
    json = await fs.readFile(ruta, "utf8");
  } catch {
    throw new ErrorStore("no-existe", `No existe ${ruta}`);
  }
  return leerClase(json);
}

export async function guardarProyecto(
  base: string,
  carpeta: string,
  clase: ClaseSalman,
): Promise<void> {
  validarCarpeta(carpeta);
  const dir = path.join(base, carpeta);
  try {
    await fs.access(dir);
  } catch {
    throw new ErrorStore("no-existe", `No existe el proyecto ${carpeta}`);
  }
  await fs.writeFile(path.join(dir, ARCHIVO_CLASE), escribirClase(clase), "utf8");
}

/** Escribe un archivo dentro de recursos/ del proyecto. */
export async function escribirRecurso(
  base: string,
  carpeta: string,
  nombre: string,
  datos: string | Uint8Array,
): Promise<void> {
  validarCarpeta(carpeta);
  validarNombreSimple(nombre);
  const dir = path.join(base, carpeta, CARPETA_RECURSOS);
  try {
    await fs.access(path.join(base, carpeta, ARCHIVO_CLASE));
  } catch {
    throw new ErrorStore("no-existe", `No existe el proyecto ${carpeta}`);
  }
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, nombre), datos);
}

/**
 * Escribe un archivo nuevo en recursos/ sin pisar ninguno existente:
 * ante colisión de nombre agrega " (n)" antes de la extensión.
 * Devuelve el nombre con el que quedó guardado.
 */
export async function escribirRecursoUnico(
  base: string,
  carpeta: string,
  nombre: string,
  datos: Uint8Array,
): Promise<string> {
  validarCarpeta(carpeta);
  validarNombreSimple(nombre);
  try {
    await fs.access(path.join(base, carpeta, ARCHIVO_CLASE));
  } catch {
    throw new ErrorStore("no-existe", `No existe el proyecto ${carpeta}`);
  }
  const dir = path.join(base, carpeta, CARPETA_RECURSOS);
  await fs.mkdir(dir, { recursive: true });

  const punto = nombre.lastIndexOf(".");
  const tallo = punto > 0 ? nombre.slice(0, punto) : nombre;
  const extension = punto > 0 ? nombre.slice(punto) : "";
  let final = nombre;
  for (let n = 2; ; n++) {
    try {
      await fs.writeFile(path.join(dir, final), datos, { flag: "wx" });
      return final;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      final = `${tallo} (${n})${extension}`;
    }
  }
}

/** Lista los archivos de recursos/ del proyecto, ordenados por nombre. */
export async function listarRecursos(base: string, carpeta: string): Promise<string[]> {
  validarCarpeta(carpeta);
  try {
    await fs.access(path.join(base, carpeta, ARCHIVO_CLASE));
  } catch {
    throw new ErrorStore("no-existe", `No existe el proyecto ${carpeta}`);
  }
  let entradas;
  try {
    entradas = await fs.readdir(path.join(base, carpeta, CARPETA_RECURSOS), {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  return entradas
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "es"));
}

/** Lee un archivo de recursos/ del proyecto. */
export async function leerRecurso(
  base: string,
  carpeta: string,
  nombre: string,
): Promise<Buffer> {
  validarCarpeta(carpeta);
  validarNombreSimple(nombre);
  try {
    return await fs.readFile(path.join(base, carpeta, CARPETA_RECURSOS, nombre));
  } catch {
    throw new ErrorStore("no-existe", `No existe el recurso ${nombre}`);
  }
}

/**
 * Crea la carpeta del proyecto (con sufijo " (n)" si el nombre ya existe),
 * escribe el fuente y deja lista `recursos/`. Devuelve el nombre de carpeta.
 */
export async function crearProyecto(base: string, clase: ClaseSalman): Promise<string> {
  await fs.mkdir(base, { recursive: true });
  const nombre = nombreCarpeta(clase.titulo);
  let carpeta = nombre;
  for (let n = 2; ; n++) {
    try {
      await fs.mkdir(path.join(base, carpeta));
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      carpeta = `${nombre} (${n})`;
    }
  }
  await fs.mkdir(path.join(base, carpeta, CARPETA_RECURSOS));
  await guardarProyecto(base, carpeta, clase);
  return carpeta;
}
