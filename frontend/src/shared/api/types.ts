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

/* ---------- Profil ve oyunlaştırma ---------- */

export type Badge = {
  code: string
  name: string
  description: string
  icon: string
  xp_reward: number
  progress: number
  goal: number
  progress_percent: number
  earned: boolean
  earned_at: string | null
  showcased: boolean
}

export type GamificationDetails = Gamification & {
  level: Gamification['level'] & { floor_xp: number; next_xp: number | null }
  showcase: string[]
  badges: Badge[]
}

export type ReadingDashboardDetails = ReadingDashboard & {
  calendar: { activity_date: string; pages_read: number; books: number }[]
  genre_distribution: { genre: string; count: number }[]
  series_progress: { series_name: string; read_books: number; total_books: number; progress_percent: number }[]
}

/* ---------- Bildirimler ve fiyat alarmları ---------- */

export type AppNotification = { id: string; title: string; body: string; created_at: string; read_at: string | null; kind?: string }

export type PriceAlert = {
  book_id: string
  title: string
  author: string | null
  cover_url: string | null
  target_price_minor: number
  current_price_minor: number | null
  currency: string
  is_active: boolean
  updated_at: string
}

export type PushCapabilities = { email: boolean; push: boolean; vapid_public_key: string | null }

/* ---------- Topluluk ---------- */

export type BookComment = {
  id: string
  book_id: string
  content: string
  parent_comment_id: string | null
  contains_spoiler: boolean
  created_at: string
  is_mine: boolean
  author_id: string
  helpful_count: number
  own_helpful: boolean
  following_author: boolean
  author: { display_name: string; is_verified: boolean; verification_label: string | null }
}

export type BookCommunity = {
  rating_count: number
  rating_average: number
  own_rating: number | null
  rating_distribution: Record<string, number>
  comments: BookComment[]
}

export type FeedItem = {
  id: string
  book_id: string
  content: string
  contains_spoiler: boolean
  created_at: string
  author_id: string
  display_name: string
  is_verified: boolean
  book_title: string
  book_author: string | null
  cover_url: string | null
  helpful_count: number
}

export type ReportReason = 'spam' | 'harassment' | 'spoiler' | 'hate' | 'misinformation' | 'other'

/* ---------- Ayarlar ---------- */

export type Preferences = {
  personality_text: string
  selected_traits: string[]
  preferred_genres: string[]
  disliked_genres: string[]
  liked_styles: string[]
  disliked_styles: string[]
  pace_preference: 'slow' | 'medium' | 'fast' | 'mixed' | null
  focus_preference: 'character' | 'plot' | 'balanced' | null
  tone_preference: 'dark' | 'hopeful' | 'balanced' | null
  violence_sensitivity: number
  romance_sensitivity: number
  spoiler_sensitivity: number
  length_preference: 'short' | 'medium' | 'long' | 'any' | null
}

export type NotificationPreferences = {
  consent_granted: boolean
  weekly_digest: boolean
  recommendations: boolean
  price_drops: boolean
  stock_updates: boolean
  social_updates: boolean
  frequency: 'instant' | 'daily' | 'weekly' | 'off'
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

/* ---------- Asistan ---------- */

export type ChatBook = { id: string; title: string; author: string; genre: string; cover_url?: string | null }
export type ChatAction = { action_type: string; book_id: string; book_title: string; arguments: Record<string, string | number | boolean>; confirmation: string }
export type ChatReply = { intent: string; answer: string; books: ChatBook[]; suggestions: string[]; pending_action: ChatAction | null; session_id: string | null }
export type ChatSession = { id: string; title: string; updated_at?: string; is_pinned?: boolean }
export type ChatMessage = { id?: string; role: 'user' | 'assistant'; content: string; books?: ChatBook[] }
export type ActiveView = 'discover' | 'catalog' | 'library' | 'insights' | 'alerts' | 'quality'
