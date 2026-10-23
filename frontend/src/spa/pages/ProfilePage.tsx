import { FormEvent, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { BadgeIcon } from '../../features/profile/BadgeIcon'
import { YearHeatmap } from '../../features/profile/YearHeatmap'
import { useGamification, useReadingDashboardDetails, useUpdateReadingGoal, useUpdateShowcase } from '../../shared/api/profile'
import type { Badge } from '../../shared/api/types'
import { Button, ErrorState, Progress, Skeleton, Tile, useToast } from '../../shared/ui'
import { initials } from '../format'
import { useSession } from '../layout/SessionGate'
import './pages.css'
import './profile-page.css'

const SHOWCASE_LIMIT = 3

function GoalEditor({ target, onDone }: { target: number; onDone: () => void }) {
  const update = useUpdateReadingGoal()
  const { notify } = useToast()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(new FormData(event.currentTarget).get('target'))
    update.mutate(value, {
      onSuccess: () => { notify('Yıllık hedefin güncellendi.', 'success'); onDone() },
      onError: (error) => notify(error.message, 'error'),
    })
  }
  return (
    <form className="goal-editor" onSubmit={submit}>
      <label className="visually-hidden" htmlFor="goal-target">Yıllık kitap hedefi</label>
      <input id="goal-target" name="target" className="mh-input" type="number" inputMode="numeric" min={1} max={1000} defaultValue={target} required autoFocus />
      <Button type="submit" size="sm" loading={update.isPending} icon={<Check size={16} aria-hidden="true" />}>Kaydet</Button>
      <Button size="sm" variant="ghost" onClick={onDone}>Vazgeç</Button>
    </form>
  )
}

function BadgeCard({ badge, onToggle, disabled }: { badge: Badge; onToggle: () => void; disabled: boolean }) {
  return (
    <li className={`badge-card${badge.earned ? ' is-earned' : ''}`}>
      <BadgeIcon code={badge.code} earned={badge.earned} xpReward={badge.xp_reward} />
      <div className="badge-card__body">
        <strong>{badge.name}</strong>
        <span>{badge.description}</span>
        {badge.earned ? (
          <button type="button" className="badge-card__showcase" aria-pressed={badge.showcased} onClick={onToggle} disabled={disabled}>
            {badge.showcased ? 'Vitrinden kaldır' : 'Vitrine koy'}
          </button>
        ) : (
          <div className="badge-card__progress">
            <Progress value={badge.progress_percent} label={`${badge.name} ilerlemesi`} size="sm" tone="accent" />
            <small>{badge.progress}/{badge.goal}</small>
          </div>
        )}
      </div>
      <span className="badge-card__xp">+{badge.xp_reward} XP</span>
    </li>
  )
}

