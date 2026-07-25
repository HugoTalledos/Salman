import { describe, expect, it } from "vitest";
import { nombreCarpeta } from "./store";

describe("nombreCarpeta", () => {
  it("limpia separadores de ruta y espacios", () => {
    expect(nombreCarpeta("  Fracciones: parte/todo \\ repaso  ")).toBe(
      "Fracciones parte todo repaso",
    );
  });

  it("no produce nombres vacíos ni ocultos", () => {
    expect(nombreCarpeta("///")).toBe("Clase sin título");
    expect(nombreCarpeta("...sigilosa")).toBe("sigilosa");
  });
});
