import { Icon } from './Icon.tsx'
import './Toast.css'

export type ToastVariant = 'success' | 'error' | 'info'

interface ToastProps {
  variant: ToastVariant
  message: string
}

const iconMap: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
}

export function Toast({ variant, message }: ToastProps) {
  return (
    <div className={`global-toast ${variant}`.trim()} role="status" aria-live="polite">
      <Icon name={iconMap[variant]} className="global-toast-icon" />
      <span>{message}</span>
    </div>
  )
}
