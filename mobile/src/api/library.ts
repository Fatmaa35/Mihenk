import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Bootstrap, LibraryBook, Shelf } from './types'

export const keys = { bootstrap: ['bootstrap'] as const }

/** Uygulama kabuğunu boyayan tek istek: kullanıcı ve kitaplığın tamamı. */
export function useBootstrap() {
  return useQuery({
    queryKey: keys.bootstrap,
    queryFn: () => api<Bootstrap>('/me/bootstrap'),
    staleTime: 30_000,
  })
}

export const SHELF_LABEL: Record<Shelf, string> = {
  reading: 'Okuyorum',
  to_read: 'Okuyacağım',
  read: 'Okudum',
  abandoned: 'Bıraktım',
}

export const SHELVES: Shelf[] = ['reading', 'to_read', 'read', 'abandoned']

export function booksOnShelf(bootstrap: Bootstrap | undefined, shelf: Shelf): LibraryBook[] {
  if (!bootstrap) return []
  const byShelf: Record<Shelf, LibraryBook[]> = {
    reading: bootstrap.profile.reading_books,
    to_read: bootstrap.profile.to_read_books,
    read: bootstrap.profile.read_books,
    abandoned: bootstrap.profile.abandoned_books,
  }
  return byShelf[shelf] ?? []
}

type EntryChange = {
  book_id: string
  shelf: Shelf
  current_page?: number
  total_pages?: number | null
  is_favorite?: boolean
}

/** Rafı ya da sayfa ilerlemesini kaydeder; kaydedince kitaplık yenilenir. */
export function useSaveEntry() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (change: EntryChange) =>
      api<unknown>('/me/library', { method: 'PUT', body: JSON.stringify(change) }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.bootstrap }),
  })
}

export function useRemoveEntry() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (bookId: string) =>
      api<void>(`/me/library/${encodeURIComponent(bookId)}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.bootstrap }),
  })
}
