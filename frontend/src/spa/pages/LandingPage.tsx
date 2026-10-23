import { useEffect } from 'react'
import { Header } from '../../features/landing/LandingHeader'
import { Hero } from '../../features/landing/LandingHero'
import { Faq, Features, FinalCta, Footer, HowItWorks, Privacy, Spotlights } from '../../features/landing/LandingSections'
import './landing.css'

export default function LandingPage() {
  useEffect(() => { document.title = 'Mihenk · Ruh hâline göre kitap önerileri' }, [])
  return (
    <div className="lp">
      <a className="skip-link" href="#main-landing">İçeriğe geç</a>
      <Header />
      <main id="main-landing">
        <Hero />
        <HowItWorks />
        <Features />
        <Spotlights />
        <Privacy />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
