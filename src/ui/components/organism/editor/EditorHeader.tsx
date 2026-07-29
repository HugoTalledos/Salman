import { BaseButton } from '../../atom/BaseButton/button'
import { BaseInput } from '../../atom/BaseInput/input'
import { useEditorCtx } from '../../../../context/EditorContext'
import type { EstadoGuardado } from '../../../../hooks/useEditorGuardado'

const TEXTO_ESTADO: Record<EstadoGuardado, string> = {
  guardado: 'Guardado',
  pendiente: 'Cambios sin guardar…',
  guardando: 'Guardando…',
  error: '⚠ No se pudo guardar',
}

export function EditorHeader() {
  const { titulo, estado, onTituloChange, volver, compilar } = useEditorCtx()

  return (
    <header className="editor-barra">
      <BaseButton label="← Inicio" variant="link" onClickBtn={volver} />
      <BaseInput
        label=""
        variant="ghost"
        value={titulo}
        className="text-center"
        onChange={onTituloChange}
      />
      <span className={`estado-guardado estado-${estado}`}>
        {TEXTO_ESTADO[estado]}
      </span>
      <BaseButton label="Compilar" onClickBtn={compilar} />
    </header>
  )
}
