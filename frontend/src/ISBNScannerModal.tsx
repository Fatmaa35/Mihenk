import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatOneDReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { api } from './api'

interface ISBNScannerModalProps {
  onClose: () => void
  onBookAdded: () => void
}

interface FoundBook {
  isbn: string
  title: string
  author: string
  page_count?: number
  cover_url?: string
  description?: string
  publication_year?: string
  publisher?: string
  catalog_saved?: boolean
  catalog_book_id?: string
}

function isValidISBN(value: string) {
  if (/^97[89]\d{10}$/.test(value)) {
    return value.split('').reduce((sum, digit, index) =>
      sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0) % 10 === 0
  }

  if (/^\d{9}[0-9X]$/i.test(value)) {
    return value.toUpperCase().split('').reduce((sum, digit, index) =>
      sum + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0
  }

  return false
}

function formatISBN(value: string) {
  const clean = value.replace(/[^0-9X]/gi, '').toUpperCase()
  if (clean.length === 13) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 8)}-${clean.slice(8, 12)}-${clean.slice(12)}`
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 1)}-${clean.slice(1, 4)}-${clean.slice(4, 9)}-${clean.slice(9)}`
  }
  return value
}

export function ISBNScannerModal({ onClose, onBookAdded }: ISBNScannerModalProps) {
  const [isbnQuery, setIsbnQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [foundBook, setFoundBook] = useState<FoundBook | null>(null)
  const [shelf, setShelf] = useState<'reading' | 'to_read' | 'read'>('reading')
  const [adding, setAdding] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const [scanMessage, setScanMessage] = useState('Barkodu çerçeveye ortalayın ve sabit tutun…')
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerControlsRef = useRef<IScannerControls | null>(null)
  const lastDetectedRef = useRef('')

  const handleLookup = async (isbnToSearch: string) => {
    const clean = isbnToSearch.trim().replace(/[^0-9X]/gi, '')
    if (!isValidISBN(clean)) {
      setError('Geçerli bir ISBN numarası giriniz.')
      return
    }

    setLoading(true)
    setError('')
    setFoundBook(null)

    try {
      const data = await api<FoundBook>(`/books/isbn/${encodeURIComponent(formatISBN(clean))}`)
      setFoundBook(data)
    } catch (err: any) {
      setError(err.message || 'Kitap bilgisi Open Library / Google Books üzerinden bulunamadı. Manuel ekleyebilirsiniz.')
    } finally {
      setLoading(false)
    }
  }

  const stopCamera = useCallback(() => {
    scannerControlsRef.current?.stop()
    scannerControlsRef.current = null
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
    setScannerActive(false)
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const handleStartCamera = async () => {
    setError('')
    setScanMessage('Barkodu çerçeveye ortalayın ve sabit tutun…')
    lastDetectedRef.current = ''
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Kamera yalnızca HTTPS veya localhost üzerinden kullanılabilir.')
      return
    }

    try {
      setScannerActive(true)
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      const video = videoRef.current
      if (!video) {
        stopCamera()
        return
      }
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A])
      hints.set(DecodeHintType.TRY_HARDER, true)
      const reader = new BrowserMultiFormatOneDReader(hints, {
        delayBetweenScanAttempts: 80,
        delayBetweenScanSuccess: 300,
        tryPlayVideoTimeout: 5000
      })
      scannerControlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        video,
        (result) => {
          const barcode = result?.getText().replace(/[^0-9X]/gi, '').toUpperCase()
          if (!barcode || barcode === lastDetectedRef.current) return
          lastDetectedRef.current = barcode

          if (isValidISBN(barcode)) {
            setScanMessage(`ISBN okundu: ${barcode}`)
            stopCamera()
            setIsbnQuery(formatISBN(barcode))
            void handleLookup(barcode)
          } else {
            setScanMessage('Bir barkod algılandı ancak geçerli bir kitap ISBN’si değil. ISBN barkodunu gösterin.')
          }
        }
      )

      const track = (video.srcObject as MediaStream | null)?.getVideoTracks()[0]
      if (track) {
        const capabilities = track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] }
        if (capabilities.focusMode?.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
        }
      }
    } catch (err) {
      stopCamera()
      const name = err instanceof DOMException ? err.name : ''
      setError(name === 'NotAllowedError'
        ? 'Kamera izni verilmedi. Tarayıcı ayarlarından bu site için kamera iznini açın.'
        : 'Kamera başlatılamadı. Başka bir uygulamanın kamerayı kullanmadığını kontrol edin.')
    }
  }

  const handleAddToLibrary = async () => {
    if (!foundBook) return
    setAdding(true)
    setError('')

    try {
      const catalogBook = await api<FoundBook>(`/me/books/isbn/${encodeURIComponent(formatISBN(foundBook.isbn))}`, {
        method: 'POST'
      })
      if (!catalogBook.catalog_book_id) {
        throw new Error('Kitap kataloğa kaydedilemedi.')
      }
      await api('/me/library', {
        method: 'PUT',
        body: JSON.stringify({
          book_id: catalogBook.catalog_book_id,
          shelf: shelf,
          current_page: 0,
          total_pages: catalogBook.page_count || undefined,
          is_favorite: false
        })
      })
      onBookAdded()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Kitap kitaplığa eklenemedi.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="product-modal" role="presentation">
      <div className="product-dialog bento-modal isbn-modal">
        <p className="product-eyebrow">ISBN & BARKOD İLE SÜRTÜNMESİZ KİTAP EKLEME</p>
        <h2>📱 Kamera ile Barkod Tara veya ISBN Ara</h2>

        <div className="barcode-camera-container">
          {scannerActive ? (
            <div className="camera-viewfinder scanning">
              <video ref={videoRef} className="camera-preview" autoPlay muted playsInline />
              <div className="scanner-line" />
              <p aria-live="polite">{scanMessage}</p>
              <button type="button" className="btn-stop-camera" onClick={stopCamera}>Taramayı Durdur</button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-camera-scan"
              onClick={() => void handleStartCamera()}
            >
              📷 Kamerayı Başlat (Barkod Okut)
            </button>
          )}
        </div>

        <div className="isbn-search-row">
          <input
            type="text"
            placeholder="ISBN Numarası (ör. 9789750719387)"
            value={isbnQuery}
            onChange={(e) => setIsbnQuery(e.target.value)}
          />
          <button
            type="button"
            className="primary"
            onClick={() => handleLookup(isbnQuery)}
            disabled={loading}
          >
            {loading ? 'Aranıyor…' : 'ISBN Sorgula'}
          </button>
        </div>

        {error && <p className="product-error">{error}</p>}

        {foundBook && (
          <div className="isbn-result-card">
            {foundBook.cover_url && (
              <img src={foundBook.cover_url} alt={foundBook.title} className="isbn-cover-img" />
            )}
            <div className="isbn-details">
              <h3>{foundBook.title}</h3>
              <p className="isbn-author">✍️ {foundBook.author}</p>
              {foundBook.page_count && <p className="isbn-meta">📄 {foundBook.page_count} Sayfa</p>}
              {foundBook.publisher && <p className="isbn-meta">🏢 {foundBook.publisher}</p>}
              {foundBook.catalog_saved && <p className="isbn-meta isbn-catalog-saved">✓ Kataloğa otomatik eklendi</p>}

              <div className="isbn-shelf-select">
                <label>
                  Raf Seçimi:
                  <select value={shelf} onChange={(e: any) => setShelf(e.target.value)}>
                    <option value="reading">📖 Okuyorum</option>
                    <option value="to_read">📌 Okuyacağım</option>
                    <option value="read">✅ Okudum</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                className="btn-add-to-shelf primary"
                onClick={handleAddToLibrary}
                disabled={adding}
              >
                {adding ? 'Eklendi…' : '📚 Kitaplığıma Ekle'}
              </button>
            </div>
          </div>
        )}

        <div className="product-actions">
          <button type="button" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
