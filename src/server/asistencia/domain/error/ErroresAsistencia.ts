export class RespuestaLLMInvalida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "RespuestaLLMInvalida";
  }
}

export class ProveedorLLMNoDisponible extends Error {
  constructor(mensaje: string, causa?: unknown) {
    super(mensaje, { cause: causa });
    this.name = "ProveedorLLMNoDisponible";
  }
}

export class RespuestaAsistenteInvalida extends RespuestaLLMInvalida {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "RespuestaAsistenteInvalida";
  }
}
