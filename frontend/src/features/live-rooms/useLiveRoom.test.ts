import { describe, expect, it } from 'vitest'
import type { LiveMessage } from '../../shared/api/types'
import { mergeMessages } from './useLiveRoom'

const message = (id: number, content = `m${id}`): LiveMessage => ({
  id, user_id: 'u', display_name: 'Okur', kind: 'text', content, created_at: '2026-11-01T10:00:00Z',
})

describe('canlı oda mesajları', () => {
  it('yeni mesajları sıraya göre ekler, tekrarları atar', () => {
    const merged = mergeMessages([message(1), message(3)], [message(2), message(3, 'güncel')])
    expect(merged.map((m) => m.id)).toEqual([1, 2, 3])
    expect(merged[2].content).toBe('güncel')
  })

  it('en fazla son 300 mesajı tutar', () => {
    const many = Array.from({ length: 320 }, (_, index) => message(index + 1))
    const merged = mergeMessages([], many)
    expect(merged).toHaveLength(300)
    expect(merged[0].id).toBe(21)
  })

  it('yeni mesaj yoksa aynı listeyi döndürür', () => {
    const current = [message(1)]
    expect(mergeMessages(current, [])).toBe(current)
  })
})
