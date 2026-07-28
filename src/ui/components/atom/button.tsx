interface BaseButtonProps {
  label: string
  onClickBtn: (event: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  ariaLabel?: string
}

export function BaseButton ({
  label,
  onClickBtn,
  className,
  ariaLabel,
}: BaseButtonProps) {
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={onClickBtn}
    >
      { label }
    </button>
  )
}