import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './api'
import type {
  Book, BookClub, BookDetails, Bootstrap, CatalogPage, LibraryEntryInput, ReadingDashboard,
  RecommendationResult, User, WeeklySummary,
} from './types'

/** Tüm sorgu anahtarları tek yerde: geçersiz kılma (invalidate) hatalarını önler. */
export const queryKeys = {
  bootstrap: ['bootstrap'] as const,
  weekly: ['weekly-summary'] as const,
  dashboard: (year: number) => ['reading-dashboard', year] as const,
  catalog: (q: string, sort: string) => ['catalog', q, sort] as const,
  book: (id: string) => ['book', id] as const,
  clubs: ['book-clubs'] as const,
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => !(error instanceof ApiError && [401, 403, 404].includes(error.status)) && count < 2,
      },
    },
  })
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

/* ---------- Oturum ---------- */

export function useBootstrap() {
  return useQuery({ queryKey: queryKeys.bootstrap, queryFn: () => api<Bootstrap>('/me/bootstrap') })
}

export function useLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; password: string }) => api<User>('/auth/login', { method: 'POST', ...json(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.bootstrap }),
  })
}

export function useRegister() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { display_name: string; email: string; password: string }) =>
      api<User & { email_confirmation_required?: boolean }>('/auth/register', { method: 'POST', ...json(input) }),
    onSuccess: (user) => { if (!user.email_confirmation_required) void client.invalidateQueries({ queryKey: queryKeys.bootstrap }) },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api<{ message?: string }>('/auth/password/forgot', { method: 'POST', ...json({ email }) }),
  })
}

export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => client.clear(),
  })
}

/* ---------- Okuma ---------- */

export function useWeeklySummary() {
  return useQuery({ queryKey: queryKeys.weekly, queryFn: () => api<WeeklySummary>('/me/weekly-summary') })
}

export function useReadingDashboard(year = new Date().getFullYear()) {
  return useQuery({ queryKey: queryKeys.dashboard(year), queryFn: () => api<ReadingDashboard>(`/me/reading-dashboard?year=${year}`) })
}

export function useBookClubs() {
  return useQuery({ queryKey: queryKeys.clubs, queryFn: () => api<BookClub[]>('/me/book-clubs') })
}

/* ---------- Katalog ve öneriler ---------- */

export function useCatalog(q: string, sort: 'title' | 'popular', pageSize = 24) {
  return useInfiniteQuery({
    queryKey: queryKeys.catalog(q, sort),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(pageParam), sort })
      if (q) params.set('q', q)
      return api<CatalogPage>(`/catalog/books?${params}`)
    },
    getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined),
    placeholderData: (previous) => previous,
  })
}

export function useBookDetails(id: string | null) {
  return useQuery({
    queryKey: queryKeys.book(id ?? ''),
    queryFn: () => api<BookDetails>(`/books/${encodeURIComponent(id ?? '')}/details`),
    enabled: Boolean(id),
  })
}

export function useRecommendations() {
  return useMutation({
    mutationFn: (description: string) =>
      api<RecommendationResult>('/me/recommendations', { method: 'POST', ...json({ character_description: description, limit: 6 }) }),
  })
}

/* ---------- Kitaplık ---------- */

function invalidateReading(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.bootstrap }),
    client.invalidateQueries({ queryKey: queryKeys.weekly }),
    client.invalidateQueries({ queryKey: ['reading-dashboard'] }),
  ])
}

export function useUpsertLibraryEntry() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: LibraryEntryInput) => api<unknown>('/me/library', { method: 'PUT', ...json(input) }),
    onSuccess: () => invalidateReading(client),
  })
}

export function useRemoveLibraryEntry() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (bookId: string) => api<void>(`/me/library/${encodeURIComponent(bookId)}`, { method: 'DELETE' }),
    onSuccess: () => invalidateReading(client),
  })
}

export type { Book }
