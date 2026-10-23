import { EmailLink, parseEmailLink } from '../features/auth/email-links'

/**
 * Davet, parola sıfırlama ve doğrulama bağlantıları adres çubuğunda jeton taşır.
 * Uygulama açılırken jeton bir kez okunur, adresten hemen silinir ve yalnızca bellekte tutulur.
 */
let pending: EmailLink = { kind: 'none' }

export function captureEmailLink(): EmailLink {
  pending = parseEmailLink(window.location.search, window.location.hash)
  if (pending.kind !== 'none') window.history.replaceState({}, '', '/giris')
  return pending
}

export function peekEmailLink(): EmailLink {
  return pending
}

export function consumeEmailLink(): EmailLink {
  const link = pending
  pending = { kind: 'none' }
  return link
}
