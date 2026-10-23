import { ReactNode } from 'react'

type EmptyStateProps = { icon?: ReactNode; title: string; description?: string; action?: ReactNode }

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="mh-empty">
      {icon && <div className="mh-empty__icon" aria-hidden="true">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="mh-empty__action">{action}</div>}
    </div>
  )
}
