import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../shared/api/api'
import { fetchLiveRoom, leaveLiveRoom, sendLiveMessage } from '../../shared/api/liveRooms'
import type { LiveMessage, LiveParticipant, LiveRoom } from '../../shared/api/types'

export const POLL_MS = 4000

/** Yeni gelen mesajları mevcut listeye ekler: tekrarları atar, sıra mesaj numarasına göredir. */
export function mergeMessages(current: LiveMessage[], incoming: LiveMessage[]): LiveMessage[] {
  if (!incoming.length) return current
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => a.id - b.id).slice(-300)
}

type State = {
  room: LiveRoom | null
  participants: LiveParticipant[]
  messages: LiveMessage[]
  error: string | null
  /** Odaya erişim kalktı (çıkarıldı ya da üyelik yok); yoklama durur. */
  lost: boolean
}

/**
 * Odanın durumunu birkaç saniyede bir yeniler. Her istek sunucuya "buradayım" der; sekme arka plandayken
 * istek atılmaz (o süre boyunca kişi "odada değil" görünür). Sayfadan çıkılınca "ayrıldı" gönderilir.
 */
export function useLiveRoom(roomId: string) {
  const [state, setState] = useState<State>({ room: null, participants: [], messages: [], error: null, lost: false })
  const lastId = useRef<number | null>(null)

  const apply = useCallback((messages: LiveMessage[]) => {
    if (messages.length) lastId.current = Math.max(lastId.current ?? 0, ...messages.map((message) => message.id))
  }, [])

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    lastId.current = null

    const tick = async () => {
      if (!alive) return
      if (document.visibilityState === 'hidden') { timer = setTimeout(tick, POLL_MS); return }
      try {
        const data = await fetchLiveRoom(roomId, lastId.current)
        if (!alive) return
        apply(data.messages)
        setState((previous) => ({
          room: data.room, participants: data.participants, error: null, lost: false,
          messages: mergeMessages(previous.messages, data.messages),
        }))
      } catch (error) {
        if (!alive) return
        const lost = error instanceof ApiError && (error.status === 403 || error.status === 404)
        setState((previous) => ({ ...previous, error: error instanceof Error ? error.message : 'Oda yüklenemedi.', lost }))
        if (lost) return
      }
      timer = setTimeout(tick, POLL_MS)
    }

    const onVisible = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); void tick() } }
    const onLeave = () => { void leaveLiveRoom(roomId) }
    void tick()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onLeave)
    return () => {
      alive = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', onLeave)
      void leaveLiveRoom(roomId)
    }
  }, [roomId, apply])

  const send = useCallback(async (content: string) => {
    const message = await sendLiveMessage(roomId, content)
    apply([message])
    setState((previous) => ({ ...previous, messages: mergeMessages(previous.messages, [message]) }))
  }, [roomId, apply])

  const patchParticipant = useCallback((userId: string, patch: Partial<LiveParticipant> | null) => {
    setState((previous) => ({
      ...previous,
      participants: patch === null
        ? previous.participants.filter((person) => person.user_id !== userId)
        : previous.participants.map((person) => person.user_id === userId ? { ...person, ...patch } : person),
    }))
  }, [])

  return { ...state, send, patchParticipant }
}
