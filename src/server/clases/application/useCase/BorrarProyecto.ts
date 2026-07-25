export interface BorrarProyecto {
  ejecutar(carpeta: string): Promise<void>;
}
