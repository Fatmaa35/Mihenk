import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { BookOpen, Compass, ExternalLink, House, LogOut, Moon, Sun, Timer, Users } from 'lucide-react'
import { useLogout } from '../../shared/api/queries'
import { IconButton, useToast } from '../../shared/ui'
import { useTheme } from '../theme/ThemeProvider'
import { classicUrl, classicViews, routes } from '../routes'
import { useSession } from './SessionGate'
import './shell.css'

const NAV_ITEMS = [
  { to: routes.today, label: 'Bugün', icon: House, title: 'Bugün' },
  { to: routes.discover, label: 'Keşfet', icon: Compass, title: 'Keşfet' },
  { to: routes.library, label: 'Kitaplık', icon: BookOpen, title: 'Kitaplığım' },
  { to: routes.clubs, label: 'Kulüpler', icon: Users, title: 'Kulüpler' },
  { to: routes.focus, label: 'Odak', icon: Timer, title: 'Okuma modu' },
] as const

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr')
}

function BrandMark({ size = 44 }: { size?: number }) {
  const { resolved } = useTheme()
  return <img className="shell__mark" src={`/static/brand/mark-${resolved}.webp`} alt="" width={size} height={size} />
}

function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  const dark = resolved === 'dark'
  return <IconButton label={dark ? 'Açık temaya geç' : 'Koyu temaya geç'} icon={dark ? <Sun size={20} /> : <Moon size={20} />} onClick={toggle} />
}

function ProfileMenu() {
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const logout = useLogout()
  const navigate = useNavigate()
  const { notify } = useToast()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])

  const signOut = () => logout.mutate(undefined, {
    onSuccess: () => navigate(routes.signIn, { replace: true }),
    onError: () => notify('Çıkış yapılamadı. Lütfen tekrar dene.', 'error'),
  })

  return (
    <div className="profile-menu" ref={ref}>
      <button
        type="button"
        className="profile-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Profil menüsü: ${user.display_name}`}
        onClick={() => setOpen((value) => !value)}
      >
        {initials(user.display_name)}
      </button>
      {open && (
        <div className="profile-menu__panel" role="menu">
          <div className="profile-menu__identity">
            <strong>{user.display_name}</strong>
            {user.email && <span>{user.email}</span>}
          </div>
          <p className="profile-menu__label">Klasik arayüzde</p>
          {classicViews.map((item) => (
            <a key={item.view} role="menuitem" className="profile-menu__item" href={classicUrl(item.view)}>
              {item.label}<ExternalLink size={14} aria-hidden="true" />
            </a>
          ))}
          {user.app_role === 'admin' && (
            <a role="menuitem" className="profile-menu__item" href={classicUrl('quality')}>Yönetim paneli<ExternalLink size={14} aria-hidden="true" /></a>
          )}
          <button type="button" role="menuitem" className="profile-menu__item profile-menu__item--danger" onClick={signOut} disabled={logout.isPending}>
            Çıkış yap<LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

/** Sayfa başlığını rotaya göre günceller; ekran okuyucular için odak ana içeriğe taşınır. */
function useDocumentTitle() {
  const location = useLocation()
  useEffect(() => {
    const item = NAV_ITEMS.find((entry) => location.pathname.startsWith(entry.to))
    document.title = item ? `${item.title} · Mihenk` : 'Mihenk'
  }, [location.pathname])
}

export function AppShell() {
  useDocumentTitle()
  return (
    <div className="shell">
      <a className="skip-link" href="#main">İçeriğe geç</a>

      <aside className="shell__rail" aria-label="Ana menü">
        <NavLink to={routes.today} className="shell__brand" aria-label="Mihenk ana sayfa">
          <BrandMark />
        </NavLink>
        <nav className="shell__nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="rail-link">
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="shell__rail-footer">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </aside>

      <header className="shell__topbar">
        <NavLink to={routes.today} className="shell__brand shell__brand--wide" aria-label="Mihenk ana sayfa">
          <BrandMark size={36} />
          <span>Mihenk</span>
        </NavLink>
        <div className="shell__topbar-actions">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>

      <main id="main" className="shell__main" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="shell__tabbar" aria-label="Ana menü">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="tab-link">
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
