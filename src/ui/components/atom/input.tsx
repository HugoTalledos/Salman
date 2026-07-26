interface BaseInputProps {
  label: string
  placeholder?: string
  value: string
  onChange: (valor: string) => void
  className?: string
}

export function BaseInput({
  label,
  placeholder,
  value,
  onChange,
  className,
}: BaseInputProps) {
  return (
    <label>
      {label}
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
