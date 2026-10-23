import { Link } from 'react-router'
import { useTheme } from '../../spa/theme/ThemeProvider'
import './brand.css'

type BrandProps = { to?: string; href?: string; size?: 'sm' | 'md' | 'lg'; label?: string }

/** Mihenk logosu: pusula-kitap işareti + yazı. Her sayfada aynı görünür; açık/koyu temaya uyar. */
export function Brand({ to, href, size = 'md', label = 'Mihenk ana sayfa' }: BrandProps) {
  const { resolved } = useTheme()
  const content = (
    <>
      <span className="brand__mark"><img src={`/static/brand/mark-${resolved}.webp`} alt="" /></span>
      <span className="brand__word">Mihenk</span>
    </>
  )
  const className = `brand brand--${size}`
  if (to) return <Link to={to} className={className} aria-label={label}>{content}</Link>
  return <a href={href ?? '/'} className={className} aria-label={label}>{content}</a>
}
