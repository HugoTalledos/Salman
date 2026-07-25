import {
  AccionAsistenteSchema,
  type AccionAsistente,
} from "../server/asistencia/domain/entity/RespuestaAsistente";
import { textoPlano } from "../mapping/inline";
import { editorDesdeClase, type BloqueEditor } from "../mapping/mapeo";

export type ResultadoAplicacion =
  | { ok: true; bloques: BloqueEditor[]; primerId: string }
  | { ok: false; error: string };

export type ResultadoValidacion =
  | { ok: true; accion: AccionAsistente }
  | { ok: false; error: string };

export function validarAccion(
  documento: BloqueEditor[],
  accion: unknown,
): ResultadoValidacion {
  const accionValidada = AccionAsistenteSchema.safeParse(accion);
  if (!accionValidada.success) {
    return { ok: false, error: accionValidada.error.issues[0].message };
  }

  const propuesta = accionValidada.data;
  const idsVivos = new Set(recolectarIds(documento));
  const idsPropuestos = recolectarIds(propuesta.bloques);
  if (idsPropuestos.some((id) => idsVivos.has(id))) {
    return { ok: false, error: "La propuesta repite un ID del documento." };
  }
  if (new Set(idsPropuestos).size !== idsPropuestos.length) {
    return { ok: false, error: "La propuesta contiene IDs duplicados." };
  }

  const ubicacion = propuesta.ubicacion;
  if (ubicacion.tipo === "raiz") {
    const existe = documento.some((bloque) => bloque.id === ubicacion.anclaId);
    return existe
      ? { ok: true, accion: propuesta }
      : { ok: false, error: "No se encontró el ancla de raíz." };
  }

  const existe = documento.some(
    (bloque) => bloque.id === ubicacion.faseId && bloque.type === "fase",
  );
  return existe
    ? { ok: true, accion: propuesta }
    : { ok: false, error: "No se encontró la fase de destino." };
}

export function aplicarAccion(
  documento: BloqueEditor[],
  accion: AccionAsistente,
): ResultadoAplicacion {
  const validacion = validarAccion(documento, accion);
  if (!validacion.ok) return validacion;

  const propuesta = validacion.accion;
  const nuevosBloques = editorDesdeClase(propuesta.bloques);
  const ubicacion = propuesta.ubicacion;
  if (ubicacion.tipo === "raiz") {
    const indice = documento.findIndex(
      (bloque) => bloque.id === ubicacion.anclaId,
    );
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
  const validacion = validarAccion(documento, accion);
  if (!validacion.ok) return null;

  const ubicacion = validacion.accion.ubicacion;
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
