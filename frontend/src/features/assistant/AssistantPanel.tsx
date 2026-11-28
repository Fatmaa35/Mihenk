import { FormEvent, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { Plus, Send, Trash2, X } from 'lucide-react'
import {
  useChatMessages, useChatSessions, useDeleteChatSession, useExecuteChatAction, useSendChat,
} from '../../shared/api/assistant'
import { useBootstrap } from '../../shared/api/queries'
import type { ChatAction, ChatBook, ChatMessage } from '../../shared/api/types'
import { Button, Dialog, IconButton, useToast } from '../../shared/ui'
import { activeViewFor } from '../../spa/routes'
import { BookDetailDialog } from '../catalog/BookDetailDialog'

const GREETING: ChatMessage = {
  role: 'assistant',
  content: 'Merhaba! Kitaplar, yazarlar ve edebî kavramlar hakkında konuşabilir, kitaplığına göre öneri yapabilir ve okuma yolculuğuna eşlik edebilirim.',
}
const STARTERS = ['Kısa ve atmosferik bir roman öner', 'Şu an ne okuyorum?', 'Yıllık hedefim nasıl gidiyor?', 'Roman ile novella farkı nedir?']

function Message({ message, onOpenBook }: { message: ChatMessage; onOpenBook: (id: string) => void }) {
  return (
    <li className={`chat-message chat-message--${message.role}`}>
      <p>{message.content}</p>
      {!!message.books?.length && (
        <ul className="chat-message__books">
          {message.books.map((book) => (
            <li key={book.id}>
              <button type="button" onClick={() => onOpenBook(book.id)}>
                <strong>{book.title}</strong><span>{book.author}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation()
  const session = useBootstrap()
  const sessions = useChatSessions(open)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const stored = useChatMessages(sessionId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS)
  const [pendingAction, setPendingAction] = useState<ChatAction | null>(null)
  const [openBook, setOpenBook] = useState<string | null>(null)
  const send = useSendChat()
  const execute = useExecuteChatAction()
  const remove = useDeleteChatSession()
  const { notify } = useToast()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLOListElement>(null)

  // Seçilen eski konuşmanın mesajları geldiğinde ekrana yükle.
  useEffect(() => { if (sessionId && stored.data) setMessages(stored.data) }, [sessionId, stored.data])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages, send.isPending])
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pendingAction && !openBook) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, pendingAction, openBook])

  const contextBooks = (): Pick<ChatBook, 'id' | 'title' | 'author' | 'genre'>[] => {
    const profile = session.data?.profile
    if (!profile || activeViewFor(location.pathname) !== 'library') return []
    return [...profile.reading_books, ...profile.to_read_books].map(({ id, title, author, genre }) => ({ id, title, author, genre }))
  }

  const startNew = () => {
    setSessionId(null)
    setMessages([])
    setSuggestions(STARTERS)
    inputRef.current?.focus()
  }

  const ask = (raw: string) => {
    const text = raw.trim()
    if (text.length < 2 || send.isPending) return
    const history = messages
    setMessages((current) => [...current, { role: 'user', content: text }])
    setSuggestions([])
    if (inputRef.current) inputRef.current.value = ''
    send.mutate(
      { message: text, history, sessionId, view: activeViewFor(location.pathname), books: contextBooks() },
      {
        onSuccess: (reply) => {
          if (reply.session_id) setSessionId(reply.session_id)
          setMessages((current) => [...current, { role: 'assistant', content: reply.answer || 'Yanıt oluşturulamadı.', books: reply.books }])
          setSuggestions(reply.suggestions)
          if (reply.pending_action) setPendingAction(reply.pending_action)
        },
        onError: (error) => {
          const message = error.name === 'AbortError' || /zaman aşımı/i.test(error.message) ? 'Yanıt çok uzun sürdü. Tekrar dener misin?' : error.message
          setMessages((current) => [...current, { role: 'assistant', content: message }])
          setSuggestions(['Tekrar dene'])
        },
      },
    )
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    ask(inputRef.current?.value ?? '')
  }

  const confirmAction = () => {
    if (!pendingAction) return
    execute.mutate(pendingAction, {
      onSuccess: () => {
        setMessages((current) => [...current, { role: 'assistant', content: `Tamam, “${pendingAction.book_title}” için işlemi tamamladım.` }])
        notify('Asistan işlemi tamamladı.', 'success')
        setPendingAction(null)
      },
      onError: (error) => notify(error.message, 'error'),
    })
  }

  const deleteSession = () => {
    if (!sessionId) return
    remove.mutate(sessionId, { onSuccess: () => { startNew(); notify('Konuşma silindi.', 'success') }, onError: (error) => notify(error.message, 'error') })
  }

  const shown = messages.length ? messages : [GREETING]

  return (
    <>
      <aside id="assistant-panel" className={`assistant${open ? ' is-open' : ''}`} aria-label="Kitap asistanı" hidden={!open}>
        <header className="assistant__head">
          <div>
            <h2>Kitap asistanı</h2>
            <label className="visually-hidden" htmlFor="assistant-session">Konuşma</label>
            <select
              id="assistant-session"
              className="assistant__session"
              value={sessionId ?? ''}
              onChange={(event) => (event.target.value ? setSessionId(event.target.value) : startNew())}
            >
              <option value="">Yeni konuşma</option>
              {sessions.data?.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </div>
          <div className="assistant__tools">
            <IconButton label="Yeni konuşma" icon={<Plus size={18} />} onClick={startNew} />
            {sessionId && <IconButton label="Bu konuşmayı sil" icon={<Trash2 size={18} />} onClick={deleteSession} disabled={remove.isPending} />}
            <IconButton label="Asistanı kapat" icon={<X size={20} />} onClick={onClose} />
          </div>
        </header>

        <ol className="assistant__messages" ref={listRef} aria-live="polite">
          {shown.map((message, index) => <Message key={`${index}-${message.role}`} message={message} onOpenBook={setOpenBook} />)}
          {send.isPending && <li className="chat-message chat-message--assistant chat-message--typing" role="status">Mihenk düşünüyor…</li>}
        </ol>

        {suggestions.length > 0 && !send.isPending && (
          <div className="assistant__suggestions" aria-label="Önerilen sorular">
            {suggestions.slice(0, 4).map((text) => (
              <button key={text} type="button" onClick={() => ask(text === 'Tekrar dene' ? [...messages].reverse().find((item) => item.role === 'user')?.content ?? '' : text)}>{text}</button>
            ))}
          </div>
        )}

        <form className="assistant__form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="assistant-input">Asistana yaz</label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            rows={2}
            maxLength={1000}
            placeholder="Bir soru sor ya da kitap iste…"
            disabled={send.isPending}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); ask(event.currentTarget.value) }
            }}
          />
          <IconButton type="submit" label="Gönder" variant="secondary" icon={<Send size={18} />} disabled={send.isPending} />
        </form>
      </aside>

      <Dialog
        open={Boolean(pendingAction)}
        title="Asistan bir işlem öneriyor"
        size="sm"
        onClose={() => setPendingAction(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setPendingAction(null)}>Vazgeç</Button>
          <Button loading={execute.isPending} onClick={confirmAction}>Onayla</Button>
        </>}
      >
        {pendingAction && (
          <dl className="action-preview">
            <div><dt>Kitap</dt><dd>{pendingAction.book_title}</dd></div>
            <div><dt>İşlem</dt><dd>{pendingAction.confirmation}</dd></div>
          </dl>
        )}
      </Dialog>
      <BookDetailDialog bookId={openBook} onClose={() => setOpenBook(null)} />
    </>
  )
}
