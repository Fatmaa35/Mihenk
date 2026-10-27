import type { Badge } from '../../shared/api/types'

/**
 * Hangi rozetlerin kutlandığını tarayıcıda hatırlar. İlk açılışta mevcut rozetler "görülmüş" sayılır;
 * böylece kullanıcı eski rozetleri için toplu kutlama görmez, yalnızca bundan sonra kazandıklarını.
 */
const key = (userId: string) => `mihenk-seen-badges:${userId}`

export function readSeen(userId: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(key(userId))
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return null
  }
}

export function writeSeen(userId: string, codes: Iterable<string>): void {
  try { localStorage.setItem(key(userId), JSON.stringify([...new Set(codes)])) } catch { /* gizli pencere */ }
}

/** Görülmemiş yeni rozetler, kazanılma sırasına göre. */
export function newlyEarned(badges: Badge[], seen: Set<string>): Badge[] {
  return badges
    .filter((badge) => badge.earned && !seen.has(badge.code))
    .sort((a, b) => (a.earned_at ?? '').localeCompare(b.earned_at ?? ''))
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Hafif konfeti: tek bir tuval üzerinde ~2,5 saniyelik parçacık animasyonu. */
export function launchConfetti(canvas: HTMLCanvasElement, colors: string[]): () => void {
  const context = canvas.getContext('2d')
  if (!context) return () => undefined
  const ratio = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  canvas.width = width * ratio
  canvas.height = height * ratio
  context.scale(ratio, ratio)
  const pieces = Array.from({ length: 150 }, () => ({
    x: width / 2 + (Math.random() - 0.5) * 120,
    y: height * 0.42,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 15 - 6,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.4,
    color: colors[Math.floor(Math.random() * colors.length)],
  }))
  const started = performance.now()
  let frame = 0
  const draw = (now: number) => {
    const elapsed = now - started
    context.clearRect(0, 0, width, height)
    for (const piece of pieces) {
      piece.vy += 0.42
      piece.vx *= 0.99
      piece.x += piece.vx
      piece.y += piece.vy
      piece.rotation += piece.spin
      context.save()
      context.globalAlpha = Math.max(0, 1 - elapsed / 2600)
      context.translate(piece.x, piece.y)
      context.rotate(piece.rotation)
      context.fillStyle = piece.color
      context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2)
      context.restore()
    }
    if (elapsed < 2600) frame = requestAnimationFrame(draw)
    else context.clearRect(0, 0, width, height)
  }
  frame = requestAnimationFrame(draw)
  return () => cancelAnimationFrame(frame)
}
