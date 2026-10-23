import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Lock, Sparkles, Trophy } from 'lucide-react'
import type { Badge } from '../../shared/api/types'
import { routes } from '../../spa/routes'
import { BadgeIcon, badgeTier } from './BadgeIcon'
import './badges.css'

/** Her rozet için "ne yapmalıyım?" sorusunun cevabı: birim ve kullanıcıyı harekete geçiren bağlantı. */
const NEXT_STEP: Record<string, { unit: string; cta: string; to: string }> = {
  first_shelf: { unit: 'kitap ekle', cta: 'Kitap keşfet', to: routes.discover },
  first_review: { unit: 'yorum paylaş', cta: 'Bir kitabı yorumla', to: routes.library },
  reader_5: { unit: 'kitap daha bitir', cta: 'Okumaya devam et', to: routes.library },
  reader_25: { unit: 'kitap daha bitir', cta: 'Okumaya devam et', to: routes.library },
  genre_explorer: { unit: 'farklı tür daha', cta: 'Yeni bir tür keşfet', to: routes.discover },
  active_7: { unit: 'gün daha oku', cta: 'Odak seansı başlat', to: routes.focus },
  streak_7: { unit: 'gün üst üste oku', cta: 'Seriyi sürdür', to: routes.focus },
  critic_10: { unit: 'yorum daha', cta: 'Yorum yaz', to: routes.library },
  ratings_10: { unit: 'kitap daha puanla', cta: 'Kitapları puanla', to: routes.library },
  goal_getter: { unit: 'yıllık hedef', cta: 'Hedefine bak', to: routes.library },
}
const FALLBACK_STEP = { unit: 'adım', cta: 'Keşfet', to: routes.discover }

const TIER_LABEL = { gold: 'Altın', silver: 'Gümüş', bronze: 'Bronz' } as const

function remaining(badge: Badge) {
  return Math.max(0, badge.goal - badge.progress)
}

/** İlerlemeye göre cesaret verici kısa bir cümle. */
export function cheer(percent: number): string {
  if (percent >= 80) return 'Neredeyse oldu!'
  if (percent >= 50) return 'Yarıyı geçtin, harika gidiyorsun.'
  if (percent > 0) return 'Güzel bir başlangıç yaptın.'
  return 'İlk adım için mükemmel bir gün.'
}

