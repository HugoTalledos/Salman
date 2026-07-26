interface BaseButtonProps {
  label: string
  onClickBtn: () => void
}

export function BaseButton ({
  label,
  onClickBtn
}: BaseButtonProps) {
  return (
    <button type="button" onClick={onClickBtn}>
      { label }
    </button>
  )
}