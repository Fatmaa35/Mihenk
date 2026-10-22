import { Check } from 'lucide-react'
import { useUpsertLibraryEntry } from '../../shared/api/queries'
import type { Shelf } from '../../shared/api/types'
import { useToast } from '../../shared/ui'
import { SHELF_LABELS } from './shelves'
import '../catalog/catalog.css'

const CHOICES: Shelf[] = ['to_read', 'reading', 'read']

type ShelfPickerProps = { bookId: string; title: string; current?: Shelf; totalPages?: number | null }

/** Bir kitabı tek dokunuşla rafa koyar; mevcut raf işaretli görünür. */
export function ShelfPicker({ bookId, title, current, totalPages }: ShelfPickerProps) {
  const upsert = useUpsertLibraryEntry()
  const { notify } = useToast()
  const choose = (shelf: Shelf) => {
    if (shelf === current) return
    upsert.mutate(
      { book_id: bookId, shelf, total_pages: totalPages ?? null, current_page: shelf === 'read' && totalPages ? totalPages : 0 },
      {
        onSuccess: () => notify(`“${title}” ${SHELF_LABELS[shelf].toLocaleLowerCase('tr')} rafına eklendi.`, 'success'),
        onError: (error) => notify(error.message, 'error'),
      },
    )
  }
  return (
    <div className="shelf-picker" role="group" aria-label={`${title} için raf seç`}>
      {CHOICES.map((shelf) => {
        const active = shelf === current
        return (
          <button
            key={shelf}
            type="button"
            className={`shelf-picker__option${active ? ' is-active' : ''}`}
            aria-pressed={active}
            disabled={upsert.isPending}
            onClick={() => choose(shelf)}
          >
            {active && <Check size={16} aria-hidden="true" />}
            {SHELF_LABELS[shelf]}
          </button>
        )
      })}
    </div>
  )
}
