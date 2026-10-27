// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { Badge } from '../../shared/api/types'
import { newlyEarned, readSeen, writeSeen } from './celebration'

const badge = (code: string, earnedAt: string | null): Badge => ({
  code, name: code, description: '', icon: '', xp_reward: 10, progress: 1, goal: 1, progress_percent: 100,
  earned: Boolean(earnedAt), earned_at: earnedAt, showcased: false,
})

describe('rozet kutlaması', () => {
  beforeEach(() => localStorage.clear())

  it('ilk açılışta görülen rozet listesi yoktur', () => {
    expect(readSeen('u1')).toBeNull()
  })

  it('görülen rozetleri kullanıcıya özel saklar', () => {
    writeSeen('u1', ['first_shelf', 'first_shelf', 'reader_5'])
    expect([...(readSeen('u1') ?? [])]).toEqual(['first_shelf', 'reader_5'])
    expect(readSeen('u2')).toBeNull()
  })

  it('yalnızca görülmemiş ve kazanılmış rozetleri kazanılma sırasıyla döndürür', () => {
    const badges = [
      badge('streak_7', '2026-10-27T10:00:00Z'),
      badge('first_review', '2026-10-20T10:00:00Z'),
      badge('first_shelf', '2026-01-01T10:00:00Z'),
      badge('reader_25', null),
    ]
    expect(newlyEarned(badges, new Set(['first_shelf'])).map((item) => item.code)).toEqual(['first_review', 'streak_7'])
  })

  it('bozuk kayıtta çökmez', () => {
    localStorage.setItem('mihenk-seen-badges:u1', '{bozuk')
    expect(readSeen('u1')).toBeNull()
  })
})
