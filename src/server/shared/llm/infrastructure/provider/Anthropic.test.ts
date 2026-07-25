import type Anthropic from "@anthropic-ai/sdk";
import type { ClientOptions } from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { crearProveedorAnthropic } from "./Anthropic";

afterEach(() => {
  vi.unstubAllEnvs();
});

function crearClienteFake(
  opciones: ClientOptions[],
  peticiones: unknown[],
): (configuracion: ClientOptions) => Anthropic {
  return (configuracion) => {
    opciones.push(configuracion);
    return {
      messages: {
        create: async (peticion: unknown) => {
          peticiones.push(peticion);
          return {
            stop_reason: "end_turn",
            content: [{ type: "text", text: "ok" }],
          };
        },
      },
    } as Anthropic;
  };
}

describe("crearProveedorAnthropic", () => {
  it("inyecta credenciales y modelo desde el entorno recibido", async () => {
    const opciones: ClientOptions[] = [];
    const peticiones: unknown[] = [];
    const proveedor = crearProveedorAnthropic(
      {
        ANTHROPIC_API_KEY: "api-inyectada",
        ANTHROPIC_AUTH_TOKEN: "token-inyectado",
        SALMAN_LLM_MODELO: "modelo-inyectado",
      },
      crearClienteFake(opciones, peticiones),
    );
    await proveedor.completar({
      sistema: "Sistema",
      mensajes: [{ rol: "usuario", contenido: "Pregunta" }],
    });

    expect(opciones).toEqual([
      {
        apiKey: "api-inyectada",
        authToken: "token-inyectado",
      },
    ]);
    expect(peticiones).toMatchObject([{ model: "modelo-inyectado" }]);
  });

  it("usa process.env y conserva el modelo por defecto", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "api-global");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "token-global");
    vi.stubEnv("SALMAN_LLM_MODELO", undefined);
    const opciones: ClientOptions[] = [];
    const peticiones: unknown[] = [];

    const proveedor = crearProveedorAnthropic(
      undefined,
      crearClienteFake(opciones, peticiones),
    );
    await proveedor.completar({
      sistema: "Sistema",
      mensajes: [{ rol: "usuario", contenido: "Pregunta" }],
    });

    expect(opciones).toEqual([
      { apiKey: "api-global", authToken: "token-global" },
    ]);
    expect(peticiones).toMatchObject([{ model: "claude-opus-4-8" }]);
  });
});
