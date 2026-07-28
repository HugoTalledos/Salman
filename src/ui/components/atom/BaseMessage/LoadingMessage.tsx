import './LoadingMessage.css'

export function LoadingMessage({ text = 'Cargando…' }: { text?: string }) {
  return <p className="loading-message">{text}</p>
}
