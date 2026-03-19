import { Icon } from './Icon.tsx'
import './EmptyState.css'

type EmptyStateType = 'no-data' | 'error' | 'no-permission' | '404'
type ExtendedEmptyStateType = EmptyStateType | 'network' | 'session-expired'

const iconMap: Record<ExtendedEmptyStateType, string> = {
  'no-data': 'inventory_2',
  error: 'error_outline',
  'no-permission': 'lock',
  '404': 'travel_explore',
  network: 'wifi_off',
  'session-expired': 'history',
}

interface EmptyStateProps {
  type: ExtendedEmptyStateType
  title: string
  description: string
  actionText: string
  onAction: () => void
}

export function EmptyState({
  type,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <section className="global-empty-state" role="status" aria-live="polite">
      <div className={`global-empty-state-icon ${type}`.trim()}>
        <Icon name={iconMap[type]} />
      </div>
      <div className="global-empty-state-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <button className="global-empty-state-action" type="button" onClick={onAction}>
        {actionText}
      </button>
    </section>
  )
}
