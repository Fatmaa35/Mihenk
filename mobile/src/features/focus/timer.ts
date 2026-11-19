/**
 * Odak seansının zaman mantığı.
 *
 * Sayaç her saniye artan bir değişkende tutulmaz; her şey başlangıç
 * zaman damgasından hesaplanır. Böylece uygulama arka plana atıldığında ya da
 * ekran kapandığında süre kaymaz: geri dönüldüğünde doğru süre görünür.
 */

export const FOCUS_MS = 25 * 60 * 1000
export const BREAK_MS = 5 * 60 * 1000

export type Mode = 'pomodoro' | 'stopwatch'
export type Phase = 'focus' | 'break'

export type Timer = {
  mode: Mode
  phase: Phase
  /** Çalışmakta olan turun başlangıcı; duraklatılmışsa null. */
  startedAt: number | null
  /** Bu evrede duraklatmalardan önce biriken süre. */
  carried: number
  /** Seans boyunca okumaya ayrılan toplam süre (molalar hariç). */
  focused: number
  cycles: number
}

export function createTimer(mode: Mode = 'pomodoro'): Timer {
  return { mode, phase: 'focus', startedAt: null, carried: 0, focused: 0, cycles: 0 }
}

export const isRunning = (timer: Timer): boolean => timer.startedAt !== null

/** Bulunulan evrede geçen süre (ms). */
export function elapsed(timer: Timer, now: number): number {
  return timer.carried + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt))
}

/** Pomodoro'da kalan süre; kronometrede sınır yoktur. */
export function remaining(timer: Timer, now: number): number {
  if (timer.mode === 'stopwatch') return 0
  const limit = timer.phase === 'focus' ? FOCUS_MS : BREAK_MS
  return Math.max(0, limit - elapsed(timer, now))
}

/** Seans kaydına yazılacak süre: yalnızca okunan dakikalar. */
export function focusedMinutes(timer: Timer, now: number): number {
  const live = timer.phase === 'focus' ? elapsed(timer, now) : 0
  return Math.round((timer.focused + live) / 60000)
}

export function start(timer: Timer, now: number): Timer {
  return isRunning(timer) ? timer : { ...timer, startedAt: now }
}

export function pause(timer: Timer, now: number): Timer {
  if (!isRunning(timer)) return timer
  return { ...timer, carried: elapsed(timer, now), startedAt: null }
}

export function reset(timer: Timer): Timer {
  return createTimer(timer.mode)
}

export function setMode(timer: Timer, mode: Mode): Timer {
  return createTimer(mode)
}

/** Evreyi kapatır: odak süresi toplama eklenir, sıra diğer evreye geçer. */
export function nextPhase(timer: Timer, now: number): Timer {
  const spent = elapsed(timer, now)
  const focusing = timer.phase === 'focus'
  return {
    ...timer,
    phase: focusing ? 'break' : 'focus',
    startedAt: now,
    carried: 0,
    focused: timer.focused + (focusing ? spent : 0),
    cycles: timer.cycles + (focusing ? 1 : 0),
  }
}

/**
 * Pomodoro'da süresi dolan evreyi kendiliğinden kapatır. Arka planda geçen
 * uzun süreler için de doğrudur: dönüldüğünde evre bir kez ilerletilir.
 */
export function tick(timer: Timer, now: number): Timer {
  if (timer.mode !== 'pomodoro' || !isRunning(timer)) return timer
  return remaining(timer, now) === 0 ? nextPhase(timer, now) : timer
}

/** Seansı bitirip kaydetmek için: o ana kadar okunan süre. */
export function finish(timer: Timer, now: number): { minutes: number; timer: Timer } {
  const minutes = focusedMinutes(timer, now)
  return { minutes, timer: createTimer(timer.mode) }
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
