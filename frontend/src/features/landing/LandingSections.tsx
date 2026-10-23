import { Link } from 'react-router'
import { ArrowRight, BellRing, BookOpen, Check, ChevronDown, Compass, Download, Lock, MessagesSquare, Sparkles, Target, Timer, Trash2, Users } from 'lucide-react'
import { Progress } from '../../shared/ui'
import { routes } from '../../spa/routes'
import { Brand } from '../../shared/brand/Brand'

const SIGN_UP = `${routes.signIn}?mod=kayit`

/* ---------- Nasıl çalışır ---------- */

const STEPS = [
  { title: 'Anlat', text: 'Ruh hâlini, sevdiğin temaları ya da aradığın karakteri yaz. Tür seçmek zorunda değilsin.', icon: MessagesSquare },
  { title: 'Eşleştir', text: 'Mihenk kataloğu karakter, tema ve okuma geçmişine göre tartar; her önerinin nedenini açıkça gösterir.', icon: Compass },
  { title: 'Oku ve izle', text: 'Kitabı rafına ekle, odak seansıyla oku, ilerlemen ve yıllık hedefin kendiliğinden güncellensin.', icon: BookOpen },
]

export function HowItWorks() {
  return (
    <section className="lp-section" id="nasil-calisir" aria-labelledby="how-title">
      <div className="lp-container">
        <div className="lp-section__head">
          <p className="lp-kicker">Nasıl çalışır</p>
          <h2 id="how-title">Üç adımda doğru kitap</h2>
        </div>
        <ol className="lp-steps">
          {STEPS.map(({ title, text, icon: Icon }, index) => (
            <li key={title} className="lp-step">
              <span className="lp-step__number">{index + 1}</span>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------- Özellikler ---------- */

export function Features() {
  return (
    <section className="lp-section" id="ozellikler" aria-labelledby="features-title">
      <div className="lp-container">
        <div className="lp-section__head">
          <p className="lp-kicker">Özellikler</p>
          <h2 id="features-title">Okuma hayatının tamamı, tek uygulamada</h2>
          <p>Öneriden kitaplığa, odak seansından kulübe kadar her şey birbirine bağlı.</p>
        </div>
        <div className="lp-bento">
          <article className="lp-feature lp-feature--wide mh-tile mh-tile--lilac">
            <Sparkles size={28} aria-hidden="true" />
            <h3>Açıklanabilir öneriler</h3>
            <p>Her öneri bir uyum puanı ve gerekçeyle gelir: karakter uyumu, temalar ve okuma geçmişin ayrı ayrı görünür. Neden önerildiğini bilmediğin kitap yok.</p>
            <div className="lp-feature__chips"><span className="mh-chip">Karakter uyumu %63</span><span className="mh-chip">Tema: gizem</span><span className="mh-chip">Zaten okudukların hariç</span></div>
          </article>
          <article className="lp-feature mh-tile mh-tile--mint">
            <BookOpen size={28} aria-hidden="true" />
            <h3>Akıllı kitaplık</h3>
            <p>Okuyorum, okuyacağım, okudum ve bıraktım rafları; sayfa ilerlemesi ve favoriler.</p>
          </article>
          <article className="lp-feature mh-tile mh-tile--butter">
            <Target size={28} aria-hidden="true" />
            <h3>Hedef ve rozetler</h3>
            <p>Yıllık hedef, okuma serisi, okuma takvimi ve kazandıkça açılan rozetler.</p>
          </article>
          <article className="lp-feature mh-tile mh-tile--peach">
            <BellRing size={28} aria-hidden="true" />
            <h3>Fiyat alarmları</h3>
            <p>Hedef fiyatını belirle; doğrulanmış mağaza teklifi altına düştüğünde haber al.</p>
          </article>
          <article className="lp-feature mh-tile mh-tile--surface lp-feature--outlined">
            <MessagesSquare size={28} aria-hidden="true" />
            <h3>Kitap asistanı</h3>
            <p>Sorularını sor, kitaplığına göre öneri iste; rafa ekleme gibi işlemler yalnızca senin onayınla yapılır.</p>
          </article>
        </div>
      </div>
    </section>
  )
}

/* ---------- Odak ve kulüpler ---------- */

export function Spotlights() {
  return (
    <section className="lp-section" aria-label="Odak modu ve kulüpler">
      <div className="lp-container lp-spotlights">
        <article className="lp-spotlight lp-spotlight--focus">
          <div className="lp-spotlight__media">
            <img src="/static/themes/cozy-study.webp" alt="Sıcak ışıklı bir çalışma odası: odak modunun ortam temalarından biri" loading="lazy" width={640} height={400} />
            <div className="lp-spotlight__timer"><strong>25:00</strong><span>Suç ve Ceza</span></div>
          </div>
          <div className="lp-spotlight__copy">
            <p className="lp-kicker"><Timer size={14} aria-hidden="true" /> Odak modu</p>
            <h2>Telefonu bırak, sayfaya dön</h2>
            <p>Pomodoro ya da kronometreyle oku; ortam sesi ve temasını seç. Seans bitince okuduğun sayfalar ilerlemene ve takvimine işlenir.</p>
            <ul className="lp-checks">
              <li><Check size={16} aria-hidden="true" /> Sekiz ortam teması ve sesleri</li>
              <li><Check size={16} aria-hidden="true" /> ISBN barkoduyla kitap ekleme</li>
              <li><Check size={16} aria-hidden="true" /> Fotoğraftan alıntı kaydetme</li>
            </ul>
          </div>
        </article>
        <article className="lp-spotlight">
          <div className="lp-spotlight__media lp-spotlight__media--club" aria-hidden="true">
            <div className="lp-club-card">
              <p className="mh-eyebrow">Perşembe Okurları</p>
              <strong>Bu ayın kitabı: Martin Eden</strong>
              <div className="lp-club-card__members">
                {['E', 'D', 'M', 'A'].map((letter) => <span key={letter}>{letter}</span>)}
                <small>+8 üye</small>
              </div>
              <Progress value={62} label="" size="sm" tone="accent" />
              <span>Kulüp ortalaması %62 · Cumartesi 20:00 buluşma</span>
            </div>
          </div>
          <div className="lp-spotlight__copy">
            <p className="lp-kicker"><Users size={14} aria-hidden="true" /> Kulüpler ve topluluk</p>
            <h2>Birlikte okumak daha keyifli</h2>
            <p>Kulübünü kur, ortak kitabı seç, bölüm bölüm tartış. Etkinlik ve oylamalarla ritmi birlikte belirleyin; spoiler'lar gizli kalsın.</p>
            <ul className="lp-checks">
              <li><Check size={16} aria-hidden="true" /> Davet koduyla katılım</li>
              <li><Check size={16} aria-hidden="true" /> Canlı okuma odası</li>
              <li><Check size={16} aria-hidden="true" /> Takip ettiğin okurların yorum akışı</li>
            </ul>
          </div>
        </article>
      </div>
    </section>
  )
}

/* ---------- Gizlilik ---------- */

export function Privacy() {
  const items = [
    { icon: Lock, title: 'Parolan bizde düz metin değil', text: 'Oturumlar yalnızca sunucunun okuyabildiği güvenli çerezlerle tutulur.' },
    { icon: Download, title: 'Verilerin senin', text: 'Ayarlar’dan tüm hesap ve okuma verilerinin bir kopyasını indirebilirsin.' },
    { icon: Trash2, title: 'Silmek tek adım', text: 'Hesabını sildiğinde kitaplığın, yorumların ve geçmişin kalıcı olarak kaldırılır.' },
  ]
  return (
    <section className="lp-section" id="gizlilik" aria-labelledby="privacy-title">
      <div className="lp-container lp-privacy">
        <div className="lp-section__head">
          <p className="lp-kicker">Gizlilik</p>
          <h2 id="privacy-title">Okuma alışkanlıkların sana ait</h2>
          <p>Hangi verinin neden işlendiği <a href="/privacy">gizlilik bildiriminde</a> açıkça yazılı.</p>
        </div>
        <ul className="lp-privacy__list">
          {items.map(({ icon: Icon, title, text }) => (
            <li key={title}><Icon size={22} aria-hidden="true" /><div><strong>{title}</strong><p>{text}</p></div></li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- SSS ---------- */

const FAQ = [
  { q: 'Mihenk ücretli mi?', a: 'Hayır. Hesap açmak ve tüm özellikleri kullanmak ücretsizdir.' },
  { q: 'Öneriler nasıl oluşturuluyor?', a: 'Yazdığın cümle; kitapların karakter özellikleri, temaları ve atmosferiyle karşılaştırılır. Hesabın varsa okuduğun ve beğendiğin kitaplar da hesaba katılır, okuduğun kitaplar tekrar önerilmez. Her önerinin yanında puanın nereden geldiği gösterilir.' },
  { q: 'Kitapları Mihenk’ten mi satın alıyorum?', a: 'Hayır. Mihenk kitap satmaz; doğrulanmış mağaza tekliflerini gösterir ve bağlantıyla mağazaya yönlendirir.' },
  { q: 'Goodreads kitaplığımı taşıyabilir miyim?', a: 'Evet. Topluluk › Kulüpler sekmesindeki içe aktarma alanına Goodreads CSV dışa aktarımını ya da başlık/yazar/raf sütunları olan bir dosyayı yükleyebilirsin.' },
  { q: 'Telefonda kullanabilir miyim?', a: 'Evet. Mihenk tarayıcıda çalışır; telefonunda “Ana ekrana ekle” ile uygulama gibi açabilir, okuma hatırlatmaları için bildirimlere izin verebilirsin.' },
]

export function Faq() {
  return (
    <section className="lp-section" id="sss" aria-labelledby="faq-title">
      <div className="lp-container lp-faq">
        <div className="lp-section__head">
          <p className="lp-kicker">Sık sorulan sorular</p>
          <h2 id="faq-title">Aklına takılanlar</h2>
        </div>
        <div className="lp-faq__list">
          {FAQ.map((item) => (
            <details key={item.q} className="lp-faq__item">
              <summary><span>{item.q}</span><ChevronDown size={20} aria-hidden="true" /></summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Kapanış ---------- */

export function FinalCta() {
  return (
    <section className="lp-section lp-section--tight">
      <div className="lp-container">
        <div className="lp-final">
          <h2>Rafındaki bir sonraki kitap seni bekliyor.</h2>
          <p>Bir dakikada hesap aç, ilk önerini hemen al.</p>
          <div className="lp-hero__ctas">
            <Link to={SIGN_UP} className="mh-button mh-button--secondary mh-button--lg">Ücretsiz başla <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link to={routes.signIn} className="lp-final__link">Zaten hesabım var</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer__inner">
        <Brand href="#top" size="sm" label="Mihenk, sayfanın başına dön" />
        <nav aria-label="Alt bağlantılar">
          <a href="#ozellikler">Özellikler</a>
          <a href="#sss">SSS</a>
          <a href="/privacy">Gizlilik ve KVKK</a>
          <Link to={routes.signIn}>Giriş yap</Link>
        </nav>
        <p>© {new Date().getFullYear()} Mihenk</p>
      </div>
    </footer>
  )
}

