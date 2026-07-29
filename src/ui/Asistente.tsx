import { useEffect, useRef, useState } from 'react'
import type { AccionAsistente } from '../server/asistencia/domain/entity/RespuestaAsistente'
import { AccionesAsistente } from './AccionesAsistente'
import { api, type MensajeAsistente } from './api'
import { useEditorDocumentCtx } from '../context/EditorDocumentContext'
import { AttachmentChip } from './components/atom/AttachmentChip/AttachmentChip'
import { LoadingMessage } from './components/atom/BaseMessage/LoadingMessage'
import { BaseMessage } from './components/atom/BaseMessage/BaseMessage'

type MensajeLocal = MensajeAsistente & {
  etiquetas?: string[]
  acciones?: AccionAsistente[]
}

export function Asistente({ carpeta }: { carpeta: string }) {
  const {
    attachments,
    removeAttachment,
    clearAttachments,
    applyAction,
    validateAction,
    describeLocation,
  } = useEditorDocumentCtx()

  const [mensajes, setMensajes] = useState<MensajeLocal[]>([])
  const [borrador, setBorrador] = useState('')
  const [pensando, setPensando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, pensando])

  const enviar = async () => {
    const contenido = borrador.trim()
    if (!contenido || pensando) return
    const nuevo: MensajeLocal = {
      rol: 'usuario',
      contenido,
      ...(attachments.length
        ? {
            bloques: attachments.map(a => a.id),
            etiquetas: attachments.map(a => a.etiqueta),
          }
        : {}),
    }
    const conversacion = [...mensajes, nuevo]
    setMensajes(conversacion)
    setBorrador('')
    setError(null)
    setPensando(true)
    try {
      const respuesta = await api.asistente(
        carpeta,
        conversacion.map(({ rol, contenido, bloques }) => ({
          rol,
          contenido,
          ...(bloques?.length ? { bloques } : {}),
        })),
      )
      setMensajes([
        ...conversacion,
        {
          rol: 'asistente',
          contenido: respuesta.mensaje,
          ...(respuesta.tipo === 'accionable' ? { acciones: respuesta.acciones } : {}),
        },
      ])
      clearAttachments()
    } catch (e) {
      setError((e as Error).message)
      setMensajes(mensajes)
      setBorrador(contenido)
    } finally {
      setPensando(false)
    }
  }

  return (
    <aside className="asistente" aria-label="Asistente Salman">
      <header className="asistente-cabecera">
        <span className="asistente-avatar">🤖</span>
        <strong>Asistente Salman</strong>
      </header>

      <div className="asistente-mensajes">
        {mensajes.length === 0 && !pensando && (
          <p className="asistente-bienvenida">
            Conozco el fuente de esta clase. Pregúntame lo que quieras — y con el 💬 de
            cualquier bloque puedes señalarme la parte exacta de la que hablamos.
          </p>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`burbuja burbuja-${m.rol}`}>
            {m.etiquetas && (
              <span className="burbuja-adjuntos">📎 {m.etiquetas.join(' · ')}</span>
            )}
            {m.contenido}
            {m.rol === 'asistente' && m.acciones && (
              <AccionesAsistente
                acciones={m.acciones}
                validar={(accion) => validateAction(accion)}
                describir={(accion) => describeLocation(accion)}
                aplicar={applyAction}
              />
            )}
          </div>
        ))}
        {pensando && <div className="burbuja burbuja-asistente pensando"><LoadingMessage text="Pensando..." /></div>}
        {error && <BaseMessage type="error" message={error} />}
        <div ref={finRef} />
      </div>

      {attachments.length > 0 && (
        <div className="asistente-adjuntos">
          {attachments.map(a => (
            <AttachmentChip
              key={a.id}
              label={a.etiqueta}
              onRemove={() => removeAttachment(a.id)}
            />
          ))}
        </div>
      )}

      <form
        className="asistente-entrada"
        onSubmit={(e) => { e.preventDefault(); enviar() }}
      >
        <input
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          placeholder={attachments.length ? 'Pregunta sobre lo señalado…' : 'Pregúntame algo…'}
          disabled={pensando}
          aria-label="Mensaje para el asistente"
        />
        <button type="submit" disabled={!borrador.trim() || pensando} title="Enviar">
          ➤
        </button>
      </form>
    </aside>
  )
}
