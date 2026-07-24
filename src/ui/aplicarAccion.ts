import {
  AccionAsistenteSchema,
  type AccionAsistente,
} from "../asistente/acciones";
import { textoPlano } from "../mapping/inline";
import { editorDesdeClase, type BloqueEditor } from "../mapping/mapeo";

export type ResultadoAplicacion =
  | { ok: true; bloques: BloqueEditor[]; primerId: string }
  | { ok: false; error: string };

export function aplicarAccion(
  documento: BloqueEditor[],
  accion: AccionAsistente,
): ResultadoAplicacion {
  const accionValidada = AccionAsistenteSchema.safeParse(accion);
  if (!accionValidada.success) {
    return { ok: false, error: accionValidada.error.issues[0].message };
  }

  const propuesta = accionValidada.data;
  if (propuesta.bloques.length === 0) {
    return { ok: false, error: "La acción debe incluir al menos un bloque." };
  }

  const idsVivos = new Set(recolectarIds(documento));
  const idsPropuestos = recolectarIds(propuesta.bloques);
  if (idsPropuestos.some((id) => idsVivos.has(id))) {
    return { ok: false, error: "La propuesta repite un ID del documento." };
  }
  if (new Set(idsPropuestos).size !== idsPropuestos.length) {
    return { ok: false, error: "La propuesta contiene IDs duplicados." };
  }

  const nuevosBloques = editorDesdeClase(propuesta.bloques);
  const ubicacion = propuesta.ubicacion;
  if (ubicacion.tipo === "raiz") {
    const indice = documento.findIndex(
      (bloque) => bloque.id === ubicacion.anclaId,
    );
    if (indice === -1) {
      return { ok: false, error: "No se encontró el ancla de raíz." };
    }

    const bloques = [...documento];
    bloques.splice(
      ubicacion.posicion === "antes" ? indice : indice + 1,
      0,
      ...nuevosBloques,
    );
    return { ok: true, bloques, primerId: nuevosBloques[0].id };
  }

  const indiceFase = documento.findIndex(
    (bloque) => bloque.id === ubicacion.faseId && bloque.type === "fase",
  );
  if (indiceFase === -1) {
    return { ok: false, error: "No se encontró la fase de destino." };
  }

  const fase = documento[indiceFase];
  const hijos = ubicacion.posicion === "inicio"
    ? [...nuevosBloques, ...fase.children]
    : [...fase.children, ...nuevosBloques];
  const bloques = [...documento];
  bloques[indiceFase] = { ...fase, children: hijos };
  return { ok: true, bloques, primerId: nuevosBloques[0].id };
}

export function describirUbicacion(
  documento: BloqueEditor[],
  accion: AccionAsistente,
): string | null {
  const accionValidada = AccionAsistenteSchema.safeParse(accion);
  if (!accionValidada.success) return null;

  const ubicacion = accionValidada.data.ubicacion;
  if (ubicacion.tipo === "fase") {
    const fase = documento.find(
      (bloque) => bloque.id === ubicacion.faseId && bloque.type === "fase",
    );
    if (!fase) return null;
    const prefijo = ubicacion.posicion === "inicio" ? "Al inicio" : "Al final";
    return `${prefijo} de la fase «${textoPlano(fase.content ?? [])}»`;
  }

  const ancla = documento.find((bloque) => bloque.id === ubicacion.anclaId);
  if (!ancla) return null;
  const prefijo = ubicacion.posicion === "antes" ? "Antes" : "Después";
  const nombre = textoPlano(ancla.content ?? []) || ancla.type;
  return `${prefijo} del bloque «${nombre}»`;
}

function recolectarIds(
  bloques: Array<{ id: string; children?: unknown[]; bloques?: unknown[] }>,
): string[] {
  const ids: string[] = [];

  const visitar = (bloque: { id: string; children?: unknown[]; bloques?: unknown[] }) => {
    ids.push(bloque.id);
    const hijos = bloque.children ?? bloque.bloques ?? [];
    for (const hijo of hijos) {
      visitar(hijo as { id: string; children?: unknown[]; bloques?: unknown[] });
    }
  };

  for (const bloque of bloques) visitar(bloque);
  return ids;
}
