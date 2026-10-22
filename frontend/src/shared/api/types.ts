/** Backend yanıtlarının arayüzde kullanılan alt kümesi. Alan adları API ile birebir aynıdır. */

export type Shelf = 'reading' | 'to_read' | 'read' | 'abandoned'

export type User = {
  id: string
  display_name: string
  email?: string
  app_role: 'user' | 'moderator' | 'admin' | string
  is_verified?: boolean
}

export type Book = {
  id: string
  title: string
  author: string
  genre: string
  description?: string
  themes?: string[]
  character_traits?: string[]
  atmosphere?: string[]
  cover_url?: string | null
  page_count?: number | null
  publication_type?: string
  rating_count?: number
  rating_average?: number
  is_custom?: boolean
}

export type LibraryBook = Book & {
  shelf: Shelf
  is_favorite: boolean
  current_page: number
  total_pages: number | null
  progress_percent?: number
  started_at?: string | null
  finished_at?: string | null
  updated_at?: string
}

export type Profile = {
  user: User
  read_books: LibraryBook[]
  reading_books: LibraryBook[]
  to_read_books: LibraryBook[]
  abandoned_books: LibraryBook[]
  favorite_books: LibraryBook[]
}

export type Gamification = {
  xp: number
  level: { name: string; number: number; next_xp: number; progress_percent: number }
  earned_count: number
  total_badges: number
}

export type Bootstrap = {
  user: User
  profile: Profile
  preferences: { preferred_genres: string[]; selected_traits: string[] } & Record<string, unknown>
  gamification: Gamification
  notifications: { id: string; title?: string; body?: string; read_at?: string | null }[]
}

export type WeeklySummary = {
  start_date: string
  end_date: string
  minutes_read: number
  pages_read: number
  sessions: number
  books_finished: number
  recommendations: Book[]
}

export type ReadingDashboard = {
  year: number
  goal: { target_books: number; completed_books: number; progress_percent: number; is_default: boolean }
  total_pages_read: number
  active_days: number
  current_streak: number
  longest_streak: number
}

export type CatalogPage = { items: Book[]; total: number; limit: number; offset: number }

export type RecommendedBook = {
  book_id: string | null
  book_title: string
  author: string
  match_score: number
  reasoning: string
  genre: string
  already_in_watchlist: boolean
}

export type RecommendationResult = {
  character_analysis_summary: string
  recommended_books: RecommendedBook[]
  recommendation_id: string
}

export type RetailOffer = {
  retailer_name: string
  product_url: string
  price_minor: number | null
  list_price_minor?: number | null
  currency: string
  stock_status?: string
  is_stale?: boolean
}

export type BookDetails = {
  book: Book
  community: { rating_average: number; rating_count: number; comments: unknown[] }
  offers: RetailOffer[]
  ai_match?: { score: number; reasons: string[] }
}

export type BookClub = { id: string; name: string; description?: string; member_count?: number; next_event?: { title?: string; starts_at?: string } | null }

export type LibraryEntryInput = {
  book_id: string
  shelf: Shelf
  is_favorite?: boolean
  current_page?: number
  total_pages?: number | null
}
