export type EmailLink =
  | { kind: 'invite' | 'recovery'; token: string }
  | { kind: 'signup' | 'error'; token?: never }
  | { kind: 'none'; token?: never }

export function parseEmailLink(search: string, hash: string): EmailLink {
  const query = new URLSearchParams(search)
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  if (query.has('error') || fragment.has('error') || query.has('error_code') || fragment.has('error_code')) return { kind: 'error' }
  const type = fragment.get('type')
  const token = fragment.get('access_token')
  if (type === 'invite' || type === 'recovery') return token ? { kind: type, token } : { kind: 'error' }
  if (type === 'signup') return token ? { kind: 'signup' } : { kind: 'error' }
  const recoveryToken = query.get('recovery_token')
  if (recoveryToken) return { kind: 'recovery', token: recoveryToken }
  return { kind: 'none' }
}
