import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { useEffect, useState } from 'react'
import type { ClaseSalman } from '../server/clases/domain/entity/Clase'
import { api } from './api'
import { LoadingMessage } from './components/atom/BaseMessage/LoadingMessage'
import { EditorCargado } from './components/organism/editor/LoadingEditor'

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
