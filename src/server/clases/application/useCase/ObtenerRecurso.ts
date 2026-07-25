export interface ObtenerRecurso {
  ejecutar(
    carpeta: string,
    nombre: string,
  ): Promise<{ datos: Uint8Array; tipoContenido: string }>;
}
