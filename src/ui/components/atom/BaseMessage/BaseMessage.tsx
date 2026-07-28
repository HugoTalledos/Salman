import './BaseMessage.css'

export function BaseMessage ({
  message,
  type = 'info'
}: {
  message: string
  type?: 'warning' | 'error' | 'success' | 'info'
}) {
  return (
    <p className={`base-message base-message--${type}`} role="alert">{ message }</p>
  )
}