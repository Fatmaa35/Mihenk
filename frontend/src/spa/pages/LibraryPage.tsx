import { useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, Heart, Pencil, Trash2 } from 'lucide-react'
import { BookDetailDialog } from '../../features/catalog/BookDetailDialog'
import { ProgressDialog } from '../../features/library/ProgressDialog'
import { progressOf, SHELF_LABELS } from '../../features/library/shelves'
import { customFields, useRemoveLibraryEntry, useUpsertLibraryEntry } from '../../shared/api/queries'
import type { LibraryBook, Shelf } from '../../shared/api/types'
import { BookCover, Dialog, EmptyState, IconButton, Progress, SegmentedTabs, Button, useToast } from '../../shared/ui'
import { useSession } from '../layout/SessionGate'
import { routes } from '../routes'
import './pages.css'

type Tab = Shelf | 'favorites'

const EMPTY_COPY: Record<Tab, { title: string; description: string }> = {
  reading: { title: 'Şu an okuduğun kitap yok', description: 'Okumaya başladığın kitabı ekle; ilerlemeni buradan takip et.' },
  to_read: { title: 'Okuma listen boş', description: 'Keşfet’te beğendiğin kitapları “Okuyacağım” rafına ekleyebilirsin.' },
  read: { title: 'Henüz bitirdiğin kitap yok', description: 'Bitirdiğin kitaplar burada birikir ve yıllık hedefine sayılır.' },
  abandoned: { title: 'Yarım bıraktığın kitap yok', description: 'Bazen bir kitabı bırakmak da iyi bir karardır.' },
  favorites: { title: 'Favorin yok', description: 'Kalp simgesiyle sevdiğin kitapları işaretle.' },
}

function LibraryRow({ book, onOpen, onProgress, onRemove }: { book: LibraryBook; onOpen: () => void; onProgress: () => void; onRemove: () => void }) {
  const upsert = useUpsertLibraryEntry()
  const { notify } = useToast()
  const update = (changes: Partial<Pick<LibraryBook, 'shelf' | 'is_favorite'>>, message: string) => upsert.mutate(
    { book_id: book.id, shelf: book.shelf, is_favorite: book.is_favorite, current_page: book.current_page, total_pages: book.total_pages, custom: customFields(book), ...changes },
    { onSuccess: () => notify(message, 'success'), onError: (error) => notify(error.message, 'error') },
  )
  const percent = progressOf(book)
  return (
    <li className="library-row">
      <button type="button" className="library-row__open" onClick={onOpen} aria-label={`${book.title} ayrıntıları`}>
        <BookCover id={book.id} title={book.title} author={book.author} coverUrl={book.cover_url} size="sm" />
      </button>
      <div className="library-row__body">
        <h3>{book.title}</h3>
        <p>{book.author} · {book.genre}</p>
        {book.shelf === 'reading' && (
          <div className="library-row__progress">
            <Progress value={percent} label={`${book.title} ilerlemesi`} size="sm" />
            <span>{book.total_pages ? `${book.current_page}/${book.total_pages}` : `%${Math.round(percent)}`}</span>
          </div>
        )}
      </div>
      <div className="library-row__actions">
        {book.shelf === 'reading' && <IconButton label="İlerleme gir" icon={<Pencil size={18} />} onClick={onProgress} />}
        <IconButton
          label={book.is_favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          className="icon-toggle"
          aria-pressed={book.is_favorite}
          icon={<Heart size={18} fill={book.is_favorite ? 'currentColor' : 'none'} />}
          onClick={() => update({ is_favorite: !book.is_favorite }, book.is_favorite ? 'Favorilerden çıkarıldı.' : 'Favorilere eklendi.')}
        />
        <label className="visually-hidden" htmlFor={`shelf-${book.id}`}>{book.title} rafı</label>
        <select
          id={`shelf-${book.id}`}
          value={book.shelf}
          disabled={upsert.isPending}
          onChange={(event) => update({ shelf: event.target.value as Shelf }, `“${book.title}” ${SHELF_LABELS[event.target.value as Shelf].toLocaleLowerCase('tr')} rafına taşındı.`)}
        >
          {(Object.keys(SHELF_LABELS) as Shelf[]).map((shelf) => <option key={shelf} value={shelf}>{SHELF_LABELS[shelf]}</option>)}
        </select>
        <IconButton label="Kitaplıktan kaldır" icon={<Trash2 size={18} />} onClick={onRemove} />
      </div>
    </li>
  )
}

export default function LibraryPage() {
  const { profile } = useSession()
  const [tab, setTab] = useState<Tab>(profile.reading_books.length ? 'reading' : 'to_read')
  const [openBook, setOpenBook] = useState<string | null>(null)
  const [progressBook, setProgressBook] = useState<LibraryBook | null>(null)
  const [removing, setRemoving] = useState<LibraryBook | null>(null)
  const remove = useRemoveLibraryEntry()
  const { notify } = useToast()

  const lists: Record<Tab, LibraryBook[]> = {
    reading: profile.reading_books,
    to_read: profile.to_read_books,
    read: profile.read_books,
    abandoned: profile.abandoned_books,
    favorites: profile.favorite_books,
  }
  const books = lists[tab]

  const confirmRemove = () => {
    if (!removing) return
    remove.mutate(removing, {
      onSuccess: () => { notify(`“${removing.title}” kitaplığından kaldırıldı.`, 'success'); setRemoving(null) },
      onError: (error) => notify(error.message, 'error'),
    })
  }

  return (
    <div className="page library">
      <header className="page-header">
        <div>
          <h1>Kitaplığım</h1>
          <p>Başladığın, sürdürdüğün ve bitirdiğin kitaplar tek yerde.</p>
        </div>
        <Link className="mh-button mh-button--primary mh-button--md" to={routes.discover}>Kitap ekle</Link>
      </header>

      <SegmentedTabs
        label="Raflar"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'reading', label: 'Okuyorum', count: lists.reading.length },
          { value: 'to_read', label: 'Okuyacağım', count: lists.to_read.length },
          { value: 'read', label: 'Okudum', count: lists.read.length },
          { value: 'abandoned', label: 'Bıraktım', count: lists.abandoned.length },
          { value: 'favorites', label: 'Favoriler', count: lists.favorites.length },
        ]}
      />

      <div role="tabpanel" aria-label={tab}>
        {books.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} />}
            title={EMPTY_COPY[tab].title}
            description={EMPTY_COPY[tab].description}
            action={<Link className="mh-button mh-button--secondary mh-button--md" to={routes.discover}>Kitap keşfet</Link>}
          />
        ) : (
          <ul className="library-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {books.map((book) => (
              <LibraryRow
                key={book.id}
                book={book}
                onOpen={() => setOpenBook(book.id)}
                onProgress={() => setProgressBook(book)}
                onRemove={() => setRemoving(book)}
              />
            ))}
          </ul>
        )}
      </div>

      <BookDetailDialog bookId={openBook} onClose={() => setOpenBook(null)} />
      <ProgressDialog book={progressBook} onClose={() => setProgressBook(null)} />
      <Dialog
        open={Boolean(removing)}
        title="Kitaplıktan kaldırılsın mı?"
        size="sm"
        onClose={() => setRemoving(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setRemoving(null)}>Vazgeç</Button>
          <Button variant="danger" loading={remove.isPending} onClick={confirmRemove}>Kaldır</Button>
        </>}
      >
        <p>“{removing?.title}” ve bu kitaptaki ilerleme kaydın kitaplığından silinecek.</p>
      </Dialog>
    </div>
  )
}
