import { describe, expect, it } from 'vitest'
import type { Badge, LibraryBook, ReadingDashboardDetails, ReadingSession } from '../../shared/api/types'
import { buildWrapped, choosePersona, pagesComparison } from './summary'

const dashboard = (overrides: Partial<ReadingDashboardDetails> = {}): ReadingDashboardDetails => ({
  year: 2026,
  goal: { target_books: 12, completed_books: 3, progress_percent: 25, is_default: false },
  total_pages_read: 0,
  active_days: 0,
  current_streak: 2,
  longest_streak: 6,
  calendar: [
    { activity_date: '2026-03-07', pages_read: 40, books: 1 }, // cumartesi
    { activity_date: '2026-03-08', pages_read: 60, books: 1 }, // pazar
    { activity_date: '2026-10-21', pages_read: 30, books: 1 }, // çarşamba
    { activity_date: '2025-12-30', pages_read: 500, books: 1 }, // önceki yıl, sayılmamalı
  ],
  genre_distribution: [{ genre: 'Polisiye', count: 1 }, { genre: 'Roman', count: 2 }],
  series_progress: [],
  ...overrides,
})

const book = (id: string, finished: string | null, pages = 300): LibraryBook => ({
  id, title: id, author: 'Yazar', genre: 'Roman', shelf: 'read', is_favorite: false,
  current_page: pages, total_pages: pages, finished_at: finished,
})

const session = (date: string, hour: number, minutes = 20): ReadingSession => ({
  id: `${date}-${hour}`, book_id: 'x', custom_book_id: null, book_title: 'X', start_page: 0, end_page: 10, pages_read: 10,
  duration_minutes: minutes, session_date: date, created_at: new Date(2026, 2, 7, hour, 0).toISOString(),
})

const badge = (code: string, earnedAt: string | null): Badge => ({
  code, name: code, description: '', icon: '', xp_reward: 10, progress: 1, goal: 1, progress_percent: 100,
  earned: Boolean(earnedAt), earned_at: earnedAt, showcased: false,
})

describe('buildWrapped', () => {
  const summary = buildWrapped({
    year: 2026,
    dashboard: dashboard(),
    sessions: [session('2026-03-07', 22), session('2026-03-08', 23, 40), session('2025-12-30', 9)],
    readBooks: [book('a', '2026-03-08T10:00:00Z', 280), book('b', '2026-10-21T10:00:00Z', 520), book('eski', '2025-06-01T00:00:00Z')],
    badges: [badge('first_shelf', '2026-02-01T00:00:00Z'), badge('reader_5', null), badge('old', '2025-01-01T00:00:00Z')],
  })

  it('yalnızca seçilen yılın günlerini ve seanslarını sayar', () => {
    expect(summary.pages).toBe(130)
    expect(summary.activeDays).toBe(3)
    expect(summary.sessions).toBe(2)
    expect(summary.minutes).toBe(60)
  })

  it('en çok okunan ayı ve günü bulur', () => {
    expect(summary.topMonth).toEqual({ index: 2, name: 'Mart', pages: 100 })
    expect(summary.monthPages[9]).toBe(30)
    expect(summary.topWeekday?.name).toBe('pazar')
  })

  it('en sevilen türü payıyla birlikte verir', () => {
    expect(summary.topGenre).toEqual({ genre: 'Roman', count: 2, share: 2 / 3 })
  })

  it('bu yıl bitirilen kitapları ve kazanılan rozetleri seçer', () => {
    expect(summary.finishedBooks.map((item) => item.id)).toEqual(['a', 'b'])
    expect(summary.booksFinished).toBe(3) // hedefteki sayı daha büyükse o kullanılır
    expect(summary.badges.map((item) => item.code)).toEqual(['first_shelf'])
  })

  it('iki gece seansıyla okuru "Gece Kuşu" saymaz (en az üç seans gerekir)', () => {
    expect(summary.persona.key).not.toBe('night_owl')
  })

  it('hiç okuma yoksa boş özet döner', () => {
    const empty = buildWrapped({ year: 2026, dashboard: dashboard({ calendar: [], genre_distribution: [], goal: { target_books: 12, completed_books: 0, progress_percent: 0, is_default: true } }), sessions: [], readBooks: [], badges: [] })
    expect(empty.isEmpty).toBe(true)
    expect(empty.topMonth).toBeNull()
    expect(empty.persona.key).toBe('sprouting')
  })
})

describe('choosePersona', () => {
  const base = { longestStreak: 0, distinctGenres: 1, nightShare: 0, morningShare: 0, booksFinished: 4, averagePages: 250, weekendShare: 0, topGenreShare: 0.3, activeDays: 40 }
  it('kurallara öncelik sırasıyla bakar', () => {
    expect(choosePersona({ ...base, longestStreak: 20, nightShare: 0.9 }).key).toBe('marathoner')
    expect(choosePersona({ ...base, nightShare: 0.7 }).key).toBe('night_owl')
    expect(choosePersona({ ...base, distinctGenres: 6 }).key).toBe('explorer')
    expect(choosePersona({ ...base, averagePages: 480 }).key).toBe('deep_diver')
    expect(choosePersona({ ...base, weekendShare: 0.7 }).key).toBe('weekender')
    expect(choosePersona({ ...base, topGenreShare: 0.8 }).key).toBe('devoted')
  })
  it('az okuyan yeni kullanıcıya "Filizlenen Okur" der', () => {
    expect(choosePersona({ ...base, activeDays: 2, booksFinished: 0 }).key).toBe('sprouting')
  })
})

describe('pagesComparison', () => {
  it('sayfaları roman sayısına çevirir', () => {
    expect(pagesComparison(3200)).toContain('10 romanın')
    expect(pagesComparison(50)).toContain('birkaç sayfa')
  })
})
