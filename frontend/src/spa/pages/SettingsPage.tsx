import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, ExternalLink, KeyRound, Monitor, Moon, Sun } from 'lucide-react'
import { useForgotPassword } from '../../shared/api/queries'
import {
  useBetaFeedback, useDeleteAccount, useNotificationPreferences, usePreferences, useUpdateNotificationPreferences, useUpdatePreferences,
} from '../../shared/api/settings'
import type { NotificationPreferences, Preferences } from '../../shared/api/types'
import { Button, Dialog, ErrorState, Skeleton, Switch, useToast } from '../../shared/ui'
import { initials } from '../format'
import { useSession } from '../layout/SessionGate'
import { routes } from '../routes'
import { ThemePreference, useTheme } from '../theme/ThemeProvider'
import './pages.css'
import './settings-page.css'

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="settings-section" aria-labelledby={id}>
      <header>
        <h2 id={id}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="settings-section__body">{children}</div>
    </section>
  )
}

/* ---------- Hesap ---------- */

function AccountSection() {
  const { user } = useSession()
  const forgot = useForgotPassword()
  const { notify } = useToast()
  return (
    <Section id="settings-account" title="Hesap">
      <div className="settings-identity">
        <span className="settings-identity__avatar" aria-hidden="true">{initials(user.display_name)}</span>
        <div><strong>{user.display_name}</strong>{user.email && <span>{user.email}</span>}</div>
      </div>
      {user.email && (
        <Button
          variant="secondary"
          icon={<KeyRound size={16} aria-hidden="true" />}
          loading={forgot.isPending}
          onClick={() => forgot.mutate(user.email!, {
            onSuccess: () => notify('Parola değiştirme bağlantısını e-postana gönderdik.', 'success'),
            onError: (error) => notify(error.message, 'error'),
          })}
        >
          Parolamı değiştir
        </Button>
      )}
    </Section>
  )
}

/* ---------- Görünüm ---------- */

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'Sistem', icon: <Monitor size={18} aria-hidden="true" /> },
  { value: 'light', label: 'Açık', icon: <Sun size={18} aria-hidden="true" /> },
  { value: 'dark', label: 'Koyu', icon: <Moon size={18} aria-hidden="true" /> },
]

function readReducedMotion() {
  try { return localStorage.getItem('mihenk-reduced-motion') === 'true' } catch { return false }
}

function AppearanceSection() {
  const { preference, setPreference } = useTheme()
  const [reduced, setReduced] = useState(readReducedMotion)
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced)
    try { localStorage.setItem('mihenk-reduced-motion', String(reduced)) } catch { /* yalnızca bu oturum */ }
  }, [reduced])
  return (
    <Section id="settings-appearance" title="Görünüm">
      <fieldset className="theme-choice">
        <legend>Tema</legend>
        {THEME_OPTIONS.map((option) => (
          <label key={option.value} className={`theme-choice__option${preference === option.value ? ' is-active' : ''}`}>
            <input type="radio" name="theme" value={option.value} checked={preference === option.value} onChange={() => setPreference(option.value)} />
            {option.icon}
            {option.label}
          </label>
        ))}
      </fieldset>
      <Switch label="Hareketleri azalt" description="Geçiş ve dekoratif animasyonları en aza indirir." checked={reduced} onChange={(event) => setReduced(event.target.checked)} />
    </Section>
  )
}

/* ---------- Okuma zevki ---------- */

const SENSITIVITY = ['Önemsemem', 'Az', 'Orta', 'Yüksek']

