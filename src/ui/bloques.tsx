import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { createContext, useContext, useState } from "react";
import type { Target } from "../schema/clase";
import { api } from "./api";

/**
 * Esquema del editor: la vista BlockNote de los bloques de Salman.
 *
 * Cada bloque muestra su target como un chip SIEMPRE visible (requisito del
 * producto: la distinción guía/material se ve mientras se escribe). El chip
 * se cicla con un clic. El `paragraph` de BlockNote sigue en el esquema
 * porque el editor lo necesita internamente, pero el Editor lo normaliza a
 * `texto` en cuanto aparece.
 */

/** Carpeta del proyecto abierto, para resolver rutas de recursos. */
export const ContextoCarpeta = createContext<string>("");

/** Un bloque señalado para el chat del asistente. */
export interface BloqueAdjunto {
  id: string;
  etiqueta: string;
}

/** Provisto por el Editor: señala un bloque en el chat del asistente. */
export const ContextoAdjuntar = createContext<(adjunto: BloqueAdjunto) => void>(
  () => {},
);

/** Texto plano abreviado del contenido inline de un bloque, para etiquetas. */
function resumenInline(contenido: unknown, max = 26): string {
  const partes = Array.isArray(contenido) ? contenido : [];
  const texto = partes
    .map((p: { text?: string; content?: { text?: string }[] }) =>
      p.text ?? p.content?.map((t) => t.text ?? "").join("") ?? "",
    )
    .join("")
    .replaceAll("\n", " ")
    .trim();
  if (!texto) return "(vacío)";
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

function BotonAdjuntar({ id, etiqueta }: BloqueAdjunto) {
  const adjuntar = useContext(ContextoAdjuntar);
  return (
    <button
      type="button"
      className="boton-adjuntar"
      contentEditable={false}
      title="Señalar este bloque en el chat del asistente"
      onClick={() => adjuntar({ id, etiqueta })}
    >
      💬
    </button>
  );
}

const TARGETS = ["guia", "material", "ambos"] as const;

const SIGUIENTE: Record<Target, Target> = {
  ambos: "guia",
  guia: "material",
  material: "ambos",
};

const ETIQUETA: Record<Target, string> = {
  ambos: "Ambos",
  guia: "Guía",
  material: "Alumno",
};

function ChipTarget({
  target,
  alCambiar,
}: {
  target: Target;
  alCambiar?: (nuevo: Target) => void;
}) {
  return (
    <button
      type="button"
      className={`chip chip-${target}`}
      contentEditable={false}
      title={
        alCambiar
          ? "A qué documento va este bloque (clic para cambiar)"
          : "Las notas de facilitación van solo a la guía"
      }
      disabled={!alCambiar}
      onClick={() => alCambiar?.(SIGUIENTE[target])}
    >
      {ETIQUETA[target]}
    </button>
  );
}

const bloqueTexto = createReactBlockSpec(
  {
    type: "texto",
    content: "inline",
    propSchema: {
      target: { default: "ambos", values: TARGETS },
    },
  },
  {
    render: ({ block, editor, contentRef }) => (
      <div className="bloque bloque-texto">
        <span className="bloque-lateral" contentEditable={false}>
          <ChipTarget
            target={block.props.target}
            alCambiar={(nuevo) =>
              editor.updateBlock(block, { props: { target: nuevo } })
            }
          />
          <BotonAdjuntar
            id={block.id}
            etiqueta={`Texto: ${resumenInline(block.content)}`}
          />
        </span>
        <div className="bloque-contenido" ref={contentRef} />
      </div>
    ),
  },
);

const bloqueNota = createReactBlockSpec(
  {
    type: "nota",
    content: "inline",
    propSchema: {},
  },
  {
    render: ({ block, contentRef }) => (
      <div className="bloque bloque-nota">
        <div className="nota-encabezado" contentEditable={false}>
          <span className="nota-titulo">📝 Nota de facilitación</span>
          <span className="bloque-lateral">
            <BotonAdjuntar
              id={block.id}
              etiqueta={`Nota: ${resumenInline(block.content)}`}
            />
            <ChipTarget target="guia" />
          </span>
        </div>
        <div className="bloque-contenido" ref={contentRef} />
      </div>
    ),
  },
);

const bloqueFase = createReactBlockSpec(
  {
    type: "fase",
    content: "inline",
    propSchema: {
      target: { default: "ambos", values: TARGETS },
      duracionMinutos: { default: 0 },
    },
  },
  {
    render: ({ block, editor, contentRef }) => (
      <div className="bloque bloque-fase">
        <div className="fase-encabezado">
          <span className="fase-marca" contentEditable={false}>
            Fase
          </span>
          <div className="fase-titulo" ref={contentRef} />
          <span className="fase-controles" contentEditable={false}>
            <BotonAdjuntar
              id={block.id}
              etiqueta={`Fase: ${resumenInline(block.content)}`}
            />
            <input
              className="fase-duracion"
              type="number"
              min={0}
              placeholder="—"
              value={block.props.duracionMinutos || ""}
              onChange={(e) =>
                editor.updateBlock(block, {
                  props: { duracionMinutos: Number(e.target.value) || 0 },
                })
              }
            />
            <span className="fase-min">min</span>
            <ChipTarget
              target={block.props.target}
              alCambiar={(nuevo) =>
                editor.updateBlock(block, { props: { target: nuevo } })
              }
            />
          </span>
        </div>
      </div>
    ),
  },
);

function ImagenRender({
  recurso,
  alt,
  pie,
  alSubir,
}: {
  recurso: string;
  alt: string;
  pie: string;
  alSubir: (archivo: File) => Promise<void>;
}) {
  const carpeta = useContext(ContextoCarpeta);
  const [estado, setEstado] = useState<"lista" | "subiendo" | string>("lista");

  if (!recurso) {
    return (
      <label className="imagen-vacia">
        {estado === "subiendo" ? "Subiendo…" : "📷 Elegir imagen…"}
        {estado !== "lista" && estado !== "subiendo" && (
          <span className="imagen-error">{estado}</span>
        )}
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
          hidden
          disabled={estado === "subiendo"}
          onChange={async (e) => {
            const archivo = e.target.files?.[0];
            if (!archivo) return;
            setEstado("subiendo");
            try {
              await alSubir(archivo);
            } catch (err) {
              setEstado((err as Error).message);
            }
          }}
        />
      </label>
    );
  }

  const archivo = recurso.replace(/^recursos\//, "");
  const src = `/api/proyectos/${encodeURIComponent(carpeta)}/recursos/${encodeURIComponent(archivo)}`;
  return (
    <figure className="imagen-figura">
      <img src={src} alt={alt} />
      {pie && <figcaption>{pie}</figcaption>}
    </figure>
  );
}

const bloqueImagen = createReactBlockSpec(
  {
    type: "imagen",
    content: "none",
    propSchema: {
      target: { default: "ambos", values: TARGETS },
      recurso: { default: "" },
      alt: { default: "" },
      pie: { default: "" },
    },
  },
  {
    render: ({ block, editor }) => (
      <ImagenBloqueRender
        idBloque={block.id}
        recurso={block.props.recurso}
        alt={block.props.alt}
        pie={block.props.pie}
        target={block.props.target}
        alCambiarTarget={(nuevo) =>
          editor.updateBlock(block, { props: { target: nuevo } })
        }
        alSubir={async (archivo, carpeta) => {
          const { recurso } = await api.subirImagen(carpeta, archivo);
          editor.updateBlock(block, { props: { recurso, alt: archivo.name } });
        }}
      />
    ),
  },
);

function ImagenBloqueRender({
  idBloque,
  recurso,
  alt,
  pie,
  target,
  alCambiarTarget,
  alSubir,
}: {
  idBloque: string;
  recurso: string;
  alt: string;
  pie: string;
  target: Target;
  alCambiarTarget: (nuevo: Target) => void;
  alSubir: (archivo: File, carpeta: string) => Promise<void>;
}) {
  const carpeta = useContext(ContextoCarpeta);
  return (
    <div className="bloque bloque-imagen" contentEditable={false}>
      <span className="bloque-lateral">
        <ChipTarget target={target} alCambiar={alCambiarTarget} />
        <BotonAdjuntar
          id={idBloque}
          etiqueta={`Imagen: ${recurso.replace(/^recursos\//, "") || "(sin archivo)"}`}
        />
      </span>
      <ImagenRender
        recurso={recurso}
        alt={alt}
        pie={pie}
        alSubir={(archivo) => alSubir(archivo, carpeta)}
      />
    </div>
  );
}

export const esquemaEditor = BlockNoteSchema.create({
  blockSpecs: {
    // BlockNote necesita paragraph como bloque base; el Editor lo convierte
    // a `texto` en cuanto aparece, para que el chip de target nunca falte.
    paragraph: defaultBlockSpecs.paragraph,
    fase: bloqueFase(),
    texto: bloqueTexto(),
    nota: bloqueNota(),
    imagen: bloqueImagen(),
  },
});

export type EditorSalman = typeof esquemaEditor.BlockNoteEditor;

/** Elementos del menú "/": los bloques de Salman, nada más. */
export function itemsMenuBloques(editor: EditorSalman) {
  return [
    {
      title: "Fase",
      subtext: "Un momento de la clase, con duración y bloques dentro",
      aliases: ["fase", "momento"],
      group: "Bloques de Salman",
      icon: <span>🧭</span>,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, { type: "fase" });
      },
    },
    {
      title: "Texto",
      subtext: "Contenido para la guía, el material del alumno o ambos",
      aliases: ["texto", "parrafo", "párrafo"],
      group: "Bloques de Salman",
      icon: <span>✏️</span>,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, { type: "texto" });
      },
    },
    {
      title: "Nota de facilitación",
      subtext: "Qué decir, hacer o preguntar — va solo a la guía",
      aliases: ["nota", "facilitacion", "facilitación"],
      group: "Bloques de Salman",
      icon: <span>📝</span>,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, { type: "nota" });
      },
    },
    {
      title: "Imagen",
      subtext: "Sube una imagen a los recursos del proyecto",
      aliases: ["imagen", "foto", "figura"],
      group: "Bloques de Salman",
      icon: <span>📷</span>,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, { type: "imagen" });
      },
    },
  ];
}

export { filterSuggestionItems };
