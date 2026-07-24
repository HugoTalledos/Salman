import { describe, expect, it } from "vitest";
import type { Bloque, ClaseSalman } from "../schema/clase";
import { claseEjemplo } from "../testing/fixtures";
import { compilarClase } from "./compilar";
import { mdAHtml } from "./markdown";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

describe("mdAHtml", () => {
  it("renderiza párrafos, listas y estilos inline", () => {
    const html = mdAHtml(
      "**Intención:** activar ideas.\n\n- Lanza el problema.\n- Anota *hipótesis*.",
    );
    expect(html).toBe(
      "<p><strong>Intención:</strong> activar ideas.</p>\n" +
        "<ul><li>Lanza el problema.</li><li>Anota <em>hipótesis</em>.</li></ul>",
    );
  });

  it("los saltos de línea simples son <br> y los encabezados bajan a h3+", () => {
    expect(mdAHtml("línea 1\nlínea 2")).toBe("<p>línea 1<br>línea 2</p>");
    expect(mdAHtml("# Título")).toBe("<h3>Título</h3>");
  });

  it("escapa HTML del usuario", () => {
    expect(mdAHtml("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });
});

describe("compilarClase — separación de targets", () => {
  const guia = compilarClase(claseEjemplo, "guia");
  const material = compilarClase(claseEjemplo, "material");

  it("las notas de facilitación aparecen SOLO en la guía", () => {
    expect(guia).toContain("¿dónde han visto hielo fuera del congelador?");
    expect(material).not.toContain("¿dónde han visto hielo");
    expect(material).not.toContain("Nota de facilitación");
  });

  it("el contenido para el alumno aparece completo en el material y como reparto en la guía", () => {
    expect(material).toContain("Dibuja el agua en sus tres formas.");
    expect(guia).toContain("Repartir material del alumno:");
    expect(guia).toContain("Dibuja el agua en sus tres formas.");
    // en la guía va como indicación, no como contenido del documento
    expect(guia).toMatch(/<aside class="reparto">[^<]*📄/);
  });

  it("los bloques 'ambos' van a los dos documentos", () => {
    expect(guia).toContain("Bloque suelto fuera de toda fase.");
    expect(material).toContain("Bloque suelto fuera de toda fase.");
  });

  it("la guía lleva tiempos y datos; el material lleva línea de nombre y no tiempos", () => {
    expect(guia).toContain("10 min");
    expect(guia).toContain("Ciencias Naturales");
    expect(guia).toContain("socioconstructivista");
    expect(material).toContain("Nombre:");
    expect(material).not.toContain("10 min");
  });
});

describe("compilarClase — estructura arbitraria", () => {
  it("compila una clase sin ningún bloque", () => {
    for (const doc of ["guia", "material"] as const) {
      const html = compilarClase({ ...claseEjemplo, bloques: [] }, doc);
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("aún no tiene contenido");
    }
  });

  it("compila una clase en blanco (sin scaffold, sin metadatos)", () => {
    const html = compilarClase(
      { ...claseEjemplo, scaffold: null, metadatos: {}, bloques: [] },
      "guia",
    );
    expect(html).toContain(claseEjemplo.titulo);
  });

  it("una fase que no va al documento no arrastra a sus hijos", () => {
    const bloques: Bloque[] = [
      {
        id: id(1),
        tipo: "fase",
        target: "guia",
        titulo: "Solo para la guía",
        bloques: [
          { id: id(2), tipo: "texto", target: "ambos", contenido: "Sobrevivo solo." },
        ],
      },
    ];
    const material = compilarClase({ ...claseEjemplo, bloques }, "material");
    expect(material).not.toContain("Solo para la guía");
    expect(material).toContain("Sobrevivo solo.");
  });

  it("una fase sin título ni duración no rompe nada", () => {
    const bloques: Bloque[] = [
      { id: id(3), tipo: "fase", target: "ambos", titulo: "", bloques: [] },
    ];
    const html = compilarClase({ ...claseEjemplo, bloques }, "guia");
    expect(html).toContain("(fase sin título)");
  });
});

describe("compilarClase — imágenes y seguridad", () => {
  const conImagen: ClaseSalman = {
    ...claseEjemplo,
    bloques: [
      {
        id: id(4),
        tipo: "imagen",
        target: "ambos",
        recurso: "recursos/mapa.png",
        alt: "Mapa",
        pie: "El ciclo del agua",
      },
    ],
  };

  it("reescribe la ruta de la imagen relativa al artefacto (vive en recursos/)", () => {
    const html = compilarClase(conImagen, "material");
    expect(html).toContain('<img src="mapa.png" alt="Mapa">');
    expect(html).toContain("<figcaption>El ciclo del agua</figcaption>");
  });

  it("escapa el título y los metadatos", () => {
    const html = compilarClase(
      { ...claseEjemplo, titulo: 'Clase <img src=x onerror="1">' },
      "guia",
    );
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("Clase &lt;img");
  });
});
