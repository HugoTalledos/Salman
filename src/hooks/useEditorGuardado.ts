import { useEffect, useRef, useState } from 'react'
import { type BloqueEditor, claseDesdeEditor } from '../mapping/mapeo'
import type { ClaseSalman } from '../server/clases/domain/entity/Clase'
import { api } from '../ui/api'
import { useEditorDocumentCtx } from '../context/EditorDocumentContext'

export type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error'

interface Params {
  carpeta: string
  claseInicial: ClaseSalman
  alVolver: () => void
}

export function useEditorGuardado({ carpeta, claseInicial, alVolver }: Params) {
  const { editor, changeCount } = useEditorDocumentCtx()

  const [titulo, setTitulo] = useState(claseInicial.titulo)
  const [estado, setEstado] = useState<EstadoGuardado>('guardado')
  const [compilado, setCompilado] = useState<{ guia: string; material: string } | null>(null)
  const [errorCompilar, setErrorCompilar] = useState<string | null>(null)
  const [versionArchivos, setVersionArchivos] = useState(0)

  const claseRef = useRef(claseInicial)
  const tituloRef = useRef(claseInicial.titulo)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const guardarAhora = async () => {
    setEstado('guardando')
    try {
      const bloques = claseDesdeEditor(editor.document as unknown as BloqueEditor[])
      const guardada = await api.guardarProyecto(carpeta, {
        ...claseRef.current,
        titulo: tituloRef.current.trim() || claseRef.current.titulo,
        bloques,
      })
      claseRef.current = guardada
      setEstado('guardado')
    } catch {
      setEstado('error')
    }
  }

  const programarGuardado = () => {
    setEstado('pendiente')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(guardarAhora, 800)
  }

  // Trigger save whenever the document signals a change
  const programarGuardadoRef = useRef(programarGuardado)
  useEffect(() => { programarGuardadoRef.current = programarGuardado })
  useEffect(() => {
    if (changeCount > 0) programarGuardadoRef.current()
  }, [changeCount])

  const onTituloChange = (text: string) => {
    setTitulo(text)
    tituloRef.current = text
    programarGuardado()
  }

  const volver = async () => {
    clearTimeout(timerRef.current)
    if (estado === 'pendiente' || estado === 'guardando') await guardarAhora()
    alVolver()
  }

  const compilar = async () => {
    clearTimeout(timerRef.current)
    setErrorCompilar(null)
    await guardarAhora()
    try {
      setCompilado(await api.compilar(carpeta))
      setVersionArchivos(v => v + 1)
    } catch (e) {
      setErrorCompilar((e as Error).message)
    }
  }

  return {
    titulo,
    estado,
    compilado,
    errorCompilar,
    versionArchivos,
    onTituloChange,
    volver,
    compilar,
  }
}
