import { describe, expect, it } from "vitest";
import { claseEjemplo } from "../../../../testing/fixtures";
import type { ClaseSalman } from "../../../clases/domain/entity/Clase";
import type {
  ProyectoRepository,
  ResumenProyecto,
} from "../../../clases/domain/repository/ProyectoRepository";
import type {
  PeticionLLM,
  ProveedorLLM,
} from "../../../shared/llm/application/port/ProveedorLLM";
import type { SerializadorPrompt } from "../port/SerializadorPrompt";
import { RespuestaLLMInvalida } from "../../domain/error/ErroresAsistencia";
import { POLITICA_ASISTENTE } from "../../domain/policy/PoliticaAsistente";
import { ResponderConsultaImpl } from "./ResponderConsultaImpl";

const MENSAJE_REPARACION =
  "Tu respuesta anterior no cumple el contrato. Devuelve únicamente JSON válido, " +
  "sin Markdown ni explicación, con exactamente tres acciones, exactamente un bloque " +
  "nuevo por acción, contenido de máximo 100 caracteres, UUID v4 nuevos y únicos para " +
  "cada acción y bloque, y anclas que sean IDs existentes del fuente. Conserva la " +
  "intención de la respuesta.";

class RepositorioFake implements ProyectoRepository {
  carpetasObtenidas: string[] = [];
  private readonly clase: ClaseSalman;

  constructor(clase: ClaseSalman) {
    this.clase = clase;
  }

  async obtener(carpeta: string): Promise<ClaseSalman> {
    this.carpetasObtenidas.push(carpeta);
    return this.clase;
  }

  async listar(): Promise<ResumenProyecto[]> {
    return [];
  }

  async crear(): Promise<string> {
    throw new Error("No implementado en este fake");
  }

  async guardar(): Promise<void> {
    throw new Error("No implementado en este fake");
  }

  async borrar(): Promise<void> {}

  async escribirRecurso(): Promise<void> {
    throw new Error("No implementado en este fake");
  }

  async escribirRecursoUnico(): Promise<string> {
    throw new Error("No implementado en este fake");
  }

  async listarRecursos(): Promise<string[]> {
    throw new Error("No implementado en este fake");
  }

  async leerRecurso(): Promise<Uint8Array> {
    throw new Error("No implementado en este fake");
  }
}

class ProveedorFake implements ProveedorLLM {
  readonly id = "fake";
  readonly peticiones: PeticionLLM[] = [];
  private readonly respuestas: (Error | string)[];

  constructor(respuestas: (Error | string)[]) {
    this.respuestas = respuestas;
  }

  async completar(peticion: PeticionLLM): Promise<string> {
    this.peticiones.push(peticion);
    const respuesta = this.respuestas.shift() ?? "";
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  }
}

class SerializadorFake implements SerializadorPrompt {
  readonly entradas: Parameters<SerializadorPrompt["serializar"]>[] = [];

  serializar(
    ...entrada: Parameters<SerializadorPrompt["serializar"]>
  ): string {
    this.entradas.push(entrada);
    return "sistema serializado";
  }
}

function preparar(respuestas: (Error | string)[]) {
  const repositorio = new RepositorioFake(claseEjemplo);
  const proveedor = new ProveedorFake(respuestas);
  const serializador = new SerializadorFake();
  const casoDeUso = new ResponderConsultaImpl(
    repositorio,
    proveedor,
    serializador,
  );
  return { casoDeUso, proveedor, repositorio, serializador };
}

