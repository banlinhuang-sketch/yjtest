import { Icon } from './Icon.tsx'
import './WorkspaceSidebar.css'

export interface WorkspaceSidebarItem {
  key: string
  label: string
  icon: string
  sectionLabel?: string
}

interface WorkspaceSidebarProps {
  brandIcon: string
  brandTitle: string
  brandSubtitle?: string
  items: WorkspaceSidebarItem[]
  activeKey: string
  onSelect: (key: string) => void
  userName: string
  userRole?: string
  userInitials?: string
  theme?: 'dark' | 'light'
  className?: string
}

function getInitials(name: string, fallback?: string) {
  if (fallback) {
    return fallback
  }

  const tokens = name
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (tokens.length >= 2) {
    return `${tokens[0][0] ?? ''}${tokens[1][0] ?? ''}`.toUpperCase()
  }

  return name.slice(0, 1).toUpperCase()
}

export function WorkspaceSidebar({
  brandIcon,
  brandTitle,
  brandSubtitle,
  items,
  activeKey,
  onSelect,
  userName,
  userRole,
  userInitials,
  theme = 'dark',
  className = '',
}: WorkspaceSidebarProps) {
  return (
    <aside className={`workspace-sidebar workspace-sidebar--${theme} ${className}`.trim()}>
      <div className="workspace-sidebar-brand">
        <div className="workspace-sidebar-brand-mark">
          <Icon name={brandIcon} />
        </div>
        <div className="workspace-sidebar-brand-copy">
          <strong>{brandTitle}</strong>
          <span className={brandSubtitle ? '' : 'is-placeholder'} aria-hidden={brandSubtitle ? undefined : 'true'}>
            {brandSubtitle || '\u00A0'}
          </span>
        </div>
      </div>

      <nav className="workspace-sidebar-nav" aria-label="全局导航">
        {items.map((item, index) => {
          const previousSection = index > 0 ? items[index - 1]?.sectionLabel : undefined
          const section =
            item.sectionLabel && item.sectionLabel !== previousSection ? item.sectionLabel : null

          return (
            <div key={item.key} className="workspace-sidebar-nav-block">
              {section ? <div className="workspace-sidebar-section">{section}</div> : null}
              <button
                className={`workspace-sidebar-item ${item.key === activeKey ? 'is-active' : ''}`.trim()}
                type="button"
                data-testid={`sidebar-item-${item.key}`}
                onClick={() => onSelect(item.key)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            </div>
          )
        })}
      </nav>

      <div className="workspace-sidebar-footer">
        <div className="workspace-sidebar-avatar">{getInitials(userName, userInitials)}</div>
        <div className="workspace-sidebar-user">
          <strong>{userName}</strong>
          <span className={userRole ? '' : 'is-placeholder'} aria-hidden={userRole ? undefined : 'true'}>
            {userRole || '\u00A0'}
          </span>
        </div>
      </div>
    </aside>
  )
}
