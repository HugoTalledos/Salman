interface AttachmentChipProps {
  label: string
  onRemove: () => void
}

export function AttachmentChip({ label, onRemove }: AttachmentChipProps) {
  return (
    <span className="adjunto">
      {label}
      <button
        type="button"
        onClick={onRemove}
        title="Quitar"
        aria-label={`Quitar ${label}`}
      >
        ✕
      </button>
    </span>
  )
}
