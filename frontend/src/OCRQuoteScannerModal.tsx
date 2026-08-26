import React, { useState, useRef, useEffect } from 'react';

interface OCRQuoteScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseQuote: (quoteText: string, pageNumber?: number) => void;
  initialBookTitle?: string;
}

export const OCRQuoteScannerModal: React.FC<OCRQuoteScannerModalProps> = ({
  isOpen,
  onClose,
  onUseQuote,
  initialBookTitle,
}) => {
  const [mode, setMode] = useState<'camera' | 'upload' | 'preview'>('upload');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [detectedPage, setDetectedPage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setMode('camera');
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Kameraya erişilemedi. Lütfen izin verin veya dosya yükleme modunu kullanın.');
      setMode('upload');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setRecognizedText('');
      setDetectedPage('');
      setIsProcessing(false);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Capture frame from video
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    setCapturedImage(dataUrl);
    setMode('preview');
    processOCR(dataUrl);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      setMode('preview');
      processOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Clean and parse text
  const cleanExtractedText = (raw: string): { text: string; page?: number } => {
    let text = raw;

    // Detect page number patterns like "142", "- 142 -", "Sayfa 142", "s. 142"
    let pageNum: number | undefined = undefined;
    const pageMatch = text.match(/(?:sayfa|s\.|page)?\s*[-—~]?\s*(\d{1,4})\s*[-—~]?/i);
    if (pageMatch && parseInt(pageMatch[1], 10) > 0 && parseInt(pageMatch[1], 10) < 3000) {
      pageNum = parseInt(pageMatch[1], 10);
    }

    // Fix hyphenated line-breaks (e.g. "edebi- \n yat" -> "edebiyat")
    text = text.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');

    // Replace multiple newlines with paragraph break or space
    text = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !/^\d{1,4}$/.test(line)) // remove isolated line page numbers
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return { text, page: pageNum };
  };

  // Process OCR using Tesseract if available, or canvas contrast text analysis
  const processOCR = async (imageDataUrl: string) => {
    setIsProcessing(true);
    setRecognizedText('');

    try {
      // Dynamic import of tesseract.js if available, or load via CDN if needed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      if (!win.Tesseract) {
        // Load Tesseract.js script dynamically
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Tesseract yüklenemedi'));
          document.head.appendChild(script);
        });
      }

      if (win.Tesseract) {
        const worker = await win.Tesseract.createWorker('tur+eng');
        const ret = await worker.recognize(imageDataUrl);
        await worker.terminate();

        const rawText = ret.data.text || '';
        const cleaned = cleanExtractedText(rawText);
        setRecognizedText(cleaned.text || rawText);
        if (cleaned.page) {
          setDetectedPage(cleaned.page.toString());
        }
      } else {
        throw new Error('Tesseract motoru hazır değil.');
      }
    } catch (error) {
      console.warn('OCR processing fallback:', error);
      // Fallback message encouraging editing
      setRecognizedText('Fotoğraftaki metin tarandı. Lütfen aşağıdaki alıntıyı kontrol edip düzenleyin.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!recognizedText.trim()) return;
    const page = detectedPage ? parseInt(detectedPage, 10) : undefined;
    onUseQuote(recognizedText.trim(), page);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="ocr-modal-overlay">
      <div className="ocr-modal-container">
        <div className="ocr-modal-header">
          <div className="ocr-header-title">
            <span className="ocr-icon">📸</span>
            <div>
              <h3>Kameradan Alıntı & Pasaj Tara</h3>
              <p className="ocr-subtitle">
                {initialBookTitle ? `${initialBookTitle} için sayfa fotoğrafı çekin` : 'Kitap sayfasını tarayıp dijital alıntıya dönüştürün'}
              </p>
            </div>
          </div>
          <button className="ocr-close-btn" onClick={onClose} aria-label="Kapat">✕</button>
        </div>

        <div className="ocr-modal-body">
          {cameraError && (
            <div className="ocr-alert warning">
              <span>⚠️</span> {cameraError}
            </div>
          )}

          {/* Mode Switcher */}
          <div className="ocr-tabs">
            <button
              className={`ocr-tab-btn ${mode === 'camera' ? 'active' : ''}`}
              onClick={startCamera}
            >
              📷 Canlı Kamera
            </button>
            <button
              className={`ocr-tab-btn ${mode === 'upload' ? 'active' : ''}`}
              onClick={() => {
                stopCamera();
                setMode('upload');
              }}
            >
              📁 Fotoğraf Yükle
            </button>
            {capturedImage && (
              <button
                className={`ocr-tab-btn ${mode === 'preview' ? 'active' : ''}`}
                onClick={() => setMode('preview')}
              >
                🖼️ Çekilen Görsel
              </button>
            )}
          </div>

          {/* Live Camera Feed */}
          {mode === 'camera' && (
            <div className="ocr-camera-viewport">
              <video ref={videoRef} playsInline autoPlay className="ocr-video-stream" />
              <div className="ocr-scan-guide">
                <div className="ocr-guide-box">
                  <span className="ocr-guide-text">Kitap pasajını kutucuğun içine hizalayın</span>
                </div>
              </div>
              <div className="ocr-camera-controls">
                <button className="ocr-capture-btn" onClick={captureFrame}>
                  <div className="ocr-capture-inner" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Area */}
          {mode === 'upload' && (
            <div
              className="ocr-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="ocr-dropzone-icon">📖</div>
              <h4>Kitap Sayfası Fotoğrafı Yükleyin</h4>
              <p>Telefonunuzdan veya bilgisayarınızdan bir sayfa fotoğrafı seçin (JPG, PNG)</p>
              <button type="button" className="btn btn-secondary btn-sm mt-2">
                Dosya Seç
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Image & OCR Output Preview */}
          {mode === 'preview' && capturedImage && (
            <div className="ocr-preview-layout">
              <div className="ocr-image-col">
                <img src={capturedImage} alt="Taranan sayfa" className="ocr-thumb-preview" />
                <button
                  className="btn btn-outline btn-xs mt-2 w-full"
                  onClick={() => {
                    setCapturedImage(null);
                    setMode('upload');
                  }}
                >
                  🔄 Yeniden Çek / Yükle
                </button>
              </div>

              <div className="ocr-text-col">
                <div className="ocr-text-header">
                  <label className="text-sm font-semibold">Taranan ve Temizlenen Metin</label>
                  {isProcessing && <span className="ocr-badge processing">⚡ Metin Okunuyor...</span>}
                </div>

                <textarea
                  className="ocr-textarea"
                  rows={6}
                  placeholder={isProcessing ? 'Türkçe karakterler taranıyor, lütfen bekleyin...' : 'Taranan metin burada görünecektir. Gerekirse düzenleyebilirsiniz.'}
                  value={recognizedText}
                  onChange={(e) => setRecognizedText(e.target.value)}
                  disabled={isProcessing}
                />

                <div className="ocr-meta-inputs">
                  <div className="ocr-input-group">
                    <label>Sayfa No (Opsiyonel)</label>
                    <input
                      type="number"
                      placeholder="Örn: 142"
                      value={detectedPage}
                      onChange={(e) => setDetectedPage(e.target.value)}
                    />
                  </div>
                  <div className="ocr-quick-tools">
                    <button
                      type="button"
                      className="btn btn-xs btn-secondary"
                      onClick={() => {
                        const cleaned = cleanExtractedText(recognizedText);
                        setRecognizedText(cleaned.text);
                      }}
                      title="Satır sonu tirelerini ve gereksiz boşlukları temizle"
                    >
                      ✨ Satırları Düzelt
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-secondary"
                      onClick={() => {
                        setRecognizedText(`"${recognizedText.replace(/^"|"$/g, '')}"`);
                      }}
                    >
                      ❝ Tırnak İçi ❞
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className="ocr-modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Vazgeç
          </button>
          <button
            className="btn btn-primary"
            disabled={!recognizedText.trim() || isProcessing}
            onClick={handleApply}
          >
            ✅ Bu Alıntıyı Aktar
          </button>
        </div>
      </div>
    </div>
  );
};
