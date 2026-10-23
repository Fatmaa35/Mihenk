import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { invalidateReading, json, queryKeys } from './queries'
import type { GamificationDetails, ReadingDashboardDetails } from './types'

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
