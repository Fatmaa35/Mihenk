import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { invalidateReading, json, queryKeys } from './queries'
import type { GamificationDetails, Quote, ReadingDashboardDetails, ReadingSession } from './types'

/** Okuma analizi, seviye/rozetler ve yıllık hedef. */

export function useGamification() {
  return useQuery({ queryKey: queryKeys.gamification, queryFn: () => api<GamificationDetails>('/me/gamification') })
}

export function useReadingDashboardDetails(year = new Date().getFullYear()) {
  return useQuery({ queryKey: queryKeys.dashboard(year), queryFn: () => api<ReadingDashboardDetails>(`/me/reading-dashboard?year=${year}`) })
}

export function useUpdateReadingGoal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (targetBooks: number) => api('/me/reading-goal', { method: 'PUT', ...json({ goal_year: new Date().getFullYear(), target_books: targetBooks }) }),
    onSuccess: () => invalidateReading(client),
  })
}

export function useUpdateShowcase() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (badgeCodes: string[]) => api<GamificationDetails>('/me/gamification/showcase', { method: 'PUT', ...json({ badge_codes: badgeCodes }) }),
    onSuccess: (data) => client.setQueryData(queryKeys.gamification, data),
  })
}

export function useReadingSessions() {
  return useQuery({ queryKey: queryKeys.readingSessions, queryFn: () => api<ReadingSession[]>('/me/reading-sessions') })
}

/* ---------- Alıntılar ---------- */

export function useQuotes() {
  return useQuery({ queryKey: queryKeys.quotes, queryFn: () => api<Quote[]>('/me/quotes') })
}

export type QuoteInput = { book_id?: string | null; custom_book_id?: string | null; quote_text: string; page_number: number | null }

export function useSaveQuote() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: QuoteInput) => api<Quote>('/me/quotes', { method: 'POST', ...json({ ...input, tags: [], source_type: 'manual' }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.quotes }),
  })
}
