export class RecursoInvalido extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "RecursoInvalido";
  }
}
