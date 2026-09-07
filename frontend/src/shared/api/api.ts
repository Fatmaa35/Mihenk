export class ApiError extends Error {
  readonly code?: 'network' | 'timeout'
  readonly requestId?: string | null

  constructor(
    message: string,
    readonly status: number,
    options: { code?: 'network' | 'timeout'; requestId?: string | null; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.code = options.code
    this.requestId = options.requestId
  }
}

function errorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !('detail' in body)) return undefined
  const detail = (body as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : ''))
      .filter(Boolean)
      .join(' ')
  }
  if (detail && typeof detail === 'object') {
    const value = detail as { message?: unknown; code?: unknown }
    return value.message ? String(value.message) : value.code ? String(value.code) : undefined
  }
  return undefined
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch (cause) {
    const timedOut = cause instanceof DOMException && cause.name === 'AbortError'
    throw new ApiError(
      timedOut ? 'İstek zaman aşımına uğradı. Lütfen tekrar dene.' : 'API sunucusuna ulaşılamadı.',
      0,
      { code: timedOut ? 'timeout' : 'network', cause },
    )
  }
  if (response.status === 204) return undefined as T
  const body: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(errorDetail(body) || 'İşlem tamamlanamadı.', response.status, {
      requestId: response.headers.get('X-Request-ID'),
    })
  }
  if (path.includes('/community') && body && typeof body === 'object' && 'comments' in body) {
    const comments = (body as { comments?: unknown }).comments
    if (Array.isArray(comments)) {
      comments.forEach((comment) => {
        if (comment?.author && comment.author_id) comment.author.id = comment.author_id
      })
    }
  }
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
