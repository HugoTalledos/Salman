interface BaseChipProps {
  label: string
  key: string
  ariaPressed: boolean
  onChipSelected: (chip: string) => void
}

export function BaseChip ({
  label,
  key,
  onChipSelected,
  ariaPressed
}: BaseChipProps) {
  return (
    <button
      type="button"
      className="objetivo-chip"
      aria-pressed={ariaPressed}
      key={key}
      onClick={() => onChipSelected(key)}
    >
      { label }
    </button>
  )
}