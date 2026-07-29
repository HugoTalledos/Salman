import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { useEffect, useState } from 'react'
import type { ClaseSalman } from '../server/clases/domain/entity/Clase'
import { api } from './api'
import { ArchivosProyecto } from './ArchivosProyecto'
import { Asistente } from './Asistente'
import { ContextoAdjuntar, ContextoCarpeta } from './bloques'
import { EditorDocumentProvider } from '../context/EditorDocumentContext'
import { EditorProvider } from '../context/EditorContext'
import { EditorHeader } from './components/organism/editor/EditorHeader'
import { EditorBlocks } from './components/organism/editor/EditorBlocks'
import { useEditorDocument } from '../hooks/useEditorDocument'
import { useEditorGuardado } from '../hooks/useEditorGuardado'
import { BaseMessage } from './components/atom/BaseMessage/BaseMessage'
import { LoadingMessage } from './components/atom/BaseMessage/LoadingMessage'

function useAnchoPanel(clave: string, inicial: number, min: number, max: number) {
  const [ancho, setAncho] = useState(() => {
    const guardado = Number(localStorage.getItem(clave))
    return guardado >= min && guardado <= max ? guardado : inicial
  })

  useEffect(() => {
    localStorage.setItem(clave, String(ancho))
  }, [clave, ancho])

  const iniciarArrastre = (evento: React.PointerEvent, direccion: 1 | -1) => {
    evento.preventDefault()
    const origenX = evento.clientX
    const origenAncho = ancho
    const mover = (e: PointerEvent) => {
      const nuevo = origenAncho + direccion * (e.clientX - origenX)
      setAncho(Math.min(max, Math.max(min, nuevo)))
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      document.body.classList.remove('redimensionando')
    }
    document.body.classList.add('redimensionando')
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  return [ancho, iniciarArrastre] as const
}

export function Editor({ carpeta, alVolver }: { carpeta: string; alVolver: () => void }) {
  const [clase, setClase] = useState<ClaseSalman | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.leerProyecto(carpeta).then(setClase, (e: Error) => setError(e.message))
  }, [carpeta])

  if (error) {
    return (
      <div className="pantalla-mensaje">
        <p>{error}</p>
        <button type="button" onClick={alVolver}>← Volver al inicio</button>
      </div>
    )
  }
  if (!clase) return <LoadingMessage text="Cargando…" />
  return <EditorCargado carpeta={carpeta} claseInicial={clase} alVolver={alVolver} />
}

function EditorCargado({
  carpeta,
  claseInicial,
  alVolver,
}: {
  carpeta: string
  claseInicial: ClaseSalman
  alVolver: () => void
}) {
  const docCtx = useEditorDocument({ claseInicial })
  const guardadoCtx = useEditorGuardado({ carpeta, claseInicial, alVolver })

  const [anchoIzq, arrastrarIzq] = useAnchoPanel('salman-panel-izq', 230, 160, 460)
  const [anchoDer, arrastrarDer] = useAnchoPanel('salman-panel-der', 320, 240, 560)

  const { scaffold } = claseInicial
  const { compilado, errorCompilar, versionArchivos } = guardadoCtx

  return (
    <EditorDocumentProvider value={docCtx}>
      <EditorProvider value={guardadoCtx}>
        <ContextoCarpeta.Provider value={carpeta}>
          <ContextoAdjuntar.Provider value={docCtx.attach}>
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
          </ContextoAdjuntar.Provider>
        </ContextoCarpeta.Provider>
      </EditorProvider>
    </EditorDocumentProvider>
  )
}
