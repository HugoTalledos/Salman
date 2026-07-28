import './button.css'
type BaseButtonVariant = 'solid' | 'outline' | 'link'

interface BaseButtonProps {
  label: string
  onClickBtn: (event: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  ariaLabel?: string
  variant?: BaseButtonVariant
}

export function BaseButton ({
  label,
  onClickBtn,
  className,
  ariaLabel,
  variant,
}: BaseButtonProps) {
  const classes = ['base-button', variant && `base-button--${variant}`, className].filter(Boolean).join(' ')

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