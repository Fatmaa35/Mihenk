import { ReactNode } from 'react'
import type { TileTone } from '../../shared/ui'
import { Tile } from '../../shared/ui'

export function Stat({ label, value, hint, tone = 'surface' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: TileTone }) {
  return (
    <Tile tone={tone} className="admin-stat">
      <p className="mh-eyebrow">{label}</p>
      <p className="admin-stat__value">{value}</p>
      {hint && <p className="admin-stat__hint">{hint}</p>}
    </Tile>
  )
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="admin-panel">
      <header className="admin-panel__head"><h2>{title}</h2>{action}</header>
      {children}
    </section>
  )
}

/** Basit yatay çubuk listesi; sayılar her zaman yanında yazılı. */
export function BarList({ rows, empty }: { rows: { label: string; value: number; display?: string }[]; empty: string }) {
  if (!rows.length) return <p className="today__muted">{empty}</p>
  const max = Math.max(1, ...rows.map((row) => row.value))
  return (
    <ul className="bars admin-bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span className="bars__label" title={row.label}>{row.label}</span>
          <span className="bars__track"><span className="bars__fill" style={{ width: `${(row.value / max) * 100}%` }} /></span>
          <b>{row.display ?? row.value.toLocaleString('tr-TR')}</b>
        </li>
      ))}
    </ul>
  )
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Açık', reviewing: 'İnceleniyor', resolved: 'Çözüldü', dismissed: 'Reddedildi',
  pending: 'Bekliyor', processing: 'İşleniyor', running: 'Çalışıyor', completed: 'Tamamlandı', succeeded: 'Başarılı',
  partial: 'Kısmi', failed: 'Başarısız', dead_letter: 'Kalıcı hata',
  low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik', warning: 'Uyarı', info: 'Bilgi', error: 'Hata',
}
const STATUS_TONE: Record<string, string> = {
  resolved: 'good', completed: 'good', succeeded: 'good', info: 'muted', dismissed: 'muted',
  failed: 'bad', dead_letter: 'bad', critical: 'bad', error: 'bad', high: 'bad',
  partial: 'warn', warning: 'warn', medium: 'warn', open: 'warn', pending: 'muted', processing: 'muted', running: 'muted', reviewing: 'muted', low: 'muted',
}

export function StatusChip({ status }: { status: string }) {
  return <span className={`status-chip status-chip--${STATUS_TONE[status] ?? 'muted'}`}>{STATUS_LABELS[status] ?? status}</span>
}
