import { Icon } from './Icon.tsx'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmText: string
  cancelText?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmText,
  cancelText = '取消',
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="global-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="global-confirm-title">
      <div className="global-confirm-dialog">
        <div className={`global-confirm-icon ${tone}`.trim()}>
          <Icon name={tone === 'danger' ? 'warning' : 'help'} />
        </div>
        <h4 id="global-confirm-title">{title}</h4>
        <p>{description}</p>
        <div className="global-confirm-actions">
          <button className="global-confirm-button secondary" type="button" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`global-confirm-button ${tone}`.trim()} type="button" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
