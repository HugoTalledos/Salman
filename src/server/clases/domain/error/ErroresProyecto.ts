export class NombreProyectoInvalido extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "NombreProyectoInvalido";
  }
}

export class ProyectoNoExiste extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ProyectoNoExiste";
  }
}

export class RecursoNoExiste extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "RecursoNoExiste";
  }
}
