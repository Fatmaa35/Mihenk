import { useMemo } from 'react'
import './profile.css'

type YearHeatmapProps = { year: number; calendar: { activity_date: string; pages_read: number }[] }

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export function pageLevel(pages: number): 0 | 1 | 2 | 3 | 4 {
  if (pages <= 0) return 0
  if (pages < 10) return 1
  if (pages < 25) return 2
  if (pages < 50) return 3
  return 4
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Yılın her gününü haftalara göre dizer (GitHub katkı takvimi düzeni); hafta pazartesi başlar. */
export function buildYearCells(year: number, calendar: YearHeatmapProps['calendar']) {
  const pagesByDate = new Map(calendar.map((item) => [item.activity_date, item.pages_read]))
  const first = new Date(year, 0, 1)
  const offset = (first.getDay() + 6) % 7
  const cells: ({ date: string; pages: number; level: number; month: number } | null)[] = Array.from({ length: offset }, () => null)
  for (let day = new Date(first); day.getFullYear() === year; day.setDate(day.getDate() + 1)) {
    const key = isoDate(day)
    const pages = pagesByDate.get(key) ?? 0
    cells.push({ date: key, pages, level: pageLevel(pages), month: day.getMonth() })
  }
  return cells
}

export function YearHeatmap({ year, calendar }: YearHeatmapProps) {
  const cells = useMemo(() => buildYearCells(year, calendar), [year, calendar])
  const weeks = Math.ceil(cells.length / 7)
  const monthStarts = useMemo(() => {
    const starts: { month: number; week: number }[] = []
    cells.forEach((cell, index) => {
      if (cell && cell.date.endsWith('-01')) starts.push({ month: cell.month, week: Math.floor(index / 7) })
    })
    return starts
  }, [cells])

  return (
    <figure className="heatmap" aria-label={`${year} okuma takvimi`}>
      <div className="heatmap__scroll">
        <div className="heatmap__months" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }} aria-hidden="true">
          {monthStarts.map(({ month, week }) => <span key={month} style={{ gridColumnStart: week + 1 }}>{MONTHS[month]}</span>)}
        </div>
        <div className="heatmap__grid" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
          {cells.map((cell, index) => cell
            ? <span key={cell.date} className="heatmap__cell" data-level={cell.level} title={`${cell.date}: ${cell.pages} sayfa`} />
            : <span key={`pad-${index}`} className="heatmap__cell heatmap__cell--pad" aria-hidden="true" />)}
        </div>
      </div>
      <figcaption className="heatmap__legend">
        <span>Az</span>
        {[0, 1, 2, 3, 4].map((level) => <span key={level} className="heatmap__cell" data-level={level} aria-hidden="true" />)}
        <span>Çok</span>
      </figcaption>
    </figure>
  )
}
