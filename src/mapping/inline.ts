/**
 * Conversión entre Markdown inline y el contenido enriquecido del editor
 * (la forma de InlineContent de BlockNote, como datos planos).
 *
 * Subconjunto soportado: **negrita**, *cursiva*, `código`, ~~tachado~~ y
 * [enlaces](url). Los saltos de línea se conservan como texto. Cualquier
 * marcador sin cierre queda como texto literal — nunca se pierde contenido.
 */

export interface Estilos {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
}

export interface TextoConEstilo {
  type: "text";
  text: string;
  styles: Estilos;
}

export interface Enlace {
  type: "link";
  href: string;
  content: TextoConEstilo[];
}

export type ContenidoInline = TextoConEstilo | Enlace;

// --- Markdown → editor -----------------------------------------------------

export function inlineDesdeMd(md: string): ContenidoInline[] {
  return fusionar(parsearSegmento(md, {}));
}

const MARCADORES: { marca: string; estilo: keyof Estilos }[] = [
  { marca: "**", estilo: "bold" },
  { marca: "~~", estilo: "strike" },
  { marca: "`", estilo: "code" },
  { marca: "*", estilo: "italic" },
];

function parsearSegmento(s: string, estilos: Estilos): ContenidoInline[] {
  const out: ContenidoInline[] = [];
  let texto = "";
  let i = 0;
  const cerrarTexto = () => {
    if (texto) {
      out.push({ type: "text", text: texto, styles: { ...estilos } });
      texto = "";
    }
  };

  while (i < s.length) {
    if (s[i] === "[") {
      const medio = s.indexOf("](", i);
      const fin = medio >= 0 ? s.indexOf(")", medio + 2) : -1;
      if (medio > i && fin > medio) {
        cerrarTexto();
        const contenido = parsearSegmento(s.slice(i + 1, medio), estilos).filter(
          (c): c is TextoConEstilo => c.type === "text",
        );
        out.push({ type: "link", href: s.slice(medio + 2, fin), content: contenido });
        i = fin + 1;
        continue;
      }
    }

    const marcador = MARCADORES.find(
      (m) => s.startsWith(m.marca, i) && !estilos[m.estilo],
    );
    if (marcador) {
      const inicioInterior = i + marcador.marca.length;
      const cierre = buscarCierre(s, marcador.marca, inicioInterior);
      if (cierre > inicioInterior) {
        cerrarTexto();
        const interior = s.slice(inicioInterior, cierre);
        if (marcador.estilo === "code") {
          out.push({ type: "text", text: interior, styles: { ...estilos, code: true } });
        } else {
          out.push(...parsearSegmento(interior, { ...estilos, [marcador.estilo]: true }));
        }
        i = cierre + marcador.marca.length;
        continue;
      }
      // sin cierre válido: el marcador completo es texto literal
      texto += marcador.marca;
      i = inicioInterior;
      continue;
    }

    texto += s[i];
    i++;
  }
  cerrarTexto();
  return out;
}

/**
 * Busca el cierre de un marcador al estilo CommonMark: la apertura debe ir
 * pegada al texto (sin espacio después) y el cierre no puede venir tras
 * espacio. Devuelve -1 si no hay cierre válido.
 */
function buscarCierre(s: string, marca: string, desde: number): number {
  if (desde >= s.length || /\s/.test(s[desde])) return -1;
  for (let j = s.indexOf(marca, desde); j >= 0; j = s.indexOf(marca, j + 1)) {
    if (!/\s/.test(s[j - 1])) return j;
  }
  return -1;
}

function mismosEstilos(a: Estilos, b: Estilos): boolean {
  const claves: (keyof Estilos)[] = ["bold", "italic", "code", "strike"];
  return claves.every((k) => Boolean(a[k]) === Boolean(b[k]));
}

function fusionar(contenido: ContenidoInline[]): ContenidoInline[] {
  const out: ContenidoInline[] = [];
  for (const c of contenido) {
    const previo = out[out.length - 1];
    if (
      c.type === "text" &&
      previo?.type === "text" &&
      mismosEstilos(previo.styles, c.styles)
    ) {
      previo.text += c.text;
    } else {
      out.push(c);
    }
  }
  return out;
}

// --- Editor → Markdown -----------------------------------------------------

export function mdDesdeInline(contenido: ContenidoInline[]): string {
  return contenido
    .map((c) =>
      c.type === "link"
        ? `[${c.content.map(serializarTexto).join("")}](${c.href})`
        : serializarTexto(c),
    )
    .join("");
}

function serializarTexto(t: TextoConEstilo): string {
  if (!t.text) return "";
  // Los marcadores no pueden tocar espacios (el editor a veces incluye el
  // salto de línea dentro de un run con estilo): se envuelve solo el núcleo.
  const [, antes, nucleo, despues] = t.text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  if (!nucleo) return t.text;
  if (t.styles.code) return `${antes}\`${nucleo}\`${despues}`;
  let out = nucleo;
  if (t.styles.italic) out = `*${out}*`;
  if (t.styles.bold) out = `**${out}**`;
  if (t.styles.strike) out = `~~${out}~~`;
  return antes + out + despues;
}

/** Texto sin formato (para campos planos como el título de una fase). */
export function textoPlano(contenido: ContenidoInline[]): string {
  return contenido
    .map((c) => (c.type === "link" ? c.content.map((t) => t.text).join("") : c.text))
    .join("");
}
