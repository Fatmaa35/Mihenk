import { isRouteErrorResponse, useRouteError } from 'react-router'
import { ErrorState } from '../../shared/ui'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : undefined
  return (
    <div className="mh-fullscreen">
      <ErrorState title="Bu sayfa açılamadı" message={message} onRetry={() => window.location.reload()} />
    </div>
  )
}
