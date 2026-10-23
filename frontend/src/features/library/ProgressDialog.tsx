import { FormEvent, useState } from 'react'
import { customFields, useUpsertLibraryEntry } from '../../shared/api/queries'
import type { LibraryBook } from '../../shared/api/types'
import { Button, Dialog, useToast } from '../../shared/ui'
import '../catalog/catalog.css'

type ProgressDialogProps = { book: LibraryBook | null; onClose: () => void }

export function ProgressDialog({ book, onClose }: ProgressDialogProps) {
  const upsert = useUpsertLibraryEntry()
  const { notify } = useToast()
  const [error, setError] = useState('')

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!book) return
    const form = new FormData(event.currentTarget)
    const totalRaw = String(form.get('total_pages') ?? '').trim()
    const total = totalRaw ? Number(totalRaw) : null
    const current = Number(form.get('current_page') ?? 0)
    if (total !== null && current > total) {
      setError('Bulunduğun sayfa toplam sayfa sayısından büyük olamaz.')
      return
    }
    const finished = total !== null && current === total
    upsert.mutate(
      { book_id: book.id, shelf: finished ? 'read' : 'reading', is_favorite: book.is_favorite, current_page: current, total_pages: total, custom: customFields(book) },
      {
        onSuccess: () => {
          notify(finished ? `Tebrikler! “${book.title}” okudukların rafına taşındı.` : 'İlerlemen kaydedildi.', 'success')
          onClose()
        },
        onError: (failure) => setError(failure.message),
      },
    )
  }

  return (
    <Dialog open={Boolean(book)} title={book ? `${book.title} · ilerleme` : ''} onClose={() => { setError(''); onClose() }} size="sm">
      {book && (
        <form className="progress-form" onSubmit={save}>
          <div className="progress-form__row">
            <label className="mh-field">
              <span>Bulunduğun sayfa</span>
              <input className="mh-input" name="current_page" type="number" inputMode="numeric" min={0} max={100000} defaultValue={book.current_page} required autoFocus />
            </label>
            <label className="mh-field">
              <span>Toplam sayfa</span>
              <input className="mh-input" name="total_pages" type="number" inputMode="numeric" min={1} max={100000} defaultValue={book.total_pages ?? book.page_count ?? ''} />
            </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="progress-form__actions">
            <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
            <Button type="submit" loading={upsert.isPending}>Kaydet</Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
