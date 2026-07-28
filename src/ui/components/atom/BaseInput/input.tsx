import './input.css'

type BaseInputVariant = 'outline' | 'ghost'

interface BaseInputProps {
  label: string
  placeholder?: string
  value: string
  onChange: (valor: string) => void
  className?: string
  variant?: BaseInputVariant
}

export function BaseInput({
  label,
  placeholder,
  value,
  onChange,
  className,
  variant,
}: BaseInputProps) {
  const inputClasses = ['base-input', variant && `base-input--${variant}`, className].filter(Boolean).join(' ')

  return (
    <label className="base-input-label">
      {label}
      <input
        className={inputClasses}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
