import React, { lazy, Suspense, useEffect, useState } from 'react'
import { api } from './api'
import { ReadingTimer } from './ReadingTimer'
import { ReadingHeatmap } from './ReadingHeatmap'

const ISBNScannerModal = lazy(() => import('./ISBNScannerModal').then(module => ({ default: module.ISBNScannerModal })))

interface BookItem {
  id: string
  title: string
  author: string
  current_page: number
  total_pages?: number
  shelf?: string
  is_custom?: boolean
}

interface ProfileResponse {
  reading_books: BookItem[]
  to_read_books: BookItem[]
  read_books: BookItem[]
}

export function BentoReadingDashboard() {
  const [readingBooks, setReadingBooks] = useState<BookItem[]>([])
  const [activeBook, setActiveBook] = useState<BookItem | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [readingDashboard, setReadingDashboard] = useState<any>(null)
  const [statsError, setStatsError] = useState('')
  const [showISBNModal, setShowISBNModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    setStatsError('')
    try {
      const currentYear = new Date().getFullYear()
      const [statsRes, profile, dashboard] = await Promise.all([
        api<any>('/me/reading-sessions/stats').catch((error) => {
          console.error('Okuma istatistikleri yüklenemedi.', error)
          setStatsError('Okuma istatistikleri yüklenemedi.')
          return null
        }),
        api<ProfileResponse>('/me/profile'),
        api<any>(`/me/reading-dashboard?year=${currentYear}`).catch(() => null)
      ])

      setStats(statsRes)
      setReadingDashboard(dashboard)
      const combined = [
        ...(profile.reading_books || []),
        ...(profile.to_read_books || []),
        ...(profile.read_books || [])
      ].map((book) => ({
        ...book,
        current_page: Number(book.current_page || 0),
        is_custom: Boolean(book.is_custom)
      }))
      setReadingBooks(combined)

      setActiveBook((current) => (
        combined.find((book) => book.id === current?.id && book.is_custom === current?.is_custom)
        || combined[0]
        || null
      ))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const handleRefresh = () => {
      fetchData()
    }

    window.addEventListener('pkm-refresh', handleRefresh)
    window.addEventListener('focus', handleRefresh)

    return () => {
      window.removeEventListener('pkm-refresh', handleRefresh)
      window.removeEventListener('focus', handleRefresh)
    }
  }, [])

  return (
    <section className="bento-container" aria-label="Okuma Modu ve PKM Paneli">
      {/* Top Banner */}
      <div className="bento-banner">
        <div className="bento-banner-info">
          <h2>📖 Mihenk Okuma Seansı &amp; PKM Modu</h2>
          <p>Okuma ritmini koru, sürtünmesiz kitap ekle ve yıllık ilerlemeni tek yerde izle.</p>
        </div>

        <div className="bento-banner-actions">
          {readingBooks.length > 0 && (
            <select
              className="active-book-select"
              value={activeBook ? `${activeBook.is_custom ? 'custom' : 'catalog'}:${activeBook.id}` : ''}
              onChange={(e) => {
                const selected = readingBooks.find(
                  (book) => `${book.is_custom ? 'custom' : 'catalog'}:${book.id}` === e.target.value
                )
                if (selected) setActiveBook(selected)
              }}
            >
              {readingBooks.map((b) => (
                <option
                  key={`${b.is_custom ? 'custom' : 'catalog'}:${b.id}`}
                  value={`${b.is_custom ? 'custom' : 'catalog'}:${b.id}`}
                >
                  📖 {b.title} (S. {b.current_page} / {b.total_pages || '?'})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn-isbn-scan-banner primary"
            onClick={() => setShowISBNModal(true)}
          >
            📱 ISBN Barkod ile Kitap Ekle
          </button>
        </div>
      </div>

      {/* Bento Grid Architecture */}
      <div className="bento-grid">
        {/* Bento Tile 1: Pomodoro & Stopwatch Timer */}
        <ReadingTimer activeBook={activeBook} onSessionSaved={fetchData} />

        {/* Bento Tile 2: GitHub-style Annual Reading Heatmap */}
        <ReadingHeatmap
          stats={stats}
          goal={readingDashboard?.goal || null}
          year={readingDashboard?.year}
          loading={loading}
          error={statsError}
          onRetry={fetchData}
        />
      </div>

      {/* ISBN Scanner & Search Modal */}
      {showISBNModal && (
        <Suspense fallback={<p role="status">ISBN tarayıcı yükleniyor…</p>}>
          <ISBNScannerModal
            onClose={() => setShowISBNModal(false)}
            onBookAdded={fetchData}
          />
        </Suspense>
      )}
    </section>
  )
}
