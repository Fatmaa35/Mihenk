import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ApiError } from '../../shared/api/api'
import { useBootstrap } from '../../shared/api/queries'
import type { Bootstrap } from '../../shared/api/types'
import { ErrorState, Spinner } from '../../shared/ui'
import { peekEmailLink } from '../emailLink'
import { routes } from '../routes'

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401

/** Oturum yoksa giriş sayfasına yönlendirir; varsa çocukları gösterir. */
export function RequireSession({ children }: { children: ReactNode }) {
  const session = useBootstrap()
  const location = useLocation()
  if (session.isPending) return <div className="mh-fullscreen"><Spinner label="Oturum kontrol ediliyor" /></div>
  if (session.isError) {
    if (isUnauthorized(session.error)) return <Navigate to={routes.signIn} replace state={{ from: location.pathname + location.search }} />
    return <div className="mh-fullscreen"><ErrorState message={session.error.message} onRetry={() => session.refetch()} /></div>
  }
  return <>{children}</>
}

/** Giriş sayfası: oturum zaten açıksa kullanıcıyı geldiği yere geri gönderir. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const session = useBootstrap()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const settingPassword = ['recovery', 'invite'].includes(peekEmailLink().kind)
  if (session.isPending && !settingPassword) return <div className="mh-fullscreen"><Spinner /></div>
  if (session.isSuccess && !settingPassword) return <Navigate to={from && from !== routes.signIn ? from : routes.today} replace />
  return <>{children}</>
}

/** RequireSession altında kullanılır; veri her zaman yüklüdür. */
export function useSession(): Bootstrap {
  const { data } = useBootstrap()
  if (!data) throw new Error('useSession yalnızca RequireSession içinde kullanılabilir.')
  return data
}
