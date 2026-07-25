export interface ListarRecursos {
  ejecutar(carpeta: string): Promise<string[]>;
}
