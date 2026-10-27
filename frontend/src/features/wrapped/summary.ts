import type { Badge, LibraryBook, ReadingDashboardDetails, ReadingSession } from '../../shared/api/types'

/**
 * "Mihenk Wrapped" yıllık okuma özeti. Tüm hesaplar istemcide, mevcut uç noktaların verisinden yapılır:
 * okuma takvimi, tür dağılımı, okuma seansları, bitirilen kitaplar ve rozetler.
 */

export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
export const WEEKDAYS = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi']

export type PersonaKey = 'marathoner' | 'explorer' | 'night_owl' | 'early_bird' | 'devourer' | 'deep_diver' | 'weekender' | 'devoted' | 'sprouting'

export type Persona = { key: PersonaKey; title: string; description: string }

export const PERSONAS: Record<PersonaKey, Omit<Persona, 'key'>> = {
  marathoner: { title: 'Maratoncu', description: 'Seriyi bozmayan, her gün birkaç sayfa da olsa kitabını açan okursun.' },
  explorer: { title: 'Kâşif', description: 'Tek bir rafa sığmıyorsun; türden türe geçip yeni dünyalar keşfediyorsun.' },
  night_owl: { title: 'Gece Kuşu', description: 'Ev sessizleşince başlıyorsun; en iyi sayfaların gece yarısına yakın çevriliyor.' },
  early_bird: { title: 'Sabahçı', description: 'Günün ilk ışığı ve ilk kahveyle birlikte kitabını açıyorsun.' },
  devourer: { title: 'Kitap Kurdu', description: 'Bir kitabı bitirmeden ötekine el atıyorsun; rafların hızla doluyor.' },
  deep_diver: { title: 'Derin Dalgıç', description: 'Kalın kitaplardan korkmuyorsun; uzun yolculukları seviyorsun.' },
  weekender: { title: 'Hafta Sonu Okuru', description: 'Hafta içi koşturuyor, cumartesi ve pazarı kitaplarına ayırıyorsun.' },
  devoted: { title: 'Sadık Okur', description: 'Sevdiğin türü biliyor ve ondan vazgeçmiyorsun.' },
  sprouting: { title: 'Filizlenen Okur', description: 'Okuma alışkanlığın yeni filizleniyor; gelecek yıl daha da büyüyecek.' },
}

export type WrappedSummary = {
  year: number
  pages: number
  booksFinished: number
  finishedBooks: LibraryBook[]
  activeDays: number
  longestStreak: number
  goal: { target: number; completed: number; percent: number }
  minutes: number
  sessions: number
  monthPages: number[]
  topMonth: { index: number; name: string; pages: number } | null
  topWeekday: { index: number; name: string } | null
  genres: { genre: string; count: number }[]
  topGenre: { genre: string; count: number; share: number } | null
  badges: Badge[]
  persona: Persona
  /** Okunan sayfalar üst üste konsa kaç santim olurdu (yaprak başına 0,1 mm, yaprak = 2 sayfa). */
  stackCm: number
  isEmpty: boolean
}

export type WrappedInput = {
  year: number
  dashboard: ReadingDashboardDetails
  sessions: ReadingSession[]
  readBooks: LibraryBook[]
  badges: Badge[]
}

const yearOf = (iso: string | null | undefined) => (iso ? Number(iso.slice(0, 4)) : Number.NaN)

/** Okur tipi: öncelik sırasıyla ilk eşleşen kural kazanır. */
export function choosePersona(stats: {
  longestStreak: number
  distinctGenres: number
  nightShare: number
  morningShare: number
  booksFinished: number
  averagePages: number
  weekendShare: number
  topGenreShare: number
  activeDays: number
}): Persona {
  const pick = (key: PersonaKey): Persona => ({ key, ...PERSONAS[key] })
  if (stats.activeDays < 5 && stats.booksFinished < 2) return pick('sprouting')
  if (stats.longestStreak >= 14) return pick('marathoner')
  if (stats.booksFinished >= 24) return pick('devourer')
  if (stats.nightShare >= 0.5) return pick('night_owl')
  if (stats.morningShare >= 0.5) return pick('early_bird')
  if (stats.distinctGenres >= 5) return pick('explorer')
  if (stats.averagePages >= 400) return pick('deep_diver')
  if (stats.weekendShare >= 0.6) return pick('weekender')
  if (stats.topGenreShare >= 0.6 && stats.booksFinished >= 3) return pick('devoted')
  return pick(stats.booksFinished >= 6 ? 'devourer' : 'sprouting')
}

