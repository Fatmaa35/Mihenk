import { FormEvent, useState } from 'react'
import { useReportComment } from '../../shared/api/community'
import type { ReportReason } from '../../shared/api/types'
import { Button, Dialog, useToast } from '../../shared/ui'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spoiler', label: 'İşaretlenmemiş spoiler' },
  { value: 'harassment', label: 'Taciz veya hakaret' },
  { value: 'hate', label: 'Nefret söylemi' },
  { value: 'spam', label: 'Spam veya reklam' },
  { value: 'misinformation', label: 'Yanıltıcı bilgi' },
  { value: 'other', label: 'Diğer' },
]

export function ReportDialog({ commentId, onClose }: { commentId: string | null; onClose: () => void }) {
  const report = useReportComment()
  const { notify } = useToast()
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!commentId) return
    const form = new FormData(event.currentTarget)
    const details = String(form.get('details') ?? '').trim()
    report.mutate(
      { commentId, reason: form.get('reason') as ReportReason, details: details || null },
      {
        onSuccess: () => { notify('Şikâyetin inceleme kuyruğuna alındı. Teşekkürler.', 'success'); onClose() },
        onError: (failure) => setError(failure.message),
      },
    )
  }
  return (
    <Dialog open={Boolean(commentId)} title="Yorumu şikâyet et" size="sm" onClose={() => { setError(''); onClose() }}>
      <form className="report-form" onSubmit={submit}>
        <fieldset className="report-form__reasons">
          <legend>Neden?</legend>
          {REASONS.map((reason, index) => (
            <label key={reason.value} className="radio-row">
              <input type="radio" name="reason" value={reason.value} defaultChecked={index === 0} required />
              {reason.label}
            </label>
          ))}
        </fieldset>
        <label className="mh-field">
          <span>Ek açıklama (isteğe bağlı)</span>
          <textarea className="mh-input mh-textarea" name="details" maxLength={500} rows={3} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="progress-form__actions">
          <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" loading={report.isPending}>Gönder</Button>
        </div>
      </form>
    </Dialog>
  )
}
