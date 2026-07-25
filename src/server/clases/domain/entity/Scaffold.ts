import type { Bloque } from "./Clase";

export interface DefinicionScaffold {
  id: string;
  nombre: string;
  version: number;
  descripcion: string;
  modelo?: string;
  metodo?: string;
  semilla(): Bloque[];
}
