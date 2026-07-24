import { type ContenidoInline, inlineDesdeMd } from "../mapping/inline";

/**
 * Render de Markdown a HTML para el compilador. Cubre el subconjunto que
 * Salman guarda: párrafos, listas (- / 1.), encabezados (#) y el inline de
 * `mapping/inline` (negrita, cursiva, código, tachado, enlaces). Todo el
 * texto del usuario se escapa: el fuente jamás inyecta HTML en el artefacto.
 */

export function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineAHtml(contenido: ContenidoInline[]): string {
  return contenido
    .map((c) => {
      if (c.type === "link") {
        const interior = inlineAHtml(c.content);
        return `<a href="${escaparHtml(c.href)}">${interior}</a>`;
      }
      let html = escaparHtml(c.text);
      if (c.styles.code) html = `<code>${html}</code>`;
      if (c.styles.bold) html = `<strong>${html}</strong>`;
      if (c.styles.italic) html = `<em>${html}</em>`;
      if (c.styles.strike) html = `<s>${html}</s>`;
      return html;
    })
    .join("");
}

/** Markdown inline → HTML (una sola línea, sin estructura de bloque). */
export function lineaAHtml(md: string): string {
  return inlineAHtml(inlineDesdeMd(md));
}

type Segmento =
  | { clase: "parrafo"; lineas: string[] }
  | { clase: "lista"; tipo: "ul" | "ol"; items: string[] }
  | { clase: "encabezado"; nivel: number; texto: string };

/** Markdown completo → HTML de bloque. */
export function mdAHtml(md: string): string {
  const segmentos: Segmento[] = [];
  let cortarParrafo = true;

  for (const linea of md.split("\n")) {
    const vineta = linea.match(/^[-*] (.*)$/);
    const numerada = linea.match(/^\d+[.)] (.*)$/);
    const encabezado = linea.match(/^(#{1,6}) (.*)$/);
    const ultimo = segmentos[segmentos.length - 1];

    if (vineta || numerada) {
      const tipo = vineta ? "ul" : "ol";
      const item = lineaAHtml((vineta ?? numerada)![1]);
      if (ultimo?.clase === "lista" && ultimo.tipo === tipo) {
        ultimo.items.push(item);
      } else {
        segmentos.push({ clase: "lista", tipo, items: [item] });
      }
      cortarParrafo = true;
    } else if (encabezado) {
      // El documento reserva h1/h2; los encabezados del contenido bajan a h3+
      const nivel = Math.min(encabezado[1].length + 2, 6);
      segmentos.push({ clase: "encabezado", nivel, texto: lineaAHtml(encabezado[2]) });
      cortarParrafo = true;
    } else if (linea.trim() === "") {
      cortarParrafo = true;
    } else if (!cortarParrafo && ultimo?.clase === "parrafo") {
      ultimo.lineas.push(lineaAHtml(linea));
    } else {
      segmentos.push({ clase: "parrafo", lineas: [lineaAHtml(linea)] });
      cortarParrafo = false;
    }
  }

  return segmentos
    .map((s) => {
      switch (s.clase) {
        case "parrafo":
          return `<p>${s.lineas.join("<br>")}</p>`;
        case "lista":
          return `<${s.tipo}>${s.items.map((i) => `<li>${i}</li>`).join("")}</${s.tipo}>`;
        case "encabezado":
          return `<h${s.nivel}>${s.texto}</h${s.nivel}>`;
      }
    })
    .join("\n");
}
