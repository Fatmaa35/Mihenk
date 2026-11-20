import { formatPrice, priceSummary, remainingOffers } from './offers'
import type { LivePriceLookup, LivePriceStep, RetailOffer } from './offers'

const step = (name: string, state: LivePriceStep['state'] = 'found'): LivePriceStep => ({
  retailer_id: name.toLowerCase(), retailer_name: name, state, message: null,
  price_minor: state === 'found' ? 24900 : null, currency: 'TRY',
  product_url: state === 'found' ? `https://${name}.test/kitap` : null, stock_status: 'in_stock',
})

const offer = (name: string, priceMinor: number | null): RetailOffer => ({
  isbn: '9789750719387', canonical_title: 'Suç ve Ceza', retailer_name: name,
  price_minor: priceMinor, currency: 'TRY', stock_status: 'in_stock',
  product_url: `https://${name}.test/kitap`, checked_at: null,
})

const lookup = (patch: Partial<LivePriceLookup> = {}): LivePriceLookup => ({
  book_id: 'b1', status: 'done', started_at: null, finished_at: null, found: 0,
  retailers: [step('Kitapseç', 'missing')], ...patch,
})

describe('formatPrice', () => {
  it('kuruşu Türk lirası olarak yazar', () => {
    expect(formatPrice(24900, 'TRY')).toBe('249,00 ₺')
    expect(formatPrice(null, 'TRY')).toBe('—')
  })
})

describe('remainingOffers', () => {
  it('canlı aranan mağazaları tekrar listelemez', () => {
    const offers = [offer('Kitapseç', 22900), offer('D&R', 25900)]
    expect(remainingOffers(offers, [step('Kitapseç')]).map((item) => item.retailer_name)).toEqual(['D&R'])
  })

  it('fiyatı olmayanları atar ve ucuzdan pahalıya sıralar', () => {
    const offers = [offer('n11', 31900), offer('D&R', null), offer('Hepsiburada', 27900)]
    expect(remainingOffers(offers, []).map((item) => item.retailer_name)).toEqual(['Hepsiburada', 'n11'])
  })

  it('kayıtlı fiyat yoksa boş liste döner', () => {
    expect(remainingOffers(undefined, [])).toEqual([])
  })
})

describe('priceSummary', () => {
  it('aramanın nerede olduğunu söyler', () => {
    expect(priceSummary(null)).toContain('henüz aranmadı')
    expect(priceSummary(lookup({ status: 'running' }))).toContain('aranıyor')
    expect(priceSummary(lookup({ found: 2 }))).toBe('2 mağazada fiyat bulundu.')
    expect(priceSummary(lookup())).toContain('bulunamadı')
  })

  it('kitap yok demekle mağazaya ulaşılamadı demeyi karıştırmaz', () => {
    const offline = lookup({ retailers: [step('Kitapseç', 'error'), step('BKM Kitap', 'blocked')] })
    expect(priceSummary(offline)).toContain('ulaşılamadı')
  })
})
