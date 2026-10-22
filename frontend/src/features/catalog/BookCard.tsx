import { Plus } from 'lucide-react'
import type { Book, Shelf } from '../../shared/api/types'
import { BookCover } from '../../shared/ui'
import { SHELF_LABELS } from '../library/shelves'
import './catalog.css'

type BookCardProps = {
  book: Pick<Book, 'id' | 'title' | 'author' | 'genre' | 'cover_url'>
  reason?: string
  shelf?: Shelf
  onOpen: (id: string) => void
  onQuickAdd?: (id: string) => void
}

/** Katalog ve öneri ızgaralarındaki kitap kartı: tek ana eylem (detayı aç) + tek hızlı eylem. */
export function BookCard({ book, reason, shelf, onOpen, onQuickAdd }: BookCardProps) {
  return (
    <article className="book-card">
      <button type="button" className="book-card__open" onClick={() => onOpen(book.id)} aria-label={`${book.title} ayrıntılarını aç`}>
        <BookCover id={book.id} title={book.title} author={book.author} coverUrl={book.cover_url} size="fill" />
      </button>
      <div className="book-card__meta">
        <h3 className="book-card__title">{book.title}</h3>
        <p className="book-card__author">{book.author}</p>
        {reason && <p className="mh-chip book-card__reason">{reason}</p>}
      </div>
      <div className="book-card__footer">
        {shelf ? (
          <span className="mh-chip mh-chip--muted">{SHELF_LABELS[shelf]}</span>
        ) : onQuickAdd ? (
          <button type="button" className="book-card__quick" onClick={() => onQuickAdd(book.id)}>
            <Plus size={16} aria-hidden="true" /> Okuyacağım
          </button>
        ) : null}
      </div>
    </article>
  )
}
