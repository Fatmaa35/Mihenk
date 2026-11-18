import Constants from 'expo-constants'
import { clearTokens, readTokens, writeTokens } from './session'

/**
 * Sunucuyla konuşan tek kapı. Mobil oturum çerez değil başlık taşır:
 * istekte `X-Mihenk-Client: mobile`, `Authorization: Bearer …` ve
 * `x-refresh-token`; yanıtta sunucu anahtarı yenilediyse
 * `X-Session-Access-Token` / `X-Session-Refresh-Token` döner ve burada
 * güvenli depoya yazılır.
 */

const FALLBACK_API = 'https://mihenk-web-production.onrender.com'

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  FALLBACK_API

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Oturumun düştüğünü arayüze bildirir; dinleyen oturum sağlayıcısıdır. */
type Listener = () => void
const expiredListeners = new Set<Listener>()

export function onSessionExpired(listener: Listener): () => void {
  expiredListeners.add(listener)
  return () => expiredListeners.delete(listener)
}

async function storeRotatedTokens(response: Response): Promise<void> {
  const access = response.headers.get('X-Session-Access-Token')
  const refresh = response.headers.get('X-Session-Refresh-Token')
  if (access || refresh) {
    await writeTokens({
      ...(access ? { access } : {}),
      ...(refresh ? { refresh } : {}),
    })
  }
}

async function failure(response: Response): Promise<never> {
  let message = 'Bir şeyler ters gitti. Lütfen tekrar dene.'
  try {
    const body = await response.json()
    const detail = body?.detail
    if (typeof detail === 'string') message = detail
    else if (detail?.message) message = detail.message
  } catch {
    // Gövde JSON değilse varsayılan mesaj kalır.
  }
  throw new ApiError(message, response.status)
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = await readTokens()
  const headers = new Headers(init.headers)
  headers.set('X-Mihenk-Client', 'mobile')
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (tokens.access) headers.set('Authorization', `Bearer ${tokens.access}`)
  if (tokens.refresh) headers.set('x-refresh-token', tokens.refresh)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. Bağlantını kontrol et.', 0)
  }
  await storeRotatedTokens(response)

  if (response.status === 401) {
    await clearTokens()
    expiredListeners.forEach((listener) => listener())
    throw new ApiError('Oturumun sona erdi, yeniden giriş yap.', 401)
  }
  if (!response.ok) return failure(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Giriş ve kayıt: anahtarlar gövdede değil yanıt başlıklarında gelir. */
export async function authenticate(path: '/auth/login' | '/auth/register', body: object): Promise<void> {
  const headers = new Headers({
    'X-Mihenk-Client': 'mobile',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  })
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. Bağlantını kontrol et.', 0)
  }
  if (!response.ok) return failure(response)
  const access = response.headers.get('X-Session-Access-Token')
  if (!access) throw new ApiError('Sunucu oturum anahtarı vermedi.', 500)
  await writeTokens({ access, refresh: response.headers.get('X-Session-Refresh-Token') })
}
