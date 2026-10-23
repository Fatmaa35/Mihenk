import { describe, expect, it } from 'vitest'
import type { LibraryBook, Profile } from '../../shared/api/types'
import { libraryIndex, progressOf, SHELF_LABELS } from './shelves'

const book = (id: string, shelf: LibraryBook['shelf']): LibraryBook => ({
  id, title: id, author: 'Yazar', genre: 'Roman', shelf, is_favorite: false, current_page: 0, total_pages: null,
})

describe('shelves', () => {
  it('indexes every shelf by book id', () => {
    const profile = {
      user: { id: 'u', display_name: 'U', app_role: 'user' },
      reading_books: [book('a', 'reading')], to_read_books: [book('b', 'to_read')],
      read_books: [book('c', 'read')], abandoned_books: [], favorite_books: [],
    } satisfies Profile
    const index = libraryIndex(profile)
    expect([...index.keys()]).toEqual(['a', 'b', 'c'])
    expect(index.get('b')?.shelf).toBe('to_read')
  })

  it('prefers server progress and falls back to page math', () => {
    expect(progressOf({ current_page: 10, total_pages: 100, progress_percent: 42 })).toBe(42)
    expect(progressOf({ current_page: 25, total_pages: 100 })).toBe(25)
    expect(progressOf({ current_page: 25, total_pages: null })).toBe(0)
  })

  it('has a Turkish label for every shelf', () => {
    expect(Object.keys(SHELF_LABELS).sort()).toEqual(['abandoned', 'read', 'reading', 'to_read'])
  })
})
