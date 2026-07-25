import type { ClaseSalman } from "../entity/Clase";

export interface ResumenProyecto {
  carpeta: string;
  titulo: string;
  modificado: string;
  scaffold: string | null;
}

export interface ProyectoRepository {
  listar(): Promise<ResumenProyecto[]>;
  obtener(carpeta: string): Promise<ClaseSalman>;
  crear(clase: ClaseSalman): Promise<string>;
  guardar(carpeta: string, clase: ClaseSalman): Promise<void>;
  borrar(carpeta: string): Promise<void>;
  escribirRecurso(carpeta: string, nombre: string, datos: string | Uint8Array): Promise<void>;
  escribirRecursoUnico(carpeta: string, nombre: string, datos: Uint8Array): Promise<string>;
  listarRecursos(carpeta: string): Promise<string[]>;
  leerRecurso(carpeta: string, nombre: string): Promise<Uint8Array>;
}
