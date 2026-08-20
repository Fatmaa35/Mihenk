import React, { useState } from 'react'
import { api } from './api'

interface Quote {
  id: string
  book_title?: string
  quote_text: string
  page_number?: number
  tags: string[]
  source_type: string
  created_at: string
}

interface QuotesManagerProps {
  quotes: Quote[]
  activeBook: {
    id: string
    title: string
    is_custom?: boolean
  } | null
  onQuoteAdded: () => void
  onRequestBookAdd: () => void
}

export function QuotesManager({ quotes, activeBook, onQuoteAdded, onRequestBookAdd }: QuotesManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [pageNumber, setPageNumber] = useState<string>('')
  const [tagsStr, setTagsStr] = useState('')
  const [sourceType, setSourceType] = useState<'manual' | 'ocr'>('manual')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setOcrLoading(true)
    setError('')
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))

    try {
      const TextDetectorClass = (window as any).TextDetector
      if (!TextDetectorClass) {
        setSourceType('manual')
        setError('Fotoğraf hazır. Bu tarayıcı otomatik metin okumayı desteklemiyor; alıntıyı aşağıdaki alana yazabilir veya yapıştırabilirsin.')
        return
      }

      const detector = new TextDetectorClass()
      const bitmap = await createImageBitmap(file)
      const blocks = await detector.detect(bitmap)
      bitmap.close()
      const detectedText = blocks.map((block: any) => block.rawValue).filter(Boolean).join('\n').trim()
      if (!detectedText) {
        setSourceType('manual')
        setError('Fotoğrafta okunabilir metin bulunamadı. Daha net bir fotoğraf deneyebilir veya notu elle yazabilirsin.')
        return
      }
      setSourceType('ocr')
      setQuoteText((current) => current ? `${current}\n\n${detectedText}` : detectedText)
    } catch {
      setSourceType('manual')
      setError('Fotoğraf okunamadı. Daha net bir görsel deneyebilir veya notu elle yazabilirsin.')
    } finally {
      setOcrLoading(false)
    }
  }

  const closeModal = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview('')
    setError('')
    setOcrLoading(false)
    setShowAddModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBook) {
      setError('Lütfen önce aktif bir kitap seçin.')
      return
    }
    if (!quoteText.trim()) return

    setSaving(true)
    setError('')

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      await api('/me/quotes', {
        method: 'POST',
        body: JSON.stringify({
          book_id: activeBook.is_custom ? undefined : activeBook.id,
          custom_book_id: activeBook.is_custom ? activeBook.id : undefined,
          quote_text: quoteText.trim(),
          page_number: pageNumber ? Number(pageNumber) : undefined,
          tags,
          source_type: sourceType
        })
      })
      setQuoteText('')
      setPageNumber('')
      setTagsStr('')
      closeModal()
      onQuoteAdded()
    } catch (err: any) {
      setError(err.message || 'Alıntı eklenemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bento-tile bento-quotes">
      <div className="bento-header">
        <span className="bento-badge">💬 Edebi Alıntılarım &amp; Notlarım</span>
        <button
          type="button"
          className="btn-bento-action"
          onClick={() => {
            setError('')
            setShowAddModal(true)
          }}
        >
          📷 Kamera/Not Ekle
        </button>
      </div>

      <div className="quotes-feed">
        {quotes.length === 0 ? (
          <div className="empty-quotes-state">
            <p>Henüz altı çizilen bir cümle veya not kaydedilmedi.</p>
            <small>Okuma esnasında kameranla alıntını tarayabilir veya not yazabilirsin.</small>
          </div>
        ) : (
          quotes.slice(0, 5).map((q) => (
            <div key={q.id} className="quote-card">
              <p className="quote-text">“{q.quote_text}”</p>
              <div className="quote-meta">
                <span className="quote-book">{q.book_title || activeBook?.title}</span>
                {q.page_number && <span className="quote-page">Sayfa {q.page_number}</span>}
                {q.source_type === 'ocr' && <span className="badge-ocr">📷 OCR Tarama</span>}
              </div>
              {q.tags.length > 0 && (
                <div className="quote-tags">
                  {q.tags.map((tag) => (
                    <span key={tag} className="quote-tag">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="product-modal" role="presentation">
          <form className="product-dialog bento-modal" onSubmit={handleSubmit}>
            <p className="product-eyebrow">Alıntı &amp; not yönetimi</p>
            <h2>📖 {activeBook?.title || 'Önce bir kitap seç'}</h2>

            {!activeBook ? (
              <div className="quote-book-required" role="status">
                <strong>Notunu ilişkilendirecek bir kitap bulunamadı.</strong>
                <span>Kitaplığından bir kitap seç veya ISBN ile yeni bir kitap ekle.</span>
                <button
                  type="button"
                  onClick={() => {
                    closeModal()
                    onRequestBookAdd()
                  }}
                >
                  ISBN ile kitap ekle
                </button>
              </div>
            ) : (
              <>

            <div className="ocr-upload-box">
              <label className="btn-ocr-upload">
                {ocrLoading ? '⏳ Görsel okunuyor…' : '📷 Fotoğraf çek / görsel seç'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelected}
                  disabled={ocrLoading}
                  style={{ display: 'none' }}
                />
              </label>
              <small className="ocr-hint">Desteklenen tarayıcılarda metin otomatik okunur; her zaman elle de düzenleyebilirsin.</small>
              {imagePreview && <img className="quote-image-preview" src={imagePreview} alt="Seçilen alıntı görseli" />}
            </div>

            <label className="input-label">
              Alıntı / Not Metni
              <textarea
                rows={4}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Kitaptan altını çizdiğin veya ilham aldığın cümleleri buraya ekle..."
                required
              />
            </label>

            <div className="product-grid">
              <label>
                Sayfa Numarası
                <input
                  type="number"
                  placeholder="ör. 42"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                />
              </label>
              <label>
                Etiketler (Virgülle ayırın)
                <input
                  type="text"
                  placeholder="felsefe, varoluş, alıntı"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                />
              </label>
            </div>

            {error && <p className="product-error">{error}</p>}

            <div className="product-actions">
              <button type="button" onClick={closeModal}>
                İptal
              </button>
              <button type="submit" className="primary" disabled={saving || ocrLoading}>
                {saving ? 'Kaydediliyor…' : 'Alıntıyı Kaydet'}
              </button>
            </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
