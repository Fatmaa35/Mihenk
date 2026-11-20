import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { keys } from './library'
import type { Shelf } from './types'

export type RecommendedBook = {
  book_id: string | null
  book_title: string
  author: string
  genre: string
  match_score: number
  reasoning: string
  already_in_watchlist: boolean
}

export type DiscoveredBook = {
  book_title: string
  author: string
  genre: string
  reasoning: string
}

export type Recommendations = {
  character_analysis_summary: string
  recommended_books: RecommendedBook[]
  ai_discoveries: DiscoveredBook[]
  recommendation_id?: string
}

/** Ruh hâline göre öneri ister; yapay zekâ yanıtı birkaç saniye sürebilir. */
export function useRecommendations() {
  return useMutation({
    mutationFn: (wish: string) =>
      api<Recommendations>('/me/recommendations', {
        method: 'POST',
        body: JSON.stringify({ character_description: wish.trim(), limit: 5 }),
      }),
  })
}

/** Önerilen kitabı doğrudan rafa alır. */
export function useAddRecommendation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, shelf }: { bookId: string; shelf: Shelf }) =>
      api<unknown>('/me/library', {
        method: 'PUT',
        body: JSON.stringify({ book_id: bookId, shelf, current_page: 0 }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.bootstrap }),
  })
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type ChatReply = {
  intent: string
  answer: string
  books: { id: string; title: string; author: string }[]
  suggestions: string[]
  session_id: string | null
}

/**
 * Asistana soru sorar. Sunucu son sekiz mesajı bağlam olarak kabul ediyor,
 * fazlası gönderilmez.
 */
export function useAssistant() {
  return useMutation({
    mutationFn: ({ message, history, sessionId }: {
      message: string
      history: ChatMessage[]
      sessionId: string | null
    }) =>
      api<ChatReply>('/me/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: message.trim(),
          history: history.slice(-8),
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
      }),
  })
}
