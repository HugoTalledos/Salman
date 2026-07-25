export class RespuestaAsistenteInvalida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "RespuestaAsistenteInvalida";
  }
}