function TasteSection() {
  const preferences = usePreferences()
  const update = useUpdatePreferences()
  const { notify } = useToast()
  if (preferences.isPending) return <Section id="settings-taste" title="Okuma zevki"><Skeleton height={180} /></Section>
  if (preferences.isError) return <Section id="settings-taste" title="Okuma zevki"><ErrorState message={preferences.error.message} onRetry={() => preferences.refetch()} /></Section>
  const current = preferences.data

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next: Preferences = {
      ...current,
      pace_preference: form.get('pace') as Preferences['pace_preference'],
      focus_preference: form.get('focus') as Preferences['focus_preference'],
      tone_preference: form.get('tone') as Preferences['tone_preference'],
      length_preference: form.get('length') as Preferences['length_preference'],
      violence_sensitivity: Number(form.get('violence')),
      romance_sensitivity: Number(form.get('romance')),
      spoiler_sensitivity: Number(form.get('spoiler')),
    }
    update.mutate(next, {
      onSuccess: () => notify('Okuma zevkin kaydedildi; öneriler buna göre güncellenecek.', 'success'),
      onError: (error) => notify(error.message, 'error'),
    })
  }

  const select = (name: string, label: string, value: string | null, fallback: string, options: [string, string][]) => (
    <label className="mh-field">
      <span>{label}</span>
      <select className="mh-input" name={name} defaultValue={value ?? fallback}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  )
  const range = (name: string, label: string, value: number) => (
    <label className="mh-field">
      <span>{label}</span>
      <select className="mh-input" name={name} defaultValue={String(value)}>
        {SENSITIVITY.map((option, index) => <option key={option} value={index}>{option}</option>)}
      </select>
    </label>
  )

  return (
    <Section id="settings-taste" title="Okuma zevki" description="Öneriler bu tercihlere göre sıralanır.">
      <form className="settings-form" onSubmit={submit}>
        <div className="settings-grid">
          {select('pace', 'Tempo', current.pace_preference, 'mixed', [['mixed', 'Karışık'], ['slow', 'Sakin'], ['medium', 'Orta'], ['fast', 'Hızlı']])}
          {select('focus', 'Odak', current.focus_preference, 'balanced', [['balanced', 'Dengeli'], ['character', 'Karakter'], ['plot', 'Olay örgüsü']])}
          {select('tone', 'Ton', current.tone_preference, 'balanced', [['balanced', 'Dengeli'], ['dark', 'Karanlık'], ['hopeful', 'Umutlu']])}
          {select('length', 'Uzunluk', current.length_preference, 'any', [['any', 'Fark etmez'], ['short', 'Kısa'], ['medium', 'Orta'], ['long', 'Uzun']])}
          {range('violence', 'Şiddet hassasiyeti', current.violence_sensitivity)}
          {range('romance', 'Romantizm hassasiyeti', current.romance_sensitivity)}
          {range('spoiler', 'Spoiler hassasiyeti', current.spoiler_sensitivity)}
        </div>
        <div><Button type="submit" loading={update.isPending}>Kaydet</Button></div>
      </form>
    </Section>
  )
}

/* ---------- Bildirim tercihleri ---------- */

const TOPICS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'weekly_digest', label: 'Haftalık okuma özeti', description: 'Haftanın sayfaları, seansları ve önerileri.' },
  { key: 'recommendations', label: 'Kişisel öneriler', description: 'Zevkine uyan yeni kitaplar.' },
  { key: 'price_drops', label: 'Fiyat düşüşleri', description: 'Fiyat alarmların hedefe ulaştığında.' },
  { key: 'stock_updates', label: 'Yeni baskı ve stok', description: 'Takip ettiğin kitapların yeni baskıları.' },
  { key: 'social_updates', label: 'Kulüp ve topluluk', description: 'Yanıtlar, takip ettiklerin ve kulüp etkinlikleri.' },
]

function NotificationSection() {
  const preferences = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()
  const { notify } = useToast()
  if (preferences.isPending) return <Section id="settings-notifications" title="Bildirimler"><Skeleton height={180} /></Section>
  if (preferences.isError) return <Section id="settings-notifications" title="Bildirimler"><ErrorState message={preferences.error.message} onRetry={() => preferences.refetch()} /></Section>
  const current = preferences.data
  const save = (changes: Partial<NotificationPreferences>) => update.mutate({ ...current, ...changes }, {
    onSuccess: () => notify('Bildirim tercihlerin kaydedildi.', 'success'),
    onError: (error) => notify(error.message, 'error'),
  })
  return (
    <Section id="settings-notifications" title="Bildirimler" description="Hangi konularda ve ne sıklıkta haber almak istediğini seç.">
      <Switch
        label="Bildirim gönderilmesine izin veriyorum"
        description="Kapalıyken yalnızca uygulama içinde bildirim görürsün."
        checked={current.consent_granted}
        disabled={update.isPending}
        onChange={(event) => save({ consent_granted: event.target.checked })}
      />
      <div className="settings-topics">
        {TOPICS.map((topic) => (
          <Switch
            key={topic.key}
            label={topic.label}
            description={topic.description}
            checked={Boolean(current[topic.key])}
            disabled={!current.consent_granted || update.isPending}
            onChange={(event) => save({ [topic.key]: event.target.checked })}
          />
        ))}
      </div>
      <div className="settings-grid">
        <label className="mh-field">
          <span>Sıklık</span>
          <select className="mh-input" value={current.frequency} disabled={!current.consent_granted || update.isPending} onChange={(event) => save({ frequency: event.target.value as NotificationPreferences['frequency'] })}>
            <option value="instant">Anında</option>
            <option value="daily">Günlük özet</option>
            <option value="weekly">Haftalık özet</option>
            <option value="off">Kapalı</option>
          </select>
        </label>
      </div>
    </Section>
  )
}

/* ---------- Gizlilik ---------- */

const DELETE_WORD = 'SİL'

