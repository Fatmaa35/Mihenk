import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { OCRQuoteScannerModal } from './OCRQuoteScannerModal'
import { LiveReadingRoom } from './LiveReadingRoom'


type WeeklySummary = {
  start_date: string
  end_date: string
  minutes_read: number
  pages_read: number
  sessions: number
  books_finished: number
  recommendations: Array<{ id: string; title: string; author: string }>
}

type Onboarding = {
  liked_book_ids: string[]
  liked_authors: string[]
  preferred_genres: string[]
  pace_preference: 'slow' | 'medium' | 'fast' | 'mixed'
  onboarding_completed: boolean
  tasks: Array<{ key: string; title: string; done: boolean }>
}

type Preferences = {
  consent_granted: boolean
  weekly_digest: boolean
  recommendations: boolean
  price_drops: boolean
  stock_updates: boolean
  social_updates: boolean
  frequency: 'instant' | 'daily' | 'weekly' | 'off'
}

type ReadingList = {
  id: string
  title: string
  description: string
  visibility: string
  share_token: string
  item_count?: number
}

type Club = {
  id: string
  name: string
  description: string
  rules?: string
  role: string
  invite_code?: string
  member_count?: number
}

type Book = {
  id: string
  title: string
  author: string
  page_count?: number
  cover_url?: string
}

type Milestone = {
  percent: number
  page: number
  title: string
  reached: boolean
}

type UserProgress = {
  book_id: string
  current_page: number
  total_pages?: number
  daily_target_pages?: number
  percent?: number
  days_left?: number
  projected_finish_date?: string
  milestones?: Milestone[]
  in_library?: boolean
}

type ClubMember = {
  user_id: string
  role: string
  joined_at: string
  display_name: string
}

type ClubRead = {
  book_id: string
  title: string
  author: string
  cover_url?: string
  page_count?: number
  status: string
  joint_progress_percent?: number
  active_readers_count?: number
  start_date?: string
  target_date?: string
}

type Discussion = {
  id: string
  club_id: string
  book_id: string
  book_title?: string
  display_name?: string
  content?: string
  page_number?: number
  chapter_title?: string
  discussion_type?: string
  is_spoiler_locked?: boolean
  created_at: string
  reactions?: {
    thoughtful: number
    agree: number
    heart: number
    bookmark: number
  }
  user_reactions?: string[]
}

type ClubEvent = {
  id: string
  club_id: string
  title: string
  description: string
  event_type: 'kickoff' | 'midpoint' | 'final' | 'general'
  event_date: string
  location: string
  creator_name: string
  rsvp_counts: {
    attending: number
    maybe: number
    declined: number
  }
  user_rsvp?: 'attending' | 'maybe' | 'declined' | null
}

type ClubPollOption = {
  id: string
  book_id: string
  title: string
  author: string
  cover_url?: string
  vote_count: number
  selected: boolean
}

type ClubPoll = {
  id: string
  title: string
  status: string
  options: ClubPollOption[]
}

type ClubBadge = {
  code: string
  title: string
  description: string
  icon: string
}

type ClubStats = {
  member_count: number
  total_discussions: number
  completed_books_count: number
}

type ClubDetail = {
  id: string
  name: string
  description: string
  rules?: string
  visibility: string
  invite_code?: string
  role: string
  owner_id?: string
  members: ClubMember[]
  reads: ClubRead[]
  active_read?: ClubRead | null
  user_progress: UserProgress[]
  discussions: Discussion[]
  upcoming_spoilers_count?: number
  events: ClubEvent[]
  polls: ClubPoll[]
  stats: ClubStats
  badges: ClubBadge[]
}

const GENRES = ['Roman', 'Bilim Kurgu', 'Fantastik', 'Polisiye', 'Tarih', 'Psikoloji', 'Felsefe', 'Şiir']

