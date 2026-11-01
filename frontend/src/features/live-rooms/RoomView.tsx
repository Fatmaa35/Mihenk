import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Crown, DoorClosed, Send, Share2, UserMinus } from 'lucide-react'
import { closeLiveRoom, removeLiveMember, setLiveStatus } from '../../shared/api/liveRooms'
import type { LiveMessage, LiveParticipant, LiveRoom } from '../../shared/api/types'
import { Button, Dialog, ErrorState, IconButton, Spinner, useToast } from '../../shared/ui'
import { initials } from '../../spa/format'
import { routes } from '../../spa/routes'
import { useSession } from '../../spa/layout/SessionGate'
import { useLiveRoom } from './useLiveRoom'
import './live-rooms.css'

export const PURPOSE_LABEL = { reading: 'Kitap okuma', study: 'Ders çalışma', other: 'Birlikte odaklanma' } as const

const clock = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

export function inviteLink(room: LiveRoom) {
  return `${window.location.origin}${routes.liveRooms}?davet=${room.invite_code}`
}

function InviteButton({ room }: { room: LiveRoom }) {
  const { notify } = useToast()
  const share = async () => {
    const url = inviteLink(room)
    const text = `Mihenk'te “${room.title}” odasına gel, birlikte ${room.purpose === 'study' ? 'çalışalım' : 'okuyalım'}.`
    try {
      if (navigator.share) { await navigator.share({ title: room.title, text, url }); return }
      await navigator.clipboard.writeText(url)
      notify('Davet bağlantısı kopyalandı.', 'success')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      notify(`Davet kodu: ${room.invite_code}`, 'info')
    }
  }
  return <Button variant="secondary" size="sm" icon={<Share2 size={16} aria-hidden="true" />} onClick={() => void share()}>Davet et</Button>
}