function PrivacySection() {
  const remove = useDeleteAccount()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const { notify } = useToast()
  return (
    <Section id="settings-privacy" title="Gizlilik ve veriler">
      <div className="settings-links">
        <a className="mh-button mh-button--secondary mh-button--md" href="/me/data-export" download>
          <Download size={16} aria-hidden="true" /><span>Verilerimi indir</span>
        </a>
        <a className="mh-button mh-button--ghost mh-button--md" href="/privacy" target="_blank" rel="noopener noreferrer">
          <span>Gizlilik bildirimi</span><ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
      <div className="danger-zone">
        <div>
          <strong>Hesabı sil</strong>
          <p>Kitaplığın, okuma geçmişin, yorumların ve kulüp üyeliklerin kalıcı olarak silinir.</p>
        </div>
        <Button variant="danger" onClick={() => setConfirming(true)}>Hesabımı sil</Button>
      </div>
      <Dialog
        open={confirming}
        title="Hesabın kalıcı olarak silinsin mi?"
        size="sm"
        onClose={() => { setConfirming(false); setTyped('') }}
        footer={<>
          <Button variant="ghost" onClick={() => { setConfirming(false); setTyped('') }}>Vazgeç</Button>
          <Button
            variant="danger"
            disabled={typed.trim().toLocaleUpperCase('tr') !== DELETE_WORD}
            loading={remove.isPending}
            onClick={() => remove.mutate(undefined, {
              onSuccess: () => navigate(routes.signIn, { replace: true }),
              onError: (error) => notify(error.message, 'error'),
            })}
          >
            Kalıcı olarak sil
          </Button>
        </>}
      >
        <div className="settings-form">
          <p>Bu işlem geri alınamaz. Devam etmek için aşağıya <strong>{DELETE_WORD}</strong> yaz.</p>
          <label className="mh-field">
            <span className="visually-hidden">Onay kelimesi</span>
            <input className="mh-input" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
          </label>
        </div>
      </Dialog>
    </Section>
  )
}

/* ---------- Geri bildirim ---------- */

function FeedbackSection() {
  const feedback = useBetaFeedback()
  const { notify } = useToast()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const rating = String(form.get('rating') ?? '')
    feedback.mutate(
      {
        category: String(form.get('category')),
        rating: rating === '' ? null : Number(rating),
        message: String(form.get('message') ?? '').trim(),
        context: { view: 'settings', viewport: `${window.innerWidth}x${window.innerHeight}`, interface: 'spa' },
      },
      {
        onSuccess: () => { formElement.reset(); notify('Teşekkürler! Geri bildirimin ürün ekibine ulaştı.', 'success') },
        onError: (error) => notify(error.message, 'error'),
      },
    )
  }
  return (
    <Section id="settings-feedback" title="Geri bildirim" description="Bir hata, kullanım zorluğu veya fikrini doğrudan ekibe gönder.">
      <form className="settings-form" onSubmit={submit}>
        <div className="settings-grid">
          <label className="mh-field">
            <span>Konu</span>
            <select className="mh-input" name="category" defaultValue="usability">
              <option value="bug">Hata</option>
              <option value="usability">Kullanım deneyimi</option>
              <option value="idea">Yeni fikir</option>
              <option value="content">Katalog / içerik</option>
              <option value="other">Diğer</option>
            </select>
          </label>
          <label className="mh-field">
            <span>Mihenk'i tavsiye eder misin? (0–10)</span>
            <select className="mh-input" name="rating" defaultValue="">
              <option value="">Puan vermeden gönder</option>
              {Array.from({ length: 11 }, (_, index) => 10 - index).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <label className="mh-field">
          <span>Mesajın</span>
          <textarea className="mh-input mh-textarea" name="message" rows={4} minLength={5} maxLength={2000} required />
        </label>
        <div><Button type="submit" loading={feedback.isPending}>Gönder</Button></div>
      </form>
    </Section>
  )
}

export default function SettingsPage() {
  return (
    <div className="page settings">
      <header className="page-header">
        <div>
          <h1>Ayarlar</h1>
          <p>Hesabını, görünümü, okuma zevkini ve bildirimlerini tek yerden yönet.</p>
        </div>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Ayar bölümleri">
          <a href="#settings-account">Hesap</a>
          <a href="#settings-appearance">Görünüm</a>
          <a href="#settings-taste">Okuma zevki</a>
          <a href="#settings-notifications">Bildirimler</a>
          <a href="#settings-privacy">Gizlilik</a>
          <a href="#settings-feedback">Geri bildirim</a>
        </nav>
        <div className="settings-sections">
          <AccountSection />
          <AppearanceSection />
          <TasteSection />
          <NotificationSection />
          <PrivacySection />
          <FeedbackSection />
        </div>
      </div>
    </div>
  )
}
