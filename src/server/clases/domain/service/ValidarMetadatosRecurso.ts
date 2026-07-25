import { RecursoInvalido } from "../error/RecursoInvalido";

const TAMANO_MAXIMO = 10 * 1024 * 1024;
const EXTENSIONES_PERMITIDAS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
]);

export interface MetadatosRecurso {
  nombre: string;
  byteLength: number;
}

function sanearTallo(tallo: string): string {
  const saneado = tallo
    .replace(/[/\\:]/g, " ")
    .split("\0")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");

  return saneado || "Clase sin título";
}

export function validarMetadatosRecurso(
  metadatos: MetadatosRecurso,
): string {
  if (metadatos.byteLength > TAMANO_MAXIMO) {
    throw new RecursoInvalido(
      "tamano",
      "El recurso excede el tamaño máximo de 10 MiB",
    );
  }

  const indiceExtension = metadatos.nombre.lastIndexOf(".");
  if (indiceExtension === 0) {
    throw new RecursoInvalido(
      "nombre",
      "La extensión del recurso no está permitida",
    );
  }
  const extension =
    indiceExtension > 0
      ? metadatos.nombre.slice(indiceExtension).toLowerCase()
      : "";
  if (!EXTENSIONES_PERMITIDAS.has(extension)) {
    throw new RecursoInvalido(
      "extension",
      "La extensión del recurso no está permitida",
    );
  }

  const tallo = metadatos.nombre.slice(0, indiceExtension);
  return `${sanearTallo(tallo)}${extension}`;
}