function earnedOn(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Rozet madalyası: kazanılmamışsa çevresinde ilerleme halkası taşır. */
function Medal({ badge, size = 'md' }: { badge: Badge; size?: 'md' | 'xl' }) {
  const style = { '--p': badge.earned ? 100 : Math.min(100, badge.progress_percent) } as CSSProperties
  return (
    <span className={`medal medal--${size} medal--${badgeTier(badge.xp_reward)}${badge.earned ? ' is-earned' : ''}`} style={style} aria-hidden="true">
      <BadgeIcon code={badge.code} earned={badge.earned} xpReward={badge.xp_reward} size={size === 'xl' ? 'lg' : 'md'} />
      {!badge.earned && <span className="medal__lock"><Lock size={11} strokeWidth={2.5} /></span>}
    </span>
  )
}

function Spotlight({ badge }: { badge: Badge }) {
  const step = NEXT_STEP[badge.code] ?? FALLBACK_STEP
  const left = remaining(badge)
  return (
    <article className={`badge-spotlight badge-spotlight--${badgeTier(badge.xp_reward)}`} aria-labelledby="badge-spotlight-title">
      <Medal badge={badge} size="xl" />
      <div className="badge-spotlight__body">
        <p className="mh-eyebrow">Sıradaki hedefin</p>
        <h3 id="badge-spotlight-title">{badge.name}</h3>
        <p className="badge-spotlight__desc">{badge.description}</p>
        <p className="badge-spotlight__left">
          <strong>{left} {step.unit}</strong>
          <span>{cheer(badge.progress_percent)}</span>
        </p>
        <div className="badge-meter" role="progressbar" aria-label={`${badge.name} ilerlemesi`} aria-valuemin={0} aria-valuemax={badge.goal} aria-valuenow={badge.progress}>
          {Array.from({ length: Math.min(badge.goal, 10) }, (_, index) => {
            const filled = badge.goal <= 10 ? index < badge.progress : index < Math.floor(badge.progress_percent / 10)
            return <span key={index} className={filled ? 'is-filled' : ''} />
          })}
        </div>
        <div className="badge-spotlight__actions">
          <Link to={step.to} className="mh-button mh-button--primary mh-button--md">
            <span>{step.cta}</span><ArrowRight size={16} aria-hidden="true" />
          </Link>
          <span className="badge-spotlight__reward"><Sparkles size={14} aria-hidden="true" /> +{badge.xp_reward} XP ödül</span>
        </div>
      </div>
    </article>
  )
}

function Collection({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((badge) => badge.earned)
  const percent = badges.length ? Math.round((earned.length / badges.length) * 100) : 0
  const xp = earned.reduce((sum, badge) => sum + badge.xp_reward, 0)
  const total = badges.reduce((sum, badge) => sum + badge.xp_reward, 0)
  const tiers = (['gold', 'silver', 'bronze'] as const).map((tier) => ({
    tier,
    have: earned.filter((badge) => badgeTier(badge.xp_reward) === tier).length,
    all: badges.filter((badge) => badgeTier(badge.xp_reward) === tier).length,
  }))
  return (
    <aside className="badge-collection" aria-label="Rozet koleksiyonu">
      <div className="badge-collection__ring" style={{ '--p': percent } as CSSProperties}>
        <Trophy size={22} aria-hidden="true" />
        <strong>{earned.length}<small>/{badges.length}</small></strong>
      </div>
      <p className="badge-collection__title">Koleksiyonun %{percent} tamam</p>
      <p className="badge-collection__xp">Rozetlerden <b>{xp}</b> / {total} XP</p>
      <ul className="badge-collection__tiers">
        {tiers.map(({ tier, have, all }) => (
          <li key={tier}><span className={`tier-dot tier-dot--${tier}`} aria-hidden="true" />{TIER_LABEL[tier]} <b>{have}/{all}</b></li>
        ))}
      </ul>
    </aside>
  )
}

function BadgeTile({ badge, onToggle, disabled, isNext }: { badge: Badge; onToggle: () => void; disabled: boolean; isNext: boolean }) {
  const tier = badgeTier(badge.xp_reward)
  const step = NEXT_STEP[badge.code] ?? FALLBACK_STEP
  const date = earnedOn(badge.earned_at)
  return (
    <li className={`badge-tile badge-tile--${tier}${badge.earned ? ' is-earned' : ''}${isNext ? ' is-next' : ''}${badge.showcased ? ' is-showcased' : ''}`}>
      <div className="badge-tile__top">
        <span className="badge-tile__tier">{TIER_LABEL[tier]}</span>
        <span className="badge-tile__xp">+{badge.xp_reward} XP</span>
      </div>
      <Medal badge={badge} />
      <strong className="badge-tile__name">{badge.name}</strong>
      <span className="badge-tile__desc">{badge.description}</span>
      {badge.earned ? (
        <div className="badge-tile__foot">
          {date && <small>{date}</small>}
          <button type="button" className="badge-tile__showcase" aria-pressed={badge.showcased} onClick={onToggle} disabled={disabled}>
            {badge.showcased ? 'Vitrinde ✓' : 'Vitrine koy'}
          </button>
        </div>
      ) : (
        <div className="badge-tile__foot">
          <small><b>{badge.progress}/{badge.goal}</b> · {remaining(badge)} {step.unit}</small>
        </div>
      )}
    </li>
  )
}

export function BadgeShelf({ badges, onToggle, disabled }: { badges: Badge[]; onToggle: (badge: Badge) => void; disabled: boolean }) {
  const pending = badges.filter((badge) => !badge.earned).sort((a, b) => b.progress_percent - a.progress_percent || a.goal - b.goal)
  const earned = badges.filter((badge) => badge.earned)
  const next = pending[0]
  return (
    <div className="badge-shelf">
      <div className="badge-shelf__hero">
        {next ? <Spotlight badge={next} /> : (
          <article className="badge-spotlight badge-spotlight--gold badge-spotlight--done">
            <Trophy size={48} aria-hidden="true" />
            <div className="badge-spotlight__body">
              <p className="mh-eyebrow">Tebrikler</p>
              <h3>Bütün rozetleri topladın!</h3>
              <p className="badge-spotlight__desc">Gerçek bir Mihenk ustasısın. Yeni rozetler yakında.</p>
            </div>
          </article>
        )}
        <Collection badges={badges} />
      </div>

      {earned.length > 0 && (
        <>
          <h3 className="badge-shelf__heading">Kazandıkların <span>{earned.length}</span></h3>
          <ul className="badge-tiles">
            {earned.map((badge) => <BadgeTile key={badge.code} badge={badge} onToggle={() => onToggle(badge)} disabled={disabled} isNext={false} />)}
          </ul>
        </>
      )}
      {pending.length > 0 && (
        <>
          <h3 className="badge-shelf__heading">Seni bekleyenler <span>{pending.length}</span></h3>
          <ul className="badge-tiles">
            {pending.map((badge) => <BadgeTile key={badge.code} badge={badge} onToggle={() => onToggle(badge)} disabled={disabled} isNext={badge === next} />)}
          </ul>
        </>
      )}
    </div>
  )
}