export function ProductGrowthHub() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null)
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [lists, setLists] = useState<ReadingList[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [activeClub, setActiveClub] = useState<ClubDetail | null>(null)
  const [clubTab, setClubTab] = useState<'lobby' | 'reading' | 'discussions' | 'live_room' | 'events' | 'library' | 'stats'>('reading')
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false)
  const [discContent, setDiscContent] = useState('')
  const [discPage, setDiscPage] = useState('')
  const [discType, setDiscType] = useState('discussion')
  const [genres, setGenres] = useState<string[]>([])
  const [authors, setAuthors] = useState('')
  const [pace, setPace] = useState<'slow' | 'medium' | 'fast' | 'mixed'>('mixed')
  const [csvText, setCsvText] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [targetDailyPages, setTargetDailyPages] = useState<number>(10)
  const clubWorkspaceRef = useRef<HTMLElement>(null)

  async function load() {
    setLoading(true)
    setStatus('')
    const results = await Promise.allSettled([
      api<WeeklySummary>('/me/weekly-summary'),
      api<Onboarding>('/me/onboarding'),
      api<Preferences>('/me/notification-preferences'),
      api<ReadingList[]>('/me/reading-lists'),
      api<Club[]>('/me/book-clubs'),
      api<Book[]>('/books'),
    ])
    if (results[0].status === 'fulfilled') setSummary(results[0].value)
    if (results[1].status === 'fulfilled') {
      setOnboarding(results[1].value)
      setAuthors(results[1].value.liked_authors.join(', '))
      setGenres(results[1].value.preferred_genres || [])
      setPace(results[1].value.pace_preference || 'mixed')
    }
    if (results[2].status === 'fulfilled') setPreferences(results[2].value)
    if (results[3].status === 'fulfilled') setLists(results[3].value)
    if (results[4].status === 'fulfilled') setClubs(results[4].value)
    if (results[5].status === 'fulfilled') setBooks(results[5].value)
    if (results.some((item) => item.status === 'rejected')) {
      setStatus('Bazı ürün verileri yüklenemedi; yeniden deneyebilirsin.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function saveTaste(event: FormEvent) {
    event.preventDefault()
    setStatus('Kaydediliyor…')
    const saved = await api<Onboarding>('/me/onboarding', {
      method: 'PUT',
      body: JSON.stringify({
        liked_authors: authors
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 20),
        liked_book_ids: [],
        preferred_genres: genres,
        pace_preference: pace,
        tone_preference: 'balanced',
        focus_preference: 'balanced',
        completed: true,
      }),
    })
    setOnboarding(saved)
    setStatus('Zevk profilin önerilere eklendi.')
  }

  async function importCSV(event: FormEvent) {
    event.preventDefault()
    setStatus('Kitaplık içe aktarılıyor…')
    const result = await api<{
      imported: number
      catalog_matches: number
      custom_books: number
      errors: string[]
    }>('/me/library/import', { method: 'POST', body: JSON.stringify({ csv_text: csvText }) })
    setStatus(
      `${result.imported} kitap aktarıldı · ${result.catalog_matches} katalog eşleşmesi · ${result.custom_books} kişisel kayıt.`,
    )
    setCsvText('')
    window.dispatchEvent(new CustomEvent('pkm-refresh'))
  }

  async function loadFile(file?: File) {
    if (file) setCsvText(await file.text())
  }

  async function savePreferences(next: Preferences) {
    setPreferences(next)
    await api('/me/notification-preferences', { method: 'PUT', body: JSON.stringify(next) })
    setStatus('Bildirim tercihlerin kaydedildi.')
  }

  async function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await api('/me/reading-lists', {
      method: 'POST',
      body: JSON.stringify({
        title: data.get('title'),
        description: data.get('description'),
        visibility: data.get('visibility'),
      }),
    })
    event.currentTarget.reset()
    await load()
  }

  async function createClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const detail = await api<ClubDetail>('/me/book-clubs', {
      method: 'POST',
      body: JSON.stringify({
        name: data.get('name'),
        description: data.get('description'),
        rules: data.get('rules') || '',
        visibility: data.get('visibility') || 'private',
      }),
    })
    event.currentTarget.reset()
    await load()
    setActiveClub(detail)
    setClubTab('lobby')
    setStatus('Kulübün başarıyla oluşturuldu!')
  }

  async function joinClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('Kulübe katılınıyor…')
    try {
      const detail = await api<ClubDetail>('/me/book-clubs/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: data.get('invite_code') }),
      })
      form.reset()
      await load()
      setActiveClub(detail)
      setClubTab('reading')
      setStatus('Kulübe katıldın. Aktif okumaya hoş geldin!')
      requestAnimationFrame(() =>
        clubWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Kulübe katılınamadı.')
    }
  }

  async function openClub(clubId: string) {
    setStatus('Kulüp açılıyor…')
    try {
      const detail = await api<ClubDetail>(`/me/book-clubs/${clubId}`)
      setActiveClub(detail)
      setClubTab('reading')
      setStatus('')
      requestAnimationFrame(() =>
        clubWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Kulüp açılamadı.')
    }
  }

  async function handleJoinReading(bookId: string) {
    if (!activeClub) return
    setStatus('Kitaplığına ekleniyor ve okuma başlatılıyor…')
    try {
      const detail = await api<ClubDetail>(`/me/book-clubs/${activeClub.id}/join-reading`, {
        method: 'POST',
        body: JSON.stringify({
          book_id: bookId,
          daily_target_pages: targetDailyPages,
          shelf: 'reading',
        }),
      })
      setActiveClub(detail)
      setStatus(`Okumaya katıldın! Günlük hedefin: günde ${targetDailyPages} sayfa.`)
      window.dispatchEvent(new CustomEvent('pkm-refresh'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Okumaya katılınamadı.')
    }
  }

  async function saveClubProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClub) return
    const data = new FormData(event.currentTarget)
    const bookId = String(data.get('book_id'))
    const pageNum = Number(data.get('current_page'))
    const dailyTarget = Number(data.get('daily_target_pages')) || targetDailyPages
    const book = books.find((item) => item.id === bookId)
    try {
      const detail = await api<ClubDetail>(`/me/book-clubs/${activeClub.id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({
          book_id: bookId,
          current_page: pageNum,
          total_pages: book?.page_count || null,
          daily_target_pages: dailyTarget,
        }),
      })
      setActiveClub(detail)
      setStatus(`İlerlemen kaydedildi (s. ${pageNum}). Ulaştığın tartışmalar açıldı!`)
      window.dispatchEvent(new CustomEvent('pkm-refresh'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'İlerleme kaydedilemedi.')
    }
  }

  async function createDiscussion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClub) return
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      const detail = await api<ClubDetail>(`/me/book-clubs/${activeClub.id}/discussions`, {
        method: 'POST',
        body: JSON.stringify({
          book_id: data.get('book_id'),
          content: data.get('content'),
          page_number: data.get('page_number') ? Number(data.get('page_number')) : null,
          chapter_title: data.get('chapter_title') || null,
          discussion_type: data.get('discussion_type') || 'discussion',
        }),
      })
      setActiveClub(detail)
      form.reset()
      setStatus('Paylaşımın kulüp tartışmalarına eklendi.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Tartışma oluşturulamadı.')
    }
  }

  async function toggleReaction(discussionId: string, reactionType: string) {
    if (!activeClub) return
    try {
      const detail = await api<ClubDetail>(
        `/me/book-clubs/${activeClub.id}/discussions/${discussionId}/reactions`,
        {
          method: 'POST',
          body: JSON.stringify({ reaction_type: reactionType }),
        },
      )
      setActiveClub(detail)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Tepki kaydedilemedi.')
    }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClub) return
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      const detail = await api<ClubDetail>(`/me/book-clubs/${activeClub.id}/events`, {
        method: 'POST',
        body: JSON.stringify({
          title: data.get('title'),
          description: data.get('description'),
          event_type: data.get('event_type') || 'general',
          event_date: data.get('event_date'),
          location: data.get('location') || '',
        }),
      })
      setActiveClub(detail)
      form.reset()
      setStatus('Yeni kulüp buluşması takvime eklendi.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Etkinlik oluşturulamadı.')
    }
  }

  async function rsvpEvent(eventId: string, rsvpStatus: 'attending' | 'maybe' | 'declined') {
    if (!activeClub) return
    try {
      const detail = await api<ClubDetail>(
        `/me/book-clubs/${activeClub.id}/events/${eventId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: rsvpStatus }),
        },
      )
      setActiveClub(detail)
      setStatus(`Katılım durumun kaydedildi: ${rsvpStatus === 'attending' ? 'Katılıyorum' : rsvpStatus === 'maybe' ? 'Belki' : 'Katılamıyorum'}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Katılım durumu kaydedilemedi.')
    }
  }

  async function createPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClub) return
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      const detail = await api<ClubDetail>(`/me/book-clubs/${activeClub.id}/polls`, {
        method: 'POST',
        body: JSON.stringify({
          title: data.get('title'),
          option_book_ids: data.getAll('option_book_ids'),
        }),
      })
      setActiveClub(detail)
      form.reset()
      setStatus('Yeni kitap oylaması açıldı.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Oylama açılamadı.')
    }
  }

  async function vote(pollId: string, optionId: string) {
    if (!activeClub) return
    try {
      const detail = await api<ClubDetail>(
        `/me/book-clubs/${activeClub.id}/polls/${pollId}/vote`,
        {
          method: 'PUT',
          body: JSON.stringify({ option_id: optionId }),
        },
      )
      setActiveClub(detail)
      setStatus('Oyun kaydedildi!')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Oy verilemedi.')
    }
  }

  async function saveClubRead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClub) return
    const data = new FormData(event.currentTarget)
    try {
      const detail = await api<ClubDetail>(`/me/book-clubs/${activeClub.id}/reads`, {
        method: 'PUT',
        body: JSON.stringify({
          book_id: data.get('book_id'),
          status: data.get('status') || 'reading',
          start_date: data.get('start_date') || null,
          target_date: data.get('target_date') || null,
        }),
      })
      setActiveClub(detail)
      setStatus('Kulübün okuma planı güncellendi.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Okuma güncellenemedi.')
    }
  }

  async function updateMemberRole(targetUserId: string, nextRole: string) {
    if (!activeClub) return
    try {
      const detail = await api<ClubDetail>(
        `/me/book-clubs/${activeClub.id}/members/${targetUserId}/role`,
        {
          method: 'PUT',
          body: JSON.stringify({ role: nextRole }),
        },
      )
      setActiveClub(detail)
      setStatus('Üye yetkisi güncellendi.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Yetki güncellenemedi.')
    }
  }

  const activeRead = activeClub?.active_read || activeClub?.reads.find((r) => r.status === 'reading') || null
  const activeUserProgress = activeClub?.user_progress.find((p) => activeRead && p.book_id === activeRead.book_id)

  if (loading) {
    return (
      <div className="growth-skeleton" role="status" aria-label="Okur merkezi yükleniyor">
        <i />
        <i />
        <i />
      </div>
    )
  }

  return (
    <section className="growth-hub" aria-labelledby="growth-title">
      <header className="growth-hero">
        <div className="growth-hero-text">
          <p className="product-eyebrow">OKUR MERKEZİ & KİTAP KULÜPLERİ</p>
          <h1 id="growth-title">Mihenk Topluluğu & Kişisel Yolculuğun</h1>
          <p>
            Birlikte oku, yol haritasında ortak ilerle, spoiler korumalı derin tartışmalara katıl ve rozetler kazan.
          </p>
        </div>
        <button type="button" className="btn-growth-refresh" onClick={load}>
          <span>🔄</span> Yenile
        </button>
      </header>

      {status && (
        <p className="growth-status" role="status">
          {status}
        </p>
      )}

      <div className="growth-grid">
        <article className="growth-card growth-weekly">
          <div className="card-header-line">
            <p className="product-eyebrow">BU HAFTA</p>
            <h2>Okuma özetin</h2>
          </div>
          <div className="growth-metrics">
            <div className="growth-metric-card">
              <span className="metric-icon">⏱️</span>
              <span className="metric-num">{summary?.minutes_read || 0}</span>
              <span className="metric-label">dakika</span>
            </div>
            <div className="growth-metric-card">
              <span className="metric-icon">📄</span>
              <span className="metric-num">{summary?.pages_read || 0}</span>
              <span className="metric-label">sayfa</span>
            </div>
            <div className="growth-metric-card">
              <span className="metric-icon">🎯</span>
              <span className="metric-num">{summary?.sessions || 0}</span>
              <span className="metric-label">seans</span>
            </div>
            <div className="growth-metric-card">
              <span className="metric-icon">📚</span>
              <span className="metric-num">{summary?.books_finished || 0}</span>
              <span className="metric-label">biten kitap</span>
            </div>
          </div>
          <h3 className="section-subheading">Bu hafta senin için</h3>
          <ul className="recommendations-clean-list">
            {summary?.recommendations.slice(0, 3).map((book) => (
              <li key={book.id} className="rec-book-item">
                <div className="rec-book-info">
                  <strong className="rec-book-title">{book.title}</strong>
                  <span className="rec-book-author">{book.author}</span>
                </div>
                <span className="rec-book-badge">Öneri</span>
              </li>
            ))}
          </ul>
        </article>

        <form className="growth-card" onSubmit={saveTaste}>
          <div className="card-header-line">
            <p className="product-eyebrow">60 SANİYELİK ZEVK TESTİ</p>
            <h2>Okuma pusulan</h2>
          </div>
          <label className="field-group">
            <span className="field-label">Sevdiğin yazarlar</span>
            <input
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="Ursula K. Le Guin, Oğuz Atay, Tolstoy…"
            />
          </label>
          <fieldset className="field-group">
            <legend className="field-label">Türler</legend>
            <div className="growth-chips">
              {GENRES.map((genre) => {
                const isSelected = genres.includes(genre)
                return (
                  <label key={genre} className={`growth-chip-label ${isSelected ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        setGenres((current) =>
                          current.includes(genre)
                            ? current.filter((v) => v !== genre)
                            : [...current, genre],
                        )
                      }
                    />
                    <span>{isSelected ? `✓ ${genre}` : genre}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="field-group">
            <span className="field-label">Tempo tercihin</span>
            <div className="pace-pills">
              {[
                { id: 'mixed', label: 'Karışık', desc: 'Dengeli' },
                { id: 'slow', label: 'Sakin', desc: '5-10 sf/gün' },
                { id: 'medium', label: 'Orta', desc: '15-25 sf/gün' },
                { id: 'fast', label: 'Hızlı', desc: '30+ sf/gün' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pace-pill ${pace === p.id ? 'active' : ''}`}
                  onClick={() => setPace(p.id as typeof pace)}
                >
                  <strong>{p.label}</strong>
                  <small>{p.desc}</small>
                </button>
              ))}
            </div>
          </div>
          <button className="primary btn-submit-taste">Profili tamamla</button>
          <ul className="growth-tasks-list">
            {onboarding?.tasks.map((task) => (
              <li className={`growth-task-item ${task.done ? 'done' : ''}`} key={task.key}>
                <span className="task-indicator">{task.done ? '✓' : '○'}</span>
                <span>{task.title}</span>
              </li>
            ))}
          </ul>
        </form>

        <form className="growth-card" onSubmit={importCSV}>
          <div className="card-header-line">
            <p className="product-eyebrow">KİTAPLIK AKTARIMI</p>
            <h2>CSV’den içe aktar</h2>
          </div>
          <p className="card-description">Goodreads veya başlık/yazar/raf sütunları olan bir CSV kullanabilirsin.</p>
          <label className="growth-file">
            <span className="field-label">CSV Dosyası Seç</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => loadFile(e.target.files?.[0])}
            />
          </label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'Title,Author,Exclusive Shelf\nDune,Frank Herbert,read'}
            required
            rows={4}
          />
          <button className="primary btn-submit-taste">Kitaplığı aktar</button>
        </form>

        {preferences && (
          <article className="growth-card">
            <div className="card-header-line">
              <p className="product-eyebrow">BİLDİRİM KONTROLÜ</p>
              <h2>Ne zaman haber verelim?</h2>
            </div>
            <label className="growth-switch main-consent">
              <input
                type="checkbox"
                checked={preferences.consent_granted}
                onChange={(e) =>
                  savePreferences({ ...preferences, consent_granted: e.target.checked })
                }
              />
              <strong>Açık bildirim izni</strong>
            </label>
            <div className="preferences-group">
              {[
                ['weekly_digest', 'Haftalık okuma özeti'],
                ['recommendations', 'Kişisel öneriler'],
                ['price_drops', 'Fiyat düşüşleri'],
                ['stock_updates', 'Yeni baskı ve stok'],
                ['social_updates', 'Kulüp ve topluluk gelişmeleri'],
              ].map(([key, label]) => (
                <label className="growth-switch" key={key}>
                  <input
                    type="checkbox"
                    disabled={!preferences.consent_granted}
                    checked={Boolean(preferences[key as keyof Preferences])}
                    onChange={(e) =>
                      savePreferences({ ...preferences, [key]: e.target.checked })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <label className="field-group" style={{ marginTop: '12px' }}>
              <span className="field-label">Bildirim Sıklığı</span>
              <select
                value={preferences.frequency}
                disabled={!preferences.consent_granted}
                onChange={(e) =>
                  savePreferences({
                    ...preferences,
                    frequency: e.target.value as Preferences['frequency'],
                  })
                }
              >
                <option value="instant">Anında</option>
                <option value="daily">Günlük özet</option>
                <option value="weekly">Haftalık özet</option>
                <option value="off">Kapalı</option>
              </select>
            </label>
          </article>
        )}

        <article className="growth-card">
          <div className="card-header-line">
            <p className="product-eyebrow">PAYLAŞILABİLİR LİSTELER</p>
            <h2>Okuma listelerin</h2>
          </div>
          <form onSubmit={createList} style={{ display: 'grid', gap: '10px' }}>
            <input name="title" placeholder="Örn. Sonbahar okumaları" required />
            <textarea name="description" placeholder="Liste notu (isteğe bağlı)..." rows={2} />
            <select name="visibility" defaultValue="unlisted">
              <option value="private">Özel</option>
              <option value="unlisted">Bağlantıya sahip olanlar</option>
              <option value="public">Herkese açık</option>
            </select>
            <button className="primary btn-submit-taste">Liste oluştur</button>
          </form>
          <ul className="unified-resource-list">
            {lists.map((list) => (
              <li key={list.id} className="resource-list-row">
                <div className="resource-info">
                  <strong>{list.title}</strong>
                  <span>
                    {list.visibility === 'unlisted' ? '🔗 Bağlantıyla' : list.visibility === 'public' ? '🌍 Herkese Açık' : '🔒 Özel'} · {list.item_count || 0} kitap
                  </span>
                </div>
                {list.visibility !== 'private' && (
                  <button
                    type="button"
                    className="btn-resource-action"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${location.origin}/shared/reading-lists/${list.share_token}`,
                      )
                    }
                  >
                    Bağlantıyı kopyala
                  </button>
                )}
              </li>
            ))}
          </ul>
        </article>

        <article className="growth-card">
          <div className="card-header-line">
            <p className="product-eyebrow">KİTAP KULÜPLERİ</p>
            <h2>Kulüplerim & Katıl</h2>
          </div>
          <form onSubmit={createClub} style={{ display: 'grid', gap: '10px' }}>
            <input name="name" placeholder="Kulüp adı (örn. Mihenk Klasikler Kulübü)" required />
            <textarea name="description" placeholder="Kulübün amacı, okuma vizyonu..." rows={2} />
            <textarea name="rules" placeholder="Kulüp kuralları (spoiler hassasiyeti, tempo...)" rows={2} />
            <select name="visibility" defaultValue="unlisted">
              <option value="private">Özel</option>
              <option value="unlisted">Davetle Giriş (Önerilen)</option>
              <option value="public">Herkese Açık</option>
            </select>
            <button className="primary btn-submit-taste">Kulüp oluştur</button>
          </form>
          <form className="growth-join-form" onSubmit={joinClub}>
            <label className="field-group">
              <span className="field-label">Davet kodun var mı?</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  name="invite_code"
                  placeholder="Davet kodunu yapıştır"
                  minLength={8}
                  required
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn-join-invite">Katıl</button>
              </div>
            </label>
          </form>
          <div className="club-unified-container">
            <h3 className="section-subheading" style={{ margin: '14px 0 8px' }}>Kayıtlı Kulüplerin</h3>
            {clubs.length === 0 ? (
              <p className="card-empty-hint">Henüz bir kulübe üye değilsin. Yukarıdan yeni bir kulüp kur veya davet koduyla katıl!</p>
            ) : (
              <ul className="unified-resource-list">
                {clubs.map((club) => (
                  <li key={club.id} className="resource-list-row">
                    <div className="resource-info">
                      <strong className="club-row-name">{club.name}</strong>
                      <span className="club-row-role">
                        {club.role === 'owner' ? '👑 Kurucu' : club.role === 'moderator' ? '🛡️ Moderatör' : '📖 Üye'}
                      </span>
                    </div>
                    <div className="club-row-actions">
                      <button type="button" className="btn-club-primary" onClick={() => openClub(club.id)}>
                        Kulübü Aç
                      </button>
                      {club.invite_code && (
                        <button
                          type="button"
                          className="btn-club-secondary"
                          title="Davet kodunu kopyala"
                          onClick={() => {
                            navigator.clipboard.writeText(club.invite_code!)
                            setStatus('Davet kodu panoya kopyalandı!')
                          }}
                        >
                          Kodu Kopyala
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        {activeClub && (
          <article ref={clubWorkspaceRef} className="growth-card club-workspace">
            <header>
              <div>
                <p className="product-eyebrow">KULÜP MERKEZİ</p>
                <h2>{activeClub.name}</h2>
                <p>{activeClub.description || 'Kitapları birlikte derinlemesine keşfetme alanı.'}</p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', fontSize: '0.82rem', color: '#4a5b53' }}>
                  <span>👥 {activeClub.stats?.member_count || activeClub.members?.length || 1} Üye</span>
                  <span>·</span>
                  <span>Rolün: <strong>{activeClub.role === 'owner' ? '👑 Sahip' : activeClub.role === 'moderator' ? '🛡️ Moderatör' : '📖 Üye'}</strong></span>
                  {activeClub.invite_code && (
                    <>
                      <span>·</span>
                      <button
                        type="button"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(activeClub.invite_code!)
                          setStatus('Davet kodu panoya kopyalandı!')
                        }}
                      >
                        🔑 Davet Kodu: {activeClub.invite_code.slice(0, 8)}…
                      </button>
                    </>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setActiveClub(null)}>
                Kulübü Kapat
              </button>
            </header>

            {/* 7 Nav Tabs */}
            <nav className="club-nav-tabs" aria-label="Kulüp sekmeleri">
              <button
                type="button"
                className={clubTab === 'reading' ? 'active' : ''}
                onClick={() => setClubTab('reading')}
              >
                📖 Aktif Okuma & Yol Haritası
              </button>
              <button
                type="button"
                className={clubTab === 'discussions' ? 'active' : ''}
                onClick={() => setClubTab('discussions')}
              >
                💬 Bölüm Tartışmaları {activeClub.upcoming_spoilers_count ? `(🔒 ${activeClub.upcoming_spoilers_count} Kilitli)` : ''}
              </button>
              <button
                type="button"
                className={clubTab === 'live_room' ? 'active live-room-tab-btn' : 'live-room-tab-btn'}
                onClick={() => setClubTab('live_room')}
              >
                🎙️ Birlikte Okuyoruz (Canlı Oda)
              </button>
              <button
                type="button"
                className={clubTab === 'events' ? 'active' : ''}
                onClick={() => setClubTab('events')}
              >
                📅 Etkinlikler & Buluşmalar ({activeClub.events?.length || 0})
              </button>
              <button
                type="button"
                className={clubTab === 'lobby' ? 'active' : ''}
                onClick={() => setClubTab('lobby')}
              >
                🏛️ Kulüp Lobisi & Kurallar
              </button>
              <button
                type="button"
                className={clubTab === 'library' ? 'active' : ''}
                onClick={() => setClubTab('library')}
              >
                📚 Kulüp Kitaplığı & Oylamalar
              </button>
              <button
                type="button"
                className={clubTab === 'stats' ? 'active' : ''}
                onClick={() => setClubTab('stats')}
              >
                🏆 İstatistikler & Rozetler ({activeClub.badges?.length || 0})
              </button>
            </nav>

            <div className="club-tab-content">
              {/* TAB 1: AKTİF OKUMA & YOL HARİTASI */}
              {clubTab === 'reading' && (
                <div className="club-grid-2">
                  <div className="club-card-section">
                    <h3>Ayın Aktif Kitabı</h3>
                    {activeRead ? (
                      <div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                          {activeRead.cover_url && (
                            <img
                              src={activeRead.cover_url}
                              alt={activeRead.title}
                              style={{ width: '80px', height: '115px', objectFit: 'cover', borderRadius: '8px' }}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#13392c' }}>
                              {activeRead.title}
                            </h4>
                            <p style={{ margin: '0 0 8px', color: '#096e54', fontWeight: 600 }}>
                              {activeRead.author}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#65776f' }}>
                              {activeRead.page_count ? `${activeRead.page_count} sayfa` : 'Sayfa bilgisi belirtilmedi'}
                              {activeRead.target_date && ` · Hedef: ${activeRead.target_date}`}
                            </p>
                          </div>
                        </div>

                        {/* Joint progress */}
                        <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '12px', background: '#edf5f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#184737' }}>
                            <span>Ortak Kulüp İlerlemesi ({activeRead.active_readers_count || 0} okur)</span>
                            <span>%{activeRead.joint_progress_percent || 0}</span>
                          </div>
                          <div className="club-progress-bar-wrap">
                            <div
                              className="club-progress-bar-fill"
                              style={{ width: `${activeRead.joint_progress_percent || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Join Reading / Daily target selector */}
                        <div style={{ marginTop: '16px', borderTop: '1px solid #e1ebe5', paddingTop: '14px' }}>
                          {!activeUserProgress?.in_library ? (
                            <div style={{ display: 'grid', gap: '10px' }}>
                              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>
                                📌 Bu kitabı okuma listene ekle ve hedefini belirle:
                              </p>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem' }}>
                                <span>Günlük okuma hedefin:</span>
                                <select
                                  value={targetDailyPages}
                                  onChange={(e) => setTargetDailyPages(Number(e.target.value))}
                                  style={{ width: 'auto', padding: '6px 12px' }}
                                >
                                  <option value={5}>Günde 5 sayfa (Sakin)</option>
                                  <option value={10}>Günde 10 sayfa (İdeal)</option>
                                  <option value={20}>Günde 20 sayfa (Dinamik)</option>
                                  <option value={35}>Günde 35 sayfa (Hızlı)</option>
                                </select>
                              </label>
                              <button
                                type="button"
                                className="primary"
                                style={{ padding: '10px 16px', background: '#0a6e54', color: '#fff', border: 0, borderRadius: '10px', fontWeight: 700 }}
                                onClick={() => handleJoinReading(activeRead.book_id)}
                              >
                                Okumaya Katıl ve Kitaplığa Ekle
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.85rem', color: '#096a51', fontWeight: 700 }}>
                              ✓ Kitap kitaplığında aktif olarak okunuyor.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: '#687770' }}>Şu an belirlenmiş bir aktif okuma bulunmuyor.</p>
                    )}

                    {/* Owner controls for active read */}
                    {['owner', 'moderator'].includes(activeClub.role) && (
                      <div style={{ marginTop: '20px', borderTop: '1px solid #e1ebe5', paddingTop: '14px' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>⚙️ Kulüp Aktif Kitabını Belirle</h4>
                        <form onSubmit={saveClubRead}>
                          <select name="book_id" required defaultValue={activeRead?.book_id || ''}>
                            <option value="">Kitap Seç…</option>
                            {books.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.title} — {b.author}
                              </option>
                            ))}
                          </select>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input name="start_date" type="date" placeholder="Başlangıç" />
                            <input name="target_date" type="date" placeholder="Hedef bitiş" />
                          </div>
                          <button style={{ width: '100%' }}>Aktif Kitap Olarak Ata</button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Individual Roadmap & Progress Updater */}
                  <div className="club-card-section">
                    <h3>Okuma Yol Haritan & İlerlemen</h3>
                    {activeRead && (
                      <div>
                        {/* Interactive Roadmap */}
                        <div className="club-roadmap">
                          {activeUserProgress?.milestones?.map((m) => (
                            <div
                              key={m.percent}
                              className={`club-roadmap-node ${m.reached ? 'reached' : ''}`}
                            >
                              <div className="node-dot">{m.reached ? '✓' : `%${m.percent}`}</div>
                              <strong>{m.title}</strong>
                              <span>s. {m.page}</span>
                            </div>
                          ))}
                        </div>

                        {/* Pace projection summary */}
                        <div style={{ background: '#fff', border: '1px solid #dae5df', borderRadius: '12px', padding: '14px', margin: '16px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.78rem', color: '#687770' }}>Bireysel İlerleme</span>
                              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#144c3b' }}>
                                s. {activeUserProgress?.current_page || 0} / {activeUserProgress?.total_pages || activeRead.page_count || 200} (%{activeUserProgress?.percent || 0})
                              </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.78rem', color: '#687770' }}>Tahmini Bitiş</span>
                              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#096e54' }}>
                                {activeUserProgress?.days_left ? `${activeUserProgress.days_left} gün kaldı` : 'Tamamlandı! 🏆'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Progress logging form */}
                        <form onSubmit={saveClubProgress} style={{ display: 'grid', gap: '8px' }}>
                          <input type="hidden" name="book_id" value={activeRead.book_id} />
                          <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                            Bugün geldiğin sayfa:
                            <input
                              name="current_page"
                              type="number"
                              min="0"
                              max={activeRead.page_count || 9999}
                              defaultValue={activeUserProgress?.current_page || 0}
                              required
                            />
                          </label>
                          <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                            Günlük hedef (sayfa/gün):
                            <input
                              name="daily_target_pages"
                              type="number"
                              min="1"
                              max="300"
                              defaultValue={activeUserProgress?.daily_target_pages || 10}
                            />
                          </label>
                          <button className="primary" style={{ background: '#0a6e54', color: '#fff', border: 0, borderRadius: '10px', padding: '10px' }}>
                            İlerlemeyi Kaydet ve Tartışmaları Aç
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: BÖLÜM TARTIŞMALARI & SPOILER KORUMASI */}
              {clubTab === 'discussions' && (
                <div className="club-tab-content">
                  <div className="club-card-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0 }}>Yeni Alıntı, Yorum veya Soru Paylaş</h3>
                      <button
                        type="button"
                        className="btn-ocr-trigger"
                        onClick={() => setIsOCRModalOpen(true)}
                        style={{
                          background: 'linear-gradient(135deg, #0a6e54 0%, #1f9d78 100%)',
                          color: '#fff',
                          border: 0,
                          borderRadius: '8px',
                          padding: '7px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(10,110,84,0.25)',
                        }}
                      >
                        <span>📸</span> Kameradan Alıntı Tara (OCR)
                      </button>
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#65776f', margin: '0 0 14px' }}>
                      🛡️ <strong>Spoiler Koruması Aktif:</strong> Paylaştığın sayfa numarasına henüz ulaşmamış üyeler içeriği görmez.
                    </p>
                    <form onSubmit={createDiscussion} style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label style={{ fontSize: '0.84rem' }}>
                          Kitap
                          <select name="book_id" required defaultValue={activeRead?.book_id || ''}>
                            {activeClub.reads.map((r) => (
                              <option key={r.book_id} value={r.book_id}>
                                {r.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ fontSize: '0.84rem' }}>
                          Paylaşım Türü
                          <select
                            name="discussion_type"
                            value={discType}
                            onChange={(e) => setDiscType(e.target.value)}
                          >
                            <option value="discussion">💬 Tartışma & Yorum</option>
                            <option value="quote">📜 Alıntı & Pasaj</option>
                            <option value="question">❓ Kulübe Soru</option>
                            <option value="analysis">🔍 Karakter / Tematik Analiz</option>
                          </select>
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input name="chapter_title" placeholder="Bölüm / Konu başlığı (isteğe bağlı)" />
                        <input
                          name="page_number"
                          type="number"
                          min="1"
                          placeholder="Sayfa numarası (isteğe bağlı)"
                          value={discPage}
                          onChange={(e) => setDiscPage(e.target.value)}
                        />
                      </div>
                      <textarea
                        name="content"
                        placeholder="Bu bölüm ya da alıntı sende nasıl bir düşünce uyandırdı? Düşüncelerini kulüple paylaş…"
                        required
                        value={discContent}
                        onChange={(e) => setDiscContent(e.target.value)}
                        rows={4}
                      />
                      <button className="primary" style={{ background: '#0a6e54', color: '#fff', border: 0, padding: '10px' }}>
                        Kulüple Paylaş
                      </button>
                    </form>
                  </div>

                  <div className="club-card-section">
                    <h3>Tartışma Akışı</h3>
                    {activeClub.discussions.length === 0 ? (
                      <p style={{ color: '#687770' }}>Henüz bu kulüpte bir paylaşım yapılmadı. İlk kıvılcımı sen çak!</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {activeClub.discussions.map((item) => {
                          if (item.is_spoiler_locked) {
                            return (
                              <div key={item.id} className="spoiler-locked-card">
                                <span>🔒</span>
                                <div>
                                  <strong>s. {item.page_number} Tartışması Kilitli (Spoiler Koruması)</strong>
                                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem' }}>
                                    Bu bölüme ulaştığında ve sayfanı kaydettiğinde tartışma otomatik olarak açılacaktır.
                                  </p>
                                </div>
                              </div>
                            )
                          }

                          const typeBadge =
                            item.discussion_type === 'quote'
                              ? '📜 Alıntı'
                              : item.discussion_type === 'question'
                              ? '❓ Soru'
                              : item.discussion_type === 'analysis'
                              ? '🔍 Analiz'
                              : '💬 Tartışma'

                          return (
                            <div
                              key={item.id}
                              style={{
                                border: '1px solid #d9e5df',
                                borderRadius: '14px',
                                padding: '16px',
                                background: '#fff',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <strong style={{ fontSize: '0.95rem', color: '#133d30' }}>
                                    {item.display_name}
                                  </strong>
                                  <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: '#687b72' }}>
                                    {item.book_title}
                                    {item.page_number ? ` · s. ${item.page_number}` : ''}
                                    {item.chapter_title ? ` (${item.chapter_title})` : ''}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: '#edf6f1',
                                    color: '#08634c',
                                    fontWeight: 700,
                                  }}
                                >
                                  {typeBadge}
                                </span>
                              </div>

                              <p style={{ margin: '10px 0 12px', fontSize: '0.92rem', color: '#273630', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                {item.content}
                              </p>

                              {/* 4 Interactive Reactions Bar */}
                              <div className="club-reaction-bar">
                                {[
                                  { type: 'thoughtful', icon: '🤔', label: 'Düşündürücü' },
                                  { type: 'agree', icon: '👍', label: 'Katılıyorum' },
                                  { type: 'heart', icon: '❤️', label: 'Sevdim' },
                                  { type: 'bookmark', icon: '🔖', label: 'Not Aldım' },
                                ].map((rx) => {
                                  const count = item.reactions ? (item.reactions as Record<string, number>)[rx.type] || 0 : 0
                                  const isReacted = item.user_reactions?.includes(rx.type)
                                  return (
                                    <button
                                      key={rx.type}
                                      type="button"
                                      className={`club-reaction-btn ${isReacted ? 'active' : ''}`}
                                      onClick={() => toggleReaction(item.id, rx.type)}
                                      title={rx.label}
                                    >
                                      <span>{rx.icon}</span>
                                      <span>{rx.label}</span>
                                      {count > 0 && <strong>{count}</strong>}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: BİRLİKTE OKUYORUZ CANLI ODA */}
              {clubTab === 'live_room' && (
                <div className="club-tab-content">
                  <LiveReadingRoom
                    clubId={activeClub.id}
                    activeBookTitle={activeRead?.title}
                    activeBookId={activeRead?.book_id}
                    userCurrentPage={activeUserProgress?.current_page || 0}
                    onSessionFinished={() => openClub(activeClub.id)}
                  />
                </div>
              )}

              {/* TAB 4: ETKİNLİKLER & BULUŞMALAR */}
              {clubTab === 'events' && (
                <div className="club-grid-2">
                  <div className="club-card-section">
                    <h3>Kulüp Buluşmaları & Etkinlik Takvimi</h3>
                    {activeClub.events?.length === 0 ? (
                      <p style={{ color: '#687770' }}>Henüz planlanmış bir etkinlik bulunmuyor.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {activeClub.events?.map((ev) => (
                          <div key={ev.id} className="event-card">
                            <div className="event-card-header">
                              <span className={`event-type-badge event-type-${ev.event_type}`}>
                                {ev.event_type === 'kickoff'
                                  ? 'Başlangıç Buluşması'
                                  : ev.event_type === 'midpoint'
                                  ? 'Ara Değerlendirme'
                                  : ev.event_type === 'final'
                                  ? 'Kapanış Toplantısı'
                                  : 'Genel Buluşma'}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#6c7c74' }}>
                                📅 {ev.event_date ? new Date(ev.event_date).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Tarih belirtilmedi'}
                              </span>
                            </div>
                            <h4 style={{ margin: '4px 0 2px', fontSize: '1.05rem', color: '#16382c' }}>
                              {ev.title}
                            </h4>
                            <p style={{ margin: '0 0 6px', fontSize: '0.86rem', color: '#4d5d56' }}>
                              {ev.description}
                            </p>
                            {ev.location && (
                              <p style={{ margin: 0, fontSize: '0.8rem', color: '#096e54' }}>
                                📍 Konum / Bağlantı: {ev.location}
                              </p>
                            )}

                            {/* RSVP Counter & Choice */}
                            <div style={{ marginTop: '8px', borderTop: '1px solid #e9f0ec', paddingTop: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#55665f', marginBottom: '6px' }}>
                                <span>{ev.rsvp_counts.attending} Katılıyor · {ev.rsvp_counts.maybe} Belki · {ev.rsvp_counts.declined} Katılamıyor</span>
                                {ev.user_rsvp && <strong>Seçimin: {ev.user_rsvp === 'attending' ? 'Katılıyorum' : ev.user_rsvp === 'maybe' ? 'Belki' : 'Katılamıyorum'}</strong>}
                              </div>
                              <div className="rsvp-buttons">
                                <button
                                  type="button"
                                  className={`rsvp-btn ${ev.user_rsvp === 'attending' ? 'active' : ''}`}
                                  onClick={() => rsvpEvent(ev.id, 'attending')}
                                >
                                  ✅ Katılıyorum
                                </button>
                                <button
                                  type="button"
                                  className={`rsvp-btn ${ev.user_rsvp === 'maybe' ? 'active' : ''}`}
                                  onClick={() => rsvpEvent(ev.id, 'maybe')}
                                >
                                  🤔 Belki
                                </button>
                                <button
                                  type="button"
                                  className={`rsvp-btn ${ev.user_rsvp === 'declined' ? 'active' : ''}`}
                                  onClick={() => rsvpEvent(ev.id, 'declined')}
                                >
                                  ❌ Katılamıyorum
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Create event form (for owner / moderator) */}
                  {['owner', 'moderator'].includes(activeClub.role) ? (
                    <div className="club-card-section">
                      <h3>Yeni Etkinlik / Buluşma Oluştur</h3>
                      <form onSubmit={createEvent} style={{ display: 'grid', gap: '10px' }}>
                        <input name="title" placeholder="Buluşma başlığı (örn. Kapanış ve Kitap Sonu Değerlendirmesi)" required />
                        <select name="event_type" defaultValue="kickoff">
                          <option value="kickoff">🚀 Başlangıç Buluşması (Kickoff)</option>
                          <option value="midpoint">⚖️ Ara Değerlendirme Buluşması</option>
                          <option value="final">🎉 Kapanış Toplantısı ve Kitap Sonu</option>
                          <option value="general">☕ Genel Sohbet & Buluşma</option>
                        </select>
                        <input name="event_date" type="datetime-local" required />
                        <input name="location" placeholder="Online Meet / Zoom linki veya buluşma mekânı" />
                        <textarea name="description" placeholder="Etkinlik detayları ve gündem maddeleri..." />
                        <button className="primary" style={{ background: '#0a6e54', color: '#fff', border: 0, padding: '10px' }}>
                          Etkinliği Yayınla
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="club-card-section">
                      <h3>Kulüp Etkinlik Kuralları</h3>
                      <p style={{ fontSize: '0.88rem', color: '#55665f' }}>
                        Buluşmalar kulüp yöneticileri tarafından organize edilir. Başlangıç, ara ve final buluşmalarına katılarak kulüp kapanış değerlendirmesinde yer alabilir ve özel katılım rozetleri kazanabilirsiniz.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: KULÜP LOBİSİ & KURALLAR */}
              {clubTab === 'lobby' && (
                <div className="club-grid-2">
                  <div className="club-card-section">
                    <h3>Kulüp Lobisi & Kurallar</h3>
                    <div style={{ background: '#fff', border: '1px solid #dbe6df', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 6px', color: '#163a2d' }}>Kulüp Vizyonu</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#4a5c53' }}>
                        {activeClub.description || 'Henüz açıklama girilmedi.'}
                      </p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #dbe6df', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 6px', color: '#163a2d' }}>Kulüp Kuralları</h4>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#4a5c53', whiteSpace: 'pre-wrap' }}>
                        {activeClub.rules || '1. Spoiler korumasına dikkat ediniz.\n2. Tartışmalarda yapıcı ve düşünceyi derinleştirici yorumlar paylaşınız.\n3. Okuma hedefinize sadık kalmaya özen gösteriniz.'}
                      </p>
                    </div>

                    <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: '#edf7f1' }}>
                      <span style={{ fontSize: '0.8rem', color: '#096a51', fontWeight: 700 }}>Davet Bağlantısı ve Kodu</span>
                      <p style={{ margin: '4px 0 8px', fontSize: '0.88rem', wordBreak: 'break-all' }}>
                        <code>{activeClub.invite_code}</code>
                      </p>
                      <button
                        type="button"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(activeClub.invite_code!)
                          setStatus('Davet kodu kopyalandı!')
                        }}
                      >
                        Davet Kodunu Kopyala
                      </button>
                    </div>
                  </div>

                  <div className="club-card-section">
                    <h3>Kulüp Üyeleri ({activeClub.members?.length || 1})</h3>
                    <ul style={{ margin: 0 }}>
                      {activeClub.members?.map((m) => (
                        <li key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{m.display_name}</strong>
                            <span>
                              {m.role === 'owner' ? '👑 Sahip' : m.role === 'moderator' ? '🛡️ Moderatör' : '📖 Üye'} · Katıldı: {new Date(m.joined_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          {activeClub.role === 'owner' && m.role !== 'owner' && (
                            <select
                              value={m.role}
                              onChange={(e) => updateMemberRole(m.user_id, e.target.value)}
                              style={{ width: 'auto', padding: '4px 8px', fontSize: '0.78rem' }}
                            >
                              <option value="member">Üye Yap</option>
                              <option value="moderator">Moderatör Yap</option>
                            </select>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 5: KULÜP KİTAPLIĞI & OYLAMALAR */}
              {clubTab === 'library' && (
                <div className="club-grid-2">
                  <div className="club-card-section">
                    <h3>Sıradaki Kitap Oylamaları</h3>
                    {['owner', 'moderator'].includes(activeClub.role) && (
                      <form onSubmit={createPoll} style={{ marginBottom: '20px', borderBottom: '1px solid #e1ebe5', paddingBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>Yeni Kitap Oylaması Başlat</h4>
                        <input name="title" placeholder="Örn: Gelecek Ay Hangi Klasik Kitabı Okuyalım?" required />
                        <select name="option_book_ids" multiple size={4} required style={{ margin: '8px 0' }}>
                          {books.map((book) => (
                            <option key={book.id} value={book.id}>
                              {book.title} — {book.author}
                            </option>
                          ))}
                        </select>
                        <small style={{ display: 'block', color: '#65776f', marginBottom: '8px' }}>
                          Ctrl tuşuna basılı tutarak birden fazla kitap seçebilirsin.
                        </small>
                        <button className="primary" style={{ background: '#0a6e54', color: '#fff', border: 0, padding: '8px 14px' }}>
                          Oylamayı Başlat
                        </button>
                      </form>
                    )}

                    {activeClub.polls?.length === 0 ? (
                      <p style={{ color: '#687770' }}>Şu an aktif bir oylama bulunmuyor.</p>
                    ) : (
                      activeClub.polls.map((poll) => (
                        <div key={poll.id} className="club-poll" style={{ background: '#fff', border: '1px solid #d9e5df', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                          <strong style={{ fontSize: '1rem', color: '#144636' }}>{poll.title}</strong>
                          <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                            {poll.options.map((option) => (
                              <button
                                key={option.id}
                                className={option.selected ? 'selected' : ''}
                                type="button"
                                onClick={() => vote(poll.id, option.id)}
                                style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}
                              >
                                <span>{option.title} — {option.author}</span>
                                <strong>{option.vote_count} Oy {option.selected ? '✓' : ''}</strong>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="club-card-section">
                    <h3>Kulüp Geçmişi & Tamamlanan Okumalar</h3>
                    {activeClub.reads.filter((r) => r.status === 'completed').length === 0 ? (
                      <p style={{ color: '#687770' }}>Henüz tamamlanan bir kulüp okuması yok.</p>
                    ) : (
                      <ul style={{ margin: 0 }}>
                        {activeClub.reads
                          .filter((r) => r.status === 'completed')
                          .map((r) => (
                            <li key={r.book_id}>
                              <div>
                                <strong>{r.title}</strong>
                                <span>{r.author} · Tamamlandı 🏆</span>
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: İSTATİSTİKLER & ROZETLER */}
              {clubTab === 'stats' && (
                <div className="club-tab-content">
                  <div className="club-card-section">
                    <h3>Kulüp İstatistikleri</h3>
                    <div className="growth-metrics">
                      <b>
                        {activeClub.stats?.member_count || activeClub.members?.length || 1}
                        <small>Toplam Üye</small>
                      </b>
                      <b>
                        {activeClub.stats?.total_discussions || activeClub.discussions?.length || 0}
                        <small>Tartışma & Alıntı</small>
                      </b>
                      <b>
                        {activeClub.stats?.completed_books_count || 0}
                        <small>Tamamlanan Kitap</small>
                      </b>
                      <b>
                        {activeClub.events?.length || 0}
                        <small>Buluşma / Etkinlik</small>
                      </b>
                    </div>
                  </div>

                  <div className="club-card-section">
                    <h3>Kazanılan Kulüp Rozetleri</h3>
                    <div className="club-grid-3">
                      {activeClub.badges?.map((badge) => (
                        <div key={badge.code} className="badge-item">
                          <div className="badge-icon">{badge.icon}</div>
                          <strong>{badge.title}</strong>
                          <p>{badge.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>
        )}
      </div>

      <OCRQuoteScannerModal
        isOpen={isOCRModalOpen}
        onClose={() => setIsOCRModalOpen(false)}
        initialBookTitle={activeClub?.active_read?.title}
        onUseQuote={(quoteText, pageNum) => {
          setDiscContent(quoteText)
          if (pageNum) setDiscPage(pageNum.toString())
          setDiscType('quote')
          setClubTab('discussions')
          setStatus('📸 Alıntı metni başarıyla tartışma formuna aktarıldı!')
        }}
      />
    </section>
  )
}
