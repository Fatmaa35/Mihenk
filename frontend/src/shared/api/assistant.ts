import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { invalidateReading, json, queryKeys } from './queries'
import type { ActiveView, ChatAction, ChatBook, ChatMessage, ChatReply, ChatSession } from './types'

/** Kitap asistanı: oturumlar, mesajlar ve onaylı işlemler. */

export function useChatSessions(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.chatSessions, queryFn: () => api<ChatSession[]>('/me/chat/sessions'), enabled })
}

export function useChatMessages(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.chatMessages(sessionId ?? ''),
    queryFn: () => api<ChatMessage[]>(`/me/chat/sessions/${encodeURIComponent(sessionId ?? '')}/messages`),
    enabled: Boolean(sessionId),
    staleTime: Infinity,
  })
}

export type SendChatInput = {
  message: string
  history: ChatMessage[]
  sessionId: string | null
  view: ActiveView
  books: Pick<ChatBook, 'id' | 'title' | 'author' | 'genre'>[]
}

export function useSendChat() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ message, history, sessionId, view, books }: SendChatInput) => {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 30_000)
      return api<ChatReply>('/me/chat', {
        method: 'POST',
        signal: controller.signal,
        ...json({
          message,
          session_id: sessionId,
          history: history.slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 2000) })),
          active_view_context: { view, query: null, books: books.slice(0, 10).map((book, index) => ({ ...book, position: index + 1 })) },
        }),
      }).finally(() => window.clearTimeout(timer))
    },
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.chatSessions }),
  })
}

export function useDeleteChatSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => api(`/me/chat/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.chatSessions }),
  })
}

export function useExecuteChatAction() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (action: ChatAction) =>
      api('/me/chat/actions/execute', { method: 'POST', ...json({ action, idempotency_key: crypto.randomUUID() }) }),
    onSuccess: () => {
      void invalidateReading(client)
      void client.invalidateQueries({ queryKey: queryKeys.priceAlerts })
    },
  })
}
