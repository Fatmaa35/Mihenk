import React, { useEffect, useRef, useState } from 'react'
import { api } from './api'

interface ReadingTimerProps {
  activeBook: {
    id: string
    title: string
    author: string
    current_page: number
    total_pages?: number
    is_custom?: boolean
  } | null
  onSessionSaved: () => void
}

type ThemeId = 'cozy' | 'rain' | 'library' | 'forest' | 'minimal' | 'sunny' | 'sea-sunset' | 'cove' | 'moon-sea'
type SoundProfile = 'room' | 'rain' | 'library' | 'forest' | 'silent' | 'morning' | 'ocean'

const AMBIENT_THEMES: Array<{
  id: ThemeId
  label: string
  icon: string
  image?: string
  sound: SoundProfile
}> = [
  { id: 'cozy', label: 'Rahat çalışma odası', icon: '🪴', image: '/static/themes/cozy-study.webp', sound: 'room' },
  { id: 'rain', label: 'Yağmurlu pencere', icon: '🌧️', image: '/static/themes/rainy-window.webp', sound: 'rain' },
  { id: 'library', label: 'Sessiz kütüphane', icon: '📚', image: '/static/themes/quiet-library.webp', sound: 'library' },
  { id: 'forest', label: 'Doğa ve orman', icon: '🌲', image: '/static/themes/forest-retreat.webp', sound: 'forest' },
  { id: 'minimal', label: 'Minimal koyu', icon: '◐', sound: 'silent' },
  { id: 'sunny', label: 'Güneşli masa', icon: '☀️', image: '/static/themes/sunny-desk.webp', sound: 'morning' },
  { id: 'sea-sunset', label: 'Gün batımı sahili', icon: '🌅', image: '/static/themes/sea-sunset.webp', sound: 'ocean' },
  { id: 'cove', label: 'Turkuaz koy', icon: '🏝️', image: '/static/themes/turquoise-cove.webp', sound: 'ocean' },
  { id: 'moon-sea', label: 'Ay ışıklı deniz', icon: '🌙', image: '/static/themes/moonlit-sea.webp', sound: 'ocean' }
]

