import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAdminDashboard, useAdminMetrics, useBetaDashboard, useQualityDashboard, useRecommendationFunnel, useSystemLogs } from '../../shared/api/admin'
import { ErrorState, Skeleton } from '../../shared/ui'
import { formatRelative } from '../../spa/format'
import { BarList, Panel, Stat, StatusChip } from './Stat'

const EVENT_LABELS: Record<string, string> = {
  session_started: 'Oturum başlatma', view_opened: 'Ekran açma', onboarding_started: 'Kuruluma başlama', onboarding_completed: 'Kurulumu bitirme',
  recommendation_requested: 'Öneri isteme', book_added: 'Kitap ekleme', reading_session_saved: 'Okuma seansı',
}
const FEEDBACK_LABELS: Record<string, string> = { bug: 'Hata', usability: 'Kullanım', idea: 'Fikir', content: 'İçerik', other: 'Diğer' }
const percent = (value: number) => `%${Math.round(value * 100)}`

export function OverviewTab() {
  const dashboard = useAdminDashboard()
  const quality = useQualityDashboard()
  const metrics = useAdminMetrics()
  const beta = useBetaDashboard()
  const funnel = useRecommendationFunnel()
  const logs = useSystemLogs()

  if (dashboard.isError) return <ErrorState message={dashboard.error.message} onRetry={() => dashboard.refetch()} />
  const d = dashboard.data
  const q = quality.data
  const alerts = metrics.data?.alerts ?? []
  const routeRows = Object.entries(metrics.data?.routes ?? {})
    .filter(([route]) => !route.startsWith('/static'))
    .sort((a, b) => b[1].requests - a[1].requests)
    .slice(0, 8)
  const recentLogs = (logs.data ?? []).filter((log) => !log.route?.startsWith('/static')).slice(0, 12)
  const errorLogs = (logs.data ?? []).filter((log) => (log.status_code ?? 0) >= 500 || log.level === 'error').length

  return (
    <div className="admin-stack">
      <div className={`admin-health${alerts.length ? ' has-alerts' : ''}`} role="status">
        {alerts.length ? <AlertTriangle size={20} aria-hidden="true" /> : <CheckCircle2 size={20} aria-hidden="true" />}
        <div>
          <strong>{alerts.length ? `${alerts.length} sistem uyarısı` : 'Sistem sağlıklı'}</strong>
          {alerts.map((alert) => <p key={alert.code}>{alert.message}</p>)}
          {!alerts.length && <p>Giriş, veri hizmeti ve güvenlik eşiklerinde alarm yok. Son 40 istekte {errorLogs} sunucu hatası.</p>}
        </div>
      </div>

      <div className="admin-stats">
        {d ? (
          <>
            <Stat label="Kullanıcı" value={d.users.toLocaleString('tr-TR')} hint={`${d.verified_users} doğrulanmış · ${d.banned_users} askıda`} tone="lilac" />
            <Stat label="Katalog" value={d.books.toLocaleString('tr-TR')} hint={q ? `${q.recommendable_books} öneriye uygun` : undefined} tone="mint" />
            <Stat label="Topluluk" value={d.comments.toLocaleString('tr-TR')} hint={`yorum · ${d.ratings} puan`} tone="peach" />
            <Stat label="Fiyat teklifi" value={d.offers.toLocaleString('tr-TR')} hint={q?.last_price_check ? `son tarama ${formatRelative(q.last_price_check)}` : 'henüz tarama yok'} tone="butter" />
          </>
        ) : [0, 1, 2, 3].map((index) => <Skeleton key={index} height={130} radius={26} />)}
      </div>

      <div className="admin-grid">
        <Panel title="Kapalı beta · son 30 gün">
          {beta.data ? (
            <>
              <dl className="admin-kv">
                <div><dt>Aktif kullanıcı</dt><dd>{beta.data.active_users}</dd></div>
                <div><dt>Kurulumu bitiren</dt><dd>{beta.data.onboarding_completed}</dd></div>
                <div><dt>Geri bildirim</dt><dd>{beta.data.feedback_count}</dd></div>
                <div><dt>Ortalama puan</dt><dd>{beta.data.average_rating == null ? '—' : beta.data.average_rating.toFixed(1)}</dd></div>
              </dl>
              <BarList empty="Henüz ürün olayı yok." rows={Object.entries(beta.data.events).map(([key, value]) => ({ label: EVENT_LABELS[key] ?? key, value }))} />
            </>
          ) : <Skeleton height={160} />}
        </Panel>
        <Panel title="Son geri bildirimler">
          {beta.data && beta.data.recent_feedback.length === 0 && <p className="today__muted">Henüz geri bildirim gelmedi.</p>}
          <ul className="admin-list">
            {beta.data?.recent_feedback.slice(0, 6).map((item, index) => (
              <li key={item.id ?? index}>
                <div className="admin-list__row">
                  <span className="mh-chip mh-chip--muted">{FEEDBACK_LABELS[item.category] ?? item.category}</span>
                  {item.rating != null && <span className="mh-chip">{item.rating}/10</span>}
                  <time>{formatRelative(item.created_at)}</time>
                </div>
                <p>{item.message}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Öne çıkan kitaplar">
          <BarList empty="Henüz puan yok." rows={(d?.top_books ?? []).slice(0, 6).map((book) => ({ label: book.title, value: book.popularity_score, display: book.rating_count ? `★ ${book.rating_average.toFixed(1)} · ${book.rating_count}` : '—' }))} />
        </Panel>
        <Panel title="Öneri hunisi · 30 gün">
          {funnel.data && Object.keys(funnel.data.variants).length === 0 && <p className="today__muted">Henüz öneri gösterimi yok.</p>}
          {Object.entries(funnel.data?.variants ?? {}).map(([variant, data]) => (
            <div key={variant} className="admin-funnel">
              <p className="admin-funnel__name">{variant === 'catalog_control' ? 'Katalog (kontrol)' : variant}</p>
              <dl className="admin-kv">
                <div><dt>Gösterim</dt><dd>{data.counts.impression ?? 0}</dd></div>
                <div><dt>Tıklama</dt><dd>{percent(data.click_through_rate)}</dd></div>
                <div><dt>Rafa ekleme</dt><dd>{percent(data.library_add_rate)}</dd></div>
                <div><dt>Okumaya başlama</dt><dd>{percent(data.reading_start_rate)}</dd></div>
              </dl>
            </div>
          ))}
        </Panel>
        <Panel title="En yoğun uç noktalar">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">Uç nokta</th><th scope="col">İstek</th><th scope="col">Hata</th><th scope="col">P95</th></tr></thead>
              <tbody>
                {routeRows.map(([route, row]) => (
                  <tr key={route}><td><code>{route}</code></td><td>{row.requests}</td><td>{row.errors}</td><td>{Math.round(row.p95_ms)} ms</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Son istekler">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">Durum</th><th scope="col">İstek</th><th scope="col">Süre</th></tr></thead>
              <tbody>
                {recentLogs.map((log, index) => (
                  <tr key={log.request_id ?? index}>
                    <td><StatusChip status={(log.status_code ?? 0) >= 500 ? 'error' : (log.status_code ?? 0) >= 400 ? 'warning' : 'info'} /> {log.status_code}</td>
                    <td><code>{log.method} {log.route}</code></td>
                    <td>{log.duration_ms != null ? `${Math.round(log.duration_ms)} ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}
