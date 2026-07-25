import { afterEach, describe, expect, it, vi } from "vitest";
import { crearProveedorOpenAICompatible } from "./OpenAICompatible";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function prepararProveedor() {
  vi.stubEnv("SALMAN_LLM_MODELO", "gemma4:e4b");
  vi.stubEnv("SALMAN_LLM_URL", "http://localhost:11434/v1");
  const peticiones: RequestInit[] = [];
  vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
    peticiones.push(init ?? {});
    return new Response(JSON.stringify({
      choices: [{ message: { content: "{\"tipo\":\"informativa\",\"mensaje\":\"ok\"}" } }],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  return { proveedor: crearProveedorOpenAICompatible(), peticiones };
}

function cuerpoEnviado(peticiones: RequestInit[]) {
  return JSON.parse(String(peticiones[0].body)) as Record<string, unknown>;
}

describe("crearProveedorOpenAICompatible", () => {
  it("traduce el formato JSON a response_format", async () => {
    const { proveedor, peticiones } = prepararProveedor();

    await proveedor.completar({
      sistema: "Sistema",
      mensajes: [{ rol: "usuario", contenido: "Pregunta" }],
      formato: "json",
    });

    expect(cuerpoEnviado(peticiones)).toMatchObject({
      response_format: { type: "json_object" },
    });
  });

  it("omite response_format cuando no se solicita JSON", async () => {
    const { proveedor, peticiones } = prepararProveedor();

    await proveedor.completar({
      sistema: "Sistema",
      mensajes: [{ rol: "usuario", contenido: "Pregunta" }],
    });

    expect(cuerpoEnviado(peticiones)).not.toHaveProperty("response_format");
  });
});
