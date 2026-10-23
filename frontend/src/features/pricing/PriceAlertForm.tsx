import { FormEvent } from 'react'
import { BellRing } from 'lucide-react'
import { useDeletePriceAlert, usePriceAlerts, useUpsertPriceAlert } from '../../shared/api/alerts'
import { Button, useToast } from '../../shared/ui'
import { formatMoney } from '../../spa/format'

/** Kitap detayında hedef fiyat belirleme; mevcut alarm varsa düzenler veya siler. */
export function PriceAlertForm({ bookId, title, bestPriceMinor }: { bookId: string; title: string; bestPriceMinor: number | null }) {
  const alerts = usePriceAlerts()
  const upsert = useUpsertPriceAlert()
  const remove = useDeletePriceAlert()
  const { notify } = useToast()
  const existing = alerts.data?.find((alert) => alert.book_id === bookId)
  const suggestion = existing ? existing.target_price_minor : bestPriceMinor ? Math.floor(bestPriceMinor * 0.9) : null

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(String(new FormData(event.currentTarget).get('target')).replace(',', '.'))
    upsert.mutate({ book_id: bookId, target_price_minor: Math.round(value * 100) }, {
      onSuccess: () => notify(`“${title}” için fiyat alarmı ${existing ? 'güncellendi' : 'kuruldu'}.`, 'success'),
      onError: (error) => notify(error.message, 'error'),
    })
  }

  return (
    <form className="price-alert-form" onSubmit={submit}>
      <p className="book-detail__muted">
        {existing
          ? `Alarm kurulu: ${formatMoney(existing.target_price_minor, existing.currency)} ve altı.`
          : 'Fiyat hedefinin altına düştüğünde bildirim gönderelim.'}
      </p>
      <div className="price-alert-form__row">
        <label className="visually-hidden" htmlFor={`alert-${bookId}`}>Hedef fiyat (TL)</label>
        <span className="price-alert-form__input">
          <input id={`alert-${bookId}`} name="target" className="mh-input" type="number" min={1} step="0.01" inputMode="decimal" required
            defaultValue={suggestion ? (suggestion / 100).toFixed(2) : ''} placeholder="Hedef fiyat" key={existing?.target_price_minor ?? 'new'} />
          <span aria-hidden="true">TL</span>
        </span>
        <Button type="submit" variant="secondary" size="md" loading={upsert.isPending} icon={<BellRing size={16} aria-hidden="true" />}>
          {existing ? 'Güncelle' : 'Alarm kur'}
        </Button>
        {existing && (
          <Button variant="ghost" size="md" loading={remove.isPending} onClick={() => remove.mutate(bookId, { onSuccess: () => notify('Fiyat alarmı silindi.', 'success') })}>Kaldır</Button>
        )}
      </div>
    </form>
  )
}
