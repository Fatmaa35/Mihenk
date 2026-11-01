/**
 * "Ana ekrana ekle" durumu. Tarayıcı `beforeinstallprompt` olayını sayfa açılır açılmaz bir kez gönderir;
 * olayı kaçırmamak için dinleyici uygulama yüklenirken kurulur, bileşenler sonradan abone olur.
 */
import { useSyncExternalStore } from 'react'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'unsupported'

const DISMISS_KEY = 'mihenk-install-dismissed-at'
const DISMISS_DAYS = 30

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export function isStandalone(win: Window = window): boolean {
  return win.matchMedia?.('(display-mode: standalone)').matches || (win.navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iPhone/iPad Safari: yükleme olayı yoktur, kullanıcı Paylaş › Ana Ekrana Ekle yolunu izler. */
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  const ios = /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(userAgent)
  return ios && !otherBrowser
}

export function setupInstallCapture(win: Window = window) {
  win.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPromptEvent
    emit()
  })
  win.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    emit()
  })
}

export function installMode(win: Window = window): InstallMode {
  if (installed || isStandalone(win)) return 'installed'
  if (deferred) return 'prompt'
  if (isIosSafari(win.navigator.userAgent, win.navigator.maxTouchPoints)) return 'ios'
  return 'unsupported'
}

/** Tarayıcının kendi yükleme penceresini açar; kabul edilirse true döner. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const event = deferred
  deferred = null
  await event.prompt()
  const choice = await event.userChoice
  if (choice.outcome === 'accepted') installed = true
  emit()
  return choice.outcome === 'accepted'
}

export function wasDismissedRecently(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(at) && at > 0 && now - at < DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

export function dismissInstall(now = Date.now()) {
  try { localStorage.setItem(DISMISS_KEY, String(now)) } catch { /* özel pencere: yalnızca bu oturumda gizlenir */ }
  emit()
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, () => installMode(), () => 'unsupported')
}

export function useInstallDismissed(): boolean {
  return useSyncExternalStore(subscribe, () => wasDismissedRecently(), () => true)
}

/** Testler için. */
export function resetInstallState() {
  deferred = null
  installed = false
}
