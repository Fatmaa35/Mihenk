import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/dm-sans'
import './theme/tokens.css'
import './theme/base.css'
import '../shared/ui/ui.css'
import { App } from './App'
import { captureEmailLink } from './emailLink'

// E-posta bağlantısındaki jetonu router başlamadan önce yakala ve adresten sil.
captureEmailLink()

const container = document.getElementById('root')
if (!container) throw new Error('#root bulunamadı')
createRoot(container).render(<StrictMode><App /></StrictMode>)

// Çevrimdışı kabuk ve web push için servis çalışanı (klasik arayüzle aynı dosya).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/static/service-worker.js').catch(() => undefined) })
}
