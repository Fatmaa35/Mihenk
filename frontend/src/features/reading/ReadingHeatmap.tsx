import React from 'react'

interface ReadingHeatmapProps {
  stats: {
    total_sessions: number
    total_minutes: number
    total_pages_read: number
    average_reading_speed_pages_per_min: number
    estimated_hours_for_300_page_book: number
    heatmap_data: Record<string, number>
  } | null
  goal?: {
    target_books: number
    completed_books: number
    progress_percent: number
  } | null
  year?: number
  loading?: boolean
  error?: string
  onRetry?: () => void
}

export function buildHeatmapDays(stats: ReadingHeatmapProps['stats'], today = new Date()) {
  const days: { dateStr: string; pages: number; intensity: number }[] = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const pages = stats?.heatmap_data?.[dateStr] || 0

    let intensity = 0
    if (pages > 0 && pages <= 15) intensity = 1
    else if (pages > 15 && pages <= 30) intensity = 2
    else if (pages > 30 && pages <= 50) intensity = 3
    else if (pages > 50) intensity = 4

    days.push({ dateStr, pages, intensity })
  }
  return days
}

export function ReadingHeatmap({ stats, goal = null, year = new Date().getFullYear(), loading = false, error = '', onRetry }: ReadingHeatmapProps) {
  const days = buildHeatmapDays(stats)
  const goalProgress = Math.min(100, Math.max(0, goal?.progress_percent || 0))
  return (
    <div className="bento-tile bento-heatmap">
      <div className="bento-header">
        <span className="bento-badge">🟩 Yıllık Okuma Takvimi &amp; Hedef</span>
        <span className="bento-subtext">
          {stats
            ? `${stats.total_pages_read} sayfa · ${stats.total_minutes} dk okundu`
            : loading
              ? 'Yükleniyor…'
              : error || 'Henüz okuma verisi yok'}
        </span>
      </div>

      {!loading && error && (
        <div className="heatmap-error" role="alert">
          <span>{error}</span>
          {onRetry && <button type="button" onClick={onRetry}>Yeniden dene</button>}
        </div>
      )}

      {goal && (
        <div className="annual-goal" aria-label={`${year} yıllık okuma hedefi`}>
          <div>
            <strong>{year} hedefi</strong>
            <span>{goal.completed_books} / {goal.target_books} kitap</span>
          </div>
          <div className="annual-goal-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={goalProgress}>
            <i style={{ width: `${goalProgress}%` }} />
          </div>
          <b>%{goalProgress}</b>
        </div>
      )}

      <div className="heatmap-grid-container">
        <div className="heatmap-grid" aria-label="Son 365 günlük okuma etkinliği">
          {days.map((item) => (
            <div
              key={item.dateStr}
              className={`heatmap-cell level-${item.intensity}`}
              title={`${item.dateStr}: ${item.pages} sayfa okundu`}
            />
          ))}
        </div>
      </div>

      <div className="heatmap-footer">
        <div className="heatmap-legend">
          <span>Az</span>
          <div className="heatmap-cell level-0" />
          <div className="heatmap-cell level-1" />
          <div className="heatmap-cell level-2" />
          <div className="heatmap-cell level-3" />
          <div className="heatmap-cell level-4" />
          <span>Çok</span>
        </div>

        {stats && (
          <div className="stats-inline">
            <span>⚡ Hız: <strong>{stats.average_reading_speed_pages_per_min} sayfa/dk</strong></span>
            <span>⏱️ 300 Sayfalık Kitap Tahmini: <strong>{stats.estimated_hours_for_300_page_book} saat</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}
