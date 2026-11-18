export type Shelf = 'reading' | 'to_read' | 'read' | 'abandoned'

export type LibraryBook = {
  id: string
  title: string
  author: string
  genre?: string
  cover_url?: string | null
  shelf: Shelf
  is_favorite?: boolean
  current_page?: number
  total_pages?: number | null
  progress_percent?: number
  is_custom?: boolean
}

export type Profile = {
  display_name: string
  reading_books: LibraryBook[]
  to_read_books: LibraryBook[]
  read_books: LibraryBook[]
  abandoned_books: LibraryBook[]
  favorite_books: LibraryBook[]
}

export type Bootstrap = {
  user: { id: string; display_name: string; email?: string }
  profile: Profile
}

export type IsbnLookup = {
  found: boolean
  book?: { id?: string; title: string; author: string; total_pages?: number | null; cover_url?: string | null }
  message?: string
}
