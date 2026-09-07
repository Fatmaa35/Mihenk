import { describe, expect, it } from 'vitest'
import { buildHeatmapDays } from './ReadingHeatmap'

describe('buildHeatmapDays', () => {
  it('creates exactly 365 local calendar days and maps intensity', () => {
    const days = buildHeatmapDays({
      total_sessions: 1,
      total_minutes: 20,
      total_pages_read: 51,
      average_reading_speed_pages_per_min: 2.55,
      estimated_hours_for_300_page_book: 2,
      heatmap_data: { '2026-08-20': 51 }
    }, new Date(2026, 7, 20, 12))

    expect(days).toHaveLength(365)
    expect(days.at(-1)).toEqual({ dateStr: '2026-08-20', pages: 51, intensity: 4 })
    expect(days[0].dateStr).toBe('2025-08-21')
  })
})
