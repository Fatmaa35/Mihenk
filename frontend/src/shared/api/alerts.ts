import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { json, queryKeys } from './queries'
import type { AppNotification, PriceAlert, PushCapabilities } from './types'

/** Bildirimler, fiyat alarmları ve web push. */

export function useNotifications() {
  return useQuery({ queryKey: queryKeys.notifications, queryFn: () => api<AppNotification[]>('/me/notifications'), refetchInterval: 120_000 })
}

export function useUnreadCount(): number {
  const { data } = useNotifications()
  return data?.filter((item) => !item.read_at).length ?? 0
}

export function useMarkNotificationRead() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/me/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api('/me/notifications/read-all', { method: 'PUT' }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}

export function usePriceAlerts() {
  return useQuery({ queryKey: queryKeys.priceAlerts, queryFn: () => api<PriceAlert[]>('/me/price-alerts') })
}

export function useUpsertPriceAlert() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { book_id: string; target_price_minor: number }) =>
      api<PriceAlert>('/me/price-alerts', { method: 'PUT', ...json({ ...input, currency: 'TRY', is_active: true }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.priceAlerts }),
  })
}

export function useDeletePriceAlert() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (bookId: string) => api(`/me/price-alerts/${encodeURIComponent(bookId)}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.priceAlerts }),
  })
}

export function usePushCapabilities() {
  return useQuery({ queryKey: queryKeys.pushCapabilities, queryFn: () => api<PushCapabilities>('/notifications/capabilities'), staleTime: Infinity })
}

function base64UrlToBytes(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

/** Tarayıcı izni ister, push aboneliği oluşturur ve sunucuya kaydeder. */
export function useEnablePush() {
  return useMutation({
    mutationFn: async (vapidPublicKey: string) => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Bu tarayıcı push bildirimlerini desteklemiyor.')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Bildirim izni verilmedi.')
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(vapidPublicKey) })
      const data = subscription.toJSON()
      await api('/me/push-subscriptions', { method: 'POST', ...json({ endpoint: data.endpoint, p256dh: data.keys?.p256dh, auth: data.keys?.auth }) })
    },
  })
}
