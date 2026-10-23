import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BadgeCheck, MessagesSquare } from 'lucide-react'
import { SpoilerText } from '../../features/community/SpoilerText'
import { BookDetailDialog } from '../../features/catalog/BookDetailDialog'
import { ClubsPanel } from '../../features/growth/ClubsPanel'
import { useCommunityFeed } from '../../shared/api/community'
import { BookCover, EmptyState, ErrorState, SegmentedTabs, Skeleton } from '../../shared/ui'
import { formatRelative, initials } from '../format'
import { routes } from '../routes'
import '../../features/community/community.css'
import './pages.css'

type Tab = 'akis' | 'kulupler'

function Feed() {
  const feed = useCommunityFeed()
  const [openBook, setOpenBook] = useState<string | null>(null)
  if (feed.isPending) return <div className="feed">{[0, 1, 2].map((index) => <Skeleton key={index} height={150} radius={26} />)}</div>
  if (feed.isError) return <ErrorState message={feed.error.message} onRetry={() => feed.refetch()} />
  if (!feed.data.length) {
    return (
      <EmptyState
        icon={<MessagesSquare size={28} />}
        title="Akışın henüz boş"
        description="Bir kitabın yorumlarında ilgini çeken okurları takip et; yeni yorumları burada görürsün."
        action={<Link className="mh-button mh-button--secondary mh-button--md" to={routes.discover}>Kitaplara göz at</Link>}
      />
    )
  }
  return (
    <>
      <ul className="feed">
        {feed.data.map((item) => (
          <li key={item.id} className="feed-card">
            <header className="feed-card__head">
              <span className="feed-card__avatar" aria-hidden="true">{initials(item.display_name || 'Okur')}</span>
              <div>
                <strong>{item.display_name || 'Okur'}</strong>
                {item.is_verified && <BadgeCheck size={15} className="comment__verified" aria-label="Doğrulanmış okur" />}
                <time dateTime={item.created_at}>{formatRelative(item.created_at)}</time>
              </div>
            </header>
            <SpoilerText text={item.content} spoiler={item.contains_spoiler} />
            <button type="button" className="feed-card__book" onClick={() => setOpenBook(item.book_id)}>
              <BookCover id={item.book_id} title={item.book_title} coverUrl={item.cover_url} size="sm" showText={false} />
              <span>
                <strong>{item.book_title}</strong>
                {item.book_author && <small>{item.book_author}</small>}
              </span>
              <span className="feed-card__cta">Yorumları aç</span>
            </button>
          </li>
        ))}
      </ul>
      <BookDetailDialog bookId={openBook} initialTab="yorumlar" onClose={() => setOpenBook(null)} />
    </>
  )
}

export default function CommunityPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('sekme') === 'kulupler' ? 'kulupler' : 'akis'
  return (
    <div className="page community">
      <header className="page-header">
        <div>
          <h1>Topluluk</h1>
          <p>Takip ettiğin okurların izlenimleri ve birlikte okuduğun kulüpler.</p>
        </div>
      </header>
      <SegmentedTabs
        label="Topluluk bölümü"
        value={tab}
        onChange={(value) => setParams(value === 'akis' ? {} : { sekme: value }, { replace: true })}
        options={[{ value: 'akis', label: 'Akış' }, { value: 'kulupler', label: 'Kulüpler' }]}
      />
      <div role="tabpanel">{tab === 'akis' ? <Feed /> : <ClubsPanel />}</div>
    </div>
  )
}
