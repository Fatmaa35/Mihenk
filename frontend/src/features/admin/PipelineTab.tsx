import { useState } from 'react'
import { Play } from 'lucide-react'
import { usePipelineLogs, usePipelineRuns, useQualityDashboard, useRunPricePipeline } from '../../shared/api/admin'
import { Button, ErrorState, Skeleton, useToast } from '../../shared/ui'
import { formatRelative } from '../../spa/format'
import { Panel, Stat, StatusChip } from './Stat'

function duration(start: string, end: string | null) {
  if (!end) return 'sürüyor'
  const seconds = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 1000))
  return seconds < 60 ? `${seconds} sn` : `${Math.round(seconds / 60)} dk`
}

export function PipelineTab() {
  const quality = useQualityDashboard()
  const runs = usePipelineRuns()
  const [runId, setRunId] = useState('')
  const logs = usePipelineLogs(runId)
  const run = useRunPricePipeline()
  const { notify } = useToast()

  return (
    <div className="admin-stack">
      <div className="admin-stats">
        <Stat label="Fiyatı olan kitap" value={quality.data?.priced_books ?? '—'} tone="mint" />
        <Stat label="Aktif teklif" value={quality.data?.offers ?? '—'} tone="lilac" />
        <Stat label="Son fiyat kontrolü" value={quality.data?.last_price_check ? formatRelative(quality.data.last_price_check) : 'Hiç'} tone="butter" />
      </div>
      <Panel
        title="Çalışmalar"
        action={<Button icon={<Play size={16} aria-hidden="true" />} loading={run.isPending}
          onClick={() => run.mutate(undefined, { onSuccess: () => notify('Fiyat hattı arka planda başlatıldı; birkaç dakika içinde listede görünür.', 'success'), onError: (error) => notify(error.message, 'error') })}>
          Şimdi çalıştır
        </Button>}
      >
        {runs.isPending && <Skeleton height={120} />}
        {runs.isError && <ErrorState message={runs.error.message} onRetry={() => runs.refetch()} />}
        {runs.data?.length === 0 && <p className="today__muted">Henüz çalışma yok. Zamanlanmış görev ya da “Şimdi çalıştır” ile başlar.</p>}
        {!!runs.data?.length && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">Durum</th><th scope="col">Tür</th><th scope="col">Başlangıç</th><th scope="col">Süre</th><th scope="col">Sonuç</th><th scope="col"><span className="visually-hidden">Kayıtlar</span></th></tr></thead>
              <tbody>
                {runs.data.map((item) => (
                  <tr key={item.id} className={runId === item.id ? 'is-selected' : undefined}>
                    <td><StatusChip status={item.status} /></td>
                    <td>{item.job_type === 'price_refresh' ? 'Fiyat yenileme' : 'Tahmin'} · {item.trigger_kind}</td>
                    <td>{formatRelative(item.started_at)}</td>
                    <td>{duration(item.started_at, item.finished_at)}</td>
                    <td>{item.success_count}/{item.checked_count} başarılı{item.failure_count ? ` · ${item.failure_count} hata` : ''}</td>
                    <td><Button size="sm" variant="ghost" onClick={() => setRunId(runId === item.id ? '' : item.id)}>{runId === item.id ? 'Tümü' : 'Kayıtlar'}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title={runId ? 'Seçili çalışmanın kayıtları' : 'Son kayıtlar'}>
        {logs.data?.length === 0 && <p className="today__muted">Kayıt yok.</p>}
        <ul className="admin-log">
          {logs.data?.map((log) => (
            <li key={log.id}><StatusChip status={log.level} /><code>{log.stage}</code><span>{log.message}</span><time>{formatRelative(log.created_at)}</time></li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
