import { FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import { useForgotPassword, useLogin, useRegister } from '../../shared/api/queries'
import { Button, SegmentedTabs } from '../../shared/ui'
import { useTheme } from '../theme/ThemeProvider'
import './sign-in.css'

type Mode = 'login' | 'register' | 'forgot'

export default function SignInPage() {
  const { resolved } = useTheme()
  const [mode, setMode] = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const login = useLogin()
  const register = useRegister()
  const forgot = useForgotPassword()
  const pending = login.isPending || register.isPending || forgot.isPending

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
    if (mode === 'forgot') {
      forgot.mutate(email, {
        onError: fail,
        onSuccess: () => setMessage({ tone: 'success', text: 'Bu adres kayıtlıysa parola sıfırlama bağlantısı gönderdik.' }),
      })
    }
  }

  const title = mode === 'login' ? 'Tekrar hoş geldin' : mode === 'register' ? 'Rafını kur' : 'Parolanı sıfırla'

  return (
    <div className="sign-in">
      <section className="sign-in__story" aria-labelledby="sign-in-story">
        <img src={`/static/brand/full-${resolved}.webp`} alt="Mihenk" className="sign-in__logo" width={120} height={140} />
        <h1 id="sign-in-story">Bir sonraki kitabın seni bekliyor.</h1>
        <p>Okuma geçmişini ve ruh hâlini anlat; Mihenk sana uygun kitapları bulsun, ilerlemeni takip etsin, kulübünle birlikte okumanı kolaylaştırsın.</p>
        <ul className="sign-in__points">
          <li className="mh-tile mh-tile--mint"><strong>Ruh hâline göre öneri</strong><span>"Yağmurlu bir akşam için kısa ve gizemli" yazman yeterli.</span></li>
          <li className="mh-tile mh-tile--lilac"><strong>Kitaplık ve ilerleme</strong><span>Okuduklarını, okuyacaklarını ve yıllık hedefini tek yerde gör.</span></li>
          <li className="mh-tile mh-tile--butter"><strong>Kulüpler ve odak modu</strong><span>Birlikte oku, odak seanslarıyla serini koru.</span></li>
        </ul>
      </section>

      <section className="sign-in__card" aria-labelledby="sign-in-title">
        {mode !== 'forgot' && (
          <SegmentedTabs
            label="Giriş türü"
            value={mode}
            onChange={(value) => { setMode(value); setMessage(null) }}
            options={[{ value: 'login', label: 'Giriş yap' }, { value: 'register', label: 'Kayıt ol' }]}
          />
        )}
        <h2 id="sign-in-title">{title}</h2>
        <form className="sign-in__form" onSubmit={submit} noValidate={false}>
          {mode === 'register' && (
            <label className="mh-field">
              <span>Adın</span>
              <input className="mh-input" name="display_name" autoComplete="name" minLength={2} maxLength={80} required />
            </label>
          )}
          <label className="mh-field">
            <span>E-posta</span>
            <input className="mh-input" name="email" type="email" autoComplete="email" required />
          </label>
          {mode !== 'forgot' && (
            <label className="mh-field">
              <span>Parola</span>
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
              {mode === 'register' && <small>En az 8 karakter.</small>}
            </label>
          )}
          {message && <p className={`sign-in__message sign-in__message--${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</p>}
          <Button type="submit" size="lg" loading={pending}>
            {mode === 'login' ? 'Giriş yap' : mode === 'register' ? 'Hesap oluştur' : 'Bağlantı gönder'}
          </Button>
        </form>
        {mode === 'login' && <button type="button" className="sign-in__link" onClick={() => { setMode('forgot'); setMessage(null) }}>Parolamı unuttum</button>}
        {mode === 'forgot' && <button type="button" className="sign-in__link" onClick={() => { setMode('login'); setMessage(null) }}>Girişe dön</button>}
        <p className="sign-in__legal">Devam ederek <Link to="/privacy" reloadDocument>gizlilik bildirimini</Link> kabul etmiş olursun.</p>
      </section>
    </div>
  )
}
