import { useEffect, useState } from 'react'
import './BaseMessage.css'

const DURACION_MS = 4000

export function BaseMessage ({
  message,
  children,
  type = 'info',
  toast = false,
}: {
  message?: string
  children?: React.ReactNode
  type?: 'warning' | 'error' | 'success' | 'info'
  toast?: boolean
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!toast) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), DURACION_MS)
    return () => clearTimeout(id)
  }, [toast, message, children])

  if (!visible) return null

  const classes = [
    'base-message',
    `base-message--${type}`,
    toast && 'base-message--toast',
  ].filter(Boolean).join(' ')

  return (
    <p className={classes} role="alert">
      {children ?? message}
    </p>
  )
}