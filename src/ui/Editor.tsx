import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AccionAsistente } from "../asistente/acciones";
import { type BloqueEditor, claseDesdeEditor, editorDesdeClase } from "../mapping/mapeo";
import type { ClaseSalman, Target } from "../schema/clase";
import { api } from "./api";
import { ArchivosProyecto } from "./ArchivosProyecto";
import { Asistente } from "./Asistente";
import { aplicarAccion } from "./aplicarAccion";
import {
  type BloqueAdjunto,
  ContextoAdjuntar,
  ContextoCarpeta,
  type EditorSalman,
  esquemaEditor,
  filterSuggestionItems,
  itemsMenuBloques,
} from "./bloques";

type EstadoGuardado = "guardado" | "pendiente" | "guardando" | "error";

/**
 * Ancho de un panel lateral, arrastrable y recordado entre sesiones.
 * `direccion` indica hacia dónde crece el panel al mover el divisor a la
 * derecha: 1 para el panel izquierdo, -1 para el derecho.
 */
function useAnchoPanel(clave: string, inicial: number, min: number, max: number) {
  const [ancho, setAncho] = useState(() => {
    const guardado = Number(localStorage.getItem(clave));
    return guardado >= min && guardado <= max ? guardado : inicial;
  });

  useEffect(() => {
    localStorage.setItem(clave, String(ancho));
  }, [clave, ancho]);

  const iniciarArrastre = (evento: React.PointerEvent, direccion: 1 | -1) => {
    evento.preventDefault();
    const origenX = evento.clientX;
    const origenAncho = ancho;
    const mover = (e: PointerEvent) => {
      const nuevo = origenAncho + direccion * (e.clientX - origenX);
      setAncho(Math.min(max, Math.max(min, nuevo)));
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      document.body.classList.remove("redimensionando");
    };
    document.body.classList.add("redimensionando");
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  };

  return [ancho, iniciarArrastre] as const;
}

const TEXTO_ESTADO: Record<EstadoGuardado, string> = {
  guardado: "Guardado",
  pendiente: "Cambios sin guardar…",
  guardando: "Guardando…",
  error: "⚠ No se pudo guardar",
};

export function Editor({ carpeta, alVolver }: { carpeta: string; alVolver: () => void }) {
  const [clase, setClase] = useState<ClaseSalman | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.leerProyecto(carpeta).then(setClase, (e: Error) => setError(e.message));
  }, [carpeta]);

  if (error) {
    return (
      <div className="pantalla-mensaje">
        <p>{error}</p>
        <button type="button" onClick={alVolver}>← Volver al inicio</button>
      </div>
    );
  }
  if (!clase) return <div className="pantalla-mensaje">Cargando…</div>;
  return <EditorCargado carpeta={carpeta} claseInicial={clase} alVolver={alVolver} />;
}

