import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useLivePrices } from '../../shared/api/livePrices'
import type { LivePriceLookup, LivePriceStep, RetailOffer } from '../../shared/api/types'
import { Button } from '../../shared/ui'
import { formatMoney } from '../../spa/format'
import './pricing.css'

const clock = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

/** Canlı aranan mağazaların fiyatı burada görünür; kalan kayıtlı fiyatlar listenin altına eklenir. */
export function remainingOffers(offers: RetailOffer[], steps: LivePriceStep[]): RetailOffer[] {
  const live = new Set(steps.map((step) => step.retailer_name))
  return offers
    .filter((offer) => offer.price_minor != null && !live.has(offer.retailer_name))
    .sort((a, b) => (a.price_minor ?? 0) - (b.price_minor ?? 0))
    .slice(0, 4)
}

/** Listenin altındaki tek satırlık özet: arama nerede ve sonuç ne oldu. */
export function statusText(lookup: LivePriceLookup | null): string {
  if (!lookup || lookup.status === 'idle') return 'Mağaza fiyatları henüz aranmadı.'
  if (lookup.status === 'waiting') return 'Arama sıraya alındı…'
  if (lookup.status === 'running') return 'Mağazalarda aranıyor; sonuçlar geldikçe görünecek.'
  const when = lookup.finished_at ? ` · son kontrol ${clock(lookup.finished_at)}` : ''
  if (lookup.found > 0) return `${lookup.found} mağazada fiyat bulundu${when}`
  const unreachable = lookup.retailers.every((step) => step.state === 'error' || step.state === 'blocked')
  if (unreachable) return 'Mağazalara şu an ulaşılamadı; biraz sonra tekrar dene.'
  return `Bu kitap şu an mağazalarda bulunamadı${when}`
}

function Price({ name, url, priceMinor, currency, note }: {
  name: string; url: string | null; priceMinor: number | null; currency: string; note?: string | null
}) {
  return (
    <li className={`live-price live-price--${priceMinor != null ? 'found' : 'missing'}`}>
      <span className="live-price__store">{name}</span>
      {priceMinor != null && url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {formatMoney(priceMinor, currency)} <ExternalLink size={14} aria-hidden="true" />
        </a>
      ) : <small>{note}</small>}
    </li>
  )
}

function Step({ step }: { step: LivePriceStep }) {
  if (step.state === 'found') {
    return <Price name={step.retailer_name} url={step.product_url} priceMinor={step.price_minor} currency={step.currency ?? 'TRY'} />
  }
  return (
    <li className={`live-price live-price--${step.state}`}>
      <span className="live-price__store">
        {step.state === 'searching' && <Loader2 size={14} className="live-price__spin" aria-hidden="true" />}
        {step.retailer_name}
      </span>
      <small>{step.message}</small>
    </li>
  )
}

/**
 * Kitabın fiyatları: açılışta izinli mağazalardan canlı çekilir, her mağaza kendi satırında
 * ilerler. Bulunan fiyatlar aynı anda kayda geçtiği için kitap bir dahaki açılışta hemen
 * görünür. Canlı aranmayan mağazaların kayıtlı fiyatları listenin sonunda durur.
 */
export function BookPrices({ bookId, offers }: { bookId: string; offers: RetailOffer[] }) {
  const { lookup, running, busy, error, refresh } = useLivePrices(bookId)
  const steps = lookup?.retailers ?? []
  const stored = remainingOffers(offers, steps)

  return (
    <div className="live-prices">
      <ul className="live-prices__list">
        {steps.map((step) => <Step key={step.retailer_id} step={step} />)}
        {stored.map((offer) => (
          <Price key={offer.product_url} name={offer.retailer_name} url={offer.product_url}
            priceMinor={offer.price_minor} currency={offer.currency} />
        ))}
      </ul>
      <p className="live-prices__status" role="status">
        {busy
          ? 'Şu an çok sayıda arama sürüyor; birkaç dakika sonra tekrar dene.'
          : error ?? statusText(lookup)}
      </p>
      <Button variant="ghost" size="sm" onClick={refresh} loading={running} disabled={running}
        icon={<RefreshCw size={14} aria-hidden="true" />}>
        Fiyatları yenile
      </Button>
    </div>
  )
}
