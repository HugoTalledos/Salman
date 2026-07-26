import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { api } from "./api";

const respuesta = (cuerpo: unknown) => new Response(JSON.stringify(cuerpo));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("solicita los catálogos de metadatos de clase", async () => {
    const fetch = vi.fn().mockResolvedValue(respuesta({
      materias: ["Matemáticas"],
      grados: ["5.º"],
    }));
    vi.stubGlobal("fetch", fetch);

    await api.listarCatalogosClase();

    expect(fetch).toHaveBeenCalledWith("/api/catalogos/clase");
  });

  it("consulta objetivos con el contexto codificado", async () => {
    const fetch = vi.fn().mockResolvedValue(respuesta({ objetivos: ["Comparar fracciones"] }));
    vi.stubGlobal("fetch", fetch);

    await api.listarObjetivos({
      materia: "Matemáticas",
      grado: "5.º",
      titulo: "Fracciones",
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/objetivos?materia=Matem%C3%A1ticas&grado=5.%C2%BA&titulo=Fracciones",
    );
  });

  it("omite los parámetros opcionales vacíos al consultar objetivos", async () => {
    const fetch = vi.fn().mockResolvedValue(respuesta({ objetivos: [] }));
    vi.stubGlobal("fetch", fetch);

    await api.listarObjetivos({ materia: "Matemáticas", grado: "", titulo: "" });

    expect(fetch).toHaveBeenCalledWith("/api/objetivos?materia=Matem%C3%A1ticas");
  });

  it("incluye los metadatos al crear un proyecto", async () => {
    const fetch = vi.fn().mockResolvedValue(respuesta({ carpeta: "fracciones", clase: {} }));
    vi.stubGlobal("fetch", fetch);

    await api.crearProyecto("Fracciones", null, {
      materia: "Matemáticas",
      grado: "5.º",
      objetivos: ["Comparar fracciones"],
    });

    expect(JSON.parse((fetch as Mock).mock.calls[0][1].body)).toEqual({
      titulo: "Fracciones",
      scaffoldId: null,
      metadatos: {
        materia: "Matemáticas",
        grado: "5.º",
        objetivos: ["Comparar fracciones"],
      },
    });
  });
});
