import { describe, expect, it } from "vitest";
import { inlineDesdeMd, mdDesdeInline, textoPlano } from "./inline";

describe("inlineDesdeMd", () => {
  it("texto plano queda en un solo run sin estilos", () => {
    expect(inlineDesdeMd("Hola mundo")).toEqual([
      { type: "text", text: "Hola mundo", styles: {} },
    ]);
  });

  it("parsea negrita, cursiva, código y tachado", () => {
    expect(inlineDesdeMd("a **b** *c* `d` ~~e~~")).toEqual([
      { type: "text", text: "a ", styles: {} },
      { type: "text", text: "b", styles: { bold: true } },
      { type: "text", text: " ", styles: {} },
      { type: "text", text: "c", styles: { italic: true } },
      { type: "text", text: " ", styles: {} },
      { type: "text", text: "d", styles: { code: true } },
      { type: "text", text: " ", styles: {} },
      { type: "text", text: "e", styles: { strike: true } },
    ]);
  });

  it("parsea estilos anidados", () => {
    expect(inlineDesdeMd("**negrita con *cursiva* dentro**")).toEqual([
      { type: "text", text: "negrita con ", styles: { bold: true } },
      { type: "text", text: "cursiva", styles: { bold: true, italic: true } },
      { type: "text", text: " dentro", styles: { bold: true } },
    ]);
  });

  it("parsea enlaces con estilos en el texto", () => {
    expect(inlineDesdeMd("ver [la **guía**](https://ejemplo.mx)")).toEqual([
      { type: "text", text: "ver ", styles: {} },
      {
        type: "link",
        href: "https://ejemplo.mx",
        content: [
          { type: "text", text: "la ", styles: {} },
          { type: "text", text: "guía", styles: { bold: true } },
        ],
      },
    ]);
  });

  it("un marcador sin cierre queda como texto literal", () => {
    expect(inlineDesdeMd("2 ** 3 y 5 * 8")).toEqual([
      { type: "text", text: "2 ** 3 y 5 * 8", styles: {} },
    ]);
  });

  it("el contenido de código no se interpreta", () => {
    expect(inlineDesdeMd("`a ** b`")).toEqual([
      { type: "text", text: "a ** b", styles: { code: true } },
    ]);
  });

  it("conserva saltos de línea como texto", () => {
    expect(inlineDesdeMd("línea 1\nlínea 2")).toEqual([
      { type: "text", text: "línea 1\nlínea 2", styles: {} },
    ]);
  });
});

describe("mdDesdeInline", () => {
  it("es inverso de inlineDesdeMd para markdown canónico", () => {
    const casos = [
      "Texto con **negrita**, *cursiva*, `código`, ~~tachado~~ y [un enlace](https://x.mx).",
      "**Intención:** activar ideas previas.\n\n- Lanza el problema.\n- Anota hipótesis.",
      "sin ningún formato",
    ];
    for (const md of casos) {
      expect(mdDesdeInline(inlineDesdeMd(md))).toBe(md);
    }
  });

  it("no envuelve espacios de borde: un run con salto de línea final sigue siendo markdown válido", () => {
    // BlockNote a veces incluye el "\n" dentro del run con estilo
    const md = mdDesdeInline([
      { type: "text", text: "¿qué pasaría si…?\n", styles: { italic: true } },
      { type: "text", text: "- Atento a los equipos.", styles: {} },
    ]);
    expect(md).toBe("*¿qué pasaría si…?*\n- Atento a los equipos.");
    expect(mdDesdeInline(inlineDesdeMd(md))).toBe(md);
  });

  it("ignora runs vacíos", () => {
    expect(mdDesdeInline([{ type: "text", text: "", styles: { bold: true } }])).toBe("");
  });
});

describe("textoPlano", () => {
  it("aplana estilos y enlaces a texto simple", () => {
    expect(textoPlano(inlineDesdeMd("**Inicio** con [liga](https://x.mx)"))).toBe(
      "Inicio con liga",
    );
  });
});
