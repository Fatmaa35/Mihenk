import type { Dispatch, FormEventHandler, RefObject, SetStateAction } from 'react'
import { LiveReadingRoom } from '../../LiveReadingRoom'
import type { Book, ClubDetail, ClubRead, UserProgress } from './types'

type ClubWorkspaceProps = {
  activeClub: ClubDetail
  activeRead: ClubRead | null
  activeUserProgress?: UserProgress
  clubWorkspaceRef: RefObject<HTMLElement | null>
  clubTab: ClubTab
  setClubTab: Dispatch<SetStateAction<ClubTab>>
  setActiveClub: Dispatch<SetStateAction<ClubDetail | null>>
  setStatus: Dispatch<SetStateAction<string>>
  books: Book[]
  targetDailyPages: number
  setTargetDailyPages: Dispatch<SetStateAction<number>>
  discContent: string
  discPage: string
  discType: string
  setDiscContent: Dispatch<SetStateAction<string>>
  setDiscPage: Dispatch<SetStateAction<string>>
  setDiscType: Dispatch<SetStateAction<string>>
  setIsOCRModalOpen: Dispatch<SetStateAction<boolean>>
  handleJoinReading: (bookId: string) => Promise<void>
  saveClubProgress: FormEventHandler<HTMLFormElement>
  createDiscussion: FormEventHandler<HTMLFormElement>
  toggleReaction: (discussionId: string, reactionType: string) => Promise<void>
  createEvent: FormEventHandler<HTMLFormElement>
  rsvpEvent: (eventId: string, status: 'attending' | 'maybe' | 'declined') => Promise<void>
  createPoll: FormEventHandler<HTMLFormElement>
  vote: (pollId: string, optionId: string) => Promise<void>
  saveClubRead: FormEventHandler<HTMLFormElement>
  updateMemberRole: (targetUserId: string, nextRole: string) => Promise<void>
  openClub: (clubId: string) => Promise<void>
}

export type ClubTab = 'lobby' | 'reading' | 'discussions' | 'live_room' | 'events' | 'library' | 'stats'

export function ClubWorkspace({
  activeClub, activeRead, activeUserProgress, clubWorkspaceRef, clubTab, setClubTab,
  setActiveClub, setStatus, books, targetDailyPages, setTargetDailyPages,
  discContent, discPage, discType, setDiscContent, setDiscPage, setDiscType,
  setIsOCRModalOpen, handleJoinReading, saveClubProgress, createDiscussion,
  toggleReaction, createEvent, rsvpEvent, createPoll, vote, saveClubRead, updateMemberRole, openClub,
}: ClubWorkspaceProps) {
  return (
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

  )
}
