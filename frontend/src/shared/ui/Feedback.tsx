import { ReactNode } from 'react'
import { Button } from './Button'

export function Spinner({ label = 'Yükleniyor' }: { label?: string }) {
  return (
    <div className="mh-loading" role="status">
      <span className="mh-spinner" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  )
}

export function Skeleton({ height = 16, width = '100%', radius = 8 }: { height?: number | string; width?: number | string; radius?: number }) {
  return <span className="mh-skeleton" style={{ height, width, borderRadius: radius }} aria-hidden="true" />
}

export function ErrorState({ title = 'Bir şeyler ters gitti', message, onRetry }: { title?: string; message?: ReactNode; onRetry?: () => void }) {
  return (
    <div className="mh-error" role="alert">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Tekrar dene</Button>}
    </div>
  )
}
