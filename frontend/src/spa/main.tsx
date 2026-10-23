import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/dm-sans'
import './theme/tokens.css'
import './theme/base.css'
import '../shared/ui/ui.css'
import { App } from './App'
import { parseEmailLink } from '../features/auth/email-links'

// Davet, parola sıfırlama ve e-posta doğrulama bağlantılarını şimdilik klasik arayüz işler.
const emailLink = parseEmailLink(window.location.search, window.location.hash)
if (emailLink.kind !== 'none') window.location.replace(`/classic${window.location.search}${window.location.hash}`)

const container = document.getElementById('root')
if (!container) throw new Error('#root bulunamadı')
if (emailLink.kind === 'none') createRoot(container).render(<StrictMode><App /></StrictMode>)

// Çevrimdışı kabuk ve web push için servis çalışanı (klasik arayüzle aynı dosya).
if ('serviceWorker' in navigator && emailLink.kind === 'none') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/static/service-worker.js').catch(() => undefined) })
}
