import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BookOpen, Flame, Search, Sparkles, Users } from 'lucide-react'
import { BookCard } from '../../features/catalog/BookCard'
import { BookDetailDialog } from '../../features/catalog/BookDetailDialog'
import { ProgressDialog } from '../../features/library/ProgressDialog'
import { libraryIndex, progressOf } from '../../features/library/shelves'
import { useBookClubs, useReadingDashboard, useUpsertLibraryEntry, useWeeklySummary } from '../../shared/api/queries'
import type { LibraryBook } from '../../shared/api/types'
import { BookCover, Button, EmptyState, ErrorState, Progress, Skeleton, Tile, useToast } from '../../shared/ui'
import { useSession } from '../layout/SessionGate'
import { routes } from '../routes'
import './pages.css'

function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 6) return 'İyi geceler'
  if (hour < 12) return 'Günaydın'
  if (hour < 18) return 'Selam'
  return 'İyi akşamlar'
}

function ContinueReading({ books, onProgress }: { books: LibraryBook[]; onProgress: (book: LibraryBook) => void }) {
  const [current, ...others] = books
  if (!current) {
    return (
      <Tile tone="mint" className="today__continue today__continue--empty" eyebrow="Okuma köşen">
        <h2>Şu an okuduğun bir kitap yok</h2>
        <p>Keşfet'ten bir kitap seç ya da kitaplığındaki “okuyacağım” rafından başla.</p>
        <div className="today__actions">
          <Link className="mh-button mh-button--secondary mh-button--md" to={routes.discover}>Kitap keşfet</Link>
          <Link className="mh-button mh-button--ghost mh-button--md" to={routes.library}>Kitaplığım</Link>
        </div>
      </Tile>
    )
  }
  const percent = progressOf(current)
  return (
    <Tile tone="mint" className="today__continue" as="section" aria-labelledby="continue-title">
      <BookCover id={current.id} title={current.title} author={current.author} coverUrl={current.cover_url} size="lg" />
      <div className="today__continue-body">
        <p className="mh-eyebrow">Devam ediyorsun</p>
        <h2 id="continue-title">{current.title}</h2>
        <p className="today__muted">
          {current.author}
          {current.total_pages ? ` · Sayfa ${current.current_page} / ${current.total_pages}` : ''}
        </p>
        <Progress value={percent} label={`${current.title} ilerlemesi`} />
        <div className="today__actions">
          <Link className="mh-button mh-button--secondary mh-button--md" to={routes.focus}>Seans başlat</Link>
          <Button variant="ghost" onClick={() => onProgress(current)}>İlerleme gir</Button>
        </div>
        {others.length > 0 && (
          <p className="today__others">
            Ayrıca okuyorsun: {others.slice(0, 2).map((book) => book.title).join(', ')}
            {others.length > 2 ? ` ve ${others.length - 2} kitap daha` : ''}
          </p>
        )}
      </div>
    </Tile>
  )
}

function ClubTile() {
  const clubs = useBookClubs()
  if (clubs.isPending) return <Tile tone="peach" className="today__club"><Skeleton height={24} width="60%" /></Tile>
  const club = clubs.data?.[0]
  return (
    <Tile tone="peach" className="today__club" eyebrow={club ? 'Kulübün' : 'Birlikte oku'}>
      <h3>{club ? club.name : 'Bir kitap kulübüne katıl'}</h3>
      <p className="today__muted">
        {club ? (club.description || 'Tartışmalar, etkinlikler ve ortak okuma ilerlemesi seni bekliyor.') : 'Arkadaşlarınla ortak bir kitap seç, ilerlemenizi birlikte takip edin.'}
      </p>
      <Link to={routes.clubs} className="today__link"><Users size={16} aria-hidden="true" /> {club ? 'Kulübe git' : 'Kulüpleri gör'}</Link>
    </Tile>
  )
}

