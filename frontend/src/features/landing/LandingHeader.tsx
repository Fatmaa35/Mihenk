import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../spa/theme/ThemeProvider'
import { routes } from '../../spa/routes'

const SIGN_UP = `${routes.signIn}?mod=kayit`

/* ---------- Üst menü ---------- */

export function Header() {
  const { resolved, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`lp-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="lp-container lp-header__inner">
        <a href="#top" className="lp-brand" aria-label="Mihenk, sayfanın başına dön">
          <img src={`/static/brand/mark-${resolved}.webp`} alt="" width={36} height={36} />
          <span>Mihenk</span>
        </a>
        <nav className="lp-nav" aria-label="Sayfa bölümleri">
          <a href="#nasil-calisir">Nasıl çalışır</a>
          <a href="#ozellikler">Özellikler</a>
          <a href="#gizlilik">Gizlilik</a>
          <a href="#sss">SSS</a>
        </nav>
        <div className="lp-header__actions">
          <button type="button" className="mh-icon-button" onClick={toggle} aria-label={resolved === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}>
            {resolved === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to={routes.signIn} className="lp-link-button">Giriş yap</Link>
          <Link to={SIGN_UP} className="mh-button mh-button--primary mh-button--md lp-header__cta">Ücretsiz başla</Link>
        </div>
      </div>
    </header>
  )
}

