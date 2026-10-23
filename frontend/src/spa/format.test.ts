import { describe, expect, it } from 'vitest'
import { formatMoney, formatRelative, initials } from './format'

describe('format', () => {
  it('formats minor currency units in Turkish', () => {
    expect(formatMoney(12345)).toMatch(/123,45/)
    expect(formatMoney(null)).toBe('—')
  })
  it('describes relative times', () => {
    const now = Date.parse('2026-10-23T12:00:00Z')
    expect(formatRelative('2026-10-23T11:59:40Z', now)).toBe('şimdi')
    expect(formatRelative('2026-10-23T09:00:00Z', now)).toBe('3 saat önce')
    expect(formatRelative('2026-10-22T12:00:00Z', now)).toBe('dün')
  })
  it('builds initials with Turkish casing', () => {
    expect(initials('ilkay şahin')).toBe('İŞ')
  })
})
