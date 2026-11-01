import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { json } from './queries'
import type { LiveMessage, LiveRoom, LiveRoomPurpose, LiveRoomState } from './types'

/** Canlı odalar: arkadaşlarla birlikte okuma ya da ders çalışma (katılımcı listesi + sohbet). */

export const liveRoomKeys = { list: ['live-rooms'] as const }

export function useLiveRooms() {
  return useQuery({ queryKey: liveRoomKeys.list, queryFn: () => api<LiveRoom[]>('/me/live-rooms'), refetchInterval: 30_000 })
}

export function useCreateLiveRoom() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { title: string; purpose: LiveRoomPurpose }) => api<LiveRoom>('/me/live-rooms', { method: 'POST', ...json(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: liveRoomKeys.list }),
  })
}

export function useJoinLiveRoom() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (inviteCode: string) => api<LiveRoom>('/me/live-rooms/join', { method: 'POST', ...json({ invite_code: inviteCode }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: liveRoomKeys.list }),
  })
}

export const fetchLiveRoom = (roomId: string, after: number | null) =>
  api<LiveRoomState>(`/me/live-rooms/${encodeURIComponent(roomId)}${after === null ? '' : `?after=${after}`}`)

export const sendLiveMessage = (roomId: string, content: string) =>
  api<LiveMessage>(`/me/live-rooms/${encodeURIComponent(roomId)}/messages`, { method: 'POST', ...json({ content }) })

export const setLiveStatus = (roomId: string, statusText: string | null) =>
  api<{ status_text: string | null }>(`/me/live-rooms/${encodeURIComponent(roomId)}/status`, { method: 'PUT', ...json({ status_text: statusText }) })

export const removeLiveMember = (roomId: string, userId: string) =>
  api(`/me/live-rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' })

export const closeLiveRoom = (roomId: string) => api(`/me/live-rooms/${encodeURIComponent(roomId)}/close`, { method: 'POST' })

/** Sayfadan çıkarken "ayrıldı" bilgisini gönderir; sekme kapanırken de iletilsin diye keepalive kullanılır. */
export function leaveLiveRoom(roomId: string) {
  return fetch(`/me/live-rooms/${encodeURIComponent(roomId)}/leave`, { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined)
}