export default function TodayPage() {
  const { user, profile } = useSession()
  const weekly = useWeeklySummary()
  const dashboard = useReadingDashboard()
  const upsert = useUpsertLibraryEntry()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [progressBook, setProgressBook] = useState<LibraryBook | null>(null)
  const [openBook, setOpenBook] = useState<string | null>(null)
  const shelfIndex = libraryIndex(profile)
  const firstName = user.display_name.split(/\s+/)[0]
  const streak = dashboard.data?.current_streak ?? 0

  const ask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = String(new FormData(event.currentTarget).get('istek') ?? '').trim()
    navigate(text ? `${routes.discover}?istek=${encodeURIComponent(text)}` : routes.discover)
  }

  const quickAdd = (bookId: string) => {
    const book = weekly.data?.recommendations.find((item) => item.id === bookId)
    upsert.mutate(
      { book_id: bookId, shelf: 'to_read' },
      { onSuccess: () => notify(`“${book?.title ?? 'Kitap'}” okuyacakların rafına eklendi.`, 'success'), onError: (error) => notify(error.message, 'error') },
    )
  }

  return (
    <div className="page today">
      <header className="today__header">
        <h1>{greeting()} {firstName}, bugün ne okuyoruz?</h1>
        {streak > 0 && <span className="today__streak"><Flame size={16} aria-hidden="true" /> {streak} gün seri</span>}
      </header>

      <form className="prompt" role="search" onSubmit={ask}>
        <Search size={20} aria-hidden="true" />
        <label htmlFor="today-prompt" className="visually-hidden">Ne okumak istediğini anlat</label>
        <input id="today-prompt" name="istek" placeholder="Yağmurlu bir akşam için kısa ve gizemli bir şey…" autoComplete="off" maxLength={500} />
        <Button type="submit" icon={<Sparkles size={16} aria-hidden="true" />}>Eşleştir</Button>
      </form>

      <section className="today__bento" aria-label="Okuma özetin">
        <ContinueReading books={profile.reading_books} onProgress={setProgressBook} />
        <Tile tone="lilac" className="today__stat" eyebrow="Bu hafta">
          {weekly.isPending ? <Skeleton height={44} width={120} /> : (
            <>
              <p className="today__big">{weekly.data?.minutes_read ?? 0}<small> dk</small></p>
              <p className="today__muted">{weekly.data?.pages_read ?? 0} sayfa · {weekly.data?.sessions ?? 0} seans</p>
            </>
          )}
        </Tile>
        <Tile tone="butter" className="today__stat" eyebrow={`${new Date().getFullYear()} hedefi`}>
          {dashboard.isPending ? <Skeleton height={44} width={120} /> : (
            <>
              <p className="today__big">{dashboard.data?.goal.completed_books ?? 0}<small> / {dashboard.data?.goal.target_books ?? 12}</small></p>
              <Progress value={dashboard.data?.goal.progress_percent ?? 0} label="Yıllık hedef ilerlemesi" size="sm" />
            </>
          )}
        </Tile>
        <ClubTile />
      </section>

      <section className="today__section" aria-labelledby="for-you">
        <div className="section-head">
          <h2 id="for-you">Rafına yakışacaklar</h2>
          <Link to={routes.discover} className="today__link">Hepsini keşfet</Link>
        </div>
        {weekly.isError && <ErrorState message={weekly.error.message} onRetry={() => weekly.refetch()} />}
        {weekly.isPending && <div className="book-grid book-grid--row">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height={320} radius={26} />)}</div>}
        {weekly.data && weekly.data.recommendations.length === 0 && (
          <EmptyState icon={<BookOpen size={28} />} title="Önerilerin hazırlanıyor" description="Birkaç kitabı rafına ekledikçe öneriler sana göre şekillenecek." />
        )}
        {weekly.data && weekly.data.recommendations.length > 0 && (
          <div className="book-grid book-grid--row">
            {weekly.data.recommendations.slice(0, 4).map((book) => (
              <BookCard
                key={book.id}
                book={book}
                reason={book.themes?.[0] ? `#${book.themes[0]}` : undefined}
                shelf={shelfIndex.get(book.id)?.shelf}
                onOpen={setOpenBook}
                onQuickAdd={quickAdd}
              />
            ))}
          </div>
        )}
      </section>

      <ProgressDialog book={progressBook} onClose={() => setProgressBook(null)} />
      <BookDetailDialog bookId={openBook} onClose={() => setOpenBook(null)} />
    </div>
  )
}
