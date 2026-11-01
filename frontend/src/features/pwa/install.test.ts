// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissInstall, installMode, isIosSafari, promptInstall, resetInstallState, setupInstallCapture, wasDismissedRecently } from './install'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP_MODE = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

window.matchMedia = window.matchMedia ?? ((query: string) => ({ matches: false, media: query }) as MediaQueryList)

describe('ana ekrana ekleme', () => {
  beforeEach(() => { localStorage.clear(); resetInstallState() })

  it('iPhone ve iPad Safari\'yi tanır, diğer iOS tarayıcılarını ayırır', () => {
    expect(isIosSafari(IPHONE_SAFARI)).toBe(true)
    expect(isIosSafari(IPAD_DESKTOP_MODE, 5)).toBe(true)
    expect(isIosSafari(IPAD_DESKTOP_MODE, 0)).toBe(false)
    expect(isIosSafari(IPHONE_CHROME)).toBe(false)
    expect(isIosSafari(ANDROID_CHROME)).toBe(false)
  })

  it('tarayıcının yükleme olayını yakalar ve kabul edilince yüklü sayar', async () => {
    setupInstallCapture(window)
    expect(installMode()).toBe('unsupported')
    const prompt = vi.fn(async () => undefined)
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' as const }) })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(installMode()).toBe('prompt')
    await expect(promptInstall()).resolves.toBe(true)
    expect(prompt).toHaveBeenCalledOnce()
    expect(installMode()).toBe('installed')
  })

  it('kapatılan kart 30 gün gizli kalır', () => {
    const now = Date.UTC(2026, 10, 1)
    dismissInstall(now)
    expect(wasDismissedRecently(now + 29 * 86_400_000)).toBe(true)
    expect(wasDismissedRecently(now + 31 * 86_400_000)).toBe(false)
  })
})
