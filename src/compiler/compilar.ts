import { textoPlano, inlineDesdeMd } from "../mapping/inline";
import type { Bloque, BloqueHijo, ClaseSalman } from "../schema/clase";
import { escaparHtml, lineaAHtml, mdAHtml } from "./markdown";

/**
 * El compilador: (clase.salman, target) → documento HTML autocontenido que
 * ya no necesita a Salman para existir.
 *
 * Regla dura: asume estructura arbitraria. Lee lo que hay — no espera que
 * exista ninguna fase concreta, ni fases en absoluto. Si algo falta, produce
 * lo que puede; nunca falla por estructura inesperada.
 *
 * Cada bloque entra a un documento según su propio target, sin cascadas:
 * una fase que no va al documento no arrastra a sus hijos.
 */

export type TargetCompilacion = "guia" | "material";

export const ARCHIVO_POR_TARGET: Record<TargetCompilacion, string> = {
  guia: "guia-del-profesor.html",
  material: "material-del-alumno.html",
};

function incluir(target: Bloque["target"], doc: TargetCompilacion): boolean {
  return target === "ambos" || target === doc;
}

/** Las imágenes se referencian relativas a la raíz del proyecto
 *  ("recursos/foto.png"); el artefacto vive dentro de recursos/. */
function rutaImagen(recurso: string): string {
  return escaparHtml(recurso.replace(/^recursos\//, ""));
}

function extracto(md: string, max = 90): string {
  const plano = textoPlano(inlineDesdeMd(md)).replaceAll("\n", " ").trim();
  return plano.length > max ? `${plano.slice(0, max)}…` : plano;
}

// --- Render de bloques -------------------------------------------------------

function htmlImagen(bloque: Extract<BloqueHijo, { tipo: "imagen" }>): string {
  const pie = bloque.pie ? `<figcaption>${escaparHtml(bloque.pie)}</figcaption>` : "";
  return `<figure><img src="${rutaImagen(bloque.recurso)}" alt="${escaparHtml(bloque.alt ?? "")}">${pie}</figure>`;
}

/**
 * En la guía, un bloque que va solo al material no se reproduce completo:
 * se convierte en la indicación operativa de repartirlo (la guía es un
 * script de aula y debe decir cuándo entra cada material).
 */
function htmlReparto(bloque: BloqueHijo): string {
  const detalle =
    bloque.tipo === "imagen"
      ? bloque.pie || bloque.alt || bloque.recurso.replace(/^recursos\//, "")
      : extracto(bloque.contenido);
  return `<aside class="reparto">📄 <strong>Repartir material del alumno:</strong> ${escaparHtml(detalle)}</aside>`;
}

function htmlHoja(bloque: BloqueHijo, doc: TargetCompilacion): string {
  if (bloque.tipo === "nota") {
    // Las notas de facilitación existen solo en la guía, por esquema.
    if (doc !== "guia") return "";
    return `<aside class="nota"><span class="nota-etiqueta">Nota de facilitación</span>${mdAHtml(bloque.contenido)}</aside>`;
  }
  if (!incluir(bloque.target, doc)) {
    return doc === "guia" && bloque.target === "material" ? htmlReparto(bloque) : "";
  }
  return bloque.tipo === "imagen" ? htmlImagen(bloque) : mdAHtml(bloque.contenido);
}

function htmlFase(
  bloque: Extract<Bloque, { tipo: "fase" }>,
  doc: TargetCompilacion,
): string {
  const cuerpo = bloque.bloques
    .map((hijo) => htmlHoja(hijo, doc))
    .filter(Boolean)
    .join("\n");

  if (!incluir(bloque.target, doc)) {
    // La fase no va a este documento, pero sus hijos deciden por sí mismos.
    return cuerpo;
  }

  const duracion =
    doc === "guia" && bloque.duracionMinutos
      ? `<span class="fase-duracion">${bloque.duracionMinutos} min</span>`
      : "";
  const titulo = lineaAHtml(bloque.titulo) || "(fase sin título)";
  return `<section class="fase"><header class="fase-encabezado"><h2>${titulo}</h2>${duracion}</header>\n${cuerpo}</section>`;
}

function htmlBloques(bloques: Bloque[], doc: TargetCompilacion): string {
  return bloques
    .map((b) => (b.tipo === "fase" ? htmlFase(b, doc) : htmlHoja(b, doc)))
    .filter(Boolean)
    .join("\n");
}

// --- Encabezados de documento ------------------------------------------------

function encabezadoGuia(clase: ClaseSalman): string {
  const m = clase.metadatos;
  const datos = [
    m.materia && `<span>${escaparHtml(m.materia)}</span>`,
    m.grado && `<span>${escaparHtml(m.grado)}</span>`,
    m.duracionMinutos && `<span>${m.duracionMinutos} min</span>`,
  ]
    .filter(Boolean)
    .join(" · ");
  const objetivos = m.objetivos?.length
    ? `<div class="objetivos"><h3>Objetivos</h3><ul>${m.objetivos
        .map((o) => `<li>${escaparHtml(o)}</li>`)
        .join("")}</ul></div>`
    : "";
  const pedagogia = clase.scaffold
    ? `<p class="pedagogia">${escaparHtml(
        [clase.scaffold.modelo, clase.scaffold.metodo].filter(Boolean).join(" · "),
      )}</p>`
    : "";
  return `<header class="documento-encabezado">
<p class="documento-tipo">Guía del profesor</p>
<h1>${escaparHtml(clase.titulo)}</h1>
${datos ? `<p class="datos">${datos}</p>` : ""}
${pedagogia}
${objetivos}
</header>`;
}

function encabezadoMaterial(clase: ClaseSalman): string {
  return `<header class="documento-encabezado">
<h1>${escaparHtml(clase.titulo)}</h1>
<p class="alumno-datos">Nombre: <span class="linea"></span> Fecha: <span class="linea corta"></span></p>
</header>`;
}

// --- Documento completo --------------------------------------------------------

const ESTILOS = `
:root { color-scheme: light; }
body {
  font: 15px/1.55 system-ui, "Segoe UI", Roboto, sans-serif;
  color: #1f2430;
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}
h1 { font-size: 1.7rem; margin: 0; }
h2 { font-size: 1.2rem; margin: 0; }
h3 { font-size: 1rem; }
p { margin: 8px 0; }
img { max-width: 100%; }
figure { margin: 12px 0; }
figcaption { font-size: 0.85rem; color: #6b7280; }
.documento-tipo {
  font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: #2563eb; margin: 0 0 4px;
}
.datos, .pedagogia { color: #6b7280; margin: 4px 0; }
.objetivos { margin-top: 12px; }
.objetivos h3 { margin: 0 0 4px; }
.objetivos ul { margin: 0; padding-left: 20px; }
.documento-encabezado { border-bottom: 2px solid #1f2430; padding-bottom: 16px; margin-bottom: 8px; }
.alumno-datos { display: flex; gap: 16px; margin-top: 16px; }
.linea { flex: 1; border-bottom: 1px solid #1f2430; }
.linea.corta { flex: 0 0 120px; }
.fase { margin-top: 24px; break-inside: avoid-page; }
.fase-encabezado {
  display: flex; justify-content: space-between; align-items: baseline;
  border-bottom: 1px solid #d1d5db; padding-bottom: 4px; margin-bottom: 8px;
}
.fase-duracion { font-weight: 600; color: #2563eb; white-space: nowrap; }
.nota {
  background: #fef7e0; border: 1px solid #f2d98c; border-radius: 6px;
  padding: 10px 14px; margin: 12px 0; break-inside: avoid;
}
.nota-etiqueta {
  display: block; font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em; color: #92700c;
}
.reparto {
  border: 1px dashed #9ca3af; border-radius: 6px; padding: 8px 12px;
  margin: 12px 0; color: #374151; break-inside: avoid;
}
@page { margin: 18mm; }
@media print {
  body { padding: 0; max-width: none; }
}
`;

const TITULO_DOC: Record<TargetCompilacion, string> = {
  guia: "Guía del profesor",
  material: "Material del alumno",
};

/** Compila el fuente a un documento HTML autocontenido para un target. */
export function compilarClase(clase: ClaseSalman, doc: TargetCompilacion): string {
  const encabezado = doc === "guia" ? encabezadoGuia(clase) : encabezadoMaterial(clase);
  const cuerpo =
    htmlBloques(clase.bloques, doc) ||
    `<p class="vacio">(Esta clase aún no tiene contenido para este documento.)</p>`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaparHtml(clase.titulo)} — ${TITULO_DOC[doc]}</title>
<style>${ESTILOS}</style>
</head>
<body>
${encabezado}
<main>
${cuerpo}
</main>
</body>
</html>
`;
}
