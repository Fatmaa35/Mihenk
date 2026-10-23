import { FlaskConical } from 'lucide-react'
import { useQualityDashboard, useRunEvaluation } from '../../shared/api/admin'
import { Button, ErrorState } from '../../shared/ui'
import { BarList, Panel, Stat, StatusChip } from './Stat'

const FEEDBACK: Record<string, string> = { like: 'Beğendi', dislike: 'Beğenmedi', not_interested: 'İlgilenmiyor', already_read: 'Zaten okumuş', saved: 'Kaydetti' }

export function QualityTab() {
  const quality = useQualityDashboard()
  const evaluation = useRunEvaluation()
  const q = quality.data
  return (
    <div className="admin-stack">
      <div className="admin-stats">
        <Stat label="Sonuçsuz arama" value={q?.zero_result_queries ?? '—'} tone="peach" />
        <Stat label="Yedek akışa düşme" value={q ? `%${Math.round(q.fallback_rate)}` : '—'} hint="Yapay zekâ yerine katalog sıralaması" tone="butter" />
        <Stat label="Ortalama öneri süresi" value={q ? `${Math.round(q.average_latency_ms)} ms` : '—'} tone="lilac" />
      </div>
      <div className="admin-grid">
        <Panel title="Öneri geri bildirimleri">
          <BarList empty="Henüz öneri tepkisi yok." rows={Object.entries(q?.feedback ?? {}).map(([key, value]) => ({ label: FEEDBACK[key] ?? key, value }))} />
        </Panel>
        <Panel
          title="Öneri regresyon testi"
          action={<Button variant="secondary" icon={<FlaskConical size={16} aria-hidden="true" />} loading={evaluation.isPending} onClick={() => evaluation.mutate()}>Testleri çalıştır</Button>}
        >
          {evaluation.isError && <ErrorState message={evaluation.error.message} />}
          {!evaluation.data && !evaluation.isPending && <p className="today__muted">Örnek sorgularla öneri motorunun beklenen kitapları bulup bulmadığını kontrol eder.</p>}
          {evaluation.data && (
            <>
              <p className="admin-eval-summary">
                <strong>{evaluation.data.summary.passed}/{evaluation.data.summary.cases}</strong> senaryo geçti
                {evaluation.data.summary.violation_count ? ` · ${evaluation.data.summary.violation_count} kural ihlali` : ''}
              </p>
              <ul className="admin-list">
                {evaluation.data.results.map((result) => (
                  <li key={result.id}>
                    <div className="admin-list__row"><StatusChip status={result.passed ? 'succeeded' : 'failed'} /><strong>{result.query}</strong></div>
                    <p className="today__muted">{result.titles.slice(0, 4).join(' · ')}</p>
                    {result.constraint_violations.length > 0 && <p className="admin-error-text">{result.constraint_violations.join(' · ')}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
