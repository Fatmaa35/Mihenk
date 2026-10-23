import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { json, queryKeys } from './queries'
import type { BookComment, BookCommunity, FeedItem, ReportReason } from './types'

/** Kitap puanları, yorumlar, takip ve topluluk akışı. */

export function useCommunityFeed() {
  return useQuery({ queryKey: queryKeys.communityFeed, queryFn: () => api<FeedItem[]>('/me/community-feed') })
}

export function useBookCommunity(bookId: string | null) {
  return useQuery({
    queryKey: queryKeys.bookCommunity(bookId ?? ''),
    queryFn: () => api<BookCommunity>(`/books/${encodeURIComponent(bookId ?? '')}/community`),
    enabled: Boolean(bookId),
  })
}

/** Topluluk verisini değiştiren her işlemden sonra yenilenmesi gereken sorgular. */
function useRefreshCommunity(bookId: string) {
  const client = useQueryClient()
  return () => Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.bookCommunity(bookId) }),
    client.invalidateQueries({ queryKey: queryKeys.book(bookId) }),
    client.invalidateQueries({ queryKey: queryKeys.communityFeed }),
    client.invalidateQueries({ queryKey: queryKeys.gamification }),
  ])
}

export function useRateBook(bookId: string) {
  const refresh = useRefreshCommunity(bookId)
  return useMutation({
    mutationFn: (rating: number) => api(`/me/book-ratings/${encodeURIComponent(bookId)}`, { method: 'PUT', ...json({ rating }) }),
    onSuccess: refresh,
  })
}

export function useCreateComment(bookId: string) {
  const refresh = useRefreshCommunity(bookId)
  return useMutation({
    mutationFn: (input: { content: string; contains_spoiler: boolean; parent_comment_id: string | null }) =>
      api<BookComment>('/me/book-comments', { method: 'POST', ...json({ book_id: bookId, ...input }) }),
    onSuccess: refresh,
  })
}

export function useDeleteComment(bookId: string) {
  const refresh = useRefreshCommunity(bookId)
  return useMutation({
    mutationFn: (commentId: string) => api(`/me/book-comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })
}

export function useToggleHelpful(bookId: string) {
  const refresh = useRefreshCommunity(bookId)
  return useMutation({
    mutationFn: (comment: Pick<BookComment, 'id' | 'own_helpful'>) =>
      api(`/me/comments/${encodeURIComponent(comment.id)}/helpful`, { method: comment.own_helpful ? 'DELETE' : 'PUT' }),
    onSuccess: refresh,
  })
}

export function useToggleFollow(bookId: string) {
  const refresh = useRefreshCommunity(bookId)
  return useMutation({
    mutationFn: (input: { userId: string; following: boolean }) =>
      api(`/me/follows/${encodeURIComponent(input.userId)}`, { method: input.following ? 'DELETE' : 'PUT' }),
    onSuccess: refresh,
  })
}

export function useReportComment() {
  return useMutation({
    mutationFn: (input: { commentId: string; reason: ReportReason; details: string | null }) =>
      api(`/me/comments/${encodeURIComponent(input.commentId)}/reports`, { method: 'POST', ...json({ reason: input.reason, details: input.details }) }),
  })
}
