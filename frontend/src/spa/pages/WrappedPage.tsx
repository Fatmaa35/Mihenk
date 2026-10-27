import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, Share2 } from 'lucide-react'
import { CARD_HEIGHT, CARD_WIDTH, wrappedCards } from '../../features/wrapped/WrappedCards'
import { buildWrapped, defaultWrappedYear } from '../../features/wrapped/summary'
import { renderNodeToPng, shareOrDownload } from '../../features/share/shareImage'
import { useGamification, useReadingDashboardDetails, useReadingSessions } from '../../shared/api/profile'
import { Button, EmptyState, ErrorState, SegmentedTabs, Skeleton, useToast } from '../../shared/ui'
import { useSession } from '../layout/SessionGate'
import { routes } from '../routes'
import '../../features/wrapped/wrapped.css'

/** Kart çerçevesini ekrana sığdıracak ölçeği hesaplar (9:16 oranı korunur). */
function useCardScale() {
  const [scale, setScale] = useState(0.3)
  useLayoutEffect(() => {
    const update = () => {
      const width = Math.min(window.innerWidth - 32, 460)
      const height = window.innerHeight - 260
      setScale(Math.max(0.18, Math.min(width / CARD_WIDTH, height / CARD_HEIGHT)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}

export default function WrappedPage() {
  const { user, profile } = useSession()
  const [params, setParams] = useSearchParams()
  const thisYear = new Date().getFullYear()
  const year = Number(params.get('yil')) || defaultWrappedYear()
  const dashboard = useReadingDashboardDetails(year)
  const gamification = useGamification()
  const sessions = useReadingSessions()
  const { notify } = useToast()
  const scale = useCardScale()
  const [index, setIndex] = useState(0)
  const [sharing, setSharing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const summary = useMemo(() => {
    if (!dashboard.data || !gamification.data || !sessions.data) return null
    return buildWrapped({ year, dashboard: dashboard.data, sessions: sessions.data, readBooks: profile.read_books, badges: gamification.data.badges })
  }, [year, dashboard.data, gamification.data, sessions.data, profile.read_books])
  const cards = useMemo(() => (summary ? wrappedCards(summary, user.display_name) : []), [summary, user.display_name])
  const current = Math.min(index, Math.max(0, cards.length - 1))

  useEffect(() => { document.title = `${year} okuma yılın · Mihenk` }, [year])

  const go = useCallback((delta: number) => setIndex((value) => Math.max(0, Math.min(cards.length - 1, value + delta))), [cards.length])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const share = async () => {
    const node = cardRef.current?.firstElementChild as HTMLElement | null
    if (!node || !cards[current]) return
    setSharing(true)
    try {
      const blob = await renderNodeToPng(node, CARD_WIDTH, CARD_HEIGHT)
      const result = await shareOrDownload(blob, `mihenk-${year}-${cards[current].id}.png`, `${year} okuma yılım #MihenkWrapped`)
      if (result === 'downloaded') notify('Görsel indirildi. Hikâyende paylaşabilirsin.', 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Görsel hazırlanamadı.', 'error')
    } finally {
      setSharing(false)
    }
  }

  const failed = dashboard.error ?? gamification.error ?? sessions.error
  const yearOptions = [thisYear - 1, thisYear].map((value) => ({ value: String(value), label: String(value) }))

  return (
    <div className="page wrapped">
      <header className="wrapped__head">
        <Link to={routes.profile} className="mh-button mh-button--ghost mh-button--sm"><ArrowLeft size={16} aria-hidden="true" /><span>Profil</span></Link>
        <SegmentedTabs label="Yıl" value={String(year)} onChange={(value) => { setIndex(0); setParams({ yil: value }) }} options={yearOptions} />
      </header>

      {failed && <ErrorState message={failed.message} onRetry={() => { void dashboard.refetch(); void gamification.refetch(); void sessions.refetch() }} />}
      {!summary && !failed && <Skeleton width={Math.round(CARD_WIDTH * scale)} height={Math.round(CARD_HEIGHT * scale)} radius={28} />}

      {summary?.isEmpty && (
        <div className="wrapped__empty">
          <EmptyState
            icon={<BookOpen size={28} />}
            title={`${year} için henüz okuma kaydın yok`}
            description="İlerleme girdikçe ve odak seansı yaptıkça yılın özeti burada şekillenecek."
            action={<Link to={routes.library} className="mh-button mh-button--secondary mh-button--md">Kitaplığıma git</Link>}
          />
        </div>
      )}

      {summary && !summary.isEmpty && cards[current] && (
        <section className="wrapped__stage" aria-roledescription="hikâye" aria-label={`${year} okuma özeti`}>
          <div className="wrapped__progress" aria-hidden="true">
            {cards.map((card, position) => <span key={card.id} className={position < current ? 'is-done' : position === current ? 'is-current' : ''} />)}
          </div>
          <div className="wrapped__frame" style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }}>
            <div ref={cardRef} className="wrapped__scale" style={{ transform: `scale(${scale})`, width: CARD_WIDTH, height: CARD_HEIGHT }}>
              {cards[current].render()}
            </div>
            <button type="button" className="wrapped__zone wrapped__zone--prev" aria-label="Önceki kart" onClick={() => go(-1)} disabled={current === 0} />
            <button type="button" className="wrapped__zone wrapped__zone--next" aria-label="Sonraki kart" onClick={() => go(1)} disabled={current === cards.length - 1} />
          </div>
          <p className="visually-hidden" aria-live="polite">{`Kart ${current + 1} / ${cards.length}: ${cards[current].label}`}</p>
          <div className="wrapped__controls">
            <Button variant="secondary" icon={<ArrowLeft size={16} aria-hidden="true" />} onClick={() => go(-1)} disabled={current === 0}>Geri</Button>
            <Button icon={<Share2 size={16} aria-hidden="true" />} loading={sharing} onClick={() => void share()}>Bu kartı paylaş</Button>
            <Button variant="secondary" onClick={() => go(1)} disabled={current === cards.length - 1}>İleri<ArrowRight size={16} aria-hidden="true" /></Button>
          </div>
        </section>
      )}
    </div>
  )
}
