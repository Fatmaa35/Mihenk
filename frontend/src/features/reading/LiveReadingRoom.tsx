import React, { useState, useEffect, useRef } from 'react';

interface Participant {
  user_id: string;
  display_name: string;
  role: string;
  current_page?: number;
  daily_target_pages?: number;
  reading_book_title?: string;
}

interface Message {
  id: string;
  user_id: string;
  display_name: string;
  content: string;
  created_at: string;
}

interface RoomData {
  id: string;
  club_id: string;
  title: string;
  book_id?: string;
  phase: 'reading' | 'break' | 'discussion';
  duration_minutes: number;
  participants: Participant[];
  messages: Message[];
}

interface LiveReadingRoomProps {
  clubId: string;
  activeBookTitle?: string;
  activeBookId?: string;
  userCurrentPage?: number;
  onSessionFinished?: () => void;
}

export const LiveReadingRoom: React.FC<LiveReadingRoomProps> = ({
  clubId,
  activeBookTitle,
  activeBookId,
  userCurrentPage = 0,
  onSessionFinished,
}) => {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Timer State
  const [phase, setPhase] = useState<'reading' | 'break' | 'discussion'>('reading');
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Session Logging
  const [startPage] = useState<number>(userCurrentPage);
  const [endPage, setEndPage] = useState<number>(userCurrentPage);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [sessionSaved, setSessionSaved] = useState<boolean>(false);

  // Ambient Audio
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'fireplace' | 'whitenoise'>('none');
  const [volume, setVolume] = useState<number>(0.5);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodeRef = useRef<{ stop: () => void } | null>(null);

  // Chat
  const [chatMessage, setChatMessage] = useState<string>('');
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);

  // Fetch Room Info
  const fetchRoom = async () => {
    try {
      const res = await fetch(`/me/book-clubs/${clubId}/room`);
      if (!res.ok) throw new Error('Oda bilgisi alınamadı.');
      const data: RoomData = await res.json();
      setRoomData(data);
    } catch (err: any) {
      setError(err.message || 'Odaya bağlanırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 10000); // Polling for messages and participants
    return () => clearInterval(interval);
  }, [clubId]);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timeLeftSeconds > 0) {
      interval = setInterval(() => {
        setTimeLeftSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timeLeftSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      playBellSound();
      if (phase === 'reading') {
        setPhase('break');
        setTimeLeftSeconds(5 * 60);
      } else if (phase === 'break') {
        setPhase('discussion');
        setTimeLeftSeconds(10 * 60);
      } else {
        setPhase('reading');
        setTimeLeftSeconds(durationMinutes * 60);
      }
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeftSeconds, phase, durationMinutes]);

  // Web Audio Bell Sound
  const playBellSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  };

  // Synthesize Ambient Sounds (Rain, Fireplace, Whitenoise) via Web Audio API
  useEffect(() => {
    if (ambientNodeRef.current) {
      ambientNodeRef.current.stop();
      ambientNodeRef.current = null;
    }

    if (ambientSound === 'none') {
      return;
    }

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Generate brown/pink noise
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (ambientSound === 'rain') {
          // Brown noise with low-pass
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
        } else if (ambientSound === 'fireplace') {
          // Crackle + low hum
          const crackle = Math.random() > 0.997 ? (Math.random() - 0.5) * 4 : 0;
          output[i] = (lastOut + 0.04 * white) / 1.04 + crackle;
          lastOut = output[i];
        } else {
          // Smooth pink noise
          output[i] = (lastOut + 0.08 * white) / 1.08;
          lastOut = output[i];
        }
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = ambientSound === 'rain' ? 'lowpass' : 'bandpass';
      filter.frequency.value = ambientSound === 'rain' ? 800 : 1200;

      const gainNode = ctx.createGain();
      gainNode.gain.value = volume * 0.4;

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      whiteNoise.start(0);

      ambientNodeRef.current = {
        stop: () => {
          try {
            whiteNoise.stop();
            ctx.close();
          } catch (e) {}
        },
      };
    } catch (e) {
      console.warn('Ambient audio init failed', e);
    }

    return () => {
      if (ambientNodeRef.current) {
        ambientNodeRef.current.stop();
        ambientNodeRef.current = null;
      }
    };
  }, [ambientSound, volume]);

  const handleStartTimer = (mins: number) => {
    setDurationMinutes(mins);
    setTimeLeftSeconds(mins * 60);
    setPhase('reading');
    setTimerRunning(true);
    setSessionSaved(false);
  };

  const handleCompleteSession = async () => {
    const pagesRead = Math.max(0, endPage - startPage);
    try {
      const res = await fetch(`/me/book-clubs/${clubId}/room/complete-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomData?.id,
          book_id: activeBookId,
          minutes_read: durationMinutes,
          pages_read: pagesRead,
          current_page: endPage > 0 ? endPage : undefined,
          notes: sessionNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Seans kaydedilemedi.');
      const updated = await res.json();
      setRoomData(updated);
      setSessionSaved(true);
      if (onSessionFinished) onSessionFinished();
    } catch (err: any) {
      alert(err.message || 'Seans kaydedilirken hata oluştu.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !roomData) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`/me/book-clubs/${clubId}/room/messages?room_id=${roomData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chatMessage.trim() }),
      });
      if (!res.ok) throw new Error('Mesaj gönderilemedi.');
      const updated = await res.json();
      setRoomData(updated);
      setChatMessage('');
    } catch (err: any) {
      console.warn('Send msg error:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalPhaseSeconds = phase === 'reading' ? durationMinutes * 60 : phase === 'break' ? 5 * 60 : 10 * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalPhaseSeconds - timeLeftSeconds) / totalPhaseSeconds) * 100));

  if (loading) return <div className="p-8 text-center text-muted">Canlı okuma odası yükleniyor...</div>;
  if (error) return <div className="p-4 alert warning">{error}</div>;

  return (
    <div className="live-room-container">
      {/* Top Banner */}
      <div className="live-room-header">
        <div className="live-room-badge">
          <span className="live-dot" /> CANLI OKUMA ODASI
        </div>
        <h2 className="live-room-title">{roomData?.title || 'Mihenk Birlikte Okuyoruz Seansı'}</h2>
        <p className="live-room-subtitle">
          📖 Aktif Kitap: <strong>{activeBookTitle || 'Kulüp Kitabı'}</strong>
        </p>
      </div>

      <div className="live-room-grid">
        {/* Left Column: Pomodoro & Focus Station */}
        <div className="live-focus-card">
          {/* Phase Selector */}
          <div className="phase-pill-group">
            <button
              className={`phase-pill ${phase === 'reading' ? 'active' : ''}`}
              onClick={() => {
                setPhase('reading');
                setTimeLeftSeconds(durationMinutes * 60);
                setTimerRunning(false);
              }}
            >
              📚 Odaklanma ({durationMinutes} dk)
            </button>
            <button
              className={`phase-pill ${phase === 'break' ? 'active' : ''}`}
              onClick={() => {
                setPhase('break');
                setTimeLeftSeconds(5 * 60);
                setTimerRunning(false);
              }}
            >
              ☕ Mola (5 dk)
            </button>
            <button
              className={`phase-pill ${phase === 'discussion' ? 'active' : ''}`}
              onClick={() => {
                setPhase('discussion');
                setTimeLeftSeconds(10 * 60);
                setTimerRunning(false);
              }}
            >
              💬 Bölüm Tartışması (10 dk)
            </button>
          </div>

          {/* Circular Timer Display */}
          <div className="timer-display-wrap">
            <div className="timer-circle">
              <svg className="timer-svg" viewBox="0 0 100 100">
                <circle className="timer-bg" cx="50" cy="50" r="44" />
                <circle
                  className="timer-progress"
                  cx="50"
                  cy="50"
                  r="44"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                />
              </svg>
              <div className="timer-content">
                <span className="timer-time">{formatTime(timeLeftSeconds)}</span>
                <span className="timer-phase-label">
                  {phase === 'reading' ? '📖 Sessiz Okuma' : phase === 'break' ? '☕ Çay & Kahve Molası' : '💬 Canlı Değerlendirme'}
                </span>
              </div>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="timer-action-buttons">
            {!timerRunning ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setTimerRunning(true)}
              >
                ▶ Seansı Başlat
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => setTimerRunning(false)}
              >
                ⏸ Duraklat
              </button>
            )}
            <button
              className="btn btn-outline"
              onClick={() => handleStartTimer(25)}
            >
              🔄 25 dk Sıfırla
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleStartTimer(45)}
            >
              ⏱ 45 dk
            </button>
          </div>

          {/* Ambient Sound Bar */}
          <div className="ambient-sound-bar">
            <span className="ambient-label">🎧 Odaklanma Sesi:</span>
            <div className="ambient-buttons">
              <button
                className={`btn btn-xs ${ambientSound === 'none' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAmbientSound('none')}
              >
                Sessiz
              </button>
              <button
                className={`btn btn-xs ${ambientSound === 'rain' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAmbientSound('rain')}
              >
                🌧️ Yağmur
              </button>
              <button
                className={`btn btn-xs ${ambientSound === 'fireplace' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAmbientSound('fireplace')}
              >
                🔥 Şömine
              </button>
              <button
                className={`btn btn-xs ${ambientSound === 'whitenoise' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAmbientSound('whitenoise')}
              >
                ☕ Beyaz Gürültü
              </button>
            </div>
            {ambientSound !== 'none' && (
              <div className="ambient-volume">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                />
              </div>
            )}
          </div>

          {/* Live Session Progress Logger */}
          <div className="session-logger-box">
            <h4>📝 Bu Seanstaki İlerlemem</h4>
            <div className="session-inputs-row">
              <div>
                <label>Başlangıç Sayfası</label>
                <input type="number" value={startPage} readOnly className="input-readonly" />
              </div>
              <div>
                <label>Ulaştığım Sayfa</label>
                <input
                  type="number"
                  value={endPage}
                  min={startPage}
                  onChange={(e) => setEndPage(parseInt(e.target.value, 10) || startPage)}
                />
              </div>
              <div className="session-diff-badge">
                <span>+{Math.max(0, endPage - startPage)} sayfa</span>
              </div>
            </div>

            <div className="mt-3">
              <label>Seans Notu / Çarpıcı Alıntı (Opsiyonel)</label>
              <textarea
                rows={2}
                placeholder="Bu seansta altını çizdiğin bir cümle veya aldığın kısa bir not..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
              />
            </div>

            <div className="mt-3 flex justify-between items-center">
              {sessionSaved ? (
                <span className="text-success font-semibold text-sm">✅ Seans okuma geçmişine başarıyla işlendi!</span>
              ) : (
                <span className="text-muted text-xs">Seans tamamlanınca kulüp yol haritana yansır.</span>
              )}
              <button
                className="btn btn-success btn-sm"
                onClick={handleCompleteSession}
              >
                💾 Seansı İstatistiklerime Kaydet
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Participants & Live Chat */}
        <div className="live-sidebar">
          {/* Participants */}
          <div className="live-participants-card">
            <div className="participants-header">
              <h3>👥 Kulüp Okurları ({roomData?.participants?.length || 0})</h3>
            </div>
            <div className="participants-list">
              {roomData?.participants?.map((p) => (
                <div key={p.user_id} className="participant-item">
                  <div className="participant-avatar">
                    {p.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="participant-info">
                    <div className="participant-name">
                      {p.display_name}
                      {p.role === 'owner' && <span className="role-tag owner">Kurucu</span>}
                      {p.role === 'moderator' && <span className="role-tag mod">Moderatör</span>}
                    </div>
                    <div className="participant-sub">
                      📖 {p.reading_book_title || activeBookTitle || 'Kitap'} • s. {p.current_page || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* In-Room Live Chat */}
          <div className="live-chat-card">
            <div className="chat-header">
              <h3>💬 Canlı Seans Sohbeti</h3>
              <span className="text-xs text-muted">Mola ve tartışma fazında aktiftir</span>
            </div>

            <div className="chat-messages-container">
              {roomData?.messages?.length === 0 ? (
                <div className="chat-empty">Henüz mesaj yok. Seans molasında ilk düşünceni yaz!</div>
              ) : (
                roomData?.messages?.map((msg) => (
                  <div key={msg.id} className="chat-bubble">
                    <div className="chat-meta">
                      <strong>{msg.display_name}</strong>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="chat-text">{msg.content}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                placeholder="Düşünceni veya okuduğun sayfayı yaz..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={sendingMsg}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={sendingMsg || !chatMessage.trim()}>
                Gönder
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