describe("ResponderConsultaImpl", () => {
  it("obtiene la clase, serializa la política y devuelve la primera respuesta válida", async () => {
    const { casoDeUso, proveedor, repositorio, serializador } = preparar([
      JSON.stringify({ tipo: "informativa", mensaje: "Todo bien." }),
    ]);

    await expect(
      casoDeUso.ejecutar({
        carpeta: "Los estados del agua",
        mensajes: [{ rol: "usuario", contenido: "¿Está completa?" }],
      }),
    ).resolves.toEqual({ tipo: "informativa", mensaje: "Todo bien." });

    expect(repositorio.carpetasObtenidas).toEqual(["Los estados del agua"]);
    expect(serializador.entradas).toEqual([
      [POLITICA_ASISTENTE, claseEjemplo],
    ]);
    expect(proveedor.peticiones).toEqual([
      {
        sistema: "sistema serializado",
        mensajes: [{ rol: "usuario", contenido: "¿Está completa?" }],
        formato: "json",
      },
    ]);
  });

  it("añade la salida inválida y el mensaje exacto de reparación antes del segundo intento", async () => {
    const { casoDeUso, proveedor } = preparar([
      "no es json",
      JSON.stringify({ tipo: "informativa", mensaje: "Corregida." }),
    ]);

    await expect(
      casoDeUso.ejecutar({
        carpeta: "clase",
        mensajes: [{ rol: "usuario", contenido: "¿Está completa?" }],
      }),
    ).resolves.toEqual({ tipo: "informativa", mensaje: "Corregida." });

    expect(proveedor.peticiones).toEqual([
      {
        sistema: "sistema serializado",
        mensajes: [{ rol: "usuario", contenido: "¿Está completa?" }],
        formato: "json",
      },
      {
        sistema: "sistema serializado",
        mensajes: [
          { rol: "usuario", contenido: "¿Está completa?" },
          { rol: "asistente", contenido: "no es json" },
          { rol: "usuario", contenido: MENSAJE_REPARACION },
        ],
        formato: "json",
      },
    ]);
  });

  it("lanza RespuestaLLMInvalida después de dos salidas inválidas", async () => {
    const { casoDeUso, proveedor } = preparar(["mal", "también mal"]);

    await expect(
      casoDeUso.ejecutar({
        carpeta: "clase",
        mensajes: [{ rol: "usuario", contenido: "Sugiere una actividad" }],
      }),
    ).rejects.toEqual(
      new RespuestaLLMInvalida(
        "El modelo no produjo una respuesta estructurada válida",
      ),
    );
    expect(proveedor.peticiones).toHaveLength(2);
  });

  it("tipifica exclusivamente un fallo del proveedor", async () => {
    const { casoDeUso, proveedor } = preparar([new Error("sin cuota")]);

    await expect(
      casoDeUso.ejecutar({
        carpeta: "clase",
        mensajes: [{ rol: "usuario", contenido: "¿Está completa?" }],
      }),
    ).rejects.toMatchObject({
      name: "ProveedorLLMNoDisponible",
      message: "sin cuota",
    });
    expect(proveedor.peticiones).toHaveLength(1);
  });

  it("anota los bloques seleccionados en su turno y conserva la anotación al reparar", async () => {
    const { casoDeUso, proveedor } = preparar([
      "mal",
      JSON.stringify({ tipo: "informativa", mensaje: "Corregida." }),
    ]);
    const mensajes = [
      {
        rol: "usuario" as const,
        contenido: "¿Mejoras esta nota?",
        bloques: [
          "1a2b3c4d-0000-4000-8000-000000000002",
          "1a2b3c4d-0000-4000-8000-000000000003",
        ],
      },
      {
        rol: "asistente" as const,
        contenido: "¿Qué aspecto quieres mejorar?",
        bloques: ["1a2b3c4d-0000-4000-8000-000000000004"],
      },
      { rol: "usuario" as const, contenido: "La claridad" },
    ];

    await casoDeUso.ejecutar({ carpeta: "clase", mensajes });

    const historialAnotado = [
      {
        rol: "usuario" as const,
        contenido:
          "[El profesor señala los bloques con id: " +
          "1a2b3c4d-0000-4000-8000-000000000002, " +
          "1a2b3c4d-0000-4000-8000-000000000003]\n" +
          "¿Mejoras esta nota?",
      },
      {
        rol: "asistente" as const,
        contenido: "¿Qué aspecto quieres mejorar?",
      },
      { rol: "usuario" as const, contenido: "La claridad" },
    ];
    expect(proveedor.peticiones[0].mensajes).toEqual(historialAnotado);
    expect(proveedor.peticiones[1].mensajes).toEqual([
      ...historialAnotado,
      { rol: "asistente", contenido: "mal" },
      { rol: "usuario", contenido: MENSAJE_REPARACION },
    ]);
    expect(mensajes[0].contenido).toBe("¿Mejoras esta nota?");
  });
});
