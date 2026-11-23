import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './client'

export type RetailOffer = {
  isbn: string | null
  canonical_title: string | null
  retailer_name: string
  price_minor: number | null
  currency: string
  stock_status: string | null
  product_url: string
  checked_at: string | null
  is_stale?: boolean
}

export type LivePriceStep = {
  retailer_id: string
  retailer_name: string
  state: 'pending' | 'searching' | 'found' | 'missing' | 'blocked' | 'error'
  message: string | null
  price_minor: number | null
  currency: string | null
  product_url: string | null
  stock_status: string | null
}

export type LivePriceLookup = {
  book_id: string
  status: 'idle' | 'waiting' | 'running' | 'done'
  started_at: string | null
  finished_at: string | null
  retailers: LivePriceStep[]
  found: number
}

const RUNNING = new Set(['waiting', 'running'])
const POLL_MS = 2000

export const offerKeys = {
  stored: (bookId: string) => ['offers', bookId] as const,
  live: (bookId: string) => ['offers-live', bookId] as const,
}

export function useStoredOffers(bookId: string) {
  return useQuery({
    queryKey: offerKeys.stored(bookId),
    queryFn: () => api<RetailOffer[]>(`/books/${encodeURIComponent(bookId)}/offers`),
  })
}

/**
 * Kitap açıldığında mağaza fiyatlarını canlı arar.
 *
 * Sunucu aramayı arka planda yürütür; burada durum birkaç saniyede bir okunur
 * ve arama bitince kayıtlı fiyat listesi tazelenir. Sunucu aynı kitabı altı
 * saatte bir (kişi yenile derse on dakikada bir) yeniden tarar, o yüzden ekranı
 * her açışta mağazalara gidilmez.
 */
export function useLiveOffers(bookId: string, auto = true) {
  const client = useQueryClient()
  const started = useRef<string | null>(null)

  const lookup = useQuery({
    queryKey: offerKeys.live(bookId),
    queryFn: () => api<LivePriceLookup>(`/books/${encodeURIComponent(bookId)}/offers/live`),
    refetchInterval: (query) => (query.state.data && RUNNING.has(query.state.data.status) ? POLL_MS : false),
  })

  const start = useMutation({
    mutationFn: (force: boolean) =>
      api<LivePriceLookup>(
        `/books/${encodeURIComponent(bookId)}/offers/live${force ? '?force=true' : ''}`,
        { method: 'POST' },
      ),
    onSuccess: (data) => client.setQueryData(offerKeys.live(bookId), data),
  })

  const { mutate } = start
  const status = lookup.data?.status
  useEffect(() => {
    if (!auto || status !== 'idle' || started.current === bookId) return
    started.current = bookId
    mutate(false)
  }, [auto, bookId, status, mutate])

  const finished = lookup.data?.finished_at
  const found = lookup.data?.found ?? 0
  useEffect(() => {
    if (!finished || !found) return
    void client.invalidateQueries({ queryKey: offerKeys.stored(bookId) })
  }, [bookId, client, finished, found])

  const busy = start.error instanceof ApiError && start.error.status === 429
  return {
    lookup: lookup.data ?? null,
    running: Boolean(lookup.data && RUNNING.has(lookup.data.status)) || start.isPending,
    busy,
    error: busy ? null : (start.error?.message ?? null),
    refresh: () => { started.current = bookId; mutate(true) },
  }
}

export function formatPrice(minor: number | null, currency: string | null): string {
  if (minor === null) return '—'
  const amount = (minor / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${amount} ${currency === 'TRY' || !currency ? '₺' : currency}`
}

/** Kayıtlı fiyatlardan, canlı aranan mağazalarda olmayanları ucuzdan pahalıya sıralar. */
export function remainingOffers(offers: RetailOffer[] | undefined, steps: LivePriceStep[]): RetailOffer[] {
  if (!offers) return []
  const live = new Set(steps.map((step) => step.retailer_name))
  return offers
    .filter((offer) => offer.price_minor !== null && !live.has(offer.retailer_name))
    .sort((a, b) => (a.price_minor ?? 0) - (b.price_minor ?? 0))
    .slice(0, 4)
}

/** Listenin altındaki tek satırlık özet. */
export function priceSummary(lookup: LivePriceLookup | null): string {
  if (!lookup || lookup.status === 'idle') return 'Mağaza fiyatları henüz aranmadı.'
  if (lookup.status === 'waiting') return 'Arama sıraya alındı…'
  if (lookup.status === 'running') return 'Mağazalarda aranıyor; sonuçlar geldikçe görünecek.'
  if (lookup.found > 0) return `${lookup.found} mağazada fiyat bulundu.`
  const unreachable = lookup.retailers.every((step) => step.state === 'error' || step.state === 'blocked')
  if (unreachable) return 'Mağazalara şu an ulaşılamadı; biraz sonra tekrar dene.'
  return 'Bu kitap şu an mağazalarda bulunamadı.'
}
