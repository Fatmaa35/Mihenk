import { FormEvent } from 'react'
import { useCatalogIssues, useCatalogJobs, useCreateCatalogJob, useQualityDashboard, useResolveIssue } from '../../shared/api/admin'
import { Button, ErrorState, Skeleton, useToast } from '../../shared/ui'
import { formatRelative } from '../../spa/format'
import { Panel, Stat, StatusChip } from './Stat'

const JOB_TYPES: Record<string, string> = {
  quality_scan: 'Kalite taraması', metadata_refresh: 'Künye yenileme', google_books_import: 'Google Books içe aktarma', open_library_import: 'Open Library içe aktarma',
}
const ISSUE_TYPES: Record<string, string> = {
  missing_cover: 'Kapak eksik', missing_description: 'Açıklama eksik', duplicate_work: 'Olası kopya', low_quality: 'Düşük kalite', suspicious: 'Şüpheli kayıt',
}

export function CatalogTab() {
  const quality = useQualityDashboard()
  const jobs = useCatalogJobs()
  const issues = useCatalogIssues()
  const create = useCreateCatalogJob()
  const resolve = useResolveIssue()
  const { notify } = useToast()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const query = String(form.get('query') ?? '').trim()
    create.mutate(
      { job_type: String(form.get('job_type')), query: query || null, limit: Number(form.get('limit')) },
      { onSuccess: () => notify('İş kuyruğa eklendi. Arka plan işleyicisi çalıştığında işlenecek.', 'success'), onError: (error) => notify(error.message, 'error') },
    )
  }
  const q = quality.data
  const openIssues = issues.data?.filter((issue) => issue.status === 'open') ?? []

  return (
    <div className="admin-stack">
      <div className="admin-stats">
        {q ? (
          <>
            <Stat label="Öneriye uygun" value={`${q.recommendable_books}/${q.books}`} hint={`${q.low_quality_books} düşük kalite`} tone="mint" />
            <Stat label="Kapak eksik" value={q.missing_covers} tone="peach" />
            <Stat label="Doğrulanmış Türkçe baskı" value={q.verified_turkish_editions} hint={`${q.editions} baskı kaydı`} tone="lilac" />
            <Stat label="Şüpheli / kopya" value={q.suspicious_records + q.duplicate_work_groups} tone="butter" />
          </>
        ) : [0, 1, 2, 3].map((index) => <Skeleton key={index} height={130} radius={26} />)}
      </div>
      <div className="admin-grid">
        <Panel title="Katalog işi başlat">
          <form className="settings-form" onSubmit={submit}>
            <div className="settings-grid">
              <label className="mh-field"><span>İş türü</span>
                <select className="mh-input" name="job_type" defaultValue="quality_scan">
                  {Object.entries(JOB_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="mh-field"><span>Arama (içe aktarmada)</span><input className="mh-input" name="query" maxLength={200} placeholder="ör. Sabahattin Ali" /></label>
              <label className="mh-field"><span>Kayıt sınırı</span><input className="mh-input" name="limit" type="number" min={1} max={200} defaultValue={30} /></label>
            </div>
            <div><Button type="submit" loading={create.isPending}>Kuyruğa ekle</Button></div>
          </form>
          <h3 className="admin-subhead">Son işler</h3>
          {jobs.isError && <ErrorState message={jobs.error.message} />}
          {jobs.data?.length === 0 && <p className="today__muted">Henüz katalog işi yok.</p>}
          <ul className="admin-list">
            {jobs.data?.slice(0, 10).map((job) => (
              <li key={job.id}>
                <div className="admin-list__row">
                  <StatusChip status={job.status} />
                  <strong>{JOB_TYPES[job.job_type] ?? job.job_type}</strong>
                  <time>{formatRelative(job.created_at)} · deneme {job.attempts}/{job.max_attempts}</time>
                </div>
                {job.last_error && <p className="admin-error-text">{job.last_error}</p>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={`İnceleme kuyruğu · ${openIssues.length} açık`}>
          {issues.isPending && <Skeleton height={160} />}
          {issues.isError && <ErrorState message={issues.error.message} onRetry={() => issues.refetch()} />}
          {issues.data && openIssues.length === 0 && <p className="today__muted">Açık katalog sorunu yok.</p>}
          <ul className="admin-list">
            {openIssues.slice(0, 25).map((issue) => (
              <li key={issue.id}>
                <div className="admin-list__row">
                  <StatusChip status={issue.severity} />
                  <strong>{issue.title}</strong>
                  <span className="today__muted">{issue.author}</span>
                </div>
                <div className="admin-list__row">
                  <span>{ISSUE_TYPES[issue.issue_type] ?? issue.issue_type} · kalite {Math.round(issue.quality_score * 100)}</span>
                  <span className="admin-list__actions">
                    <Button size="sm" variant="secondary" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: issue.id, status: 'resolved' })}>Çözüldü</Button>
                    <Button size="sm" variant="ghost" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: issue.id, status: 'dismissed' })}>Yoksay</Button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