function Participants({ room, people, meId, onRemove }: { room: LiveRoom; people: LiveParticipant[]; meId: string; onRemove: (person: LiveParticipant) => void }) {
  const here = people.filter((person) => person.present).length
  return (
    <section className="live-people" aria-labelledby="live-people-title">
      <h2 id="live-people-title">Odadakiler <span>{here} / {people.length}</span></h2>
      <ul>
        {people.map((person) => (
          <li key={person.user_id} className={person.present ? 'is-here' : 'is-away'}>
            <span className="live-avatar" aria-hidden="true">{initials(person.display_name)}<i /></span>
            <span className="live-person">
              <strong>
                {person.display_name}{person.user_id === meId ? ' (sen)' : ''}
                {person.role === 'owner' && <Crown size={14} aria-label="Odayı açan" />}
              </strong>
              <small>{person.present ? (person.status_text || 'Odada') : 'Şu an odada değil'}</small>
            </span>
            {room.role === 'owner' && person.user_id !== meId && !room.closed && (
              <IconButton label={`${person.display_name} kişisini odadan çıkar`} icon={<UserMinus size={16} />} onClick={() => onRemove(person)} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function StatusForm({ roomId, current, onSaved }: { roomId: string; current: string | null; onSaved: (text: string | null) => void }) {
  const { profile } = useSession()
  const { notify } = useToast()
  const [text, setText] = useState(current ?? '')
  const reading = profile.reading_books[0]
  const suggestion = reading ? `${reading.title}${reading.current_page ? `, s. ${reading.current_page}` : ''}` : null
  const save = async (value: string) => {
    try {
      const saved = await setLiveStatus(roomId, value.trim() || null)
      setText(saved.status_text ?? '')
      onSaved(saved.status_text)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Kaydedilemedi.', 'error')
    }
  }
  return (
    <form className="live-status" onSubmit={(event) => { event.preventDefault(); void save(text) }}>
      <label htmlFor="live-status-input">Şu an ne yapıyorsun?</label>
      <div>
        <input id="live-status-input" className="mh-input" value={text} maxLength={80} onChange={(event) => setText(event.target.value)}
          placeholder="Örn. Fizik, 3. ünite" />
        <Button type="submit" size="sm" variant="secondary">Kaydet</Button>
      </div>
      {suggestion && !text && <button type="button" className="live-chip" onClick={() => void save(suggestion)}>{suggestion}</button>}
    </form>
  )
}

function Chat({ messages, meId, disabled, onSend }: { messages: LiveMessage[]; meId: string; disabled: boolean; onSend: (text: string) => Promise<void> }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const { notify } = useToast()
  const listRef = useRef<HTMLOListElement>(null)
  const stick = useRef(true)

  // Kişi yukarı kaydırıp eski mesajları okurken aşağı çekilmez; en alttaysa yeni mesajı görür.
  useLayoutEffect(() => {
    const list = listRef.current
    if (list && stick.current) list.scrollTop = list.scrollHeight
  }, [messages])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await onSend(text)
      setDraft('')
      stick.current = true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Mesaj gönderilemedi.', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="live-chat" aria-labelledby="live-chat-title">
      <h2 id="live-chat-title" className="visually-hidden">Sohbet</h2>
      <ol ref={listRef} className="live-messages" aria-live="polite"
        onScroll={(event) => { const el = event.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }}>
        {messages.length === 0 && <li className="live-empty">Henüz mesaj yok. Bir selam ver.</li>}
        {messages.map((message) => message.kind === 'text' ? (
          <li key={message.id} className={message.user_id === meId ? 'live-msg is-mine' : 'live-msg'}>
            {message.user_id !== meId && <strong>{message.display_name}</strong>}
            <p>{message.content}</p>
            <time dateTime={message.created_at}>{clock(message.created_at)}</time>
          </li>
        ) : (
          <li key={message.id} className="live-event">{message.display_name} {message.content} · {clock(message.created_at)}</li>
        ))}
      </ol>
      <form className="live-compose" onSubmit={(event) => void submit(event)}>
        <label htmlFor="live-compose-input" className="visually-hidden">Mesaj</label>
        <input id="live-compose-input" className="mh-input" value={draft} maxLength={500} disabled={disabled}
          placeholder={disabled ? 'Oda kapatıldı' : 'Mesaj yaz…'} onChange={(event) => setDraft(event.target.value)} autoComplete="off" />
        <Button type="submit" loading={sending} disabled={disabled || !draft.trim()} icon={<Send size={16} aria-hidden="true" />}>Gönder</Button>
      </form>
    </section>
  )
}

/** Tek bir canlı oda: üstte başlık ve davet, solda (telefonda üstte) katılımcılar, yanında sohbet. */
export function RoomView({ roomId }: { roomId: string }) {
  const { user } = useSession()
  const { notify } = useToast()
  const live = useLiveRoom(roomId)
  const [removing, setRemoving] = useState<LiveParticipant | null>(null)
  const [closing, setClosing] = useState(false)
  const title = live.room?.title

  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} · Mihenk`
    return () => { document.title = previous }
  }, [title])

  if (live.lost) {
    return <ErrorState title="Bu odaya giremiyorsun" message={live.error ?? 'Oda bulunamadı.'} />
  }
  if (!live.room) return live.error ? <ErrorState message={live.error} /> : <Spinner />
  const room = live.room
  const me = live.participants.find((person) => person.user_id === user.id)

  const remove = async () => {
    if (!removing) return
    try {
      await removeLiveMember(room.id, removing.user_id)
      live.patchParticipant(removing.user_id, null)
      notify(`${removing.display_name} odadan çıkarıldı.`, 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Çıkarılamadı.', 'error')
    }
    setRemoving(null)
  }
  const close = async () => {
    try {
      await closeLiveRoom(room.id)
      notify('Oda kapatıldı.', 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Oda kapatılamadı.', 'error')
    }
    setClosing(false)
  }

  return (
    <div className="page live-room">
      <header className="live-room__header">
        <Link to={routes.liveRooms} className="live-back"><ArrowLeft size={16} aria-hidden="true" /> Odalar</Link>
        <div className="live-room__title">
          <span className="live-pill">{PURPOSE_LABEL[room.purpose]}</span>
          <h1>{room.title}</h1>
        </div>
        <div className="live-room__actions">
          {!room.closed && <InviteButton room={room} />}
          {room.role === 'owner' && !room.closed && (
            <Button variant="ghost" size="sm" icon={<DoorClosed size={16} aria-hidden="true" />} onClick={() => setClosing(true)}>Odayı kapat</Button>
          )}
        </div>
      </header>
      {room.closed && <p className="live-closed" role="status">Bu oda kapatıldı. Eski mesajları okuyabilirsin.</p>}
      {live.error && !live.lost && <p className="live-offline" role="status">Bağlantı koptu, yeniden deneniyor…</p>}
      <div className="live-room__body">
        <aside className="live-room__side">
          <Participants room={room} people={live.participants} meId={user.id} onRemove={setRemoving} />
          {!room.closed && me && (
            <StatusForm key={me.user_id} roomId={room.id} current={me.status_text}
              onSaved={(text) => live.patchParticipant(user.id, { status_text: text })} />
          )}
        </aside>
        <Chat messages={live.messages} meId={user.id} disabled={room.closed} onSend={live.send} />
      </div>
      <Dialog open={Boolean(removing)} title="Odadan çıkarılsın mı?" onClose={() => setRemoving(null)} size="sm"
        footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Vazgeç</Button><Button variant="danger" onClick={() => void remove()}>Çıkar</Button></>}>
        <p>{removing?.display_name} bu odaya bir daha giremez.</p>
      </Dialog>
      <Dialog open={closing} title="Oda kapatılsın mı?" onClose={() => setClosing(false)} size="sm"
        footer={<><Button variant="ghost" onClick={() => setClosing(false)}>Vazgeç</Button><Button variant="danger" onClick={() => void close()}>Kapat</Button></>}>
        <p>Kimse yeni mesaj yazamaz ve davet bağlantısı çalışmaz. Odadakiler eski mesajları görmeye devam eder.</p>
      </Dialog>
    </div>
  )
}
