import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Download, Quote as QuoteIcon, Share2 } from 'lucide-react'
import { QuoteCard, QuoteFormat, QUOTE_SIZES, QUOTE_STYLES, QuoteStyle } from '../../features/quotes/QuoteCard'
import { libraryIndex } from '../../features/library/shelves'
import { extractCoverColors, mix, renderNodeToPng, shareOrDownload, slugify } from '../../features/share/shareImage'
import { useQuotes, useSaveQuote } from '../../shared/api/profile'
import type { LibraryBook, Quote } from '../../shared/api/types'
import { Button, coverColor, EmptyState, ErrorState, Skeleton, useToast } from '../../shared/ui'
import { useSession } from '../layout/SessionGate'
import { routes } from '../routes'
import '../../features/quotes/quote-card.css'

const CARD_LIMIT = 500
const PREVIEW_WIDTH = 340

/** Kapak görselinin renkleri okunabiliyorsa onlar, okunamıyorsa kitaba özgü sabit renk kullanılır. */
function useBookPalette(book: LibraryBook | undefined): [string, string] {
  const fallback = useMemo<[string, string]>(() => {
    const base = coverColor(book?.id ?? 'mihenk')
    return [base, mix(base, '#15151A', 0.45)]
  }, [book?.id])
  const [extracted, setExtracted] = useState<{ url: string; colors: [string, string] } | null>(null)
  useEffect(() => {
    let alive = true
    const url = book?.cover_url
    if (url) void extractCoverColors(url).then((colors) => { if (alive && colors) setExtracted({ url, colors }) })
    return () => { alive = false }
  }, [book?.cover_url])
  return extracted && extracted.url === book?.cover_url ? extracted.colors : fallback
}

