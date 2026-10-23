import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { json, queryKeys } from './queries'
import type { NotificationPreferences, Preferences } from './types'

/** Okuma zevki, bildirim tercihleri, geri bildirim ve hesap işlemleri. */

export function usePreferences() {
  return useQuery({ queryKey: queryKeys.preferences, queryFn: () => api<Preferences>('/me/preferences') })
}

export function useUpdatePreferences() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: Preferences) => api<Preferences>('/me/preferences', { method: 'PUT', ...json(input) }),
    onSuccess: (data) => {
      client.setQueryData(queryKeys.preferences, data)
      void client.invalidateQueries({ queryKey: queryKeys.bootstrap })
      void client.invalidateQueries({ queryKey: queryKeys.weekly })
    },
  })
}

export function useNotificationPreferences() {
  return useQuery({ queryKey: queryKeys.notificationPreferences, queryFn: () => api<NotificationPreferences>('/me/notification-preferences') })
}

export function useUpdateNotificationPreferences() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: NotificationPreferences) => api<NotificationPreferences>('/me/notification-preferences', { method: 'PUT', ...json(input) }),
    onSuccess: (data) => client.setQueryData(queryKeys.notificationPreferences, data),
  })
}

export function useBetaFeedback() {
  return useMutation({
    mutationFn: (input: { category: string; rating: number | null; message: string; context: Record<string, unknown> }) =>
      api('/me/beta-feedback', { method: 'POST', ...json(input) }),
  })
}

export function useDeleteAccount() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api('/me/account', { method: 'DELETE' }),
    onSuccess: () => client.clear(),
  })
}
