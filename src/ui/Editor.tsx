import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useEffect, useMemo, useState } from "react";
import { type BloqueEditor, editorDesdeClase } from "../mapping/mapeo";
import type { ClaseSalman } from "../server/clases/domain/entity/Clase";
import { api } from "./api";
import { ArchivosProyecto } from "./ArchivosProyecto";
import { Asistente } from "./Asistente";
import {
  type BloqueAdjunto,
  ContextoAdjuntar,
  ContextoCarpeta,
  esquemaEditor,
  filterSuggestionItems,
  itemsMenuBloques,
} from "./bloques";
import { EditorProvider } from "./components/organism/editor/EditorContext";
import { EditorHeader } from "./components/organism/editor/EditorHeader";
import { useEditorGuardado } from "./components/organism/editor/useEditorGuardado";
import { BaseMessage } from "./components/atom/BaseMessage/BaseMessage";
import { LoadingMessage } from "./components/atom/BaseMessage/LoadingMessage";

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
  if (!clase) return <LoadingMessage text="Cargando…" />;
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
  const [adjuntos, setAdjuntos] = useState<BloqueAdjunto[]>([]);
  const adjuntar = (nuevo: BloqueAdjunto) =>
    setAdjuntos((previos) =>
      previos.some((a) => a.id === nuevo.id) || previos.length >= 6
        ? previos
        : [...previos, nuevo],
    );

  const [anchoIzq, arrastrarIzq] = useAnchoPanel("salman-panel-izq", 230, 160, 460);
  const [anchoDer, arrastrarDer] = useAnchoPanel("salman-panel-der", 320, 240, 560);

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

  const editorCtx = useEditorGuardado({ carpeta, claseInicial, alVolver, editor });
  const { compilado, errorCompilar, versionArchivos, manejarCambio, confirmarAccion } = editorCtx;

  const { scaffold } = claseInicial;

  return (
    <EditorProvider value={editorCtx}>
      <ContextoCarpeta.Provider value={carpeta}>
        <div className="pantalla-editor">
          <EditorHeader />
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
                {
                  compilado && (
                    <BaseMessage toast type="success">
                      Artefactos generados en <code>recursos/</code>
                    </BaseMessage>
                )}
                { errorCompilar && <BaseMessage type="error" message={errorCompilar} /> }
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
    </EditorProvider>
  );
}
