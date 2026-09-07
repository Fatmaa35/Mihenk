import { describe, expect, it } from 'vitest'
import { parseEmailLink } from './email-links'

describe('email account setup links', () => {
  it.each(['invite', 'recovery'] as const)('opens password setup for %s', kind => {
    expect(parseEmailLink('', `#type=${kind}&access_token=valid-token&refresh_token=private`)).toEqual({ kind, token: 'valid-token' })
  })
  it('recognizes confirmation without retaining session credentials', () => {
    expect(parseEmailLink('', '#type=signup&access_token=private')).toEqual({ kind: 'signup' })
  })
  it('supports existing local recovery links', () => {
    expect(parseEmailLink('?recovery_token=local-token', '')).toEqual({ kind: 'recovery', token: 'local-token' })
  })
  it.each(['#type=invite', '#type=recovery', '#type=invite&access_token=token&error=access_denied'])('rejects incomplete or expired links: %s', hash => {
    expect(parseEmailLink('', hash)).toEqual({ kind: 'error' })
  })
  it('ignores ordinary navigation fragments', () => {
    expect(parseEmailLink('', '#reading')).toEqual({ kind: 'none' })
    expect(parseEmailLink('', '#type=untrusted&access_token=token')).toEqual({ kind: 'none' })
  })
})
