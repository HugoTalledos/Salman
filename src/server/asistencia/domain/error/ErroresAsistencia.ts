export class RespuestaLLMInvalida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "RespuestaLLMInvalida";
  }
}

export class RespuestaAsistenteInvalida extends RespuestaLLMInvalida {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "RespuestaAsistenteInvalida";
  }
}
