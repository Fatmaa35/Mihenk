import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { keys } from './library'
import type { LibraryBook } from './types'

export type ReadingStats = {
  total_sessions: number
  total_minutes: number
  total_pages_read: number
  average_reading_speed_pages_per_min: number
  estimated_hours_for_300_page_book: number
  heatmap_data: Record<string, number>
}

export const readingKeys = { stats: ['reading-stats'] as const }

export function useReadingStats() {
  return useQuery({
    queryKey: readingKeys.stats,
    queryFn: () => api<ReadingStats>('/me/reading-sessions/stats'),
    staleTime: 60_000,
  })
}

export type FinishedSession = {
  book: LibraryBook
  startPage: number
  endPage: number
  minutes: number
}

/**
 * Biten odak seansını kaydeder ve kitabın kaldığı sayfayı günceller.
 *
 * Katalog kitapları `book_id`, kişinin kendi eklediği kitaplar
 * `custom_book_id` ile kaydedilir; sunucu ikisinden yalnızca birini kabul eder.
 */
export function useFinishSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ book, startPage, endPage, minutes }: FinishedSession) => {
      await api<unknown>('/me/reading-sessions', {
        method: 'POST',
        body: JSON.stringify({
          ...(book.is_custom ? { custom_book_id: book.id } : { book_id: book.id }),
          start_page: startPage,
          end_page: endPage,
          duration_minutes: minutes,
        }),
      })
      await api<unknown>('/me/library', {
        method: 'PUT',
        body: JSON.stringify({
          book_id: book.id,
          shelf: book.shelf,
          current_page: endPage,
          total_pages: book.total_pages ?? null,
        }),
      })
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.bootstrap })
      void client.invalidateQueries({ queryKey: readingKeys.stats })
    },
  })
}
