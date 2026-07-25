import { describe, expect, it } from "vitest";
import { z } from "zod";
import type {
  MensajeConsulta,
  ResponderConsulta,
} from "../../application/useCase/ResponderConsulta";
import { RespuestaLLMInvalida } from "../../domain/error/ErroresAsistencia";
import { crearRutasAsistencia } from "./RutasAsistencia";

const json = <T>(respuesta: Response) => respuesta.json() as Promise<T>;

class ResponderFake implements ResponderConsulta {
  readonly entradas: {
    carpeta: string;
    mensajes: MensajeConsulta[];
  }[] = [];
  private readonly ejecutarFake: ResponderConsulta["ejecutar"];

  constructor(
    ejecutarFake: ResponderConsulta["ejecutar"] = async () => ({
      tipo: "informativa",
      mensaje: "Todo bien.",
    }),
  ) {
    this.ejecutarFake = ejecutarFake;
  }

  ejecutar(
    entrada: Parameters<ResponderConsulta["ejecutar"]>[0],
  ): ReturnType<ResponderConsulta["ejecutar"]> {
    this.entradas.push(entrada);
    return this.ejecutarFake(entrada);
  }
}

function crearPeticion(
  mensajes: unknown,
  carpeta = "Mi clase",
): Request {
  return new Request(
    `http://localhost/api/proyectos/${encodeURIComponent(carpeta)}/asistente`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mensajes }),
    },
  );
}

function crearRutas(
  responder: ResponderConsulta | null,
  errorConfiguracion = "Configuración LLM ausente",
) {
  let resoluciones = 0;
  const rutas = crearRutasAsistencia({
    obtenerResponderConsulta() {
      resoluciones += 1;
      return responder;
    },
    obtenerErrorConfiguracion() {
      return errorConfiguracion;
    },
  });
  return { rutas, resoluciones: () => resoluciones };
}

describe("crearRutasAsistencia", () => {
  it("valida y transforma el DTO sin anotar los bloques en HTTP", async () => {
    const responder = new ResponderFake();
    const { rutas, resoluciones } = crearRutas(responder);
    const mensajes = [
      {
        rol: "usuario",
        contenido: "¿Mejoras esta nota?",
        bloques: ["1a2b3c4d-0000-4000-8000-000000000002"],
      },
    ];

    expect(resoluciones()).toBe(0);
    const respuesta = await rutas.request(crearPeticion(mensajes));

    expect(respuesta.status).toBe(200);
    expect(await json<object>(respuesta)).toEqual({
      tipo: "informativa",
      mensaje: "Todo bien.",
    });
    expect(resoluciones()).toBe(1);
    expect(responder.entradas).toEqual([
      { carpeta: "Mi clase", mensajes },
    ]);
  });

  it.each([
    ["ningún mensaje", []],
    [
      "más de 60 mensajes",
      Array.from({ length: 61 }, () => ({
        rol: "usuario",
        contenido: "hola",
      })),
    ],
    [
      "contenido vacío",
      [{ rol: "usuario", contenido: "" }],
    ],
    [
      "más de 10 bloques",
      [{
        rol: "usuario",
        contenido: "hola",
        bloques: Array.from(
          { length: 11 },
          (_, indice) =>
            `1a2b3c4d-0000-4000-8000-${String(indice).padStart(12, "0")}`,
        ),
      }],
    ],
    [
      "un bloque que no es UUID",
      [{ rol: "usuario", contenido: "hola", bloques: ["bloque-1"] }],
    ],
  ])("responde 400 ante %s", async (_caso, mensajes) => {
    const { rutas } = crearRutas(new ResponderFake());

    const respuesta = await rutas.request(crearPeticion(mensajes));

    expect(respuesta.status).toBe(400);
    expect(await json<{ error: string }>(respuesta)).toMatchObject({
      error: "Documento inválido",
    });
  });

  it("acepta exactamente 60 mensajes y 10 bloques seleccionados", async () => {
    const responder = new ResponderFake();
    const { rutas } = crearRutas(responder);
    const mensajes = Array.from(
      { length: 60 },
      (_, indice) => ({
        rol: "usuario" as const,
        contenido: `Mensaje ${indice + 1}`,
        bloques: indice === 0
          ? Array.from(
              { length: 10 },
              (_, bloque) =>
                `1a2b3c4d-0000-4000-8000-${String(bloque).padStart(12, "0")}`,
            )
          : undefined,
      }),
    );

    const respuesta = await rutas.request(crearPeticion(mensajes));

    expect(respuesta.status).toBe(200);
    expect(responder.entradas[0].mensajes).toHaveLength(60);
    expect(responder.entradas[0].mensajes[0].bloques).toHaveLength(10);
  });

  it("responde 502 con el motivo cuando falla el asistente", async () => {
    const responder = new ResponderFake(async () => {
      throw new RespuestaLLMInvalida(
        "El modelo no produjo una respuesta estructurada válida",
      );
    });
    const { rutas } = crearRutas(responder);

    const respuesta = await rutas.request(
      crearPeticion([{ rol: "usuario", contenido: "hola" }]),
    );

    expect(respuesta.status).toBe(502);
    expect(await json<object>(respuesta)).toEqual({
      error:
        "El asistente no pudo responder: " +
        "El modelo no produjo una respuesta estructurada válida",
    });
  });

  it("conserva el 400 cuando el proyecto en disco viola su esquema", async () => {
    const responder = new ResponderFake(async () => {
      z.object({ formato: z.literal("salman") }).parse({ formato: "otro" });
      throw new Error("inalcanzable");
    });
    const { rutas } = crearRutas(responder);

    const respuesta = await rutas.request(
      crearPeticion([{ rol: "usuario", contenido: "hola" }]),
    );

    expect(respuesta.status).toBe(400);
    expect(await json<{ error: string }>(respuesta)).toMatchObject({
      error: "Documento inválido",
    });
  });

  it("responde 503 con el error exacto de configuración si no hay caso de uso", async () => {
    const mensaje =
      "El asistente no está configurado. Define ANTHROPIC_API_KEY " +
      "(o SALMAN_LLM=openai con su configuración) y reinicia el servidor.";
    const { rutas, resoluciones } = crearRutas(null, mensaje);

    expect(resoluciones()).toBe(0);
    const respuesta = await rutas.request(
      crearPeticion([{ rol: "usuario", contenido: "hola" }]),
    );

    expect(respuesta.status).toBe(503);
    expect(await json<object>(respuesta)).toEqual({ error: mensaje });
    expect(resoluciones()).toBe(1);
  });
});
