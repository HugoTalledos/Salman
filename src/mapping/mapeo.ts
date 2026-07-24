import type { Bloque, BloqueFase, BloqueHijo, Target } from "../schema/clase";
import { Target as TargetSchema } from "../schema/clase";
import {
  type ContenidoInline,
  inlineDesdeMd,
  mdDesdeInline,
  textoPlano,
} from "./inline";

/**
 * Capa de mapeo entre el fuente (`clase.salman`) y el documento del editor.
 *
 * El editor es una VISTA: este módulo es la única frontera entre ambos
 * esquemas y funciona sobre datos planos (la forma JSON de los bloques de
 * BlockNote), sin cargar el motor del editor. Reglas:
 *
 * - Mapeo 1:1 por bloque, conservando IDs en ambas direcciones.
 * - Nunca pierde contenido: tipos desconocidos del editor se guardan como
 *   `texto`; estructuras que el fuente no admite se normalizan (una fase
 *   anidada sube al nivel superior; los hijos de un bloque hoja se aplanan
 *   como hermanos).
 */

export interface BloqueEditor {
  id: string;
  type: string;
  props: Record<string, string | number | boolean>;
  content?: ContenidoInline[];
  children: BloqueEditor[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Los IDs del fuente son UUID; si el editor generó otra cosa, se reemplaza. */
function idValido(id: string): string {
  return UUID.test(id) ? id : crypto.randomUUID();
}

function targetValido(valor: unknown): Target {
  const parseado = TargetSchema.safeParse(valor);
  return parseado.success ? parseado.data : "ambos";
}

// --- Fuente → editor -------------------------------------------------------

export function editorDesdeClase(bloques: Bloque[]): BloqueEditor[] {
  return bloques.map(editorDesdeBloque);
}

function editorDesdeBloque(bloque: Bloque): BloqueEditor {
  switch (bloque.tipo) {
    case "fase":
      return {
        id: bloque.id,
        type: "fase",
        props: {
          target: bloque.target,
          duracionMinutos: bloque.duracionMinutos ?? 0,
        },
        content: [{ type: "text", text: bloque.titulo, styles: {} }],
        children: bloque.bloques.map(editorDesdeBloque),
      };
    case "texto":
      return {
        id: bloque.id,
        type: "texto",
        props: { target: bloque.target },
        content: inlineDesdeMd(bloque.contenido),
        children: [],
      };
    case "nota":
      return {
        id: bloque.id,
        type: "nota",
        props: {},
        content: inlineDesdeMd(bloque.contenido),
        children: [],
      };
    case "imagen":
      return {
        id: bloque.id,
        type: "imagen",
        props: {
          target: bloque.target,
          recurso: bloque.recurso,
          alt: bloque.alt ?? "",
          pie: bloque.pie ?? "",
        },
        children: [],
      };
  }
}

// --- Editor → fuente -------------------------------------------------------

export function claseDesdeEditor(bloquesEditor: BloqueEditor[]): Bloque[] {
  const salida: Bloque[] = [];

  const visitar = (bloque: BloqueEditor, fase: BloqueFase | null) => {
    if (bloque.type === "fase") {
      // Las fases viven solo en el nivel superior: una fase anidada sube.
      const nueva: BloqueFase = {
        id: idValido(bloque.id),
        tipo: "fase",
        target: targetValido(bloque.props.target),
        titulo: textoPlano(bloque.content ?? []),
        ...(duracion(bloque) ? { duracionMinutos: duracion(bloque) } : {}),
        bloques: [],
      };
      salida.push(nueva);
      for (const hijo of bloque.children) visitar(hijo, nueva);
      return;
    }

    const hoja = hojaDesdeEditor(bloque);
    if (hoja) {
      if (fase) fase.bloques.push(hoja);
      else salida.push(hoja);
    }
    // El fuente no admite hijos bajo un bloque hoja: se aplanan como hermanos.
    for (const hijo of bloque.children) visitar(hijo, fase);
  };

  for (const bloque of bloquesEditor) visitar(bloque, null);
  return salida;
}

function duracion(bloque: BloqueEditor): number | undefined {
  const valor = Number(bloque.props.duracionMinutos);
  return Number.isInteger(valor) && valor > 0 ? valor : undefined;
}

function hojaDesdeEditor(bloque: BloqueEditor): BloqueHijo | null {
  switch (bloque.type) {
    case "nota":
      return {
        id: idValido(bloque.id),
        tipo: "nota",
        target: "guia",
        contenido: mdDesdeInline(bloque.content ?? []),
      };
    case "imagen": {
      const recurso = String(bloque.props.recurso ?? "");
      if (!recurso) return null; // una imagen sin archivo aún no es fuente
      const alt = String(bloque.props.alt ?? "");
      const pie = String(bloque.props.pie ?? "");
      return {
        id: idValido(bloque.id),
        tipo: "imagen",
        target: targetValido(bloque.props.target),
        recurso,
        ...(alt ? { alt } : {}),
        ...(pie ? { pie } : {}),
      };
    }
    // "texto" y cualquier tipo desconocido del editor se guardan como texto:
    // el mapeo nunca tira contenido.
    default:
      return {
        id: idValido(bloque.id),
        tipo: "texto",
        target: targetValido(bloque.props.target),
        contenido: mdDesdeInline(bloque.content ?? []),
      };
  }
}
