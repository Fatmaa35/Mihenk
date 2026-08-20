export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message) } }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers } })
  if (response.status === 204) return undefined as T
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(body.detail || 'İşlem tamamlanamadı.', response.status)
  return body as T
}

export class QueryCache {
  private values = new Map<string, { expires: number; value: unknown }>()
  async get<T>(key: string, loader: () => Promise<T>, ttl = 30_000): Promise<T> {
    const hit = this.values.get(key)
    if (hit && hit.expires > Date.now()) return hit.value as T
    const value = await loader(); this.values.set(key, { expires: Date.now() + ttl, value }); return value
  }
  invalidate(prefix = '') { for (const key of this.values.keys()) if (key.startsWith(prefix)) this.values.delete(key) }
}
export const queryCache = new QueryCache()
