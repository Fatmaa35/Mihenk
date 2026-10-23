import type { LibraryBook, Profile, Shelf } from '../../shared/api/types'

export const SHELF_LABELS: Record<Shelf, string> = {
  reading: 'Okuyorum',
  to_read: 'Okuyacağım',
  read: 'Okudum',
  abandoned: 'Bıraktım',
}

/** Kitap kimliğinden kitaplıktaki kaydına hızlı erişim. */
export function libraryIndex(profile: Profile): Map<string, LibraryBook> {
  const entries = [...profile.reading_books, ...profile.to_read_books, ...profile.read_books, ...profile.abandoned_books]
  return new Map(entries.map((book) => [book.id, book]))
}

export function progressOf(book: Pick<LibraryBook, 'current_page' | 'total_pages' | 'progress_percent'>): number {
  if (typeof book.progress_percent === 'number') return book.progress_percent
  return book.total_pages ? (book.current_page / book.total_pages) * 100 : 0
}
