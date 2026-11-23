import {
  BREAK_MS, FOCUS_MS, createTimer, elapsed, finish, focusedMinutes, formatClock,
  isRunning, nextPhase, pause, remaining, reset, start, tick,
} from './timer'

const MINUTE = 60_000
const T0 = 1_700_000_000_000

describe('odak sayacı', () => {
  it('başlamadan önce boştur', () => {
    const timer = createTimer()
    expect(isRunning(timer)).toBe(false)
    expect(elapsed(timer, T0)).toBe(0)
    expect(remaining(timer, T0)).toBe(FOCUS_MS)
  })

  it('geçen süreyi saatten değil zaman damgasından hesaplar', () => {
    const timer = start(createTimer(), T0)
    expect(elapsed(timer, T0 + 3 * MINUTE)).toBe(3 * MINUTE)
    expect(remaining(timer, T0 + 3 * MINUTE)).toBe(FOCUS_MS - 3 * MINUTE)
  })

  it('duraklatıp devam edince süre kaldığı yerden sayar', () => {
    let timer = start(createTimer(), T0)
    timer = pause(timer, T0 + 4 * MINUTE)
    expect(isRunning(timer)).toBe(false)
    // Duraklatmada geçen on dakika sayılmaz.
    expect(elapsed(timer, T0 + 14 * MINUTE)).toBe(4 * MINUTE)
    timer = start(timer, T0 + 14 * MINUTE)
    expect(elapsed(timer, T0 + 15 * MINUTE)).toBe(5 * MINUTE)
  })

  it('pomodoroda süre dolunca molaya geçer, mola bitince okumaya döner', () => {
    let timer = start(createTimer(), T0)
    timer = tick(timer, T0 + FOCUS_MS)
    expect(timer.phase).toBe('break')
    expect(timer.cycles).toBe(1)
    expect(remaining(timer, T0 + FOCUS_MS)).toBe(BREAK_MS)

    timer = tick(timer, T0 + FOCUS_MS + BREAK_MS)
    expect(timer.phase).toBe('focus')
    expect(timer.cycles).toBe(1)
  })

  it('uygulama arka plandayken geçen süre kaybolmaz', () => {
    const timer = start(createTimer(), T0)
    // Telefon cebe girdi, yarım saat sonra geri dönüldü.
    const after = tick(timer, T0 + 30 * MINUTE)
    expect(after.phase).toBe('break')
    expect(focusedMinutes(after, T0 + 30 * MINUTE)).toBe(30)
  })

  it('yalnızca okunan dakikaları sayar, molayı saymaz', () => {
    let timer = start(createTimer(), T0)
    timer = nextPhase(timer, T0 + 20 * MINUTE)
    expect(timer.phase).toBe('break')
    expect(focusedMinutes(timer, T0 + 25 * MINUTE)).toBe(20)
  })

  it('kronometrede sınır yoktur ve süre artarak sayar', () => {
    const timer = start(createTimer('stopwatch'), T0)
    expect(remaining(timer, T0 + 90 * MINUTE)).toBe(0)
    expect(elapsed(timer, T0 + 90 * MINUTE)).toBe(90 * MINUTE)
    expect(tick(timer, T0 + 90 * MINUTE)).toBe(timer)
  })

  it('bitirince okunan dakikayı verir ve sayacı sıfırlar', () => {
    const timer = start(createTimer(), T0)
    const { minutes, timer: fresh } = finish(timer, T0 + 42 * MINUTE)
    expect(minutes).toBe(42)
    expect(fresh).toEqual(createTimer())
  })

  it('sıfırlamak her şeyi başa alır', () => {
    let timer = start(createTimer(), T0)
    timer = nextPhase(timer, T0 + 25 * MINUTE)
    expect(reset(timer)).toEqual(createTimer())
  })

  it('saati dakika:saniye olarak yazar', () => {
    expect(formatClock(25 * MINUTE)).toBe('25:00')
    expect(formatClock(61_000)).toBe('01:01')
    expect(formatClock(-5)).toBe('00:00')
  })
})
