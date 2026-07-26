import { describe, expect, it } from "vitest";
import { catalogoMetadatosClase } from "./CatalogoMetadatosClaseEstatico";

describe("CatalogoMetadatosClaseEstatico", () => {
  it("expone el catálogo cerrado de materias y grados", () => {
    expect(catalogoMetadatosClase.listarMaterias()).toEqual([
      "Matemáticas",
      "Lengua Castellana",
      "Ciencias Naturales",
      "Ciencias Sociales",
      "Inglés",
      "Tecnología e Informática",
      "Educación Artística",
      "Educación Física",
      "Ética y Valores",
    ]);
    expect(catalogoMetadatosClase.listarGrados()).toEqual([
      "Preescolar", "1.º", "2.º", "3.º", "4.º", "5.º", "6.º",
      "7.º", "8.º", "9.º", "10.º", "11.º",
    ]);
  });

  it("devuelve objetivos por materia y no reconoce materias externas", () => {
    expect(catalogoMetadatosClase.listarObjetivos({
      materia: "Matemáticas",
      grado: "5.º",
      titulo: "Fracciones",
    })).toContain("Resolver problemas aplicando conceptos matemáticos");
    expect(catalogoMetadatosClase.listarObjetivos({ materia: "Astronomía" }))
      .toBeUndefined();
  });
});
