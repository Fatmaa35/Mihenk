export type WeeklySummary = {
  start_date: string
  end_date: string
  minutes_read: number
  pages_read: number
  sessions: number
  books_finished: number
  recommendations: Array<{ id: string; title: string; author: string }>
}

export type Onboarding = {
  liked_book_ids: string[]
  liked_authors: string[]
  preferred_genres: string[]
  pace_preference: 'slow' | 'medium' | 'fast' | 'mixed'
  onboarding_completed: boolean
  tasks: Array<{ key: string; title: string; done: boolean }>
}

export type Preferences = {
  consent_granted: boolean
  weekly_digest: boolean
  recommendations: boolean
  price_drops: boolean
  stock_updates: boolean
  social_updates: boolean
  frequency: 'instant' | 'daily' | 'weekly' | 'off'
}

export type ReadingList = {
  id: string
  title: string
  description: string
  visibility: string
  share_token: string
  item_count?: number
}

export type Club = {
  id: string
  name: string
  description: string
  rules?: string
  role: string
  invite_code?: string
  member_count?: number
}

export type Book = {
  id: string
  title: string
  author: string
  page_count?: number
  cover_url?: string
}

export type Milestone = {
  percent: number
  page: number
  title: string
  reached: boolean
}

export type UserProgress = {
  book_id: string
  current_page: number
  total_pages?: number
  daily_target_pages?: number
  percent?: number
  days_left?: number
  projected_finish_date?: string
  milestones?: Milestone[]
  in_library?: boolean
}

export type ClubMember = {
  user_id: string
  role: string
  joined_at: string
  display_name: string
}

export type ClubRead = {
  book_id: string
  title: string
  author: string
  cover_url?: string
  page_count?: number
  status: string
  joint_progress_percent?: number
  active_readers_count?: number
  start_date?: string
  target_date?: string
}

export type Discussion = {
  id: string
  club_id: string
  book_id: string
  book_title?: string
  display_name?: string
  content?: string
  page_number?: number
  chapter_title?: string
  discussion_type?: string
  is_spoiler_locked?: boolean
  created_at: string
  reactions?: {
    thoughtful: number
    agree: number
    heart: number
    bookmark: number
  }
  user_reactions?: string[]
}

export type ClubEvent = {
  id: string
  club_id: string
  title: string
  description: string
  event_type: 'kickoff' | 'midpoint' | 'final' | 'general'
  event_date: string
  location: string
  creator_name: string
  rsvp_counts: {
    attending: number
    maybe: number
    declined: number
  }
  user_rsvp?: 'attending' | 'maybe' | 'declined' | null
}

export type ClubPollOption = {
  id: string
  book_id: string
  title: string
  author: string
  cover_url?: string
  vote_count: number
  selected: boolean
}

export type ClubPoll = {
  id: string
  title: string
  status: string
  options: ClubPollOption[]
}

export type ClubBadge = {
  code: string
  title: string
  description: string
  icon: string
}

export type ClubStats = {
  member_count: number
  total_discussions: number
  completed_books_count: number
}

export type ClubDetail = {
  id: string
  name: string
  description: string
  rules?: string
  visibility: string
  invite_code?: string
  role: string
  owner_id?: string
  members: ClubMember[]
  reads: ClubRead[]
  active_read?: ClubRead | null
  user_progress: UserProgress[]
  discussions: Discussion[]
  upcoming_spoilers_count?: number
  events: ClubEvent[]
  polls: ClubPoll[]
  stats: ClubStats
  badges: ClubBadge[]
}

export const GENRES = ['Roman', 'Bilim Kurgu', 'Fantastik', 'Polisiye', 'Tarih', 'Psikoloji', 'Felsefe', 'Şiir']
