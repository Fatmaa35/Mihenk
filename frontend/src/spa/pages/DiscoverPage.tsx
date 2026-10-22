import { FormEvent, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Search, Sparkles } from 'lucide-react'
import { BookCard } from '../../features/catalog/BookCard'
import { BookDetailDialog } from '../../features/catalog/BookDetailDialog'
import { libraryIndex } from '../../features/library/shelves'
import { useCatalog, useRecommendations, useUpsertLibraryEntry } from '../../shared/api/queries'
import type { RecommendedBook } from '../../shared/api/types'
import { BookCover, Button, EmptyState, ErrorState, Skeleton, useToast } from '../../shared/ui'
import { useSession } from '../layout/SessionGate'
import './pages.css'

const PAGE_SIZE = 24
const SUGGESTIONS = [
  'Yağmurlu bir akşam için kısa ve gizemli',
  'Karakteri zamanla değişen sürükleyici bir roman',
  'Melankolik ama umut veren bir klasik',
  'Zekice diyalogları olan hafif bir şey',
]

function MatchCard({ item, onOpen, onAdd, shelfLabel }: { item: RecommendedBook; onOpen: (id: string) => void; onAdd: (id: string, title: string) => void; shelfLabel?: string }) {
  const id = item.book_id ?? item.book_title
  return (
    <article className="match-card">
      <BookCover id={id} title={item.book_title} author={item.author} size="md" />
      <div className="match-card__body">
        <span className="mh-chip match-card__score">%{Math.round(item.match_score * 100)} uyum</span>
        <h3>{item.book_title}</h3>
        <p><strong>{item.author}</strong> · {item.genre}</p>
        <p>{item.reasoning}</p>
        <div className="match-card__actions">
          {item.book_id && <Button size="sm" variant="secondary" onClick={() => onOpen(item.book_id!)}>Ayrıntılar</Button>}
          {item.book_id && !shelfLabel && <Button size="sm" variant="ghost" onClick={() => onAdd(item.book_id!, item.book_title)}>Okuyacağım</Button>}
          {shelfLabel && <span className="mh-chip mh-chip--muted">{shelfLabel}</span>}
        </div>
      </div>
    </article>
  )
}

export default function DiscoverPage() {
  const { profile } = useSession()
  const shelfIndex = libraryIndex(profile)
  const [params, setParams] = useSearchParams()
  const initialRequest = params.get('istek') ?? ''
  const [request, setRequest] = useState(initialRequest)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sort, setSort] = useState<'title' | 'popular'>('title')
  const [openBook, setOpenBook] = useState<string | null>(null)
  const recommend = useRecommendations()
  const upsert = useUpsertLibraryEntry()
  const catalog = useCatalog(debouncedQuery, sort, PAGE_SIZE)
  const { notify } = useToast()
  const ranInitial = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQuery(query.trim()) }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const runRecommendation = (text: string) => {
    if (text.trim().length < 3) return
    recommend.mutate(text.trim())
    setParams(text ? { istek: text } : {}, { replace: true })
  }

  useEffect(() => {
    if (initialRequest && !ranInitial.current) {
      ranInitial.current = true
      runRecommendation(initialRequest)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRequest])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    runRecommendation(request)
  }

  const addToRead = (bookId: string, title?: string) => upsert.mutate(
    { book_id: bookId, shelf: 'to_read' },
    { onSuccess: () => notify(`“${title ?? 'Kitap'}” okuyacakların rafına eklendi.`, 'success'), onError: (error) => notify(error.message, 'error') },
  )

  const total = catalog.data?.pages[0]?.total ?? 0
  const items = catalog.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="page discover">
      <header className="page-header">
        <div>
          <h1>Keşfet</h1>
          <p>Ne okumak istediğini kendi cümlelerinle anlat ya da kataloğa göz at.</p>
        </div>
      </header>

      <section aria-labelledby="match-title" className="discover__results">
        <h2 id="match-title" className="visually-hidden">Akıllı eşleştirme</h2>
        <form className="prompt" role="search" onSubmit={submit}>
          <Sparkles size={20} aria-hidden="true" />
          <label htmlFor="discover-prompt" className="visually-hidden">Ne okumak istediğini anlat</label>
          <input
            id="discover-prompt"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder="Ruh hâlini, sevdiğin temaları ya da aradığın karakteri anlat…"
            maxLength={1500}
            autoComplete="off"
          />
          <Button type="submit" loading={recommend.isPending} disabled={request.trim().length < 3}>Eşleştir</Button>
        </form>
        {!recommend.data && !recommend.isPending && (
          <div className="suggestions" aria-label="Örnek istekler">
            {SUGGESTIONS.map((text) => (
              <button key={text} type="button" className="suggestion" onClick={() => { setRequest(text); runRecommendation(text) }}>{text}</button>
            ))}
          </div>
        )}
        {recommend.isError && <ErrorState message={recommend.error.message} onRetry={() => runRecommendation(request)} />}
        {recommend.isPending && <div className="match-list">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height={220} radius={26} />)}</div>}
        {recommend.data && (
          <>
            <p className="discover__summary">{recommend.data.character_analysis_summary}</p>
            {recommend.data.recommended_books.length === 0 ? (
              <EmptyState icon={<Search size={28} />} title="Eşleşme bulamadık" description="İsteğini biraz daha açarak ya da farklı kelimelerle tekrar dene." />
            ) : (
              <div className="match-list">
                {recommend.data.recommended_books.map((item) => (
                  <MatchCard
                    key={`${item.book_id}-${item.book_title}`}
                    item={item}
                    onOpen={setOpenBook}
                    onAdd={addToRead}
                    shelfLabel={item.book_id && shelfIndex.has(item.book_id) ? 'Kitaplığında' : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="catalog-title">
        <div className="section-head">
          <h2 id="catalog-title">Katalog</h2>
          {catalog.data && <span className="catalog-count">{total} kitap</span>}
        </div>
        <div className="catalog-toolbar">
          <label htmlFor="catalog-search" className="visually-hidden">Katalogda ara</label>
          <input id="catalog-search" className="mh-input" type="search" placeholder="Kitap, yazar veya tür ara" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label htmlFor="catalog-sort" className="visually-hidden">Sıralama</label>
          <select id="catalog-sort" className="mh-input" value={sort} onChange={(event) => setSort(event.target.value as 'title' | 'popular')}>
            <option value="title">Ada göre</option>
            <option value="popular">Popülerliğe göre</option>
          </select>
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          {catalog.isError && <ErrorState message={catalog.error.message} onRetry={() => catalog.refetch()} />}
          {catalog.isPending && <div className="book-grid">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} height={320} radius={26} />)}</div>}
          {catalog.data && items.length === 0 && (
            <EmptyState icon={<Search size={28} />} title="Sonuç yok" description={`“${debouncedQuery}” için katalogda kitap bulamadık.`} />
          )}
          {items.length > 0 && (
            <div className="book-grid">
              {items.map((book) => (
                <BookCard key={book.id} book={book} shelf={shelfIndex.get(book.id)?.shelf} onOpen={setOpenBook} onQuickAdd={(id) => addToRead(id, book.title)} />
              ))}
            </div>
          )}
          {catalog.hasNextPage && (
            <div className="catalog-more">
              <Button variant="secondary" loading={catalog.isFetchingNextPage} onClick={() => catalog.fetchNextPage()}>Daha fazla göster</Button>
            </div>
          )}
        </div>
      </section>

      <BookDetailDialog bookId={openBook} onClose={() => setOpenBook(null)} />
    </div>
  )
}
