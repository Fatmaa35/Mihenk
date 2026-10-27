import { useEffect, useRef, useState } from 'react'
import { Share2, Sparkles, Star } from 'lucide-react'
import { useGamification, useUpdateShowcase } from '../../shared/api/profile'
import type { Badge } from '../../shared/api/types'
import { Button, useToast } from '../../shared/ui'
import { renderNodeToPng, shareOrDownload, slugify } from '../share/shareImage'
import { BadgeIcon, badgeTier } from './BadgeIcon'
import { launchConfetti, newlyEarned, prefersReducedMotion, readSeen, writeSeen } from './celebration'
import './badges.css'
import './celebration.css'

const SHOWCASE_LIMIT = 3
const TIER_LABEL = { gold: 'Altın', silver: 'Gümüş', bronze: 'Bronz' } as const
const CONFETTI = ['#3D3AC9', '#E9A92E', '#FFE08A', '#D9F2E3', '#FFDCD2', '#B23A2E', '#8E8BFF']

/** Paylaşılan rozet görseli (1080×1350). Ekran dışında çizilir, yalnızca dışa aktarılırken kullanılır. */
function BadgeShareCard({ badge, name }: { badge: Badge; name: string }) {
  const tier = badgeTier(badge.xp_reward)
  return (
    <div className={`bc-share bc-share--${tier}`} style={{ width: 1080, height: 1350 }}>
      <p className="bc-share__kicker">Yeni rozet · {TIER_LABEL[tier]}</p>
      <span className={`medal medal--xl medal--${tier} is-earned bc-share__medal`}>
        <BadgeIcon code={badge.code} earned xpReward={badge.xp_reward} size="lg" />
      </span>
      <h2 className="bc-share__title">{badge.name}</h2>
      <p className="bc-share__desc">{badge.description}</p>
      <p className="bc-share__who">{name} · +{badge.xp_reward} XP</p>
      <p className="bc-share__brand"><img src="/static/brand/mark-light.webp" alt="" />Mihenk</p>
    </div>
  )
}

/**
 * Yeni bir rozet kazanıldığında açılan kutlama: konfeti, dönerek parlayan madalya, "Vitrine koy" ve "Paylaş".
 * Uygulama kabuğunda bir kez yer alır; rozet verisi her ilerlemeden sonra zaten yenilenir.
 */
export function BadgeCelebration({ userId, displayName }: { userId: string; displayName: string }) {
  const gamification = useGamification()
  const showcase = useUpdateShowcase()
  const { notify } = useToast()
  const [queue, setQueue] = useState<Badge[]>([])
  const [sharing, setSharing] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)
  const current = queue[0] ?? null

  // Yeni kazanılan rozetleri kuyruğa ekle (ilk açılışta mevcutları görülmüş say).
  useEffect(() => {
    const badges = gamification.data?.badges
    if (!badges) return
    const seen = readSeen(userId)
    const earned = badges.filter((badge) => badge.earned).map((badge) => badge.code)
    if (seen === null) { writeSeen(userId, earned); return }
    const fresh = newlyEarned(badges, seen)
    if (fresh.length === 0) return
    writeSeen(userId, [...seen, ...fresh.map((badge) => badge.code)])
    setQueue((previous) => [...previous, ...fresh.filter((badge) => !previous.some((item) => item.code === badge.code))])
  }, [gamification.data, userId])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (current && !dialog.open) dialog.showModal()
    if (!current && dialog.open) dialog.close()
    if (!current || prefersReducedMotion() || !canvasRef.current) return
    return launchConfetti(canvasRef.current, CONFETTI)
  }, [current])

  const next = () => setQueue((previous) => previous.slice(1))
  const showcased = gamification.data?.showcase ?? []
  const inShowcase = current ? showcased.includes(current.code) : false
  const showcaseFull = showcased.length >= SHOWCASE_LIMIT && !inShowcase
  // Vitrin doluysa yeni rozet en eski vitrin rozetinin yerini alır; düğme hangisi olduğunu söyler.
  const replaced = showcaseFull ? gamification.data?.badges.find((badge) => badge.code === showcased[0]) : undefined

  const putInShowcase = () => {
    if (!current) return
    const next = showcaseFull ? [...showcased.slice(1), current.code] : [...showcased, current.code]
    showcase.mutate(next, {
      onSuccess: () => notify(`“${current.name}” vitrinine eklendi.`, 'success'),
      onError: (error) => notify(error.message, 'error'),
    })
  }

  const share = async () => {
    const node = shareRef.current?.firstElementChild as HTMLElement | null
    if (!node || !current) return
    setSharing(true)
    try {
      const blob = await renderNodeToPng(node, 1080, 1350)
      const result = await shareOrDownload(blob, `mihenk-rozet-${slugify(current.name)}.png`, `Mihenk'te “${current.name}” rozetini kazandım!`)
      if (result === 'downloaded') notify('Rozet görseli indirildi.', 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Görsel hazırlanamadı.', 'error')
    } finally {
      setSharing(false)
    }
  }

  const tier = current ? badgeTier(current.xp_reward) : 'bronze'
  return (
    <dialog ref={dialogRef} className="bc" aria-labelledby="bc-title" onClose={next} onCancel={(event) => { event.preventDefault(); next() }}>
      <canvas ref={canvasRef} className="bc__confetti" aria-hidden="true" />
      {current && (
        <div className={`bc__panel bc__panel--${tier}`}>
          <p className="bc__eyebrow"><Sparkles size={16} aria-hidden="true" /> Yeni rozet kazandın!</p>
          <span className={`medal medal--xl medal--${tier} is-earned bc__medal`} aria-hidden="true">
            <BadgeIcon code={current.code} earned xpReward={current.xp_reward} size="lg" />
          </span>
          <h2 id="bc-title">{current.name}</h2>
          <p className="bc__desc">{current.description}</p>
          <p className="bc__reward"><Star size={16} aria-hidden="true" /> {TIER_LABEL[tier]} · +{current.xp_reward} XP</p>
          <div className="bc__actions">
            <Button variant="secondary" onClick={putInShowcase} loading={showcase.isPending} disabled={inShowcase}>
              {inShowcase ? 'Vitrinde ✓' : 'Vitrine koy'}
            </Button>
            <Button variant="secondary" icon={<Share2 size={16} aria-hidden="true" />} loading={sharing} onClick={() => void share()}>Paylaş</Button>
            <Button onClick={next} autoFocus>{queue.length > 1 ? 'Sıradaki rozet' : 'Harika!'}</Button>
          </div>
          {showcaseFull && replaced && <p className="bc__hint">Vitrin dolu; bu rozet “{replaced.name}” rozetinin yerini alır.</p>}
          <div ref={shareRef} className="bc__offscreen" aria-hidden="true"><BadgeShareCard badge={current} name={displayName} /></div>
        </div>
      )}
    </dialog>
  )
}
