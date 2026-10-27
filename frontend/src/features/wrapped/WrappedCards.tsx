import type { ReactNode } from 'react'
import { BookCover } from '../../shared/ui'
import { BadgeIcon, badgeTier } from '../profile/BadgeIcon'
import { MONTHS, pagesComparison, WrappedSummary } from './summary'
import '../profile/badges.css'
import './wrapped.css'

/**
 * Hikâye kartları 1080×1920 gerçek boyutta çizilir; ekranda ölçeklenerek gösterilir ve aynen PNG'ye aktarılır.
 * Renkler temadan bağımsızdır: paylaşılan görsel herkeste aynı görünmeli.
 */

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1920

const number = (value: number) => Math.round(value).toLocaleString('tr-TR')

function Card({ tone, children, footer = true, name }: { tone: string; children: ReactNode; footer?: boolean; name: string }) {
  return (
    <div className={`wr-card wr-card--${tone}`} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
      <div className="wr-card__top">
        <span className="wr-brand"><img src="/static/brand/mark-light.webp" alt="" />Mihenk</span>
        <span className="wr-chip">{name}</span>
      </div>
      <div className="wr-card__body">{children}</div>
      {footer && <p className="wr-card__footer">mihenk · okuma yılın</p>}
    </div>
  )
}

export type WrappedCard = { id: string; label: string; render: () => ReactNode }

