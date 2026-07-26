interface BaseSelectProps {
  label: string
  placeholder?: string
  value: string
  options: string[]
  onSelect: (option: string) => void
}

export function BaseSelect({
  label,
  placeholder,
  value,
  options,
  onSelect,
}: BaseSelectProps) {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">{placeholder ?? '----'}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}
