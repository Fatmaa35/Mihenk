import { mix, readableInk } from '../share/shareImage'
import './quote-card.css'

export type QuoteStyle = 'cover' | 'paper' | 'night'
export type QuoteFormat = 'story' | 'post'

export const QUOTE_SIZES: Record<QuoteFormat, { width: number; height: number; label: string }> = {
  story: { width: 1080, height: 1920, label: 'Hikâye 9:16' },
  post: { width: 1080, height: 1350, label: 'Gönderi 4:5' },
}

export const QUOTE_STYLES: { value: QuoteStyle; label: string }[] = [
  { value: 'cover', label: 'Kapak renkleri' },
  { value: 'paper', label: 'Kâğıt' },
  { value: 'night', label: 'Gece' },
]

/** Uzun alıntıda yazı küçülür; kart her zaman okunaklı kalır. */
export function quoteFontSize(text: string, format: QuoteFormat): number {
  const length = text.trim().length
  const base = length <= 70 ? 96 : length <= 140 ? 78 : length <= 240 ? 62 : length <= 380 ? 50 : 42
  return format === 'post' ? Math.round(base * 0.88) : base
}

export type QuoteCardData = {
  text: string
  bookTitle: string
  author?: string | null
  page?: number | null
  palette: [string, string]
  style: QuoteStyle
  format: QuoteFormat
}

/** Alıntı kartı gerçek boyutunda çizilir (1080 genişlik); önizlemede ölçeklenir, paylaşırken aynen aktarılır. */
export function QuoteCard({ text, bookTitle, author, page, palette, style, format }: QuoteCardData) {
  const { width, height } = QUOTE_SIZES[format]
  const [base, second] = palette
  const look = style === 'cover'
    ? { background: `linear-gradient(160deg, ${mix(base, '#FFFFFF', 0.08)} 0%, ${base} 45%, ${mix(second, '#000000', 0.2)} 100%)`, ink: readableInk(base), accent: mix(second, '#FFFFFF', 0.55) }
    : style === 'paper'
      ? { background: '#FBF6EC', ink: '#2A2622', accent: mix(base, '#000000', 0.1) }
      : { background: `radial-gradient(120% 80% at 20% 0%, ${mix(base, '#15151A', 0.55)} 0%, #121218 70%)`, ink: '#F3F2EE', accent: mix(base, '#FFFFFF', 0.45) }

  return (
    <div className={`qc qc--${style} qc--${format}`} style={{ width, height, background: look.background, color: look.ink }}>
      <span className="qc__mark" style={{ color: look.accent }} aria-hidden="true">“</span>
      <blockquote className="qc__text" style={{ fontSize: quoteFontSize(text, format) }}>
        {text.trim() || 'Beğendiğin cümle burada görünecek.'}
      </blockquote>
      <div className="qc__source">
        <span className="qc__rule" style={{ background: look.accent }} />
        <div>
          <strong>{bookTitle}</strong>
          <span>{[author, page ? `s. ${page}` : null].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <div className="qc__brand">
        <img src="/static/brand/mark-light.webp" alt="" />
        <span>Mihenk</span>
      </div>
    </div>
  )
}