export default function ProfilePage() {
  const { user } = useSession()
  const year = new Date().getFullYear()
  const dashboard = useReadingDashboardDetails(year)
  const gamification = useGamification()
  const showcase = useUpdateShowcase()
  const { notify } = useToast()
  const [editingGoal, setEditingGoal] = useState(false)

  const toggleShowcase = (badge: Badge) => {
    const current = gamification.data?.showcase ?? []
    const next = badge.showcased ? current.filter((code) => code !== badge.code) : [...current, badge.code]
    if (next.length > SHOWCASE_LIMIT) {
      notify(`Vitrinde en fazla ${SHOWCASE_LIMIT} rozet olabilir. Önce birini kaldır.`, 'error')
      return
    }
    showcase.mutate(next, { onError: (error) => notify(error.message, 'error') })
  }

  const level = gamification.data?.level
  const nextBadge = gamification.data?.badges
    .filter((badge) => !badge.earned)
    .sort((a, b) => b.progress_percent - a.progress_percent)[0]
  const showcased = gamification.data?.badges.filter((badge) => badge.showcased) ?? []
  const data = dashboard.data
  const maxGenre = Math.max(1, ...(data?.genre_distribution.map((item) => item.count) ?? [1]))

  return (
    <div className="page profile">
      <header className="profile__hero">
        <span className="profile__avatar" aria-hidden="true">{initials(user.display_name)}</span>
        <div className="profile__identity">
          <h1>{user.display_name}</h1>
          {level ? (
            <>
              <p className="profile__level">Seviye {level.number} · {level.name} · {gamification.data?.xp.toLocaleString('tr-TR')} XP</p>
              <div className="profile__level-bar">
                <Progress value={level.progress_percent} label="Sonraki seviyeye ilerleme" size="sm" tone="accent" />
                <small>{level.next_xp == null ? 'En yüksek seviyedesin.' : `Sonraki seviyeye ${(level.next_xp - (gamification.data?.xp ?? 0)).toLocaleString('tr-TR')} XP`}</small>
              </div>
            </>
          ) : <Skeleton width={260} height={18} />}
        </div>
        {showcased.length > 0 && (
          <ul className="profile__showcase" aria-label="Vitrindeki rozetler">
            {showcased.map((badge) => (
              <li key={badge.code} title={badge.name}><BadgeIcon code={badge.code} earned xpReward={badge.xp_reward} size="lg" /></li>
            ))}
          </ul>
        )}
      </header>

      {dashboard.isError && <ErrorState message={dashboard.error.message} onRetry={() => dashboard.refetch()} />}

      <section className="profile__stats" aria-label="Okuma istatistikleri">
        <Tile tone="butter" className="profile__goal">
          <p className="mh-eyebrow">{year} hedefi</p>
          {data ? (
            <>
              <p className="today__big">{data.goal.completed_books}<small> / {data.goal.target_books} kitap</small></p>
              <Progress value={data.goal.progress_percent} label="Yıllık hedef ilerlemesi" size="sm" />
              {editingGoal
                ? <GoalEditor target={data.goal.target_books} onDone={() => setEditingGoal(false)} />
                : <Button size="sm" variant="ghost" icon={<Pencil size={14} aria-hidden="true" />} onClick={() => setEditingGoal(true)}>Hedefi değiştir</Button>}
            </>
          ) : <Skeleton height={48} width={140} />}
        </Tile>
        <Tile tone="lilac"><p className="mh-eyebrow">Okunan sayfa</p><p className="today__big">{data?.total_pages_read.toLocaleString('tr-TR') ?? '—'}</p></Tile>
        <Tile tone="mint"><p className="mh-eyebrow">Aktif gün</p><p className="today__big">{data?.active_days ?? '—'}</p></Tile>
        <Tile tone="peach">
          <p className="mh-eyebrow">Seri</p>
          <p className="today__big">{data?.current_streak ?? '—'}<small> gün</small></p>
          {data && <p className="today__muted">En uzun: {data.longest_streak} gün</p>}
        </Tile>
      </section>

      <section className="profile__panel" aria-labelledby="calendar-title">
        <div className="section-head"><h2 id="calendar-title">Okuma takvimi</h2></div>
        {data ? <YearHeatmap year={year} calendar={data.calendar} /> : <Skeleton height={120} />}
      </section>

      <div className="profile__split">
        <section className="profile__panel" aria-labelledby="genres-title">
          <div className="section-head"><h2 id="genres-title">Tür dağılımı</h2></div>
          {data && data.genre_distribution.length === 0 && <p className="today__muted">Bitirdiğin kitaplar burada türlerine göre dağılacak.</p>}
          <ul className="bars">
            {data?.genre_distribution.map((item) => (
              <li key={item.genre}>
                <span className="bars__label">{item.genre}</span>
                <span className="bars__track"><span className="bars__fill" style={{ width: `${(item.count / maxGenre) * 100}%` }} /></span>
                <b>{item.count}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="profile__panel" aria-labelledby="series-title">
          <div className="section-head"><h2 id="series-title">Seriler</h2></div>
          {data && data.series_progress.length === 0 && <p className="today__muted">Bir serinin kitaplarını okudukça ilerlemen burada görünecek.</p>}
          <ul className="bars">
            {data?.series_progress.map((item) => (
              <li key={item.series_name}>
                <span className="bars__label">{item.series_name}</span>
                <span className="bars__track"><span className="bars__fill" style={{ width: `${item.progress_percent}%` }} /></span>
                <b>{item.read_books}/{item.total_books}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="badges-title">
        <div className="section-head">
          <h2 id="badges-title">Rozetler</h2>
          {gamification.data && <span className="mh-chip mh-chip--muted">{gamification.data.earned_count} / {gamification.data.total_badges} kazanıldı</span>}
        </div>
        {nextBadge && (
          <p className="profile__next">
            Sıradaki rozet: <strong>{nextBadge.name}</strong> · {Math.max(0, nextBadge.goal - nextBadge.progress)} adım kaldı
          </p>
        )}
        {gamification.isError && <ErrorState message={gamification.error.message} onRetry={() => gamification.refetch()} />}
        <ul className="badge-grid">
          {gamification.data?.badges.map((badge) => (
            <BadgeCard key={badge.code} badge={badge} onToggle={() => toggleShowcase(badge)} disabled={showcase.isPending} />
          ))}
        </ul>
      </section>
    </div>
  )
}
