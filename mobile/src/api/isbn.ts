import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { keys } from './library'
import type { Shelf } from './types'

export type IsbnBook = {
  isbn: string
  title: string
  author: string
  page_count?: number | null
  cover_url?: string | null
  publication_year?: string | null
  publisher?: string | null
  catalog_saved: boolean
  catalog_book_id?: string | null
}

const digits = (value: string) => value.replace(/[^0-9Xx]/g, '')

/**
 * Barkoddan kitap ekleme iki adımdır: ISBN kataloğa yazılır (sunucu Open Library
 * ve Google Books'a bakar), dönen katalog kimliği kitaplığa eklenir. Katalogda
 * karşılığı bulunamazsa kişisel kitap olarak kaydedilir.
 */
export function useAddByIsbn() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ isbn, shelf }: { isbn: string; shelf: Shelf }) => {
      const found = await api<IsbnBook>(`/me/books/isbn/${encodeURIComponent(digits(isbn))}`, { method: 'POST' })
      if (found.catalog_book_id) {
        await api<unknown>('/me/library', {
          method: 'PUT',
          body: JSON.stringify({
            book_id: found.catalog_book_id, shelf,
            total_pages: found.page_count ?? null, current_page: 0,
          }),
        })
      } else {
        await api<unknown>('/me/custom-books', {
          method: 'POST',
          body: JSON.stringify({
            title: found.title, author: found.author, genre: 'Genel',
            shelf: shelf === 'read' || shelf === 'abandoned' ? 'reading' : shelf,
            total_pages: found.page_count ?? null,
          }),
        })
      }
      return found
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.bootstrap }),
  })
}

export function useAddCustomBook() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (book: { title: string; author: string; shelf: Shelf; total_pages?: number | null }) =>
      api<unknown>('/me/custom-books', {
        method: 'POST',
        body: JSON.stringify({
          title: book.title.trim(), author: book.author.trim(), genre: 'Genel',
          shelf: book.shelf === 'read' || book.shelf === 'abandoned' ? 'reading' : book.shelf,
          total_pages: book.total_pages ?? null,
        }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.bootstrap }),
  })
}