export default function QuotesPage() {
  const { profile } = useSession()
  const [params] = useSearchParams()
  const quotes = useQuotes()
  const save = useSaveQuote()
  const { notify } = useToast()
  const index = useMemo(() => libraryIndex(profile), [profile])
  const books = useMemo(() => [...profile.reading_books, ...profile.read_books, ...profile.to_read_books, ...profile.abandoned_books], [profile])

  const [bookId, setBookId] = useState(params.get('kitap') ?? books[0]?.id ?? '')
  const [text, setText] = useState('')
  const [page, setPage] = useState('')
  const [selected, setSelected] = useState<Quote | null>(null)
  const [style, setStyle] = useState<QuoteStyle>('cover')
  const [format, setFormat] = useState<QuoteFormat>('story')
  const [busy, setBusy] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Kartta gösterilen alıntı: listeden seçilen ya da formda yazılmakta olan.
  const cardBookId = selected ? (selected.book_id ?? selected.custom_book_id ?? '') : bookId
  const cardBook = index.get(cardBookId)
  const palette = useBookPalette(cardBook)
  const cardText = selected ? selected.quote_text : text
  const cardPage = selected ? selected.page_number : (page ? Number(page) : null)
  const cardTitle = cardBook?.title ?? selected?.book_title ?? 'Kitap seç'
  const size = QUOTE_SIZES[format]
  const scale = PREVIEW_WIDTH / size.width

  useEffect(() => { document.title = 'Alıntılarım · Mihenk' }, [])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const book = index.get(bookId)
    if (!book) return notify('Önce bir kitap seç.', 'error')
    if (text.trim().length < 2) return notify('Alıntıyı yaz.', 'error')
    const pageNumber = page.trim() ? Number.parseInt(page, 10) : null
    save.mutate(
      { book_id: book.is_custom ? null : book.id, custom_book_id: book.is_custom ? book.id : null, quote_text: text.trim(), page_number: Number.isFinite(pageNumber) ? pageNumber : null },
      {
        onSuccess: (quote) => { setSelected(quote); setText(''); setPage(''); notify('Alıntın kaydedildi. Kartın hazır!', 'success') },
        onError: (error) => notify(error.message, 'error'),
      },
    )
  }

  const exportCard = async (mode: 'share' | 'download') => {
    const node = cardRef.current?.firstElementChild as HTMLElement | null
    if (!node || !cardText.trim()) return notify('Önce bir alıntı yaz ya da listeden seç.', 'info')
    setBusy(true)
    try {
      const blob = await renderNodeToPng(node, size.width, size.height)
      const name = `mihenk-alinti-${slugify(cardTitle)}.png`
      if (mode === 'share') {
        const result = await shareOrDownload(blob, name, `“${cardText.trim().slice(0, 120)}” — ${cardTitle}`)
        if (result === 'downloaded') notify('Görsel indirildi; Instagram’da hikâye olarak paylaşabilirsin.', 'success')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = name; document.body.append(link); link.click(); link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1_000)
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Görsel hazırlanamadı.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page quotes">
      <header className="page-header">
        <div>
          <h1>Alıntılarım</h1>
          <p>Beğendiğin cümleyi kaydet; Mihenk onu kitabın renkleriyle paylaşmaya hazır bir karta çevirsin.</p>
        </div>
      </header>

      <div className="quotes__layout">
        <div className="quotes__column">
          {books.length === 0 ? (
            <EmptyState icon={<QuoteIcon size={28} />} title="Önce kitaplığına bir kitap ekle" description="Alıntılar kitaplığındaki kitaplara bağlanır." action={<Link to={routes.discover} className="mh-button mh-button--secondary mh-button--md">Kitap keşfet</Link>} />
          ) : (
            <form className="quotes__form" onSubmit={submit}>
              <h2>Yeni alıntı</h2>
              <div className="mh-field">
                <label htmlFor="quote-book">Kitap</label>
                <select id="quote-book" className="mh-input" value={bookId} onChange={(event) => { setBookId(event.target.value); setSelected(null) }}>
                  {books.map((book) => <option key={`${book.is_custom ? 'c' : 'b'}-${book.id}`} value={book.id}>{book.title} — {book.author}</option>)}
                </select>
              </div>
              <div className="mh-field">
                <label htmlFor="quote-text">Alıntı</label>
                <textarea
                  id="quote-text"
                  className="mh-input"
                  value={text}
                  maxLength={CARD_LIMIT}
                  placeholder="Sayfadaki cümleyi yaz…"
                  aria-describedby="quote-count"
                  onChange={(event) => { setText(event.target.value); setSelected(null) }}
                  required
                />
                <small id="quote-count" className="quotes__counter">{text.length}/{CARD_LIMIT}</small>
              </div>
              <div className="mh-field">
                <label htmlFor="quote-page">Sayfa (isteğe bağlı)</label>
                <input id="quote-page" className="mh-input" type="number" inputMode="numeric" min={0} value={page} onChange={(event) => { setPage(event.target.value); setSelected(null) }} />
              </div>
              <Button type="submit" loading={save.isPending}>Kaydet ve kart yap</Button>
            </form>
          )}

          <section className="quotes__saved" aria-labelledby="saved-quotes">
            <div className="section-head"><h2 id="saved-quotes">Kaydettiklerin</h2></div>
            {quotes.isPending && <Skeleton height={90} />}
            {quotes.isError && <ErrorState message={quotes.error.message} onRetry={() => quotes.refetch()} />}
            {quotes.data?.length === 0 && <p className="today__muted">Henüz alıntı kaydetmedin.</p>}
            <ul className="quotes__list">
              {quotes.data?.map((quote) => (
                <li key={quote.id}>
                  <button type="button" className="quotes__item" aria-pressed={selected?.id === quote.id} onClick={() => setSelected(quote)}>
                    <q>{quote.quote_text}</q>
                    <small>{quote.book_title ?? 'Kitap'}{quote.page_number ? ` · s. ${quote.page_number}` : ''}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="quotes__studio" aria-label="Alıntı kartı">
          <h2>Kartın</h2>
          <div className="quotes__preview" style={{ width: PREVIEW_WIDTH, height: Math.round(size.height * scale) }}>
            <div ref={cardRef} style={{ transform: `scale(${scale})`, width: size.width, height: size.height }}>
              <QuoteCard text={cardText} bookTitle={cardTitle} author={cardBook?.author} page={cardPage} palette={palette} style={style} format={format} />
            </div>
          </div>
          <div className="quotes__options" role="group" aria-label="Kart stili">
            {QUOTE_STYLES.map((item) => (
              <button key={item.value} type="button" className="quotes__option" aria-pressed={style === item.value} onClick={() => setStyle(item.value)}>{item.label}</button>
            ))}
          </div>
          <div className="quotes__options" role="group" aria-label="Kart boyutu">
            {(Object.keys(QUOTE_SIZES) as QuoteFormat[]).map((value) => (
              <button key={value} type="button" className="quotes__option" aria-pressed={format === value} onClick={() => setFormat(value)}>{QUOTE_SIZES[value].label}</button>
            ))}
          </div>
          <div className="quotes__actions">
            <Button icon={<Share2 size={16} aria-hidden="true" />} loading={busy} onClick={() => void exportCard('share')}>Paylaş</Button>
            <Button variant="secondary" icon={<Download size={16} aria-hidden="true" />} disabled={busy} onClick={() => void exportCard('download')}>PNG indir</Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
