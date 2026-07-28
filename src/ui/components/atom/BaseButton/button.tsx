import './button.css'
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
  const classes = ['base-button', className].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={classes}
      aria-label={ariaLabel}
      onClick={onClickBtn}
    >
      { label }
    </button>
  )
}