export function buildWrapped({ year, dashboard, sessions, readBooks, badges }: WrappedInput): WrappedSummary {
  const calendar = dashboard.calendar.filter((day) => yearOf(day.activity_date) === year)
  const monthPages = Array.from({ length: 12 }, () => 0)
  const weekdayPages = Array.from({ length: 7 }, () => 0)
  let weekendDays = 0
  for (const day of calendar) {
    const date = new Date(`${day.activity_date}T12:00:00`)
    monthPages[date.getMonth()] += day.pages_read
    weekdayPages[date.getDay()] += day.pages_read
    if (date.getDay() === 0 || date.getDay() === 6) weekendDays += 1
  }
  const topMonthIndex = monthPages.reduce((best, pages, index) => (pages > monthPages[best] ? index : best), 0)
  const topWeekdayIndex = weekdayPages.reduce((best, pages, index) => (pages > weekdayPages[best] ? index : best), 0)

  const yearSessions = sessions.filter((session) => yearOf(session.session_date) === year)
  let night = 0
  let morning = 0
  for (const session of yearSessions) {
    const hour = new Date(session.created_at).getHours()
    if (hour >= 21 || hour < 4) night += 1
    else if (hour >= 5 && hour < 10) morning += 1
  }

  const finishedBooks = readBooks
    .filter((book) => yearOf(book.finished_at) === year)
    .sort((a, b) => (a.finished_at ?? '').localeCompare(b.finished_at ?? ''))
  const booksFinished = Math.max(finishedBooks.length, dashboard.goal.completed_books)
  const pagesOfFinished = finishedBooks.map((book) => book.total_pages ?? book.page_count ?? 0).filter((pages) => pages > 0)
  const averagePages = pagesOfFinished.length ? pagesOfFinished.reduce((sum, pages) => sum + pages, 0) / pagesOfFinished.length : 0

  const genres = [...dashboard.genre_distribution].sort((a, b) => b.count - a.count)
  const genreTotal = genres.reduce((sum, item) => sum + item.count, 0)
  const topGenre = genres[0] ? { ...genres[0], share: genreTotal ? genres[0].count / genreTotal : 0 } : null

  const pages = calendar.length ? calendar.reduce((sum, day) => sum + day.pages_read, 0) : dashboard.total_pages_read
  const activeDays = calendar.length || dashboard.active_days
  const yearBadges = badges.filter((badge) => badge.earned && yearOf(badge.earned_at) === year)

  const persona = choosePersona({
    longestStreak: dashboard.longest_streak,
    distinctGenres: genres.length,
    nightShare: yearSessions.length >= 3 ? night / yearSessions.length : 0,
    morningShare: yearSessions.length >= 3 ? morning / yearSessions.length : 0,
    booksFinished,
    averagePages,
    weekendShare: activeDays >= 5 ? weekendDays / activeDays : 0,
    topGenreShare: topGenre?.share ?? 0,
    activeDays,
  })

  return {
    year,
    pages,
    booksFinished,
    finishedBooks,
    activeDays,
    longestStreak: dashboard.longest_streak,
    goal: { target: dashboard.goal.target_books, completed: dashboard.goal.completed_books, percent: Math.round(dashboard.goal.progress_percent) },
    minutes: yearSessions.reduce((sum, session) => sum + session.duration_minutes, 0),
    sessions: yearSessions.length,
    monthPages,
    topMonth: monthPages[topMonthIndex] > 0 ? { index: topMonthIndex, name: MONTHS[topMonthIndex], pages: monthPages[topMonthIndex] } : null,
    topWeekday: weekdayPages[topWeekdayIndex] > 0 ? { index: topWeekdayIndex, name: WEEKDAYS[topWeekdayIndex] } : null,
    genres,
    topGenre,
    badges: yearBadges,
    persona,
    stackCm: Math.round((pages / 2) * 0.01 * 10) / 10,
    isEmpty: pages === 0 && booksFinished === 0,
  }
}

/** Ocak'ın ilk yarısında geçen yılın özeti, diğer zamanlarda bu yılınki öne çıkar. */
export function defaultWrappedYear(now = new Date()): number {
  return now.getMonth() === 0 && now.getDate() <= 15 ? now.getFullYear() - 1 : now.getFullYear()
}

/** Özet kartının Bugün ekranında öne çıkacağı dönem: aralık ayı ve ocağın ilk yarısı. */
export function isWrappedSeason(now = new Date()): boolean {
  return now.getMonth() === 11 || (now.getMonth() === 0 && now.getDate() <= 15)
}

/** Sayfaları gündelik bir karşılaştırmaya çevirir; büyük sayılar akılda daha kolay kalır. */
export function pagesComparison(pages: number): string {
  const novels = Math.round(pages / 320)
  if (novels >= 2) return `Bu, ortalama ${novels} romanın toplam uzunluğu demek.`
  if (pages >= 100) return 'Bir romanın yarısından fazlası, hem de kendi temponla.'
  return 'Her büyük okuma serüveni birkaç sayfayla başlar.'
}
