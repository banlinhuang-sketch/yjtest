import './LoadingSkeleton.css'

export type LoadingSkeletonVariant = 'case-card' | 'detail-panel' | 'table-card' | 'knowledge-card'

interface LoadingSkeletonProps {
  variant?: LoadingSkeletonVariant
  className?: string
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function LoadingSkeleton({
  variant = 'case-card',
  className = '',
}: LoadingSkeletonProps) {
  if (variant === 'detail-panel') {
    return (
      <div className={classNames('loading-skeleton loading-skeleton-panel', className)} aria-hidden="true">
        <div className="loading-skeleton-row">
          <span className="loading-skeleton-block chip" />
          <span className="loading-skeleton-block meta short" />
        </div>
        <span className="loading-skeleton-block title wide" />
        <div className="loading-skeleton-grid">
          <span className="loading-skeleton-block metric" />
          <span className="loading-skeleton-block metric" />
          <span className="loading-skeleton-block metric" />
        </div>
        <span className="loading-skeleton-block text" />
        <span className="loading-skeleton-block text wide" />
        <span className="loading-skeleton-block text" />
      </div>
    )
  }

  if (variant === 'table-card') {
    return (
      <div className={classNames('loading-skeleton loading-skeleton-table', className)} aria-hidden="true">
        <div className="loading-skeleton-row">
          <span className="loading-skeleton-block title short" />
          <span className="loading-skeleton-block chip" />
        </div>
        <div className="loading-skeleton-table-rows">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="loading-skeleton-row">
              <span className="loading-skeleton-block meta short" />
              <span className="loading-skeleton-block text" />
              <span className="loading-skeleton-block chip" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'knowledge-card') {
    return (
      <div className={classNames('loading-skeleton loading-skeleton-knowledge', className)} aria-hidden="true">
        <span className="loading-skeleton-icon" />
        <span className="loading-skeleton-block title short" />
        <span className="loading-skeleton-block text" />
        <span className="loading-skeleton-block text wide" />
        <div className="loading-skeleton-row">
          <span className="loading-skeleton-block meta short" />
          <span className="loading-skeleton-block chip" />
        </div>
      </div>
    )
  }

  return (
    <div className={classNames('loading-skeleton loading-skeleton-card', className)} aria-hidden="true">
      <div className="loading-skeleton-row">
        <span className="loading-skeleton-block meta short" />
        <span className="loading-skeleton-block chip" />
      </div>
      <span className="loading-skeleton-block title" />
      <span className="loading-skeleton-block text wide" />
      <div className="loading-skeleton-row">
        <span className="loading-skeleton-block chip" />
        <span className="loading-skeleton-block chip" />
        <span className="loading-skeleton-block meta short align-end" />
      </div>
    </div>
  )
}
