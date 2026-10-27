/**
 * Paylaşılabilir görseller: ekrandaki bir kartı (DOM) PNG'ye çevirir, telefonda paylaşım menüsünü,
 * masaüstünde dosya indirmeyi kullanır. Önizleme ile paylaşılan görsel birebir aynıdır.
 */

export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

/** Şeffaf 1x1 PNG: dış kaynaklı (CORS izni olmayan) kapak görselleri yerine kullanılır. */
const EMPTY_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

/** Kartı tam çözünürlükte PNG'ye çevirir. Yazı tipleri yüklenmeden çekilen görselde yedek font görünür; önce beklenir. */
export async function renderNodeToPng(node: HTMLElement, width: number, height: number): Promise<Blob> {
  await document.fonts?.ready
  const { toBlob } = await import('html-to-image')
  const blob = await toBlob(node, {
    width,
    height,
    pixelRatio: 1,
    cacheBust: true,
    imagePlaceholder: EMPTY_PIXEL,
    // Önizlemede kart küçültülerek gösterilir; dışa aktarırken gerçek boyutuna döndürülür.
    style: { transform: 'none', transformOrigin: 'top left', margin: '0' },
  })
  if (!blob) throw new Error('Görsel oluşturulamadı.')
  return blob
}

export function slugify(value: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (char) => map[char] ?? char)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mihenk'
}

/** Paylaşım menüsü varsa (çoğu telefon) onu açar, yoksa PNG'yi indirir. */
export async function shareOrDownload(blob: Blob, fileName: string, text: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: 'Mihenk' })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Paylaşım reddedildiyse indirmeye düş.
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
  return 'downloaded'
}

/* ---------- Renkler ---------- */

type Rgb = { r: number; g: number; b: number }

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean
  const value = Number.parseInt(full, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((part) => Math.round(Math.max(0, Math.min(255, part))).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

export function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return rgbToHex({ r: x.r + (y.r - x.r) * amount, g: x.g + (y.g - x.g) * amount, b: x.b + (y.b - x.b) * amount })
}

/** WCAG göreli parlaklık; kartta yazının açık mı koyu mu olacağına karar verir. */
export function luminance(hex: string): number {
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function readableInk(background: string): string {
  return luminance(background) > 0.35 ? '#15151A' : '#FFFFFF'
}

/**
 * Kapak görselinden iki baskın renk çıkarır. Görsel başka bir siteden geliyor ve CORS izni vermiyorsa
 * tarayıcı pikselleri okumamıza izin vermez; o zaman null döner ve çağıran yedek paleti kullanır.
 */
export async function extractCoverColors(url: string | null | undefined): Promise<[string, string] | null> {
  if (!url) return null
  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('kapak yüklenemedi'))
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = 24
    canvas.height = 36
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()
    for (let index = 0; index < data.length; index += 4) {
      const [r, g, b] = [data[index], data[index + 1], data[index + 2]]
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
      bucket.count += 1; bucket.r += r; bucket.g += g; bucket.b += b
      buckets.set(key, bucket)
    }
    const ranked = [...buckets.values()]
      .map((bucket) => ({ count: bucket.count, hex: rgbToHex({ r: bucket.r / bucket.count, g: bucket.g / bucket.count, b: bucket.b / bucket.count }) }))
      .sort((a, b) => b.count - a.count)
    if (ranked.length === 0) return null
    const first = ranked[0].hex
    const second = ranked.find((item) => Math.abs(luminance(item.hex) - luminance(first)) > 0.12)?.hex ?? mix(first, '#000000', 0.35)
    return [first, second]
  } catch {
    return null
  }
}
