export interface SubirRecurso {
  ejecutar(entrada: {
    carpeta: string;
    nombre: string;
    tipo: string;
    datos: Uint8Array;
  }): Promise<{ recurso: string }>;
}
