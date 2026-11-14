import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './api'
import { queryKeys } from './queries'
import type { LivePriceLookup } from './types'

/** Kitap açıldığında mağaza fiyatlarının canlı aranması: başlat ve bitene kadar durumu izle. */

export const livePriceKeys = { lookup: (bookId: string) => ['live-prices', bookId] as const }

const RUNNING = new Set(['waiting', 'running'])
const POLL_MS = 2000

const path = (bookId: string) => `/books/${encodeURIComponent(bookId)}/offers/live`

/**
 * Aramanın durumunu döner; `auto` açıkken kitapta henüz arama yoksa kendiliğinden başlatır.
 * Arama sürerken birkaç saniyede bir yenilenir, bitince yoklama durur ve kitap detayı
 * (kayıtlı fiyat listesi) tazelenir.
 */
export function useLivePrices(bookId: string | null, auto = true) {
  const client = useQueryClient()
  const started = useRef<string | null>(null)

  const lookup = useQuery({
    queryKey: livePriceKeys.lookup(bookId ?? ''),
    queryFn: () => api<LivePriceLookup>(path(bookId ?? '')),
    enabled: Boolean(bookId),
    refetchInterval: (query) => (query.state.data && RUNNING.has(query.state.data.status) ? POLL_MS : false),
  })

  const start = useMutation({
    mutationFn: (force: boolean) => api<LivePriceLookup>(`${path(bookId ?? '')}${force ? '?force=true' : ''}`, { method: 'POST' }),
    onSuccess: (data) => client.setQueryData(livePriceKeys.lookup(bookId ?? ''), data),
  })

  const { mutate } = start
  const status = lookup.data?.status
  useEffect(() => {
    if (!bookId || !auto || status !== 'idle' || started.current === bookId) return
    started.current = bookId
    mutate(false)
  }, [bookId, auto, status, mutate])

  const finished = lookup.data?.finished_at
  const found = lookup.data?.found ?? 0
  useEffect(() => {
    if (!bookId || !finished || !found) return
    void client.invalidateQueries({ queryKey: queryKeys.book(bookId) })
  }, [bookId, finished, found, client])

  const busy = start.error instanceof ApiError && start.error.status === 429
  return {
    lookup: lookup.data ?? null,
    running: Boolean(lookup.data && RUNNING.has(lookup.data.status)) || start.isPending,
    busy,
    error: busy ? null : (start.error?.message ?? null),
    refresh: () => { started.current = bookId; mutate(true) },
  }
}
