/** Arayüz genelinde ortak, Türkçe biçimlendiriciler. */

export function formatMoney(minor: number | null | undefined, currency = 'TRY'): string {
  if (minor == null) return '—'
  return (minor / 100).toLocaleString('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 })
}

const relative = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600], ['month', 30 * 24 * 3600], ['week', 7 * 24 * 3600],
  ['day', 24 * 3600], ['hour', 3600], ['minute', 60],
]

/** "3 saat önce", "dün" gibi göreli zaman; bir dakikadan yeni olaylar "şimdi". */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = (new Date(iso).getTime() - now) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'şimdi'
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr')
}
