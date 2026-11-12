import { describe, expect, it } from 'vitest'
import { remainingOffers, statusText } from './BookPrices'
import type { LivePriceLookup, LivePriceStep, RetailOffer } from '../../shared/api/types'

const step = (name: string, state: LivePriceStep['state'] = 'found'): LivePriceStep => ({
  retailer_id: name.toLowerCase(), retailer_name: name, state, message: null,
  price_minor: state === 'found' ? 24900 : null, currency: 'TRY',
  product_url: state === 'found' ? `https://${name}.test/kitap` : null, stock_status: 'in_stock',
})

const offer = (name: string, priceMinor: number | null): RetailOffer => ({
  retailer_name: name, product_url: `https://${name}.test/kitap`, price_minor: priceMinor, currency: 'TRY',
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
})

const lookup = (patch: Partial<LivePriceLookup> = {}): LivePriceLookup => ({
  book_id: 'suc-ve-ceza', status: 'done', started_at: null, finished_at: null, found: 0,
  retailers: [step('Kitapseç', 'missing')], ...patch,
})

describe('statusText', () => {
  it('arama sürerken ve bittiğinde ne olduğunu söyler', () => {
    expect(statusText(lookup({ status: 'running' }))).toContain('aranıyor')
    expect(statusText(lookup({ found: 2, retailers: [step('Kitapseç'), step('D&R')] }))).toBe('2 mağazada fiyat bulundu')
    expect(statusText(lookup())).toContain('bulunamadı')
    expect(statusText(null)).toContain('henüz aranmadı')
  })

  it('kitap yok demekle mağazaya ulaşılamadı demeyi karıştırmaz', () => {
    const offline = lookup({ retailers: [step('Kitapseç', 'error'), step('BKM Kitap', 'blocked')] })
    expect(statusText(offline)).toContain('ulaşılamadı')
  })

  it('biten aramanın saatini gösterir', () => {
    const finished = new Date('2026-11-12T12:34:00Z').toISOString()
    expect(statusText(lookup({ found: 1, finished_at: finished }))).toMatch(/son kontrol \d{2}:\d{2}/)
  })
})
