import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import { useForgotPassword, useLogin, useRegister, useResetPassword } from '../../shared/api/queries'
import { consumeEmailLink, peekEmailLink } from '../emailLink'
import { Button, SegmentedTabs } from '../../shared/ui'
import { useTheme } from '../theme/ThemeProvider'
import './sign-in.css'

type Mode = 'login' | 'register' | 'forgot' | 'reset'
type Message = { tone: 'error' | 'success'; text: string }

/** E-posta bağlantısından gelindiyse sayfanın hangi adımla açılacağını belirler. */
function initialState(): { mode: Mode; message: Message | null; invite: boolean } {
  const link = peekEmailLink()
  if (link.kind === 'recovery' || link.kind === 'invite') return { mode: 'reset', message: null, invite: link.kind === 'invite' }
  if (link.kind === 'signup') { consumeEmailLink(); return { mode: 'login', invite: false, message: { tone: 'success', text: 'E-posta adresin doğrulandı. Parolanla giriş yapabilirsin.' } } }
  if (link.kind === 'error') { consumeEmailLink(); return { mode: 'forgot', invite: false, message: { tone: 'error', text: 'Bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı isteyebilirsin; davetler için yöneticiden yeni bağlantı iste.' } } }
  return { mode: 'login', message: null, invite: false }
}

export default function SignInPage() {
  const { resolved } = useTheme()
  const [params] = useSearchParams()
  const [initial] = useState(initialState)
  const [mode, setMode] = useState<Mode>(initial.mode === 'login' && params.get('mod') === 'kayit' ? 'register' : initial.mode)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<Message | null>(initial.message)
  const reset = useResetPassword()
  const login = useLogin()
  const register = useRegister()
  const forgot = useForgotPassword()
  const pending = login.isPending || register.isPending || forgot.isPending || reset.isPending

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const fail = (error: Error) => setMessage({ tone: 'error', text: error.message })
    if (mode === 'login') login.mutate({ email, password }, { onError: fail })
    if (mode === 'register') {
      register.mutate(
        { display_name: String(form.get('display_name') ?? '').trim(), email, password },
        {
          onError: fail,
          onSuccess: (user) => {
            if (user.email_confirmation_required) setMessage({ tone: 'success', text: 'Hesabın oluşturuldu. E-postana gelen bağlantıyla hesabını doğrula.' })
          },
        },
      )
    }
    if (mode === 'reset') {
      const link = peekEmailLink()
      if (password !== String(form.get('password_confirm') ?? '')) { setMessage({ tone: 'error', text: 'Parolalar eşleşmiyor.' }); return }
      if (!link.token) { setMode('forgot'); setMessage({ tone: 'error', text: 'Yeni bir sıfırlama bağlantısı iste.' }); return }
      reset.mutate({ recovery_token: link.token, new_password: password }, {
        onError: fail,
        onSuccess: () => {
          consumeEmailLink()
          setMode('login')
          setMessage({ tone: 'success', text: initial.invite ? 'Parolan oluşturuldu. Davet edilen e-posta adresin ve yeni parolanla giriş yap.' : 'Parolan güncellendi. Yeni parolanla giriş yapabilirsin.' })
        },
      })
    }
    if (mode === 'forgot') {
      forgot.mutate(email, {
        onError: fail,
        onSuccess: () => setMessage({ tone: 'success', text: 'Bu adres kayıtlıysa parola sıfırlama bağlantısı gönderdik.' }),
      })
    }
  }

  const title = mode === 'login' ? 'Tekrar hoş geldin' : mode === 'register' ? 'Rafını kur' : mode === 'reset' ? (initial.invite ? 'Mihenk’e hoş geldin' : 'Yeni parolanı belirle') : 'Parolanı sıfırla'

  return (
    <div className="sign-in">
      <section className="sign-in__story" aria-labelledby="sign-in-story">
        <Link to="/" className="sign-in__home" aria-label="Mihenk tanıtım sayfasına dön">
          <img src={`/static/brand/full-${resolved}.webp`} alt="Mihenk" className="sign-in__logo" width={120} height={140} />
        </Link>
        <h1 id="sign-in-story">Bir sonraki kitabın seni bekliyor.</h1>
        <p>Okuma geçmişini ve ruh hâlini anlat; Mihenk sana uygun kitapları bulsun, ilerlemeni takip etsin, kulübünle birlikte okumanı kolaylaştırsın.</p>
        <ul className="sign-in__points">
          <li className="mh-tile mh-tile--mint"><strong>Ruh hâline göre öneri</strong><span>"Yağmurlu bir akşam için kısa ve gizemli" yazman yeterli.</span></li>
          <li className="mh-tile mh-tile--lilac"><strong>Kitaplık ve ilerleme</strong><span>Okuduklarını, okuyacaklarını ve yıllık hedefini tek yerde gör.</span></li>
          <li className="mh-tile mh-tile--butter"><strong>Kulüpler ve odak modu</strong><span>Birlikte oku, odak seanslarıyla serini koru.</span></li>
        </ul>
      </section>

      <section className="sign-in__card" aria-labelledby="sign-in-title">
        {(mode === 'login' || mode === 'register') && (
          <SegmentedTabs
            label="Giriş türü"
            value={mode}
            onChange={(value) => { setMode(value); setMessage(null) }}
            options={[{ value: 'login', label: 'Giriş yap' }, { value: 'register', label: 'Kayıt ol' }]}
          />
        )}
        <h2 id="sign-in-title">{title}</h2>
        {mode === 'reset' && <p className="today__muted">{initial.invite ? 'Davetini tamamlamak için bir parola belirle.' : 'Hesabın için yeni bir parola belirle.'}</p>}
        <form className="sign-in__form" onSubmit={submit} noValidate={false}>
          {mode === 'register' && (
            <label className="mh-field">
              <span>Adın</span>
              <input className="mh-input" name="display_name" autoComplete="name" minLength={2} maxLength={80} required />
            </label>
          )}
          {mode !== 'reset' && (
            <label className="mh-field">
              <span>E-posta</span>
              <input className="mh-input" name="email" type="email" autoComplete="email" required />
            </label>
          )}
          {mode !== 'forgot' && (
            <label className="mh-field">
              <span>{mode === 'reset' ? 'Yeni parola' : 'Parola'}</span>
              <span className="sign-in__password">
                <input
                  className="mh-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                />
                <button type="button" className="sign-in__reveal" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
              {(mode === 'register' || mode === 'reset') && <small>En az 8 karakter.</small>}
            </label>
          )}
          {mode === 'reset' && (
            <label className="mh-field">
              <span>Parola (tekrar)</span>
              <input className="mh-input" name="password_confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required />
            </label>
          )}
          {message && <p className={`sign-in__message sign-in__message--${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</p>}
          <Button type="submit" size="lg" loading={pending}>
            {mode === 'login' ? 'Giriş yap' : mode === 'register' ? 'Hesap oluştur' : mode === 'reset' ? (initial.invite ? 'Parola oluştur' : 'Parolayı güncelle') : 'Bağlantı gönder'}
          </Button>
        </form>
        {mode === 'login' && <button type="button" className="sign-in__link" onClick={() => { setMode('forgot'); setMessage(null) }}>Parolamı unuttum</button>}
        {(mode === 'forgot' || mode === 'reset') && <button type="button" className="sign-in__link" onClick={() => { consumeEmailLink(); setMode('login'); setMessage(null) }}>Girişe dön</button>}
        <p className="sign-in__legal">Devam ederek <Link to="/privacy" reloadDocument>gizlilik bildirimini</Link> kabul etmiş olursun.</p>
      </section>
    </div>
  )
}
