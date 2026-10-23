import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useCommentReports, useResolveReport } from '../../shared/api/admin'
import { Button, EmptyState, ErrorState, SegmentedTabs, Skeleton, useToast } from '../../shared/ui'
import { formatRelative } from '../../spa/format'
import { StatusChip } from './Stat'

const REASONS: Record<string, string> = {
  spoiler: 'İşaretlenmemiş spoiler', harassment: 'Taciz / hakaret', hate: 'Nefret söylemi', spam: 'Spam', misinformation: 'Yanıltıcı bilgi', other: 'Diğer',
}

export function ReportsTab() {
  const [status, setStatus] = useState<'open' | 'reviewing' | ''>('open')
  const reports = useCommentReports(status)
  const resolve = useResolveReport()
  const { notify } = useToast()
  const act = (id: number, next: 'reviewing' | 'resolved' | 'dismissed', comment: 'published' | 'hidden' | 'removed' | null, message: string) =>
    resolve.mutate({ id, status: next, comment_status: comment }, { onSuccess: () => notify(message, 'success'), onError: (error) => notify(error.message, 'error') })

  return (
    <div className="admin-stack">
      <SegmentedTabs label="Şikâyet durumu" value={status} onChange={setStatus}
        options={[{ value: 'open', label: 'Açık' }, { value: 'reviewing', label: 'İncelenen' }, { value: '', label: 'Tümü' }]} />
      {reports.isPending && <Skeleton height={160} />}
      {reports.isError && <ErrorState message={reports.error.message} onRetry={() => reports.refetch()} />}
      {reports.data?.length === 0 && <EmptyState icon={<ShieldCheck size={28} />} title="Bekleyen şikâyet yok" description="Okurların bildirdiği yorumlar burada incelemeye düşer." />}
      <ul className="admin-reports">
        {reports.data?.map((report) => (
          <li key={report.id} className="admin-report">
            <div className="admin-list__row">
              <StatusChip status={report.status} />
              <strong>{REASONS[report.reason] ?? report.reason}</strong>
              <time>{formatRelative(report.created_at)} · {report.reporter_name}</time>
            </div>
            <blockquote>{report.content}</blockquote>
            {report.details && <p className="today__muted">Not: {report.details}</p>}
            {(report.status === 'open' || report.status === 'reviewing') && (
              <div className="admin-report__actions">
                <Button size="sm" variant="danger" disabled={resolve.isPending} onClick={() => act(report.id, 'resolved', 'removed', 'Yorum kaldırıldı.')}>Yorumu kaldır</Button>
                <Button size="sm" variant="secondary" disabled={resolve.isPending} onClick={() => act(report.id, 'resolved', 'hidden', 'Yorum gizlendi.')}>Gizle</Button>
                <Button size="sm" variant="ghost" disabled={resolve.isPending} onClick={() => act(report.id, 'dismissed', 'published', 'Şikâyet reddedildi; yorum yayında kaldı.')}>Reddet</Button>
                {report.status === 'open' && <Button size="sm" variant="ghost" disabled={resolve.isPending} onClick={() => act(report.id, 'reviewing', null, 'İncelemeye alındı.')}>İncelemeye al</Button>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
