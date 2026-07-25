export type CodigoRecursoInvalido = "tamano" | "extension" | "nombre";

export class RecursoInvalido extends Error {
  readonly codigo: CodigoRecursoInvalido;

  constructor(codigo: CodigoRecursoInvalido, mensaje: string) {
    super(mensaje);
    this.name = "RecursoInvalido";
    this.codigo = codigo;
  }
}
