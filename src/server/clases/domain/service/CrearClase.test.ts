import { describe, expect, it } from "vitest";
import { ClaseSalman } from "../entity/Clase";
import { catalogoScaffolds } from "../../infrastructure/scaffold/CatalogoScaffolds";
import { crearClase } from "./CrearClase";

const scaffolds = catalogoScaffolds.listar();
const obtenerScaffold = (id: string) => catalogoScaffolds.obtener(id);

describe("catálogo", () => {
  it("expone el scaffold Inicio / Desarrollo / Cierre", () => {
    expect(obtenerScaffold("inicio-desarrollo-cierre")?.nombre).toBe(
      "Inicio / Desarrollo / Cierre",
    );
    expect(obtenerScaffold("inexistente")).toBeUndefined();
  });

  it("la semilla de cada scaffold produce una clase válida contra el esquema", () => {
    for (const scaffold of scaffolds) {
      const clase = crearClase("Prueba", scaffold);
      expect(() => ClaseSalman.parse(clase)).not.toThrow();
    }
  });
});

describe("crearClase con scaffold", () => {
  const scaffold = obtenerScaffold("inicio-desarrollo-cierre")!;

  it("estampa la identidad completa del scaffold, incluidos modelo y método", () => {
    const clase = crearClase("Los estados del agua", scaffold);
    expect(clase.scaffold).toEqual({
      id: "inicio-desarrollo-cierre",
      nombre: "Inicio / Desarrollo / Cierre",
      version: 1,
      modelo: "socioconstructivista",
      metodo: "PBL (aprendizaje basado en problemas)",
    });
  });

  it("puebla la semilla: tres fases con notas guía y placeholders", () => {
    const clase = crearClase("Prueba", scaffold);
    const fases = clase.bloques.filter((b) => b.tipo === "fase");
    expect(fases.map((f) => f.titulo)).toEqual(["Inicio", "Desarrollo", "Cierre"]);
    for (const fase of fases) {
      expect(fase.bloques.some((b) => b.tipo === "nota")).toBe(true);
    }
    const hijos = fases.flatMap((f) => f.bloques);
    expect(hijos.some((b) => b.target === "material")).toBe(true);
  });

  it("genera IDs frescos en cada creación", () => {
    const a = crearClase("A", scaffold);
    const b = crearClase("B", scaffold);
    expect(a.id).not.toBe(b.id);
    expect(a.bloques[0].id).not.toBe(b.bloques[0].id);
  });
});

describe("crearClase en blanco", () => {
  it("no tiene scaffold ni bloques", () => {
    const clase = crearClase("Clase libre", null);
    expect(clase.scaffold).toBeNull();
    expect(clase.bloques).toEqual([]);
    expect(() => ClaseSalman.parse(clase)).not.toThrow();
  });

  it("conserva los metadatos indicados", () => {
    const metadatos = {
      materia: "Matemáticas",
      grado: "5.º",
      objetivos: ["Comparar fracciones"],
    };

    expect(crearClase("Fracciones", null, metadatos).metadatos).toEqual(metadatos);
  });
});
