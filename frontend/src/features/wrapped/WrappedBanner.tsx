import { Link } from 'react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { routes } from '../../spa/routes'
import { defaultWrappedYear } from './summary'
import './wrapped-banner.css'

/** Profil ve Bugün ekranlarında yıllık özete götüren şerit. */
export function WrappedBanner({ year = defaultWrappedYear() }: { year?: number }) {
  return (
    <Link to={`${routes.wrapped}?yil=${year}`} className="wrapped-banner">
      <span className="wrapped-banner__icon" aria-hidden="true"><Sparkles size={22} /></span>
      <span className="wrapped-banner__text">
        <strong>{year} okuma yılın</strong>
        <span>Sayfaların, en sevdiğin tür, en uzun serin ve okur tipin. Hikâye olarak paylaş.</span>
      </span>
      <ArrowRight size={20} aria-hidden="true" />
    </Link>
  )
}
