import { createContext, useContext } from 'react'
import type { useEditorDocument } from '../hooks/useEditorDocument'

type EditorDocumentContextValue = ReturnType<typeof useEditorDocument>

const EditorDocumentContext = createContext<EditorDocumentContextValue | null>(null)

export function EditorDocumentProvider({
  value,
  children,
}: {
  value: EditorDocumentContextValue
  children: React.ReactNode
}) {
  return (
    <EditorDocumentContext.Provider value={value}>
      {children}
    </EditorDocumentContext.Provider>
  )
}

export function useEditorDocumentCtx(): EditorDocumentContextValue {
  const ctx = useContext(EditorDocumentContext)
  if (!ctx) throw new Error('useEditorDocumentCtx must be used inside EditorDocumentProvider')
  return ctx
}
