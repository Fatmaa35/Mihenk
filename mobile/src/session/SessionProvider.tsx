import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, authenticate, onSessionExpired } from '../api/client'
import { clearTokens, readTokens } from '../api/session'

type Status = 'loading' | 'signed-out' | 'signed-in'

type SessionValue = {
  status: Status
  signIn: (email: string, password: string) => Promise<void>
  signUp: (displayName: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

/**
 * Oturumun açık mı kapalı mı olduğunu tek yerde tutar. Açılışta güvenli depodaki
 * anahtarla sunucuya sorar; anahtar geçersizse (ya da sonradan düşerse) uygulama
 * giriş ekranına döner.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const client = useQueryClient()

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      const { access } = await readTokens()
      if (!access) {
        if (!cancelled) setStatus('signed-out')
        return
      }
      try {
        await api('/auth/me')
        if (!cancelled) setStatus('signed-in')
      } catch {
        if (!cancelled) setStatus('signed-out')
      }
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => onSessionExpired(() => {
    client.clear()
    setStatus('signed-out')
  }), [client])

  const signIn = useCallback(async (email: string, password: string) => {
    await authenticate('/auth/login', { email: email.trim(), password })
    await client.invalidateQueries()
    setStatus('signed-in')
  }, [client])

  const signUp = useCallback(async (displayName: string, email: string, password: string) => {
    await authenticate('/auth/register', {
      display_name: displayName.trim(), email: email.trim(), password,
    })
    await client.invalidateQueries()
    setStatus('signed-in')
  }, [client])

  const signOut = useCallback(async () => {
    try {
      await api<void>('/auth/logout', { method: 'POST' })
    } catch {
      // Sunucuya ulaşılamasa da yerel oturum kapatılır.
    }
    await clearTokens()
    client.clear()
    setStatus('signed-out')
  }, [client])

  const value = useMemo(() => ({ status, signIn, signUp, signOut }), [status, signIn, signUp, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession yalnızca SessionProvider içinde kullanılır.')
  return value
}