/** Özetteki verilere göre gösterilecek kartları sıralar; verisi olmayan kart atlanır. */
export function wrappedCards(summary: WrappedSummary, displayName: string): WrappedCard[] {
  const year = String(summary.year)
  const firstName = displayName.split(/\s+/)[0]
  const cards: WrappedCard[] = [
    {
      id: 'intro',
      label: 'Giriş',
      render: () => (
        <Card tone="indigo" name={year} footer={false}>
          <p className="wr-kicker">{firstName}, hazır mısın?</p>
          <h2 className="wr-giant">{year}<br />okuma<br />yılın</h2>
          <p className="wr-lead">Sayfalar, seriler, en sevdiğin tür ve senin okur tipin. Kaydırarak keşfet.</p>
        </Card>
      ),
    },
  ]

  if (summary.pages > 0) {
    cards.push({
      id: 'pages',
      label: 'Sayfalar',
      render: () => (
        <Card tone="butter" name={year}>
          <p className="wr-kicker">Bu yıl okuduğun</p>
          <p className="wr-number">{number(summary.pages)}</p>
          <p className="wr-unit">sayfa</p>
          <p className="wr-lead">{pagesComparison(summary.pages)}</p>
          <div className="wr-stack" aria-hidden="true">
            {Array.from({ length: Math.min(14, Math.max(3, Math.round(summary.stackCm / 2))) }, (_, index) => <span key={index} />)}
          </div>
          <p className="wr-note">Üst üste koysan {summary.stackCm.toLocaleString('tr-TR')} cm’lik bir kule olurdu.</p>
        </Card>
      ),
    })
  }

  if (summary.booksFinished > 0) {
    cards.push({
      id: 'books',
      label: 'Kitaplar',
      render: () => (
        <Card tone="mint" name={year}>
          <p className="wr-kicker">Bitirdiğin kitaplar</p>
          <p className="wr-number">{summary.booksFinished}</p>
          <p className="wr-unit">kitap{summary.goal.target ? ` · hedefin ${summary.goal.target}` : ''}</p>
          {summary.finishedBooks.length > 0 && (
            <div className="wr-covers">
              {summary.finishedBooks.slice(-6).map((book) => (
                <div key={book.id} className="wr-cover"><BookCover id={book.id} title={book.title} author={book.author} coverUrl={book.cover_url} size="fill" /></div>
              ))}
            </div>
          )}
          {summary.goal.target > 0 && (
            <div className="wr-goal">
              <span className="wr-goal__track"><span style={{ width: `${Math.min(100, summary.goal.percent)}%` }} /></span>
              <b>%{Math.min(999, summary.goal.percent)}</b>
            </div>
          )}
        </Card>
      ),
    })
  }

  if (summary.topGenre) {
    const genres = summary.genres.slice(0, 4)
    const max = Math.max(1, ...genres.map((item) => item.count))
    cards.push({
      id: 'genre',
      label: 'Tür',
      render: () => (
        <Card tone="lilac" name={year}>
          <p className="wr-kicker">En çok okuduğun tür</p>
          <h2 className="wr-headline">{summary.topGenre?.genre}</h2>
          <p className="wr-lead">
            {summary.genres.length > 1 && (summary.topGenre?.count ?? 0) === summary.genres[1].count
              ? `Bu yıl ${summary.genres.length} farklı türde kitap bitirdin; zirve paylaşılıyor.`
              : `Bitirdiğin kitapların %${Math.round((summary.topGenre?.share ?? 0) * 100)}’i bu türdendi.`}
          </p>
          <ul className="wr-bars">
            {genres.map((item) => (
              <li key={item.genre}>
                <span>{item.genre}</span>
                <span className="wr-bars__track"><span style={{ width: `${(item.count / max) * 100}%` }} /></span>
                <b>{item.count}</b>
              </li>
            ))}
          </ul>
        </Card>
      ),
    })
  }

  if (summary.topMonth) {
    const max = Math.max(1, ...summary.monthPages)
    cards.push({
      id: 'month',
      label: 'Ay',
      render: () => (
        <Card tone="peach" name={year}>
          <p className="wr-kicker">En çok okuduğun ay</p>
          <h2 className="wr-headline">{summary.topMonth?.name}</h2>
          <p className="wr-lead">{number(summary.topMonth?.pages ?? 0)} sayfa. {summary.topWeekday ? `En sevdiğin okuma günü ${summary.topWeekday.name}.` : ''}</p>
          <div className="wr-months" aria-hidden="true">
            {summary.monthPages.map((pages, index) => (
              <span key={MONTHS[index]} className={index === summary.topMonth?.index ? 'is-top' : ''}>
                <i style={{ height: `${Math.max(3, (pages / max) * 100)}%` }} />
                <small>{MONTHS[index].slice(0, 1)}</small>
              </span>
            ))}
          </div>
        </Card>
      ),
    })
  }

  if (summary.activeDays > 0) {
    cards.push({
      id: 'streak',
      label: 'Seri',
      render: () => (
        <Card tone="ink" name={year}>
          <p className="wr-kicker">En uzun serin</p>
          <p className="wr-number">{summary.longestStreak}</p>
          <p className="wr-unit">gün üst üste</p>
          <div className="wr-pair">
            <div><b>{summary.activeDays}</b><span>gün kitap açtın</span></div>
            {summary.minutes > 0 && (summary.minutes >= 120
              ? <div><b>{number(summary.minutes / 60)}</b><span>saat odak seansı</span></div>
              : <div><b>{summary.minutes}</b><span>dakika odak seansı</span></div>)}
          </div>
        </Card>
      ),
    })
  }

  if (summary.badges.length > 0) {
    cards.push({
      id: 'badges',
      label: 'Rozetler',
      render: () => (
        <Card tone="butter" name={year}>
          <p className="wr-kicker">Bu yıl kazandığın rozetler</p>
          <p className="wr-number">{summary.badges.length}</p>
          <div className="wr-medals">
            {summary.badges.slice(0, 6).map((badge) => (
              <div key={badge.code} className="wr-medal">
                <span className={`medal medal--xl medal--${badgeTier(badge.xp_reward)} is-earned`}>
                  <BadgeIcon code={badge.code} earned xpReward={badge.xp_reward} size="lg" />
                </span>
                <b>{badge.name}</b>
              </div>
            ))}
          </div>
        </Card>
      ),
    })
  }

  cards.push({
    id: 'persona',
    label: 'Okur tipi',
    render: () => (
      <Card tone={`persona-${summary.persona.key}`} name={year}>
        <p className="wr-kicker">Senin okur tipin</p>
        <h2 className="wr-giant wr-giant--persona">{summary.persona.title}</h2>
        <p className="wr-lead">{summary.persona.description}</p>
      </Card>
    ),
  })

  cards.push({
    id: 'summary',
    label: 'Özet',
    render: () => (
      <Card tone="indigo" name={year}>
        <p className="wr-kicker">{firstName} · {year} okuma yılı</p>
        <h2 className="wr-headline">{summary.persona.title}</h2>
        <div className="wr-grid">
          <div><b>{number(summary.pages)}</b><span>sayfa</span></div>
          <div><b>{summary.booksFinished}</b><span>kitap</span></div>
          <div><b>{summary.longestStreak}</b><span>gün seri</span></div>
          <div><b>{summary.activeDays}</b><span>okuma günü</span></div>
          <div><b>{summary.topGenre?.genre ?? '—'}</b><span>favori tür</span></div>
          <div><b>{summary.topMonth?.name ?? '—'}</b><span>zirve ayı</span></div>
        </div>
      </Card>
    ),
  })
  return cards
}
