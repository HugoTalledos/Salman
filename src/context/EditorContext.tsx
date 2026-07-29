import { createContext, useContext } from "react"
import type { useEditorGuardado } from "../hooks/useEditorGuardado"

type EditorContextValue = ReturnType<typeof useEditorGuardado>

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({
  value,
  children,
}: {
  value: EditorContextValue
  children: React.ReactNode
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditorCtx() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error("useEditorCtx debe usarse dentro de EditorProvider")
  return ctx
}