export function ReadingTimer({ activeBook, onSessionSaved }: ReadingTimerProps) {
  const timerRef = useRef<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<'pomodoro' | 'stopwatch'>('pomodoro')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60) // 25 min default
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const saved = window.localStorage.getItem('mihenk-focus-theme') as ThemeId | null
    return AMBIENT_THEMES.some((theme) => theme.id === saved) ? saved! : 'cozy'
  })
  const [ambientSound, setAmbientSound] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const audioCleanupRef = useRef<(() => void) | null>(null)
  const theme = AMBIENT_THEMES.find((item) => item.id === themeId) || AMBIENT_THEMES[0]

  // Form states for finishing session
  const [startPage, setStartPage] = useState<number>(activeBook?.current_page || 0)
  const [endPage, setEndPage] = useState<number>((activeBook?.current_page || 0) + 15)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (activeBook) {
      setStartPage(activeBook.current_page)
      setEndPage(activeBook.current_page + 10)
    }
  }, [activeBook])

  useEffect(() => {
    window.localStorage.setItem('mihenk-focus-theme', themeId)
  }, [themeId])

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement === timerRef.current)
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  useEffect(() => {
    audioCleanupRef.current?.()
    audioCleanupRef.current = null
    if (!ambientSound || theme.sound === 'silent') return

    const AudioContextClass = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const context = new AudioContextClass()
    const sampleRate = context.sampleRate
    const buffer = context.createBuffer(1, sampleRate * 3, sampleRate)
    const samples = buffer.getChannelData(0)
    let last = 0
    for (let index = 0; index < samples.length; index += 1) {
      const white = Math.random() * 2 - 1
      last = theme.sound === 'rain' ? white : (last + 0.025 * white) / 1.025
      samples[index] = last
    }

    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    const profiles: Record<Exclude<SoundProfile, 'silent'>, { type: BiquadFilterType; frequency: number; volume: number; modulation?: number }> = {
      rain: { type: 'bandpass', frequency: 2600, volume: 0.115 },
      forest: { type: 'lowpass', frequency: 950, volume: 0.075 },
      library: { type: 'lowpass', frequency: 380, volume: 0.035 },
      room: { type: 'lowpass', frequency: 720, volume: 0.048 },
      morning: { type: 'lowpass', frequency: 1100, volume: 0.042 },
      ocean: { type: 'lowpass', frequency: 680, volume: 0.075, modulation: 0.032 }
    }
    const profile = profiles[theme.sound as Exclude<SoundProfile, 'silent'>]
    source.buffer = buffer
    source.loop = true
    filter.type = profile.type
    filter.frequency.value = profile.frequency
    gain.gain.value = profile.volume
    source.connect(filter).connect(gain).connect(context.destination)
    const waveOscillator = profile.modulation ? context.createOscillator() : null
    const waveDepth = profile.modulation ? context.createGain() : null
    if (waveOscillator && waveDepth && profile.modulation) {
      waveOscillator.type = 'sine'
      waveOscillator.frequency.value = 0.11
      waveDepth.gain.value = profile.modulation
      waveOscillator.connect(waveDepth).connect(gain.gain)
      waveOscillator.start()
    }
    source.start()
    void context.resume()

    const cleanup = () => {
      try { waveOscillator?.stop() } catch { /* already stopped */ }
      try { source.stop() } catch { /* already stopped */ }
      void context.close()
    }
    audioCleanupRef.current = cleanup
    return cleanup
  }, [ambientSound, theme.sound])

  useEffect(() => {
    let interval: any = null
    if (isRunning) {
      interval = setInterval(() => {
        if (mode === 'pomodoro') {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              // Toggle pomodoro / break
              if (!isBreak) {
                setIsBreak(true)
                return 5 * 60 // 5 min break
              } else {
                setIsBreak(false)
                return 25 * 60
              }
            }
            return prev - 1
          })
        } else {
          setStopwatchSeconds((prev) => prev + 1)
        }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, mode, isBreak])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartPause = () => {
    setIsRunning(!isRunning)
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsBreak(false)
    setSecondsLeft(25 * 60)
    setStopwatchSeconds(0)
  }

  const handleCompleteSession = () => {
    setIsRunning(false)
    setShowFinishModal(true)
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await timerRef.current?.requestFullscreen()
      }
    } catch {
      setError('Tam ekran modu bu tarayıcıda açılamadı.')
    }
  }

  const isOceanTheme = theme.sound === 'ocean'

  const submitSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBook) return
    setError('')
    setSaving(true)

    const elapsedMinutes = mode === 'pomodoro'
      ? Math.max(1, Math.round(((isBreak ? 5 * 60 : 25 * 60) - secondsLeft) / 60))
      : Math.max(1, Math.round(stopwatchSeconds / 60))

    try {
      await api('/me/reading-sessions', {
        method: 'POST',
        body: JSON.stringify({
          book_id: activeBook.is_custom ? undefined : activeBook.id,
          custom_book_id: activeBook.is_custom ? activeBook.id : undefined,
          start_page: Number(startPage),
          end_page: Number(endPage),
          duration_minutes: elapsedMinutes
        })
      })
      setShowFinishModal(false)
      handleReset()
      onSessionSaved()
    } catch (err: any) {
      setError(err.message || 'Seans kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={timerRef} className={`bento-tile bento-timer focus-theme focus-theme-${theme.id}`}>
      <div
        key={theme.id}
        className="focus-theme-backdrop"
        style={theme.image ? { backgroundImage: `url(${theme.image})` } : undefined}
        aria-hidden="true"
      />
      <div className="focus-theme-content">
      <div className="bento-header focus-theme-header">
        <span className="bento-badge">⏱️ {mode === 'pomodoro' ? (isBreak ? 'Mola vakti' : 'Odaklanma seansı') : 'Serbest kronometre'}</span>
        <div className="focus-theme-controls">
          <label className="focus-theme-select">
            <span>Ortam</span>
            <select value={themeId} onChange={(event) => setThemeId(event.target.value as ThemeId)}>
              {AMBIENT_THEMES.map((item) => (
                <option key={item.id} value={item.id}>{item.icon} {item.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`ambient-sound-toggle ${ambientSound ? 'active' : ''}`}
            onClick={() => setAmbientSound((current) => !current)}
            disabled={theme.sound === 'silent'}
            aria-pressed={ambientSound}
            title={theme.sound === 'silent' ? 'Bu tema sessizdir' : 'Ortam sesini aç veya kapat'}
          >
            {theme.sound === 'silent'
              ? '🔇 Sessiz'
              : isOceanTheme
                ? ambientSound ? '🔊 Deniz sesi açık' : '🌊 Deniz sesi'
                : ambientSound ? '🔊 Ses açık' : '🔈 Ortam sesi'}
          </button>
          <button
            type="button"
            className="focus-fullscreen-toggle"
            onClick={toggleFullscreen}
            aria-pressed={isFullscreen}
            title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran yap'}
          >
            {isFullscreen ? '↙ Tam ekrandan çık' : '⛶ Tam ekran'}
          </button>
        </div>
      </div>

      <div className="timer-mode-selector">
          <button
            type="button"
            className={mode === 'pomodoro' ? 'active' : ''}
            onClick={() => { setMode('pomodoro'); handleReset() }}
          >
            Pomodoro (25/5)
          </button>
          <button
            type="button"
            className={mode === 'stopwatch' ? 'active' : ''}
            onClick={() => { setMode('stopwatch'); handleReset() }}
          >
            Kronometre
          </button>
      </div>

      <div className="timer-display">
        <div className={`timer-clock ${isBreak ? 'break' : ''} ${isRunning ? 'running' : ''}`}>
          {mode === 'pomodoro' ? formatTime(secondsLeft) : formatTime(stopwatchSeconds)}
        </div>
        <p className="timer-book-title">
          📖 {activeBook ? activeBook.title : 'Kitap seçilmedi (Seans açık)'}
        </p>
      </div>

      <div className="timer-controls">
        <button
          type="button"
          className={`btn-timer-primary ${isRunning ? 'pause' : 'start'}`}
          onClick={handleStartPause}
        >
          {isRunning ? '⏸️ Duraklat' : '▶️ Başlat'}
        </button>
        <button type="button" className="btn-timer-secondary" onClick={handleReset}>
          🔄 Sıfırla
        </button>
        <button
          type="button"
          className="btn-timer-finish"
          onClick={handleCompleteSession}
          disabled={!activeBook}
        >
          ⏹️ Okumayı Bitir
        </button>
      </div>
      </div>

      {showFinishModal && (
        <div className="product-modal" role="presentation">
          <form className="product-dialog bento-modal" onSubmit={submitSession}>
            <p className="product-eyebrow">Seans tamamlama</p>
            <h2>📖 {activeBook?.title}</h2>
            <p className="modal-sub">Bugünkü seansında kaçıncı sayfaya ulaştın?</p>

            <div className="product-grid">
              <label>
                Başlangıç Sayfası
                <input
                  type="number"
                  min="0"
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value))}
                  required
                />
              </label>
              <label>
                Bitiş Sayfası
                <input
                  type="number"
                  min={startPage}
                  value={endPage}
                  onChange={(e) => setEndPage(Number(e.target.value))}
                  required
                />
              </label>
            </div>

            {error && <p className="product-error">{error}</p>}

            <div className="product-actions">
              <button type="button" onClick={() => setShowFinishModal(false)}>
                İptal
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Kaydediliyor…' : 'Seansı Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
