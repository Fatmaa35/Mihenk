import { ExternalLink, Star } from 'lucide-react'
import { useBookDetails, useBootstrap } from '../../shared/api/queries'
import type { RetailOffer } from '../../shared/api/types'
import { BookCover, Dialog, ErrorState, Skeleton } from '../../shared/ui'
import { ShelfPicker } from '../library/ShelfPicker'
import { libraryIndex } from '../library/shelves'
import './catalog.css'

const money = (minor: number | null, currency = 'TRY') =>
  minor == null ? '—' : (minor / 100).toLocaleString('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 })

function Offers({ offers }: { offers: RetailOffer[] }) {
  const fresh = offers.filter((offer) => offer.price_minor != null).sort((a, b) => (a.price_minor ?? 0) - (b.price_minor ?? 0))
  if (!fresh.length) return <p className="book-detail__muted">Bu kitap için henüz doğrulanmış mağaza fiyatı yok.</p>
  return (
    <ul className="book-detail__offers">
      {fresh.slice(0, 4).map((offer) => (
        <li key={`${offer.retailer_name}-${offer.product_url}`}>
          <span>{offer.retailer_name}{offer.is_stale && <small> · güncel olmayabilir</small>}</span>
          <a href={offer.product_url} target="_blank" rel="noopener noreferrer">
            {money(offer.price_minor, offer.currency)} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function BookDetailDialog({ bookId, onClose }: { bookId: string | null; onClose: () => void }) {
  const details = useBookDetails(bookId)
  const session = useBootstrap()
  const entry = bookId && session.data ? libraryIndex(session.data.profile).get(bookId) : undefined
  const book = details.data?.book

  return (
    <Dialog open={Boolean(bookId)} title={book?.title ?? 'Kitap'} onClose={onClose} size="lg">
      {details.isPending && (
        <div className="book-detail">
          <Skeleton width={148} height={222} radius={14} />
          <div className="book-detail__body"><Skeleton height={28} width="60%" /><Skeleton height={16} /><Skeleton height={16} width="80%" /></div>
        </div>
      )}
      {details.isError && <ErrorState message={details.error.message} onRetry={() => details.refetch()} />}
      {book && details.data && (
        <div className="book-detail">
          <BookCover id={book.id} title={book.title} author={book.author} coverUrl={book.cover_url} size="lg" />
          <div className="book-detail__body">
            <p className="book-detail__author">{book.author} · {book.genre}</p>
            {details.data.community.rating_count > 0 && (
              <p className="book-detail__rating">
                <Star size={16} aria-hidden="true" /> {details.data.community.rating_average.toFixed(1)}
                <span> ({details.data.community.rating_count} puan)</span>
              </p>
            )}
            {book.description && <p>{book.description}</p>}
            {!!book.themes?.length && (
              <ul className="book-detail__chips" aria-label="Temalar">
                {book.themes.map((theme) => <li key={theme} className="mh-chip mh-chip--muted">{theme}</li>)}
              </ul>
            )}
            {details.data.ai_match && (
              <div className="book-detail__match mh-tile mh-tile--lilac">
                <strong>Sana uyumu %{Math.round(details.data.ai_match.score * 100)}</strong>
                {details.data.ai_match.reasons.length > 0 && <span>{details.data.ai_match.reasons.join(' · ')}</span>}
              </div>
            )}
            <section aria-labelledby="detail-shelf">
              <h3 id="detail-shelf" className="book-detail__heading">Kitaplığına ekle</h3>
              <ShelfPicker bookId={book.id} title={book.title} current={entry?.shelf} totalPages={entry?.total_pages ?? book.page_count} />
            </section>
            <section aria-labelledby="detail-offers">
              <h3 id="detail-offers" className="book-detail__heading">Fiyatlar</h3>
              <Offers offers={details.data.offers} />
            </section>
          </div>
        </div>
      )}
    </Dialog>
  )
}
