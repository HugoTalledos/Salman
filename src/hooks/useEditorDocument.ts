import { useMemo, useState } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import type { AccionAsistente } from '../server/asistencia/domain/entity/RespuestaAsistente'
import { type BloqueEditor, editorDesdeClase } from '../mapping/mapeo'
import type { ClaseSalman, Target } from '../server/clases/domain/entity/Clase'
import { aplicarAccion, validarAccion, describirUbicacion, type ResultadoValidacion } from '../ui/aplicarAccion'
import { type BloqueAdjunto, type EditorSalman, esquemaEditor } from '../ui/bloques'

interface Params {
  claseInicial: ClaseSalman
}

export function useEditorDocument({ claseInicial }: Params) {
  const [attachments, setAttachments] = useState<BloqueAdjunto[]>([])
  const [changeCount, setChangeCount] = useState(0)

  const initialContent = useMemo(() => {
    const bloques = editorDesdeClase(claseInicial.bloques)
    return bloques.length > 0
      ? bloques
      : [{
          id: crypto.randomUUID(),
          type: 'texto',
          props: { target: 'ambos' },
          content: [],
          children: [],
        } satisfies BloqueEditor]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editor = useCreateBlockNote({
    schema: esquemaEditor,
    initialContent: initialContent as unknown as (typeof esquemaEditor.PartialBlock)[],
  })

  const currentDocument = (): BloqueEditor[] =>
    editor.document as unknown as BloqueEditor[]

  const handleChange = () => {
    normalizeParagraphs(editor)
    setChangeCount(c => c + 1)
  }

  const attach = (block: BloqueAdjunto) => {
    setAttachments(prev =>
      prev.some(a => a.id === block.id) || prev.length >= 6
        ? prev
        : [...prev, block],
    )
  }

  const removeAttachment = (id: string) =>
    setAttachments(prev => prev.filter(a => a.id !== id))

  const clearAttachments = () => setAttachments([])

  const applyAction = (action: AccionAsistente): { ok: true } | { ok: false; error: string } => {
    const resultado = aplicarAccion(currentDocument(), action)
    if (!resultado.ok) return resultado

    editor.replaceBlocks(
      editor.document.map(({ id }) => id),
      resultado.bloques as unknown as (typeof esquemaEditor.PartialBlock)[],
    )
    editor.setTextCursorPosition(resultado.primerId, 'start')
    handleChange()
    return { ok: true }
  }

  const validateAction = (action: unknown): ResultadoValidacion =>
    validarAccion(currentDocument(), action)

  const describeLocation = (action: AccionAsistente): string | null =>
    describirUbicacion(currentDocument(), action)

  return {
    editor,
    currentDocument,
    handleChange,
    changeCount,
    attachments,
    attach,
    removeAttachment,
    clearAttachments,
    applyAction,
    validateAction,
    describeLocation,
  }
}

function normalizeParagraphs(editor: EditorSalman) {
  const visit = (
    blocks: readonly (typeof editor.document)[number][],
    targetFase: Target,
  ) => {
    for (const block of blocks) {
      if (block.type === 'paragraph') {
        editor.updateBlock(block, { type: 'texto', props: { target: targetFase } })
      }
      const target = block.type === 'fase' ? (block.props.target as Target) : targetFase
      visit(block.children, target)
    }
  }
  visit(editor.document, 'ambos')
}
