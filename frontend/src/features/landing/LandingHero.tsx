import { FormEvent, useRef } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Check, Flame, Sparkles } from 'lucide-react'
import { api } from '../../shared/api/api'
import type { RecommendationResult } from '../../shared/api/types'
import { BookCover, Button, Progress } from '../../shared/ui'
import { routes } from '../../spa/routes'

const EXAMPLES = ['Yağmurlu bir akşam için kısa ve gizemli', 'Karakteri zamanla değişen bir klasik', 'Melankolik ama umut veren bir roman']
const SIGN_UP = `${routes.signIn}?mod=kayit`

function useDemoRecommendations() {
  return useMutation({
    mutationFn: (description: string) =>
      api<RecommendationResult>('/demo/recommendations', { method: 'POST', body: JSON.stringify({ character_description: description, limit: 3 }) }),
  })
}

/* ---------- Kahraman bölümü + canlı deneme ---------- */

function LiveDemo() {
  const demo = useDemoRecommendations()
  const inputRef = useRef<HTMLInputElement>(null)
  const run = (text: string) => {
    const value = text.trim()
    if (value.length < 3) { inputRef.current?.focus(); return }
    if (inputRef.current) inputRef.current.value = value
    demo.mutate(value)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    run(inputRef.current?.value ?? '')
  }
  return (
    <div className="lp-demo">
      <form className="prompt lp-demo__prompt" role="search" onSubmit={submit}>
        <Sparkles size={20} aria-hidden="true" />
        <label htmlFor="lp-demo-input" className="visually-hidden">Ne okumak istediğini anlat</label>
        <input id="lp-demo-input" ref={inputRef} placeholder="Ne okumak istiyorsun? Bir ruh hâli yaz…" maxLength={300} autoComplete="off" />
        <Button type="submit" loading={demo.isPending}>Dene</Button>
      </form>
      <div className="lp-demo__examples">
        <span>Örnek:</span>
        {EXAMPLES.map((text) => <button key={text} type="button" onClick={() => run(text)}>{text}</button>)}
      </div>
      <div className="lp-demo__results" aria-live="polite">
        {demo.isError && <p className="lp-demo__note">Şu an öneri alınamadı. Birazdan tekrar deneyebilirsin.</p>}
        {demo.data && (
          <>
            <ol className="lp-demo__list">
              {demo.data.recommended_books.slice(0, 3).map((book) => (
                <li key={book.book_title}>
                  <BookCover id={book.book_id ?? book.book_title} title={book.book_title} size="sm" showText={false} />
                  <div>
                    <strong>{book.book_title}</strong>
                    <span>{book.author} · {book.genre}</span>
                  </div>
                  <span className="mh-chip">%{Math.round(book.match_score * 100)}</span>
                </li>
              ))}
            </ol>
            <p className="lp-demo__note">
              Bu öneriler yalnızca yazdığın cümleye dayanıyor. <Link to={SIGN_UP}>Hesap açınca</Link> kitaplığın ve zevkin de hesaba katılır.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function ProductPreview() {
  return (
    <div className="lp-preview" aria-hidden="true">
      <div className="lp-preview__window">
        <div className="lp-preview__bar"><i /><i /><i /><span>mihenk · Bugün</span></div>
        <div className="lp-preview__body">
          <div className="lp-preview__continue mh-tile mh-tile--mint">
            <BookCover id="suc-ve-ceza" title="Suç ve Ceza" author="Dostoyevski" size="md" />
            <div>
              <p className="mh-eyebrow">Devam ediyorsun</p>
              <strong>Suç ve Ceza</strong>
              <span>Sayfa 312 / 687</span>
              <Progress value={45} label="" size="sm" />
              <span className="lp-preview__button">Seans başlat</span>
            </div>
          </div>
          <div className="lp-preview__stat mh-tile mh-tile--lilac"><p className="mh-eyebrow">Bu hafta</p><strong>186<small> dk</small></strong></div>
          <div className="lp-preview__stat mh-tile mh-tile--butter"><p className="mh-eyebrow">2026 hedefi</p><strong>7<small> / 12</small></strong></div>
        </div>
      </div>
      <div className="lp-preview__float lp-preview__float--match">
        <Sparkles size={16} /> <span><strong>%87 uyum</strong> · Melankolik, karakter odaklı</span>
      </div>
      <div className="lp-preview__float lp-preview__float--streak">
        <Flame size={16} /> <span><strong>5 gün</strong> seri</span>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="lp-hero" id="top">
      <div className="lp-container lp-hero__grid">
        <div className="lp-hero__copy">
          <p className="lp-kicker"><Sparkles size={14} aria-hidden="true" /> Kişisel okuma pusulan</p>
          <h1>Bir sonraki kitabını <span className="lp-highlight">ruh hâline göre</span> bul.</h1>
          <p className="lp-lead">
            Mihenk, ne okumak istediğini kendi cümlelerinle anlatmana izin verir; kitaplığını, okuma ritmini ve kulüplerini tek yerde toplar.
          </p>
          <LiveDemo />
          <div className="lp-hero__ctas">
            <Link to={SIGN_UP} className="mh-button mh-button--primary mh-button--lg">Ücretsiz hesap aç <ArrowRight size={18} aria-hidden="true" /></Link>
            <a href="#nasil-calisir" className="mh-button mh-button--ghost mh-button--lg">Nasıl çalışır?</a>
          </div>
          <ul className="lp-assurances">
            <li><Check size={16} aria-hidden="true" /> Ücretsiz</li>
            <li><Check size={16} aria-hidden="true" /> Açık ve koyu tema, mobil uyumlu</li>
            <li><Check size={16} aria-hidden="true" /> Verilerini istediğin an indir veya sil</li>
          </ul>
        </div>
        <ProductPreview />
      </div>
    </section>
  )
}

