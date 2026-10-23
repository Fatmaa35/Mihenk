import { useEffect, useState } from 'react'
import { ExternalLink, Star } from 'lucide-react'
import { useBookDetails, useBootstrap } from '../../shared/api/queries'
import type { RetailOffer } from '../../shared/api/types'
import { BookCover, Dialog, ErrorState, SegmentedTabs, Skeleton } from '../../shared/ui'
import { formatMoney } from '../../spa/format'
import { BookCommunityPanel } from '../community/BookCommunityPanel'
import { ShelfPicker } from '../library/ShelfPicker'
import { libraryIndex } from '../library/shelves'
import { PriceAlertForm } from '../pricing/PriceAlertForm'
import './catalog.css'

export type BookDetailTab = 'genel' | 'yorumlar'

function availableOffers(offers: RetailOffer[]) {
  return offers.filter((offer) => offer.price_minor != null).sort((a, b) => (a.price_minor ?? 0) - (b.price_minor ?? 0))
}

function Offers({ offers }: { offers: RetailOffer[] }) {
  if (!offers.length) return <p className="book-detail__muted">Bu kitap için henüz doğrulanmış mağaza fiyatı yok.</p>
  return (
    <ul className="book-detail__offers">
      {offers.slice(0, 4).map((offer) => (
        <li key={`${offer.retailer_name}-${offer.product_url}`}>
          <span>{offer.retailer_name}{offer.is_stale && <small> · güncel olmayabilir</small>}</span>
          <a href={offer.product_url} target="_blank" rel="noopener noreferrer">
            {formatMoney(offer.price_minor, offer.currency)} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  )
}

type BookDetailDialogProps = { bookId: string | null; onClose: () => void; initialTab?: BookDetailTab }

export function BookDetailDialog({ bookId, onClose, initialTab = 'genel' }: BookDetailDialogProps) {
  const details = useBookDetails(bookId)
  const session = useBootstrap()
  const [tab, setTab] = useState<BookDetailTab>(initialTab)
  useEffect(() => { if (bookId) setTab(initialTab) }, [bookId, initialTab])

  const entry = bookId && session.data ? libraryIndex(session.data.profile).get(bookId) : undefined
  const book = details.data?.book
  const community = details.data?.community
  const offers = details.data ? availableOffers(details.data.offers) : []

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
        <>
          <div className="book-detail__tabs">
            <SegmentedTabs
              label="Kitap bölümleri"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'genel', label: 'Genel bakış' },
                { value: 'yorumlar', label: 'Puan ve yorumlar', count: community?.comments.length ?? 0 },
              ]}
            />
          </div>
          {tab === 'yorumlar' ? (
            <BookCommunityPanel bookId={book.id} />
          ) : (
            <div className="book-detail">
              <BookCover id={book.id} title={book.title} author={book.author} coverUrl={book.cover_url} size="lg" />
              <div className="book-detail__body">
                <p className="book-detail__author">{book.author} · {book.genre}</p>
                {community && community.rating_count > 0 && (
                  <button type="button" className="book-detail__rating" onClick={() => setTab('yorumlar')}>
                    <Star size={16} aria-hidden="true" /> {community.rating_average.toFixed(1)}
                    <span>({community.rating_count} puan · yorumları gör)</span>
                  </button>
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
                  <Offers offers={offers} />
                </section>
                <section aria-labelledby="detail-alert">
                  <h3 id="detail-alert" className="book-detail__heading">Fiyat alarmı</h3>
                  <PriceAlertForm bookId={book.id} title={book.title} bestPriceMinor={offers[0]?.price_minor ?? null} />
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </Dialog>
  )
}
