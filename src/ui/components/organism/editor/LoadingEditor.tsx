import type { ClaseSalman } from '../../../../server/clases/domain/entity/Clase'
import { ContextoAdjuntar, ContextoCarpeta } from '../../../bloques'
import { EditorDocumentProvider } from '../../../../context/EditorDocumentContext'
import { EditorProvider } from '../../../../context/EditorContext'
import { EditorHeader } from './EditorHeader'
import { EditorBlocks } from './EditorBlocks'
import { ArchivosProyecto } from '../../../ArchivosProyecto'
import { Asistente } from '../../../Asistente'
import { useEditorDocument } from '../../../../hooks/useEditorDocument'
import { useEditorGuardado } from '../../../../hooks/useEditorGuardado'
import { useAnchoPanel } from '../../../../hooks/useAnchoPanel'
import { BaseMessage } from '../../atom/BaseMessage/BaseMessage'

export function EditorCargado({
  carpeta,
  claseInicial,
  alVolver,
}: {
  carpeta: string
  claseInicial: ClaseSalman
  alVolver: () => void
}) {
  const docCtx = useEditorDocument({ claseInicial })

  const [anchoIzq, arrastrarIzq] = useAnchoPanel('salman-panel-izq', 230, 160, 460)
  const [anchoDer, arrastrarDer] = useAnchoPanel('salman-panel-der', 320, 240, 560)

  return (
    <EditorDocumentProvider value={docCtx}>
      <ContextoAdjuntar.Provider value={docCtx.attach}>
        <EditorInner
          carpeta={carpeta}
          claseInicial={claseInicial}
          alVolver={alVolver}
          scaffold={claseInicial.scaffold}
          anchoIzq={anchoIzq}
          anchoDer={anchoDer}
          arrastrarIzq={arrastrarIzq}
          arrastrarDer={arrastrarDer}
        />
      </ContextoAdjuntar.Provider>
    </EditorDocumentProvider>
  )
}

function EditorInner({
  carpeta,
  claseInicial,
  alVolver,
  scaffold,
  anchoIzq,
  anchoDer,
  arrastrarIzq,
  arrastrarDer,
}: {
  carpeta: string
  claseInicial: ClaseSalman
  alVolver: () => void
  scaffold: ClaseSalman['scaffold']
  anchoIzq: number
  anchoDer: number
  arrastrarIzq: (evento: React.PointerEvent, direccion: 1 | -1) => void
  arrastrarDer: (evento: React.PointerEvent, direccion: 1 | -1) => void
}) {
  const guardadoCtx = useEditorGuardado({ carpeta, claseInicial, alVolver })
  const { compilado, errorCompilar, versionArchivos } = guardadoCtx

  return (
    <EditorProvider value={guardadoCtx}>
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
              {compilado && (
                <BaseMessage toast type="success">
                  Artefactos generados en <code>recursos/</code>
                </BaseMessage>
              )}
              {errorCompilar && <BaseMessage type="error" message={errorCompilar} />}
              {scaffold && (
                <p className="editor-scaffold">
                  Creada con <strong>{scaffold.nombre}</strong>
                  {scaffold.modelo && <> · {scaffold.modelo}</>}
                  {scaffold.metodo && <> · {scaffold.metodo}</>}
                </p>
              )}
              <EditorBlocks />
            </main>

            <div
              className="divisor"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={(e) => arrastrarDer(e, -1)}
            />
            <Asistente carpeta={carpeta} />
          </div>
        </div>
      </ContextoCarpeta.Provider>
    </EditorProvider>
  )
}
