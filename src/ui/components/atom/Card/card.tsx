export function BaseCard({
  nombre,
  descripcion,
  etiqueta,
  disabled,
  variante,
  onClick,
}: {
  nombre: string
  descripcion: string
  etiqueta?: string
  disabled?: boolean
  variante?: 'blanca'
  onClick: () => void
}) {
  const className = ['tarjeta-scaffold', variante && `tarjeta-${variante}`]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={className} disabled={disabled} onClick={onClick}>
      <strong>{nombre}</strong>
      <span className="tarjeta-descripcion">{descripcion}</span>
      {etiqueta && <span className="tarjeta-pedagogia">{etiqueta}</span>}
    </button>
  )
}
