import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { OCRQuoteScannerModal } from './OCRQuoteScannerModal'
import { ClubWorkspace, type ClubTab } from './features/growth/ClubWorkspace'


import { GENRES, type WeeklySummary, type Onboarding, type Preferences, type ReadingList, type Club, type Book, type Milestone, type UserProgress, type ClubMember, type ClubRead, type Discussion, type ClubEvent, type ClubPollOption, type ClubPoll, type ClubBadge, type ClubStats, type ClubDetail } from './features/growth/types'
export function ProductGrowthHub() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null)
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [lists, setLists] = useState<ReadingList[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [activeClub, setActiveClub] = useState<ClubDetail | null>(null)
  const [clubTab, setClubTab] = useState<ClubTab>('reading')
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
          <ClubWorkspace
            activeClub={activeClub} activeRead={activeRead} activeUserProgress={activeUserProgress}
            clubWorkspaceRef={clubWorkspaceRef} clubTab={clubTab} setClubTab={setClubTab}
            setActiveClub={setActiveClub} setStatus={setStatus} books={books}
            targetDailyPages={targetDailyPages} setTargetDailyPages={setTargetDailyPages}
            discContent={discContent} discPage={discPage} discType={discType}
            setDiscContent={setDiscContent} setDiscPage={setDiscPage} setDiscType={setDiscType}
            setIsOCRModalOpen={setIsOCRModalOpen} handleJoinReading={handleJoinReading}
            saveClubProgress={saveClubProgress} createDiscussion={createDiscussion}
            toggleReaction={toggleReaction} createEvent={createEvent} rsvpEvent={rsvpEvent}
            createPoll={createPoll} vote={vote} saveClubRead={saveClubRead}
            updateMemberRole={updateMemberRole} openClub={openClub}
          />
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
