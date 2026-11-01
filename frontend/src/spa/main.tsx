import './bootEmailLink'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/dm-sans'
import './theme/tokens.css'
import './theme/base.css'
import '../shared/ui/ui.css'
import { App } from './App'
import { setupInstallCapture } from '../features/pwa/install'

const container = document.getElementById('root')
if (!container) throw new Error('#root bulunamadı')
createRoot(container).render(<StrictMode><App /></StrictMode>)

// "Ana ekrana ekle" olayı sayfa açılır açılmaz gelir; bileşenler yüklenmeden yakalanmalı.
setupInstallCapture()

// Çevrimdışı kabuk ve web push için servis çalışanı. Kökten sunulur ki tüm sayfaları kontrol edebilsin;
// eski /static/ kaydı yalnızca kendi klasörünü yönetiyordu, kaldırılır.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(
      registrations.filter((registration) => new URL(registration.scope).pathname.startsWith('/static/')).map((registration) => registration.unregister()),
    )).catch(() => undefined)
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(() => undefined)
  })
}
