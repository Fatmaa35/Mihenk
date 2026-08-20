import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { BrowserQRCodeSvgWriter } from '@zxing/browser'
import { z } from 'zod'
import { api } from './api'
import { t } from './i18n'
import { BentoReadingDashboard } from './BentoReadingDashboard'
import './product-ui.css'

type Action = { action_type: string; book_id: string; book_title: string; arguments: Record<string, string | number | boolean>; confirmation: string }
type Book = { id: string; title: string }
const PlanSchema = z.object({ target_date: z.string().date(), reminder_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timezone: z.string().min(3), excluded_weekdays: z.array(z.number().int().min(0).max(6)), delivery_channel: z.enum(['in_app', 'email', 'push']) })

declare global { interface Window { BookPusulasiUI: {
  confirmAction(action: Action): Promise<Record<string, unknown> | null>
  openReadingPlan(book: Book): Promise<Record<string, unknown> | null>
} } }

function AppRoot() {
  const [action, setAction] = useState<Action | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const actionResolve = useRef<(value: Record<string, unknown> | null) => void>(() => {})
  const planResolve = useRef<(value: Record<string, unknown> | null) => void>(() => {})

  useEffect(() => {
    window.BookPusulasiUI = {
      confirmAction(next) { setError(''); setAction(next); return new Promise(resolve => { actionResolve.current = resolve }) },
      openReadingPlan(next) { setError(''); setBook(next); return new Promise(resolve => { planResolve.current = resolve }) }
    }
  }, [])

  async function executeAction() {
    if (!action) return; setBusy(true); setError('')
    try { const value = await api<Record<string, unknown>>('/me/chat/actions/execute', { method: 'POST', body: JSON.stringify({ action, idempotency_key: crypto.randomUUID() }) }); setAction(null); actionResolve.current(value) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'İşlem tamamlanamadı.') }
    finally { setBusy(false) }
  }

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!book) return
    const data = new FormData(event.currentTarget), parsed = PlanSchema.safeParse({ target_date: data.get('target_date'), reminder_time: data.get('reminder_time'), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul', excluded_weekdays: data.getAll('excluded_weekdays').map(Number), delivery_channel: data.get('delivery_channel') })
    if (!parsed.success) { setError('Plan alanlarını kontrol edin.'); return }
    setBusy(true); setError('')
    try { const value = await api<Record<string, unknown>>('/me/reading-plans', { method: 'PUT', body: JSON.stringify({ book_id: book.id, reminder_enabled: true, ...parsed.data }) }); setBook(null); planResolve.current(value) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Plan oluşturulamadı.') }
    finally { setBusy(false) }
  }

  const defaultDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  return <>
    {action && <div className="product-modal" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="action-preview-title" className="product-dialog">
      <p className="product-eyebrow">GÜVENLİ EYLEM</p><h2 id="action-preview-title">{t('actionTitle')}</h2>
      <dl><div><dt>Kitap</dt><dd>{action.book_title}</dd></div><div><dt>İşlem</dt><dd>{action.confirmation}</dd></div></dl>
      {error && <p role="alert" className="product-error">{error}</p>}<div className="product-actions"><button onClick={() => { setAction(null); actionResolve.current(null) }}>{t('cancel')}</button><button className="primary" disabled={busy} onClick={executeAction}>{busy ? 'İşleniyor…' : t('confirm')}</button></div>
    </section></div>}

    {book && <div className="product-modal" role="presentation"><form role="dialog" aria-modal="true" aria-labelledby="plan-title" className="product-dialog" onSubmit={submitPlan}>
      <p className="product-eyebrow">OKUMA RİTMİ</p><h2 id="plan-title">{book.title} · {t('planTitle')}</h2>
      <label>{t('targetDate')}<input name="target_date" type="date" min={new Date().toISOString().slice(0,10)} defaultValue={defaultDate} required autoFocus /></label>
      <div className="product-grid"><label>Bildirim saati<input name="reminder_time" type="time" defaultValue="20:00" required /></label><label>Kanal<select name="delivery_channel" defaultValue="in_app"><option value="in_app">Uygulama içi</option><option value="email">E-posta</option><option value="push">Push</option></select></label></div>
      <fieldset><legend>{t('weekdays')}</legend>{['Pt','Sa','Ça','Pe','Cu','Ct','Pa'].map((day,index)=><label key={day}><input type="checkbox" name="excluded_weekdays" value={index}/>{day}</label>)}</fieldset>
      {error && <p role="alert" className="product-error">{error}</p>}<div className="product-actions"><button type="button" onClick={() => { setBook(null); planResolve.current(null) }}>{t('cancel')}</button><button className="primary" disabled={busy}>{busy ? 'Hazırlanıyor…' : 'Planı oluştur'}</button></div>
    </form></div>}
  </>
}

function PhoneQr() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(window.location.origin)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api<{ url: string }>('/app/network-url').then(value => setUrl(value.url)).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!open || !qrRef.current || !url) return
    const size = Math.max(190, Math.min(280, window.innerWidth - 80, window.innerHeight - 330))
    qrRef.current.replaceChildren(new BrowserQRCodeSvgWriter().write(url, size, size))
  }, [open, url])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return <>
    <button type="button" className="icon-button phone-qr-button" aria-label="Telefonda açmak için QR kod" onClick={() => setOpen(true)}>▦</button>
    {open && createPortal(<div className="product-modal phone-qr-modal" role="presentation" onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}><section className="product-dialog phone-qr-dialog" role="dialog" aria-modal="true" aria-labelledby="phone-qr-title">
      <p className="product-eyebrow">TELEFONDA AÇ</p>
      <h2 id="phone-qr-title">QR kodu telefonunla tara</h2>
      <div ref={qrRef} className="phone-qr-code" aria-label={`QR kod: ${url}`} />
      <label>Telefon bağlantısı<input value={url} onChange={event => setUrl(event.target.value)} inputMode="url" /></label>
      <p className="phone-qr-hint">Bilgisayar ve telefon aynı ağda olmalı. Kamera kullanımı için HTTPS gerekir.</p>
      <div className="product-actions"><button type="button" onClick={() => setOpen(false)}>Kapat</button></div>
    </section></div>, document.body)}
  </>
}

function initMounts() {
  const pkmMount = document.getElementById('pkm-dashboard-mount')
  let pkmMounted = false
  const mountPkm = () => {
    if (!pkmMount || pkmMounted) return
    pkmMounted = true
    createRoot(pkmMount).render(<BentoReadingDashboard />)
  }
  window.addEventListener('pkm-refresh', mountPkm)
  if (!document.getElementById('app')?.classList.contains('hidden')) mountPkm()

  const host = document.getElementById('product-ui-root')
  if (host) createRoot(host).render(<AppRoot />)

  const phoneQrMount = document.getElementById('phone-qr-mount')
  if (phoneQrMount) createRoot(phoneQrMount).render(<PhoneQr />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMounts)
} else {
  initMounts()
}
