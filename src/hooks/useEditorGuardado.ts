import { useRef, useState } from "react"
import type { AccionAsistente } from "../server/asistencia/domain/entity/RespuestaAsistente"
import { type BloqueEditor, claseDesdeEditor } from "../mapping/mapeo"
import type { ClaseSalman, Target } from "../server/clases/domain/entity/Clase"
import { api } from "../ui/api"
import { aplicarAccion } from "../ui/aplicarAccion"
import { type EditorSalman, esquemaEditor } from "../ui/bloques"

export type EstadoGuardado = "guardado" | "pendiente" | "guardando" | "error"

interface Params {
  carpeta: string
  claseInicial: ClaseSalman
  alVolver: () => void
  editor: EditorSalman
}

export function useEditorGuardado({ carpeta, claseInicial, alVolver, editor }: Params) {
  const [titulo, setTitulo] = useState(claseInicial.titulo)
  const [estado, setEstado] = useState<EstadoGuardado>("guardado")
  const [compilado, setCompilado] = useState<{ guia: string; material: string } | null>(null)
  const [errorCompilar, setErrorCompilar] = useState<string | null>(null)
  const [versionArchivos, setVersionArchivos] = useState(0)

  const claseRef = useRef(claseInicial)
  const tituloRef = useRef(claseInicial.titulo)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const guardarAhora = async () => {
    setEstado("guardando")
    try {
      const bloques = claseDesdeEditor(editor.document as unknown as BloqueEditor[])
      const guardada = await api.guardarProyecto(carpeta, {
        ...claseRef.current,
        titulo: tituloRef.current.trim() || claseRef.current.titulo,
        bloques,
      })
      claseRef.current = guardada
      setEstado("guardado")
    } catch {
      setEstado("error")
    }
  }

  const programarGuardado = () => {
    setEstado("pendiente")
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(guardarAhora, 800)
  }

  const onTituloChange = (text: string) => {
    setTitulo(text)
    tituloRef.current = text
    programarGuardado()
  }

  const manejarCambio = () => {
    normalizarParagraphs(editor)
    programarGuardado()
  }

  const confirmarAccion = (accion: AccionAsistente) => {
    const actual = editor.document as unknown as BloqueEditor[]
    const resultado = aplicarAccion(actual, accion)
    if (!resultado.ok) return resultado

    editor.replaceBlocks(
      editor.document.map(({ id }) => id),
      resultado.bloques as unknown as (typeof esquemaEditor.PartialBlock)[],
    )
    editor.setTextCursorPosition(resultado.primerId, "start")
    programarGuardado()
    return { ok: true as const }
  }

  const volver = async () => {
    clearTimeout(timerRef.current)
    if (estado === "pendiente" || estado === "guardando") await guardarAhora()
    alVolver()
  }

  const compilar = async () => {
    clearTimeout(timerRef.current)
    setErrorCompilar(null)
    await guardarAhora()
    try {
      setCompilado(await api.compilar(carpeta))
      setVersionArchivos((v) => v + 1)
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
    manejarCambio,
    confirmarAccion,
  }
}

function normalizarParagraphs(editor: EditorSalman) {
  const visitar = (
    bloques: readonly (typeof editor.document)[number][],
    targetFase: Target,
  ) => {
    for (const bloque of bloques) {
      if (bloque.type === "paragraph") {
        editor.updateBlock(bloque, { type: "texto", props: { target: targetFase } })
      }
      const target = bloque.type === "fase" ? (bloque.props.target as Target) : targetFase
      visitar(bloque.children, target)
    }
  }
  visitar(editor.document, "ambos")
}