function EditorCargado({
  carpeta,
  claseInicial,
  alVolver,
}: {
  carpeta: string;
  claseInicial: ClaseSalman;
  alVolver: () => void;
}) {
  const [titulo, setTitulo] = useState(claseInicial.titulo);
  const [estado, setEstado] = useState<EstadoGuardado>("guardado");
  const [compilado, setCompilado] = useState<{ guia: string; material: string } | null>(
    null,
  );
  const [errorCompilar, setErrorCompilar] = useState<string | null>(null);
  // se incrementa tras compilar para que la barra de archivos se recargue
  const [versionArchivos, setVersionArchivos] = useState(0);

  // bloques señalados desde el editor para el próximo mensaje al asistente
  const [adjuntos, setAdjuntos] = useState<BloqueAdjunto[]>([]);
  const adjuntar = (nuevo: BloqueAdjunto) =>
    setAdjuntos((previos) =>
      previos.some((a) => a.id === nuevo.id) || previos.length >= 6
        ? previos
        : [...previos, nuevo],
    );

  const [anchoIzq, arrastrarIzq] = useAnchoPanel("salman-panel-izq", 230, 160, 460);
  const [anchoDer, arrastrarDer] = useAnchoPanel("salman-panel-der", 320, 240, 560);

  // La última versión confirmada en disco y el título vigente, legibles
  // desde el guardado asíncrono sin quedar atrapados en un closure viejo.
  const claseRef = useRef(claseInicial);
  const tituloRef = useRef(claseInicial.titulo);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const contenidoInicial = useMemo(() => {
    const bloques = editorDesdeClase(claseInicial.bloques);
    return bloques.length > 0
      ? bloques
      : [
          {
            id: crypto.randomUUID(),
            type: "texto",
            props: { target: "ambos" },
            content: [],
            children: [],
          } satisfies BloqueEditor,
        ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editor = useCreateBlockNote({
    schema: esquemaEditor,
    initialContent: contenidoInicial as unknown as (typeof esquemaEditor.PartialBlock)[],
  });

  const guardarAhora = async () => {
    setEstado("guardando");
    try {
      const bloques = claseDesdeEditor(editor.document as unknown as BloqueEditor[]);
      const guardada = await api.guardarProyecto(carpeta, {
        ...claseRef.current,
        titulo: tituloRef.current.trim() || claseRef.current.titulo,
        bloques,
      });
      claseRef.current = guardada;
      setEstado("guardado");
    } catch {
      setEstado("error");
    }
  };

  const programarGuardado = () => {
    setEstado("pendiente");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(guardarAhora, 800);
  };

  const manejarCambio = () => {
    normalizarParagraphs(editor);
    programarGuardado();
  };

  const confirmarAccion = (accion: AccionAsistente) => {
    const actual = editor.document as unknown as BloqueEditor[];
    const resultado = aplicarAccion(actual, accion);
    if (!resultado.ok) return resultado;

    editor.replaceBlocks(
      editor.document.map(({ id }) => id),
      resultado.bloques as unknown as (typeof esquemaEditor.PartialBlock)[],
    );
    editor.setTextCursorPosition(resultado.primerId, "start");
    programarGuardado();
    return { ok: true as const };
  };

  const volver = async () => {
    clearTimeout(timerRef.current);
    if (estado === "pendiente" || estado === "guardando") await guardarAhora();
    alVolver();
  };

  /** Compila el fuente en disco: primero asegura que lo editado esté guardado. */
  const compilar = async () => {
    clearTimeout(timerRef.current);
    setErrorCompilar(null);
    await guardarAhora();
    try {
      setCompilado(await api.compilar(carpeta));
      setVersionArchivos((v) => v + 1);
    } catch (e) {
      setErrorCompilar((e as Error).message);
    }
  };

  const { scaffold } = claseInicial;

  return (
    <ContextoCarpeta.Provider value={carpeta}>
      <div className="pantalla-editor">
        <header className="editor-barra">
          <button type="button" className="boton-volver" onClick={volver}>
            ← Inicio
          </button>
          <input
            className="editor-titulo"
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              tituloRef.current = e.target.value;
              programarGuardado();
            }}
            aria-label="Título de la clase"
          />
          <span className={`estado-guardado estado-${estado}`}>
            {TEXTO_ESTADO[estado]}
          </span>
          <button type="button" className="boton-compilar" onClick={compilar}>
            Compilar
          </button>
        </header>
        <div
          className="editor-cuerpo"
          style={{
            gridTemplateColumns: `${anchoIzq}px 5px minmax(0, 1fr) 5px ${anchoDer}px`,
          }}
        >
          <ArchivosProyecto carpeta={carpeta} version={versionArchivos} />
          <div
            className="divisor"
            role="separator"
            aria-orientation="vertical"
            onPointerDown={(e) => arrastrarIzq(e, 1)}
          />

          <main className="editor-centro">
            <ContextoAdjuntar.Provider value={adjuntar}>
            {compilado && (
              <p className="compilado-enlaces">
                Artefactos generados en <code>recursos/</code>:{" "}
                <a
                  href={api.urlRecurso(carpeta, compilado.guia)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Guía del profesor
                </a>{" "}
                ·{" "}
                <a
                  href={api.urlRecurso(carpeta, compilado.material)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Material del alumno
                </a>
              </p>
            )}
            {errorCompilar && <p className="mensaje-error">{errorCompilar}</p>}
            {scaffold && (
              <p className="editor-scaffold">
                Creada con <strong>{scaffold.nombre}</strong>
                {scaffold.modelo && <> · {scaffold.modelo}</>}
                {scaffold.metodo && <> · {scaffold.metodo}</>}
              </p>
            )}
            <BlockNoteView
              editor={editor}
              theme="light"
              slashMenu={false}
              onChange={manejarCambio}
            >
              <SuggestionMenuController
                triggerCharacter="/"
                getItems={async (query) =>
                  filterSuggestionItems(itemsMenuBloques(editor), query)
                }
              />
            </BlockNoteView>
            </ContextoAdjuntar.Provider>
          </main>

          <div
            className="divisor"
            role="separator"
            aria-orientation="vertical"
            onPointerDown={(e) => arrastrarDer(e, -1)}
          />
          <Asistente
            carpeta={carpeta}
            adjuntos={adjuntos}
            quitarAdjunto={(id) =>
              setAdjuntos((previos) => previos.filter((a) => a.id !== id))
            }
            limpiarAdjuntos={() => setAdjuntos([])}
            documentoActual={() => editor.document as unknown as BloqueEditor[]}
            aplicarAccionDocumento={confirmarAccion}
          />
        </div>
      </div>
    </ContextoCarpeta.Provider>
  );
}

/**
 * BlockNote crea `paragraph` al partir bloques con Enter; aquí se convierte a
 * `texto` en cuanto aparece, heredando como valor inicial el target de la
 * fase que lo contiene (guardado explícito: sin herencia en lectura).
 */
function normalizarParagraphs(editor: EditorSalman) {
  const visitar = (
    bloques: readonly (typeof editor.document)[number][],
    targetFase: Target,
  ) => {
    for (const bloque of bloques) {
      if (bloque.type === "paragraph") {
        editor.updateBlock(bloque, {
          type: "texto",
          props: { target: targetFase },
        });
      }
      const target =
        bloque.type === "fase" ? (bloque.props.target as Target) : targetFase;
      visitar(bloque.children, target);
    }
  };
  visitar(editor.document, "ambos");
}
