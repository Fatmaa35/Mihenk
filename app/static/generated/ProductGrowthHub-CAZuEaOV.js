import { r as l, j as e, a as y } from "./main-CLEpNDmM.js";
const $e = ({
  isOpen: b,
  onClose: P,
  onUseQuote: F,
  initialBookTitle: L
}) => {
  const [v, u] = l.useState("upload"), [E, I] = l.useState(null), [B, K] = l.useState(""), [R, w] = l.useState(""), [s, x] = l.useState(!1), [N, f] = l.useState(null), j = l.useRef(null), A = l.useRef(null), C = l.useRef(null), $ = async () => {
    f(null);
    try {
      const c = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      j.current && (j.current.srcObject = c, j.current.play(), u("camera"));
    } catch (c) {
      console.warn("Camera access error:", c), f("Kameraya erişilemedi. Lütfen izin verin veya dosya yükleme modunu kullanın."), u("upload");
    }
  }, z = () => {
    j.current && j.current.srcObject && (j.current.srcObject.getTracks().forEach((d) => d.stop()), j.current.srcObject = null);
  };
  l.useEffect(() => (b || (z(), I(null), K(""), w(""), x(!1)), () => {
    z();
  }), [b]);
  const U = () => {
    if (!j.current || !A.current) return;
    const c = j.current, d = A.current;
    d.width = c.videoWidth || 1280, d.height = c.videoHeight || 720;
    const g = d.getContext("2d");
    if (!g) return;
    g.drawImage(c, 0, 0, d.width, d.height);
    const S = d.toDataURL("image/jpeg", 0.9);
    z(), I(S), u("preview"), Y(S);
  }, Z = (c) => {
    var S;
    const d = (S = c.target.files) == null ? void 0 : S[0];
    if (!d) return;
    const g = new FileReader();
    g.onload = () => {
      const k = g.result;
      I(k), u("preview"), Y(k);
    }, g.readAsDataURL(d);
  }, G = (c) => {
    let d = c, g;
    const S = d.match(/(?:sayfa|s\.|page)?\s*[-—~]?\s*(\d{1,4})\s*[-—~]?/i);
    return S && parseInt(S[1], 10) > 0 && parseInt(S[1], 10) < 3e3 && (g = parseInt(S[1], 10)), d = d.replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2"), d = d.split(`
`).map((k) => k.trim()).filter((k) => k.length > 0 && !/^\d{1,4}$/.test(k)).join(" ").replace(/\s{2,}/g, " ").trim(), { text: d, page: g };
  }, Y = async (c) => {
    x(!0), K("");
    try {
      const d = window;
      if (d.Tesseract || await new Promise((g, S) => {
        const k = document.createElement("script");
        k.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js", k.onload = () => g(), k.onerror = () => S(new Error("Tesseract yüklenemedi")), document.head.appendChild(k);
      }), d.Tesseract) {
        const g = await d.Tesseract.createWorker("tur+eng"), S = await g.recognize(c);
        await g.terminate();
        const k = S.data.text || "", _ = G(k);
        K(_.text || k), _.page && w(_.page.toString());
      } else
        throw new Error("Tesseract motoru hazır değil.");
    } catch (d) {
      console.warn("OCR processing fallback:", d), K("Fotoğraftaki metin tarandı. Lütfen aşağıdaki alıntıyı kontrol edip düzenleyin.");
    } finally {
      x(!1);
    }
  }, H = () => {
    if (!B.trim()) return;
    const c = R ? parseInt(R, 10) : void 0;
    F(B.trim(), c), P();
  };
  return b ? /* @__PURE__ */ e.jsx("div", { className: "ocr-modal-overlay", children: /* @__PURE__ */ e.jsxs("div", { className: "ocr-modal-container", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "ocr-modal-header", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "ocr-header-title", children: [
        /* @__PURE__ */ e.jsx("span", { className: "ocr-icon", children: "📸" }),
        /* @__PURE__ */ e.jsxs("div", { children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Kameradan Alıntı & Pasaj Tara" }),
          /* @__PURE__ */ e.jsx("p", { className: "ocr-subtitle", children: L ? `${L} için sayfa fotoğrafı çekin` : "Kitap sayfasını tarayıp dijital alıntıya dönüştürün" })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("button", { className: "ocr-close-btn", onClick: P, "aria-label": "Kapat", children: "✕" })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { className: "ocr-modal-body", children: [
      N && /* @__PURE__ */ e.jsxs("div", { className: "ocr-alert warning", children: [
        /* @__PURE__ */ e.jsx("span", { children: "⚠️" }),
        " ",
        N
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "ocr-tabs", children: [
        /* @__PURE__ */ e.jsx(
          "button",
          {
            className: `ocr-tab-btn ${v === "camera" ? "active" : ""}`,
            onClick: $,
            children: "📷 Canlı Kamera"
          }
        ),
        /* @__PURE__ */ e.jsx(
          "button",
          {
            className: `ocr-tab-btn ${v === "upload" ? "active" : ""}`,
            onClick: () => {
              z(), u("upload");
            },
            children: "📁 Fotoğraf Yükle"
          }
        ),
        E && /* @__PURE__ */ e.jsx(
          "button",
          {
            className: `ocr-tab-btn ${v === "preview" ? "active" : ""}`,
            onClick: () => u("preview"),
            children: "🖼️ Çekilen Görsel"
          }
        )
      ] }),
      v === "camera" && /* @__PURE__ */ e.jsxs("div", { className: "ocr-camera-viewport", children: [
        /* @__PURE__ */ e.jsx("video", { ref: j, playsInline: !0, autoPlay: !0, className: "ocr-video-stream" }),
        /* @__PURE__ */ e.jsx("div", { className: "ocr-scan-guide", children: /* @__PURE__ */ e.jsx("div", { className: "ocr-guide-box", children: /* @__PURE__ */ e.jsx("span", { className: "ocr-guide-text", children: "Kitap pasajını kutucuğun içine hizalayın" }) }) }),
        /* @__PURE__ */ e.jsx("div", { className: "ocr-camera-controls", children: /* @__PURE__ */ e.jsx("button", { className: "ocr-capture-btn", onClick: U, children: /* @__PURE__ */ e.jsx("div", { className: "ocr-capture-inner" }) }) })
      ] }),
      v === "upload" && /* @__PURE__ */ e.jsxs(
        "div",
        {
          className: "ocr-dropzone",
          onClick: () => {
            var c;
            return (c = C.current) == null ? void 0 : c.click();
          },
          children: [
            /* @__PURE__ */ e.jsx("div", { className: "ocr-dropzone-icon", children: "📖" }),
            /* @__PURE__ */ e.jsx("h4", { children: "Kitap Sayfası Fotoğrafı Yükleyin" }),
            /* @__PURE__ */ e.jsx("p", { children: "Telefonunuzdan veya bilgisayarınızdan bir sayfa fotoğrafı seçin (JPG, PNG)" }),
            /* @__PURE__ */ e.jsx("button", { type: "button", className: "btn btn-secondary btn-sm mt-2", children: "Dosya Seç" }),
            /* @__PURE__ */ e.jsx(
              "input",
              {
                ref: C,
                type: "file",
                accept: "image/*",
                capture: "environment",
                style: { display: "none" },
                onChange: Z
              }
            )
          ]
        }
      ),
      v === "preview" && E && /* @__PURE__ */ e.jsxs("div", { className: "ocr-preview-layout", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "ocr-image-col", children: [
          /* @__PURE__ */ e.jsx("img", { src: E, alt: "Taranan sayfa", className: "ocr-thumb-preview" }),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-outline btn-xs mt-2 w-full",
              onClick: () => {
                I(null), u("upload");
              },
              children: "🔄 Yeniden Çek / Yükle"
            }
          )
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "ocr-text-col", children: [
          /* @__PURE__ */ e.jsxs("div", { className: "ocr-text-header", children: [
            /* @__PURE__ */ e.jsx("label", { className: "text-sm font-semibold", children: "Taranan ve Temizlenen Metin" }),
            s && /* @__PURE__ */ e.jsx("span", { className: "ocr-badge processing", children: "⚡ Metin Okunuyor..." })
          ] }),
          /* @__PURE__ */ e.jsx(
            "textarea",
            {
              className: "ocr-textarea",
              rows: 6,
              placeholder: s ? "Türkçe karakterler taranıyor, lütfen bekleyin..." : "Taranan metin burada görünecektir. Gerekirse düzenleyebilirsiniz.",
              value: B,
              onChange: (c) => K(c.target.value),
              disabled: s
            }
          ),
          /* @__PURE__ */ e.jsxs("div", { className: "ocr-meta-inputs", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "ocr-input-group", children: [
              /* @__PURE__ */ e.jsx("label", { children: "Sayfa No (Opsiyonel)" }),
              /* @__PURE__ */ e.jsx(
                "input",
                {
                  type: "number",
                  placeholder: "Örn: 142",
                  value: R,
                  onChange: (c) => w(c.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ e.jsxs("div", { className: "ocr-quick-tools", children: [
              /* @__PURE__ */ e.jsx(
                "button",
                {
                  type: "button",
                  className: "btn btn-xs btn-secondary",
                  onClick: () => {
                    const c = G(B);
                    K(c.text);
                  },
                  title: "Satır sonu tirelerini ve gereksiz boşlukları temizle",
                  children: "✨ Satırları Düzelt"
                }
              ),
              /* @__PURE__ */ e.jsx(
                "button",
                {
                  type: "button",
                  className: "btn btn-xs btn-secondary",
                  onClick: () => {
                    K(`"${B.replace(/^"|"$/g, "")}"`);
                  },
                  children: "❝ Tırnak İçi ❞"
                }
              )
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("canvas", { ref: A, style: { display: "none" } })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { className: "ocr-modal-footer", children: [
      /* @__PURE__ */ e.jsx("button", { className: "btn btn-outline", onClick: P, children: "Vazgeç" }),
      /* @__PURE__ */ e.jsx(
        "button",
        {
          className: "btn btn-primary",
          disabled: !B.trim() || s,
          onClick: H,
          children: "✅ Bu Alıntıyı Aktar"
        }
      )
    ] })
  ] }) }) : null;
}, Ee = ({
  clubId: b,
  activeBookTitle: P,
  activeBookId: F,
  userCurrentPage: L = 0,
  onSessionFinished: v
}) => {
  var de, ue, me, ie;
  const [u, E] = l.useState(null), [I, B] = l.useState(!0), [K, R] = l.useState(null), [w, s] = l.useState("reading"), [x, N] = l.useState(25), [f, j] = l.useState(1500), [A, C] = l.useState(!1), [$] = l.useState(L), [z, U] = l.useState(L), [Z, G] = l.useState(""), [Y, H] = l.useState(!1), [c, d] = l.useState("none"), [g, S] = l.useState(0.5), k = l.useRef(null), _ = l.useRef(null), [V, r] = l.useState(""), [ce, te] = l.useState(!1), J = async () => {
    try {
      const i = await fetch(`/me/book-clubs/${b}/room`);
      if (!i.ok) throw new Error("Oda bilgisi alınamadı.");
      const p = await i.json();
      E(p);
    } catch (i) {
      R(i.message || "Odaya bağlanırken hata oluştu.");
    } finally {
      B(!1);
    }
  };
  l.useEffect(() => {
    J();
    const i = setInterval(J, 1e4);
    return () => clearInterval(i);
  }, [b]), l.useEffect(() => {
    let i = null;
    return A && f > 0 ? i = setInterval(() => {
      j((p) => p - 1);
    }, 1e3) : f === 0 && A && (C(!1), pe(), w === "reading" ? (s("break"), j(300)) : w === "break" ? (s("discussion"), j(600)) : (s("reading"), j(x * 60))), () => clearInterval(i);
  }, [A, f, w, x]);
  const pe = () => {
    try {
      const i = new (window.AudioContext || window.webkitAudioContext)(), p = i.createOscillator(), T = i.createGain();
      p.type = "sine", p.frequency.setValueAtTime(587.33, i.currentTime), p.frequency.exponentialRampToValueAtTime(880, i.currentTime + 0.5), T.gain.setValueAtTime(0.3, i.currentTime), T.gain.exponentialRampToValueAtTime(1e-3, i.currentTime + 1.5), p.connect(T), T.connect(i.destination), p.start(), p.stop(i.currentTime + 1.5);
    } catch (i) {
      console.warn("Audio play failed", i);
    }
  };
  l.useEffect(() => {
    if (_.current && (_.current.stop(), _.current = null), c !== "none") {
      try {
        const i = new (window.AudioContext || window.webkitAudioContext)();
        k.current = i;
        const p = i.sampleRate * 2, T = i.createBuffer(1, p, i.sampleRate), D = T.getChannelData(0);
        let q = 0;
        for (let O = 0; O < p; O++) {
          const re = Math.random() * 2 - 1;
          if (c === "rain")
            D[O] = (q + 0.02 * re) / 1.02, q = D[O], D[O] *= 3.5;
          else if (c === "fireplace") {
            const o = Math.random() > 0.997 ? (Math.random() - 0.5) * 4 : 0;
            D[O] = (q + 0.04 * re) / 1.04 + o, q = D[O];
          } else
            D[O] = (q + 0.08 * re) / 1.08, q = D[O];
        }
        const M = i.createBufferSource();
        M.buffer = T, M.loop = !0;
        const X = i.createBiquadFilter();
        X.type = c === "rain" ? "lowpass" : "bandpass", X.frequency.value = c === "rain" ? 800 : 1200;
        const le = i.createGain();
        le.gain.value = g * 0.4, M.connect(X), X.connect(le), le.connect(i.destination), M.start(0), _.current = {
          stop: () => {
            try {
              M.stop(), i.close();
            } catch {
            }
          }
        };
      } catch (i) {
        console.warn("Ambient audio init failed", i);
      }
      return () => {
        _.current && (_.current.stop(), _.current = null);
      };
    }
  }, [c, g]);
  const Q = (i) => {
    N(i), j(i * 60), s("reading"), C(!0), H(!1);
  }, W = async () => {
    const i = Math.max(0, z - $);
    try {
      const p = await fetch(`/me/book-clubs/${b}/room/complete-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: u == null ? void 0 : u.id,
          book_id: F,
          minutes_read: x,
          pages_read: i,
          current_page: z > 0 ? z : void 0,
          notes: Z.trim() || void 0
        })
      });
      if (!p.ok) throw new Error("Seans kaydedilemedi.");
      const T = await p.json();
      E(T), H(!0), v && v();
    } catch (p) {
      alert(p.message || "Seans kaydedilirken hata oluştu.");
    }
  }, he = async (i) => {
    if (i.preventDefault(), !(!V.trim() || !u)) {
      te(!0);
      try {
        const p = await fetch(`/me/book-clubs/${b}/room/messages?room_id=${u.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: V.trim() })
        });
        if (!p.ok) throw new Error("Mesaj gönderilemedi.");
        const T = await p.json();
        E(T), r("");
      } catch (p) {
        console.warn("Send msg error:", p);
      } finally {
        te(!1);
      }
    }
  }, xe = (i) => {
    const p = Math.floor(i / 60), T = i % 60;
    return `${p.toString().padStart(2, "0")}:${T.toString().padStart(2, "0")}`;
  }, oe = w === "reading" ? x * 60 : w === "break" ? 300 : 600, ne = Math.min(100, Math.max(0, (oe - f) / oe * 100));
  return I ? /* @__PURE__ */ e.jsx("div", { className: "p-8 text-center text-muted", children: "Canlı okuma odası yükleniyor..." }) : K ? /* @__PURE__ */ e.jsx("div", { className: "p-4 alert warning", children: K }) : /* @__PURE__ */ e.jsxs("div", { className: "live-room-container", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "live-room-header", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "live-room-badge", children: [
        /* @__PURE__ */ e.jsx("span", { className: "live-dot" }),
        " CANLI OKUMA ODASI"
      ] }),
      /* @__PURE__ */ e.jsx("h2", { className: "live-room-title", children: (u == null ? void 0 : u.title) || "Mihenk Birlikte Okuyoruz Seansı" }),
      /* @__PURE__ */ e.jsxs("p", { className: "live-room-subtitle", children: [
        "📖 Aktif Kitap: ",
        /* @__PURE__ */ e.jsx("strong", { children: P || "Kulüp Kitabı" })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { className: "live-room-grid", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "live-focus-card", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "phase-pill-group", children: [
          /* @__PURE__ */ e.jsxs(
            "button",
            {
              className: `phase-pill ${w === "reading" ? "active" : ""}`,
              onClick: () => {
                s("reading"), j(x * 60), C(!1);
              },
              children: [
                "📚 Odaklanma (",
                x,
                " dk)"
              ]
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: `phase-pill ${w === "break" ? "active" : ""}`,
              onClick: () => {
                s("break"), j(300), C(!1);
              },
              children: "☕ Mola (5 dk)"
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: `phase-pill ${w === "discussion" ? "active" : ""}`,
              onClick: () => {
                s("discussion"), j(600), C(!1);
              },
              children: "💬 Bölüm Tartışması (10 dk)"
            }
          )
        ] }),
        /* @__PURE__ */ e.jsx("div", { className: "timer-display-wrap", children: /* @__PURE__ */ e.jsxs("div", { className: "timer-circle", children: [
          /* @__PURE__ */ e.jsxs("svg", { className: "timer-svg", viewBox: "0 0 100 100", children: [
            /* @__PURE__ */ e.jsx("circle", { className: "timer-bg", cx: "50", cy: "50", r: "44" }),
            /* @__PURE__ */ e.jsx(
              "circle",
              {
                className: "timer-progress",
                cx: "50",
                cy: "50",
                r: "44",
                strokeDasharray: "276.46",
                strokeDashoffset: 276.46 - 276.46 * ne / 100
              }
            )
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "timer-content", children: [
            /* @__PURE__ */ e.jsx("span", { className: "timer-time", children: xe(f) }),
            /* @__PURE__ */ e.jsx("span", { className: "timer-phase-label", children: w === "reading" ? "📖 Sessiz Okuma" : w === "break" ? "☕ Çay & Kahve Molası" : "💬 Canlı Değerlendirme" })
          ] })
        ] }) }),
        /* @__PURE__ */ e.jsxs("div", { className: "timer-action-buttons", children: [
          A ? /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-secondary btn-lg",
              onClick: () => C(!1),
              children: "⏸ Duraklat"
            }
          ) : /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-primary btn-lg",
              onClick: () => C(!0),
              children: "▶ Seansı Başlat"
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-outline",
              onClick: () => Q(25),
              children: "🔄 25 dk Sıfırla"
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-outline",
              onClick: () => Q(45),
              children: "⏱ 45 dk"
            }
          )
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "ambient-sound-bar", children: [
          /* @__PURE__ */ e.jsx("span", { className: "ambient-label", children: "🎧 Odaklanma Sesi:" }),
          /* @__PURE__ */ e.jsxs("div", { className: "ambient-buttons", children: [
            /* @__PURE__ */ e.jsx(
              "button",
              {
                className: `btn btn-xs ${c === "none" ? "btn-primary" : "btn-outline"}`,
                onClick: () => d("none"),
                children: "Sessiz"
              }
            ),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                className: `btn btn-xs ${c === "rain" ? "btn-primary" : "btn-outline"}`,
                onClick: () => d("rain"),
                children: "🌧️ Yağmur"
              }
            ),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                className: `btn btn-xs ${c === "fireplace" ? "btn-primary" : "btn-outline"}`,
                onClick: () => d("fireplace"),
                children: "🔥 Şömine"
              }
            ),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                className: `btn btn-xs ${c === "whitenoise" ? "btn-primary" : "btn-outline"}`,
                onClick: () => d("whitenoise"),
                children: "☕ Beyaz Gürültü"
              }
            )
          ] }),
          c !== "none" && /* @__PURE__ */ e.jsx("div", { className: "ambient-volume", children: /* @__PURE__ */ e.jsx(
            "input",
            {
              type: "range",
              min: "0.1",
              max: "1.0",
              step: "0.05",
              value: g,
              onChange: (i) => S(parseFloat(i.target.value))
            }
          ) })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "session-logger-box", children: [
          /* @__PURE__ */ e.jsx("h4", { children: "📝 Bu Seanstaki İlerlemem" }),
          /* @__PURE__ */ e.jsxs("div", { className: "session-inputs-row", children: [
            /* @__PURE__ */ e.jsxs("div", { children: [
              /* @__PURE__ */ e.jsx("label", { children: "Başlangıç Sayfası" }),
              /* @__PURE__ */ e.jsx("input", { type: "number", value: $, readOnly: !0, className: "input-readonly" })
            ] }),
            /* @__PURE__ */ e.jsxs("div", { children: [
              /* @__PURE__ */ e.jsx("label", { children: "Ulaştığım Sayfa" }),
              /* @__PURE__ */ e.jsx(
                "input",
                {
                  type: "number",
                  value: z,
                  min: $,
                  onChange: (i) => U(parseInt(i.target.value, 10) || $)
                }
              )
            ] }),
            /* @__PURE__ */ e.jsx("div", { className: "session-diff-badge", children: /* @__PURE__ */ e.jsxs("span", { children: [
              "+",
              Math.max(0, z - $),
              " sayfa"
            ] }) })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "mt-3", children: [
            /* @__PURE__ */ e.jsx("label", { children: "Seans Notu / Çarpıcı Alıntı (Opsiyonel)" }),
            /* @__PURE__ */ e.jsx(
              "textarea",
              {
                rows: 2,
                placeholder: "Bu seansta altını çizdiğin bir cümle veya aldığın kısa bir not...",
                value: Z,
                onChange: (i) => G(i.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "mt-3 flex justify-between items-center", children: [
            Y ? /* @__PURE__ */ e.jsx("span", { className: "text-success font-semibold text-sm", children: "✅ Seans okuma geçmişine başarıyla işlendi!" }) : /* @__PURE__ */ e.jsx("span", { className: "text-muted text-xs", children: "Seans tamamlanınca kulüp yol haritana yansır." }),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                className: "btn btn-success btn-sm",
                onClick: W,
                children: "💾 Seansı İstatistiklerime Kaydet"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "live-sidebar", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "live-participants-card", children: [
          /* @__PURE__ */ e.jsx("div", { className: "participants-header", children: /* @__PURE__ */ e.jsxs("h3", { children: [
            "👥 Kulüp Okurları (",
            ((de = u == null ? void 0 : u.participants) == null ? void 0 : de.length) || 0,
            ")"
          ] }) }),
          /* @__PURE__ */ e.jsx("div", { className: "participants-list", children: (ue = u == null ? void 0 : u.participants) == null ? void 0 : ue.map((i) => /* @__PURE__ */ e.jsxs("div", { className: "participant-item", children: [
            /* @__PURE__ */ e.jsx("div", { className: "participant-avatar", children: i.display_name.charAt(0).toUpperCase() }),
            /* @__PURE__ */ e.jsxs("div", { className: "participant-info", children: [
              /* @__PURE__ */ e.jsxs("div", { className: "participant-name", children: [
                i.display_name,
                i.role === "owner" && /* @__PURE__ */ e.jsx("span", { className: "role-tag owner", children: "Kurucu" }),
                i.role === "moderator" && /* @__PURE__ */ e.jsx("span", { className: "role-tag mod", children: "Moderatör" })
              ] }),
              /* @__PURE__ */ e.jsxs("div", { className: "participant-sub", children: [
                "📖 ",
                i.reading_book_title || P || "Kitap",
                " • s. ",
                i.current_page || 0
              ] })
            ] })
          ] }, i.user_id)) })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "live-chat-card", children: [
          /* @__PURE__ */ e.jsxs("div", { className: "chat-header", children: [
            /* @__PURE__ */ e.jsx("h3", { children: "💬 Canlı Seans Sohbeti" }),
            /* @__PURE__ */ e.jsx("span", { className: "text-xs text-muted", children: "Mola ve tartışma fazında aktiftir" })
          ] }),
          /* @__PURE__ */ e.jsx("div", { className: "chat-messages-container", children: ((me = u == null ? void 0 : u.messages) == null ? void 0 : me.length) === 0 ? /* @__PURE__ */ e.jsx("div", { className: "chat-empty", children: "Henüz mesaj yok. Seans molasında ilk düşünceni yaz!" }) : (ie = u == null ? void 0 : u.messages) == null ? void 0 : ie.map((i) => /* @__PURE__ */ e.jsxs("div", { className: "chat-bubble", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "chat-meta", children: [
              /* @__PURE__ */ e.jsx("strong", { children: i.display_name }),
              /* @__PURE__ */ e.jsx("span", { children: new Date(i.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })
            ] }),
            /* @__PURE__ */ e.jsx("div", { className: "chat-text", children: i.content })
          ] }, i.id)) }),
          /* @__PURE__ */ e.jsxs("form", { onSubmit: he, className: "chat-input-form", children: [
            /* @__PURE__ */ e.jsx(
              "input",
              {
                type: "text",
                placeholder: "Düşünceni veya okuduğun sayfayı yaz...",
                value: V,
                onChange: (i) => r(i.target.value),
                disabled: ce
              }
            ),
            /* @__PURE__ */ e.jsx("button", { type: "submit", className: "btn btn-primary btn-sm", disabled: ce || !V.trim(), children: "Gönder" })
          ] })
        ] })
      ] })
    ] })
  ] });
}, Re = ["Roman", "Bilim Kurgu", "Fantastik", "Polisiye", "Tarih", "Psikoloji", "Felsefe", "Şiir"];
function Me() {
  var be, ye, je, ge, fe, ke, ve, Ne, Se, we, _e, Te, Ke, Ce, ze, Oe, Be, Ae;
  const [b, P] = l.useState(null), [F, L] = l.useState(null), [v, u] = l.useState(null), [E, I] = l.useState([]), [B, K] = l.useState([]), [R, w] = l.useState([]), [s, x] = l.useState(null), [N, f] = l.useState("reading"), [j, A] = l.useState(!1), [C, $] = l.useState(""), [z, U] = l.useState(""), [Z, G] = l.useState("discussion"), [Y, H] = l.useState([]), [c, d] = l.useState(""), [g, S] = l.useState("mixed"), [k, _] = l.useState(""), [V, r] = l.useState(""), [ce, te] = l.useState(!0), [J, pe] = l.useState(10), Q = l.useRef(null);
  async function W() {
    te(!0), r("");
    const a = await Promise.allSettled([
      y("/me/weekly-summary"),
      y("/me/onboarding"),
      y("/me/notification-preferences"),
      y("/me/reading-lists"),
      y("/me/book-clubs"),
      y("/books")
    ]);
    a[0].status === "fulfilled" && P(a[0].value), a[1].status === "fulfilled" && (L(a[1].value), d(a[1].value.liked_authors.join(", ")), H(a[1].value.preferred_genres || []), S(a[1].value.pace_preference || "mixed")), a[2].status === "fulfilled" && u(a[2].value), a[3].status === "fulfilled" && I(a[3].value), a[4].status === "fulfilled" && K(a[4].value), a[5].status === "fulfilled" && w(a[5].value), a.some((t) => t.status === "rejected") && r("Bazı ürün verileri yüklenemedi; yeniden deneyebilirsin."), te(!1);
  }
  l.useEffect(() => {
    W();
  }, []);
  async function he(a) {
    a.preventDefault(), r("Kaydediliyor…");
    const t = await y("/me/onboarding", {
      method: "PUT",
      body: JSON.stringify({
        liked_authors: c.split(",").map((n) => n.trim()).filter(Boolean).slice(0, 20),
        liked_book_ids: [],
        preferred_genres: Y,
        pace_preference: g,
        tone_preference: "balanced",
        focus_preference: "balanced",
        completed: !0
      })
    });
    L(t), r("Zevk profilin önerilere eklendi.");
  }
  async function xe(a) {
    a.preventDefault(), r("Kitaplık içe aktarılıyor…");
    const t = await y("/me/library/import", { method: "POST", body: JSON.stringify({ csv_text: k }) });
    r(
      `${t.imported} kitap aktarıldı · ${t.catalog_matches} katalog eşleşmesi · ${t.custom_books} kişisel kayıt.`
    ), _(""), window.dispatchEvent(new CustomEvent("pkm-refresh"));
  }
  async function oe(a) {
    a && _(await a.text());
  }
  async function ne(a) {
    u(a), await y("/me/notification-preferences", { method: "PUT", body: JSON.stringify(a) }), r("Bildirim tercihlerin kaydedildi.");
  }
  async function de(a) {
    a.preventDefault();
    const t = new FormData(a.currentTarget);
    await y("/me/reading-lists", {
      method: "POST",
      body: JSON.stringify({
        title: t.get("title"),
        description: t.get("description"),
        visibility: t.get("visibility")
      })
    }), a.currentTarget.reset(), await W();
  }
  async function ue(a) {
    a.preventDefault();
    const t = new FormData(a.currentTarget), n = await y("/me/book-clubs", {
      method: "POST",
      body: JSON.stringify({
        name: t.get("name"),
        description: t.get("description"),
        rules: t.get("rules") || "",
        visibility: t.get("visibility") || "private"
      })
    });
    a.currentTarget.reset(), await W(), x(n), f("lobby"), r("Kulübün başarıyla oluşturuldu!");
  }
  async function me(a) {
    a.preventDefault();
    const t = a.currentTarget, n = new FormData(t);
    r("Kulübe katılınıyor…");
    try {
      const h = await y("/me/book-clubs/join", {
        method: "POST",
        body: JSON.stringify({ invite_code: n.get("invite_code") })
      });
      t.reset(), await W(), x(h), f("reading"), r("Kulübe katıldın. Aktif okumaya hoş geldin!"), requestAnimationFrame(
        () => {
          var ee;
          return (ee = Q.current) == null ? void 0 : ee.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      );
    } catch (h) {
      r(h instanceof Error ? h.message : "Kulübe katılınamadı.");
    }
  }
  async function ie(a) {
    r("Kulüp açılıyor…");
    try {
      const t = await y(`/me/book-clubs/${a}`);
      x(t), f("reading"), r(""), requestAnimationFrame(
        () => {
          var n;
          return (n = Q.current) == null ? void 0 : n.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      );
    } catch (t) {
      r(t instanceof Error ? t.message : "Kulüp açılamadı.");
    }
  }
  async function i(a) {
    if (s) {
      r("Kitaplığına ekleniyor ve okuma başlatılıyor…");
      try {
        const t = await y(`/me/book-clubs/${s.id}/join-reading`, {
          method: "POST",
          body: JSON.stringify({
            book_id: a,
            daily_target_pages: J,
            shelf: "reading"
          })
        });
        x(t), r(`Okumaya katıldın! Günlük hedefin: günde ${J} sayfa.`), window.dispatchEvent(new CustomEvent("pkm-refresh"));
      } catch (t) {
        r(t instanceof Error ? t.message : "Okumaya katılınamadı.");
      }
    }
  }
  async function p(a) {
    if (a.preventDefault(), !s) return;
    const t = new FormData(a.currentTarget), n = String(t.get("book_id")), h = Number(t.get("current_page")), ee = Number(t.get("daily_target_pages")) || J, ae = R.find((se) => se.id === n);
    try {
      const se = await y(`/me/book-clubs/${s.id}/progress`, {
        method: "PUT",
        body: JSON.stringify({
          book_id: n,
          current_page: h,
          total_pages: (ae == null ? void 0 : ae.page_count) || null,
          daily_target_pages: ee
        })
      });
      x(se), r(`İlerlemen kaydedildi (s. ${h}). Ulaştığın tartışmalar açıldı!`), window.dispatchEvent(new CustomEvent("pkm-refresh"));
    } catch (se) {
      r(se instanceof Error ? se.message : "İlerleme kaydedilemedi.");
    }
  }
  async function T(a) {
    if (a.preventDefault(), !s) return;
    const t = a.currentTarget, n = new FormData(t);
    try {
      const h = await y(`/me/book-clubs/${s.id}/discussions`, {
        method: "POST",
        body: JSON.stringify({
          book_id: n.get("book_id"),
          content: n.get("content"),
          page_number: n.get("page_number") ? Number(n.get("page_number")) : null,
          chapter_title: n.get("chapter_title") || null,
          discussion_type: n.get("discussion_type") || "discussion"
        })
      });
      x(h), t.reset(), r("Paylaşımın kulüp tartışmalarına eklendi.");
    } catch (h) {
      r(h instanceof Error ? h.message : "Tartışma oluşturulamadı.");
    }
  }
  async function D(a, t) {
    if (s)
      try {
        const n = await y(
          `/me/book-clubs/${s.id}/discussions/${a}/reactions`,
          {
            method: "POST",
            body: JSON.stringify({ reaction_type: t })
          }
        );
        x(n);
      } catch (n) {
        r(n instanceof Error ? n.message : "Tepki kaydedilemedi.");
      }
  }
  async function q(a) {
    if (a.preventDefault(), !s) return;
    const t = a.currentTarget, n = new FormData(t);
    try {
      const h = await y(`/me/book-clubs/${s.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          title: n.get("title"),
          description: n.get("description"),
          event_type: n.get("event_type") || "general",
          event_date: n.get("event_date"),
          location: n.get("location") || ""
        })
      });
      x(h), t.reset(), r("Yeni kulüp buluşması takvime eklendi.");
    } catch (h) {
      r(h instanceof Error ? h.message : "Etkinlik oluşturulamadı.");
    }
  }
  async function M(a, t) {
    if (s)
      try {
        const n = await y(
          `/me/book-clubs/${s.id}/events/${a}/rsvp`,
          {
            method: "PUT",
            body: JSON.stringify({ status: t })
          }
        );
        x(n), r(`Katılım durumun kaydedildi: ${t === "attending" ? "Katılıyorum" : t === "maybe" ? "Belki" : "Katılamıyorum"}`);
      } catch (n) {
        r(n instanceof Error ? n.message : "Katılım durumu kaydedilemedi.");
      }
  }
  async function X(a) {
    if (a.preventDefault(), !s) return;
    const t = a.currentTarget, n = new FormData(t);
    try {
      const h = await y(`/me/book-clubs/${s.id}/polls`, {
        method: "POST",
        body: JSON.stringify({
          title: n.get("title"),
          option_book_ids: n.getAll("option_book_ids")
        })
      });
      x(h), t.reset(), r("Yeni kitap oylaması açıldı.");
    } catch (h) {
      r(h instanceof Error ? h.message : "Oylama açılamadı.");
    }
  }
  async function le(a, t) {
    if (s)
      try {
        const n = await y(
          `/me/book-clubs/${s.id}/polls/${a}/vote`,
          {
            method: "PUT",
            body: JSON.stringify({ option_id: t })
          }
        );
        x(n), r("Oyun kaydedildi!");
      } catch (n) {
        r(n instanceof Error ? n.message : "Oy verilemedi.");
      }
  }
  async function O(a) {
    if (a.preventDefault(), !s) return;
    const t = new FormData(a.currentTarget);
    try {
      const n = await y(`/me/book-clubs/${s.id}/reads`, {
        method: "PUT",
        body: JSON.stringify({
          book_id: t.get("book_id"),
          status: t.get("status") || "reading",
          start_date: t.get("start_date") || null,
          target_date: t.get("target_date") || null
        })
      });
      x(n), r("Kulübün okuma planı güncellendi.");
    } catch (n) {
      r(n instanceof Error ? n.message : "Okuma güncellenemedi.");
    }
  }
  async function re(a, t) {
    if (s)
      try {
        const n = await y(
          `/me/book-clubs/${s.id}/members/${a}/role`,
          {
            method: "PUT",
            body: JSON.stringify({ role: t })
          }
        );
        x(n), r("Üye yetkisi güncellendi.");
      } catch (n) {
        r(n instanceof Error ? n.message : "Yetki güncellenemedi.");
      }
  }
  const o = (s == null ? void 0 : s.active_read) || (s == null ? void 0 : s.reads.find((a) => a.status === "reading")) || null, m = s == null ? void 0 : s.user_progress.find((a) => o && a.book_id === o.book_id);
  return ce ? /* @__PURE__ */ e.jsxs("div", { className: "growth-skeleton", role: "status", "aria-label": "Okur merkezi yükleniyor", children: [
    /* @__PURE__ */ e.jsx("i", {}),
    /* @__PURE__ */ e.jsx("i", {}),
    /* @__PURE__ */ e.jsx("i", {})
  ] }) : /* @__PURE__ */ e.jsxs("section", { className: "growth-hub", "aria-labelledby": "growth-title", children: [
    /* @__PURE__ */ e.jsxs("header", { className: "growth-hero", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "growth-hero-text", children: [
        /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "OKUR MERKEZİ & KİTAP KULÜPLERİ" }),
        /* @__PURE__ */ e.jsx("h1", { id: "growth-title", children: "Mihenk Topluluğu & Kişisel Yolculuğun" }),
        /* @__PURE__ */ e.jsx("p", { children: "Birlikte oku, yol haritasında ortak ilerle, spoiler korumalı derin tartışmalara katıl ve rozetler kazan." })
      ] }),
      /* @__PURE__ */ e.jsxs("button", { type: "button", className: "btn-growth-refresh", onClick: W, children: [
        /* @__PURE__ */ e.jsx("span", { children: "🔄" }),
        " Yenile"
      ] })
    ] }),
    V && /* @__PURE__ */ e.jsx("p", { className: "growth-status", role: "status", children: V }),
    /* @__PURE__ */ e.jsxs("div", { className: "growth-grid", children: [
      /* @__PURE__ */ e.jsxs("article", { className: "growth-card growth-weekly", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "card-header-line", children: [
          /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "BU HAFTA" }),
          /* @__PURE__ */ e.jsx("h2", { children: "Okuma özetin" })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "growth-metrics", children: [
          /* @__PURE__ */ e.jsxs("div", { className: "growth-metric-card", children: [
            /* @__PURE__ */ e.jsx("span", { className: "metric-icon", children: "⏱️" }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-num", children: (b == null ? void 0 : b.minutes_read) || 0 }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-label", children: "dakika" })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "growth-metric-card", children: [
            /* @__PURE__ */ e.jsx("span", { className: "metric-icon", children: "📄" }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-num", children: (b == null ? void 0 : b.pages_read) || 0 }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-label", children: "sayfa" })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "growth-metric-card", children: [
            /* @__PURE__ */ e.jsx("span", { className: "metric-icon", children: "🎯" }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-num", children: (b == null ? void 0 : b.sessions) || 0 }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-label", children: "seans" })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "growth-metric-card", children: [
            /* @__PURE__ */ e.jsx("span", { className: "metric-icon", children: "📚" }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-num", children: (b == null ? void 0 : b.books_finished) || 0 }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-label", children: "biten kitap" })
          ] })
        ] }),
        /* @__PURE__ */ e.jsx("h3", { className: "section-subheading", children: "Bu hafta senin için" }),
        /* @__PURE__ */ e.jsx("ul", { className: "recommendations-clean-list", children: b == null ? void 0 : b.recommendations.slice(0, 3).map((a) => /* @__PURE__ */ e.jsxs("li", { className: "rec-book-item", children: [
          /* @__PURE__ */ e.jsxs("div", { className: "rec-book-info", children: [
            /* @__PURE__ */ e.jsx("strong", { className: "rec-book-title", children: a.title }),
            /* @__PURE__ */ e.jsx("span", { className: "rec-book-author", children: a.author })
          ] }),
          /* @__PURE__ */ e.jsx("span", { className: "rec-book-badge", children: "Öneri" })
        ] }, a.id)) })
      ] }),
      /* @__PURE__ */ e.jsxs("form", { className: "growth-card", onSubmit: he, children: [
        /* @__PURE__ */ e.jsxs("div", { className: "card-header-line", children: [
          /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "60 SANİYELİK ZEVK TESTİ" }),
          /* @__PURE__ */ e.jsx("h2", { children: "Okuma pusulan" })
        ] }),
        /* @__PURE__ */ e.jsxs("label", { className: "field-group", children: [
          /* @__PURE__ */ e.jsx("span", { className: "field-label", children: "Sevdiğin yazarlar" }),
          /* @__PURE__ */ e.jsx(
            "input",
            {
              value: c,
              onChange: (a) => d(a.target.value),
              placeholder: "Ursula K. Le Guin, Oğuz Atay, Tolstoy…"
            }
          )
        ] }),
        /* @__PURE__ */ e.jsxs("fieldset", { className: "field-group", children: [
          /* @__PURE__ */ e.jsx("legend", { className: "field-label", children: "Türler" }),
          /* @__PURE__ */ e.jsx("div", { className: "growth-chips", children: Re.map((a) => {
            const t = Y.includes(a);
            return /* @__PURE__ */ e.jsxs("label", { className: `growth-chip-label ${t ? "active" : ""}`, children: [
              /* @__PURE__ */ e.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: t,
                  onChange: () => H(
                    (n) => n.includes(a) ? n.filter((h) => h !== a) : [...n, a]
                  )
                }
              ),
              /* @__PURE__ */ e.jsx("span", { children: t ? `✓ ${a}` : a })
            ] }, a);
          }) })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "field-group", children: [
          /* @__PURE__ */ e.jsx("span", { className: "field-label", children: "Tempo tercihin" }),
          /* @__PURE__ */ e.jsx("div", { className: "pace-pills", children: [
            { id: "mixed", label: "Karışık", desc: "Dengeli" },
            { id: "slow", label: "Sakin", desc: "5-10 sf/gün" },
            { id: "medium", label: "Orta", desc: "15-25 sf/gün" },
            { id: "fast", label: "Hızlı", desc: "30+ sf/gün" }
          ].map((a) => /* @__PURE__ */ e.jsxs(
            "button",
            {
              type: "button",
              className: `pace-pill ${g === a.id ? "active" : ""}`,
              onClick: () => S(a.id),
              children: [
                /* @__PURE__ */ e.jsx("strong", { children: a.label }),
                /* @__PURE__ */ e.jsx("small", { children: a.desc })
              ]
            },
            a.id
          )) })
        ] }),
        /* @__PURE__ */ e.jsx("button", { className: "primary btn-submit-taste", children: "Profili tamamla" }),
        /* @__PURE__ */ e.jsx("ul", { className: "growth-tasks-list", children: F == null ? void 0 : F.tasks.map((a) => /* @__PURE__ */ e.jsxs("li", { className: `growth-task-item ${a.done ? "done" : ""}`, children: [
          /* @__PURE__ */ e.jsx("span", { className: "task-indicator", children: a.done ? "✓" : "○" }),
          /* @__PURE__ */ e.jsx("span", { children: a.title })
        ] }, a.key)) })
      ] }),
      /* @__PURE__ */ e.jsxs("form", { className: "growth-card", onSubmit: xe, children: [
        /* @__PURE__ */ e.jsxs("div", { className: "card-header-line", children: [
          /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "KİTAPLIK AKTARIMI" }),
          /* @__PURE__ */ e.jsx("h2", { children: "CSV’den içe aktar" })
        ] }),
        /* @__PURE__ */ e.jsx("p", { className: "card-description", children: "Goodreads veya başlık/yazar/raf sütunları olan bir CSV kullanabilirsin." }),
        /* @__PURE__ */ e.jsxs("label", { className: "growth-file", children: [
          /* @__PURE__ */ e.jsx("span", { className: "field-label", children: "CSV Dosyası Seç" }),
          /* @__PURE__ */ e.jsx(
            "input",
            {
              type: "file",
              accept: ".csv,text/csv",
              onChange: (a) => {
                var t;
                return oe((t = a.target.files) == null ? void 0 : t[0]);
              }
            }
          )
        ] }),
        /* @__PURE__ */ e.jsx(
          "textarea",
          {
            value: k,
            onChange: (a) => _(a.target.value),
            placeholder: `Title,Author,Exclusive Shelf
Dune,Frank Herbert,read`,
            required: !0,
            rows: 4
          }
        ),
        /* @__PURE__ */ e.jsx("button", { className: "primary btn-submit-taste", children: "Kitaplığı aktar" })
      ] }),
      v && /* @__PURE__ */ e.jsxs("article", { className: "growth-card", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "card-header-line", children: [
          /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "BİLDİRİM KONTROLÜ" }),
          /* @__PURE__ */ e.jsx("h2", { children: "Ne zaman haber verelim?" })
        ] }),
        /* @__PURE__ */ e.jsxs("label", { className: "growth-switch main-consent", children: [
          /* @__PURE__ */ e.jsx(
            "input",
            {
              type: "checkbox",
              checked: v.consent_granted,
              onChange: (a) => ne({ ...v, consent_granted: a.target.checked })
            }
          ),
          /* @__PURE__ */ e.jsx("strong", { children: "Açık bildirim izni" })
        ] }),
        /* @__PURE__ */ e.jsx("div", { className: "preferences-group", children: [
          ["weekly_digest", "Haftalık okuma özeti"],
          ["recommendations", "Kişisel öneriler"],
          ["price_drops", "Fiyat düşüşleri"],
          ["stock_updates", "Yeni baskı ve stok"],
          ["social_updates", "Kulüp ve topluluk gelişmeleri"]
        ].map(([a, t]) => /* @__PURE__ */ e.jsxs("label", { className: "growth-switch", children: [
          /* @__PURE__ */ e.jsx(
            "input",
            {
              type: "checkbox",
              disabled: !v.consent_granted,
              checked: !!v[a],
              onChange: (n) => ne({ ...v, [a]: n.target.checked })
            }
          ),
          /* @__PURE__ */ e.jsx("span", { children: t })
        ] }, a)) }),
        /* @__PURE__ */ e.jsxs("label", { className: "field-group", style: { marginTop: "12px" }, children: [
          /* @__PURE__ */ e.jsx("span", { className: "field-label", children: "Bildirim Sıklığı" }),
          /* @__PURE__ */ e.jsxs(
            "select",
            {
              value: v.frequency,
              disabled: !v.consent_granted,
              onChange: (a) => ne({
                ...v,
                frequency: a.target.value
              }),
              children: [
                /* @__PURE__ */ e.jsx("option", { value: "instant", children: "Anında" }),
                /* @__PURE__ */ e.jsx("option", { value: "daily", children: "Günlük özet" }),
                /* @__PURE__ */ e.jsx("option", { value: "weekly", children: "Haftalık özet" }),
                /* @__PURE__ */ e.jsx("option", { value: "off", children: "Kapalı" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("article", { className: "growth-card", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "card-header-line", children: [
          /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "PAYLAŞILABİLİR LİSTELER" }),
          /* @__PURE__ */ e.jsx("h2", { children: "Okuma listelerin" })
        ] }),
        /* @__PURE__ */ e.jsxs("form", { onSubmit: de, style: { display: "grid", gap: "10px" }, children: [
          /* @__PURE__ */ e.jsx("input", { name: "title", placeholder: "Örn. Sonbahar okumaları", required: !0 }),
          /* @__PURE__ */ e.jsx("textarea", { name: "description", placeholder: "Liste notu (isteğe bağlı)...", rows: 2 }),
          /* @__PURE__ */ e.jsxs("select", { name: "visibility", defaultValue: "unlisted", children: [
            /* @__PURE__ */ e.jsx("option", { value: "private", children: "Özel" }),
            /* @__PURE__ */ e.jsx("option", { value: "unlisted", children: "Bağlantıya sahip olanlar" }),
            /* @__PURE__ */ e.jsx("option", { value: "public", children: "Herkese açık" })
          ] }),
          /* @__PURE__ */ e.jsx("button", { className: "primary btn-submit-taste", children: "Liste oluştur" })
        ] }),
        /* @__PURE__ */ e.jsx("ul", { className: "unified-resource-list", children: E.map((a) => /* @__PURE__ */ e.jsxs("li", { className: "resource-list-row", children: [
          /* @__PURE__ */ e.jsxs("div", { className: "resource-info", children: [
            /* @__PURE__ */ e.jsx("strong", { children: a.title }),
            /* @__PURE__ */ e.jsxs("span", { children: [
              a.visibility === "unlisted" ? "🔗 Bağlantıyla" : a.visibility === "public" ? "🌍 Herkese Açık" : "🔒 Özel",
              " · ",
              a.item_count || 0,
              " kitap"
            ] })
          ] }),
          a.visibility !== "private" && /* @__PURE__ */ e.jsx(
            "button",
            {
              type: "button",
              className: "btn-resource-action",
              onClick: () => navigator.clipboard.writeText(
                `${location.origin}/shared/reading-lists/${a.share_token}`
              ),
              children: "Bağlantıyı kopyala"
            }
          )
        ] }, a.id)) })
      ] }),
      /* @__PURE__ */ e.jsxs("article", { className: "growth-card", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "card-header-line", children: [
          /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "KİTAP KULÜPLERİ" }),
          /* @__PURE__ */ e.jsx("h2", { children: "Kulüplerim & Katıl" })
        ] }),
        /* @__PURE__ */ e.jsxs("form", { onSubmit: ue, style: { display: "grid", gap: "10px" }, children: [
          /* @__PURE__ */ e.jsx("input", { name: "name", placeholder: "Kulüp adı (örn. Mihenk Klasikler Kulübü)", required: !0 }),
          /* @__PURE__ */ e.jsx("textarea", { name: "description", placeholder: "Kulübün amacı, okuma vizyonu...", rows: 2 }),
          /* @__PURE__ */ e.jsx("textarea", { name: "rules", placeholder: "Kulüp kuralları (spoiler hassasiyeti, tempo...)", rows: 2 }),
          /* @__PURE__ */ e.jsxs("select", { name: "visibility", defaultValue: "unlisted", children: [
            /* @__PURE__ */ e.jsx("option", { value: "private", children: "Özel" }),
            /* @__PURE__ */ e.jsx("option", { value: "unlisted", children: "Davetle Giriş (Önerilen)" }),
            /* @__PURE__ */ e.jsx("option", { value: "public", children: "Herkese Açık" })
          ] }),
          /* @__PURE__ */ e.jsx("button", { className: "primary btn-submit-taste", children: "Kulüp oluştur" })
        ] }),
        /* @__PURE__ */ e.jsx("form", { className: "growth-join-form", onSubmit: me, children: /* @__PURE__ */ e.jsxs("label", { className: "field-group", children: [
          /* @__PURE__ */ e.jsx("span", { className: "field-label", children: "Davet kodun var mı?" }),
          /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: "8px" }, children: [
            /* @__PURE__ */ e.jsx(
              "input",
              {
                name: "invite_code",
                placeholder: "Davet kodunu yapıştır",
                minLength: 8,
                required: !0,
                style: { flex: 1 }
              }
            ),
            /* @__PURE__ */ e.jsx("button", { type: "submit", className: "btn-join-invite", children: "Katıl" })
          ] })
        ] }) }),
        /* @__PURE__ */ e.jsxs("div", { className: "club-unified-container", children: [
          /* @__PURE__ */ e.jsx("h3", { className: "section-subheading", style: { margin: "14px 0 8px" }, children: "Kayıtlı Kulüplerin" }),
          B.length === 0 ? /* @__PURE__ */ e.jsx("p", { className: "card-empty-hint", children: "Henüz bir kulübe üye değilsin. Yukarıdan yeni bir kulüp kur veya davet koduyla katıl!" }) : /* @__PURE__ */ e.jsx("ul", { className: "unified-resource-list", children: B.map((a) => /* @__PURE__ */ e.jsxs("li", { className: "resource-list-row", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "resource-info", children: [
              /* @__PURE__ */ e.jsx("strong", { className: "club-row-name", children: a.name }),
              /* @__PURE__ */ e.jsx("span", { className: "club-row-role", children: a.role === "owner" ? "👑 Kurucu" : a.role === "moderator" ? "🛡️ Moderatör" : "📖 Üye" })
            ] }),
            /* @__PURE__ */ e.jsxs("div", { className: "club-row-actions", children: [
              /* @__PURE__ */ e.jsx("button", { type: "button", className: "btn-club-primary", onClick: () => ie(a.id), children: "Kulübü Aç" }),
              a.invite_code && /* @__PURE__ */ e.jsx(
                "button",
                {
                  type: "button",
                  className: "btn-club-secondary",
                  title: "Davet kodunu kopyala",
                  onClick: () => {
                    navigator.clipboard.writeText(a.invite_code), r("Davet kodu panoya kopyalandı!");
                  },
                  children: "Kodu Kopyala"
                }
              )
            ] })
          ] }, a.id)) })
        ] })
      ] }),
      s && /* @__PURE__ */ e.jsxs("article", { ref: Q, className: "growth-card club-workspace", children: [
        /* @__PURE__ */ e.jsxs("header", { children: [
          /* @__PURE__ */ e.jsxs("div", { children: [
            /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "KULÜP MERKEZİ" }),
            /* @__PURE__ */ e.jsx("h2", { children: s.name }),
            /* @__PURE__ */ e.jsx("p", { children: s.description || "Kitapları birlikte derinlemesine keşfetme alanı." }),
            /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: "10px", alignItems: "center", marginTop: "6px", fontSize: "0.82rem", color: "#4a5b53" }, children: [
              /* @__PURE__ */ e.jsxs("span", { children: [
                "👥 ",
                ((be = s.stats) == null ? void 0 : be.member_count) || ((ye = s.members) == null ? void 0 : ye.length) || 1,
                " Üye"
              ] }),
              /* @__PURE__ */ e.jsx("span", { children: "·" }),
              /* @__PURE__ */ e.jsxs("span", { children: [
                "Rolün: ",
                /* @__PURE__ */ e.jsx("strong", { children: s.role === "owner" ? "👑 Sahip" : s.role === "moderator" ? "🛡️ Moderatör" : "📖 Üye" })
              ] }),
              s.invite_code && /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
                /* @__PURE__ */ e.jsx("span", { children: "·" }),
                /* @__PURE__ */ e.jsxs(
                  "button",
                  {
                    type: "button",
                    style: { padding: "3px 8px", fontSize: "0.75rem" },
                    onClick: () => {
                      navigator.clipboard.writeText(s.invite_code), r("Davet kodu panoya kopyalandı!");
                    },
                    children: [
                      "🔑 Davet Kodu: ",
                      s.invite_code.slice(0, 8),
                      "…"
                    ]
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ e.jsx("button", { type: "button", onClick: () => x(null), children: "Kulübü Kapat" })
        ] }),
        /* @__PURE__ */ e.jsxs("nav", { className: "club-nav-tabs", "aria-label": "Kulüp sekmeleri", children: [
          /* @__PURE__ */ e.jsx(
            "button",
            {
              type: "button",
              className: N === "reading" ? "active" : "",
              onClick: () => f("reading"),
              children: "📖 Aktif Okuma & Yol Haritası"
            }
          ),
          /* @__PURE__ */ e.jsxs(
            "button",
            {
              type: "button",
              className: N === "discussions" ? "active" : "",
              onClick: () => f("discussions"),
              children: [
                "💬 Bölüm Tartışmaları ",
                s.upcoming_spoilers_count ? `(🔒 ${s.upcoming_spoilers_count} Kilitli)` : ""
              ]
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              type: "button",
              className: N === "live_room" ? "active live-room-tab-btn" : "live-room-tab-btn",
              onClick: () => f("live_room"),
              children: "🎙️ Birlikte Okuyoruz (Canlı Oda)"
            }
          ),
          /* @__PURE__ */ e.jsxs(
            "button",
            {
              type: "button",
              className: N === "events" ? "active" : "",
              onClick: () => f("events"),
              children: [
                "📅 Etkinlikler & Buluşmalar (",
                ((je = s.events) == null ? void 0 : je.length) || 0,
                ")"
              ]
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              type: "button",
              className: N === "lobby" ? "active" : "",
              onClick: () => f("lobby"),
              children: "🏛️ Kulüp Lobisi & Kurallar"
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              type: "button",
              className: N === "library" ? "active" : "",
              onClick: () => f("library"),
              children: "📚 Kulüp Kitaplığı & Oylamalar"
            }
          ),
          /* @__PURE__ */ e.jsxs(
            "button",
            {
              type: "button",
              className: N === "stats" ? "active" : "",
              onClick: () => f("stats"),
              children: [
                "🏆 İstatistikler & Rozetler (",
                ((ge = s.badges) == null ? void 0 : ge.length) || 0,
                ")"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "club-tab-content", children: [
          N === "reading" && /* @__PURE__ */ e.jsxs("div", { className: "club-grid-2", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Ayın Aktif Kitabı" }),
              o ? /* @__PURE__ */ e.jsxs("div", { children: [
                /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: "16px", alignItems: "flex-start" }, children: [
                  o.cover_url && /* @__PURE__ */ e.jsx(
                    "img",
                    {
                      src: o.cover_url,
                      alt: o.title,
                      style: { width: "80px", height: "115px", objectFit: "cover", borderRadius: "8px" }
                    }
                  ),
                  /* @__PURE__ */ e.jsxs("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 4px", fontSize: "1.2rem", color: "#13392c" }, children: o.title }),
                    /* @__PURE__ */ e.jsx("p", { style: { margin: "0 0 8px", color: "#096e54", fontWeight: 600 }, children: o.author }),
                    /* @__PURE__ */ e.jsxs("p", { style: { margin: 0, fontSize: "0.84rem", color: "#65776f" }, children: [
                      o.page_count ? `${o.page_count} sayfa` : "Sayfa bilgisi belirtilmedi",
                      o.target_date && ` · Hedef: ${o.target_date}`
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ e.jsxs("div", { style: { marginTop: "16px", padding: "12px 14px", borderRadius: "12px", background: "#edf5f0" }, children: [
                  /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700, color: "#184737" }, children: [
                    /* @__PURE__ */ e.jsxs("span", { children: [
                      "Ortak Kulüp İlerlemesi (",
                      o.active_readers_count || 0,
                      " okur)"
                    ] }),
                    /* @__PURE__ */ e.jsxs("span", { children: [
                      "%",
                      o.joint_progress_percent || 0
                    ] })
                  ] }),
                  /* @__PURE__ */ e.jsx("div", { className: "club-progress-bar-wrap", children: /* @__PURE__ */ e.jsx(
                    "div",
                    {
                      className: "club-progress-bar-fill",
                      style: { width: `${o.joint_progress_percent || 0}%` }
                    }
                  ) })
                ] }),
                /* @__PURE__ */ e.jsx("div", { style: { marginTop: "16px", borderTop: "1px solid #e1ebe5", paddingTop: "14px" }, children: m != null && m.in_library ? /* @__PURE__ */ e.jsx("div", { style: { fontSize: "0.85rem", color: "#096a51", fontWeight: 700 }, children: "✓ Kitap kitaplığında aktif olarak okunuyor." }) : /* @__PURE__ */ e.jsxs("div", { style: { display: "grid", gap: "10px" }, children: [
                  /* @__PURE__ */ e.jsx("p", { style: { margin: 0, fontSize: "0.88rem", fontWeight: 600 }, children: "📌 Bu kitabı okuma listene ekle ve hedefini belirle:" }),
                  /* @__PURE__ */ e.jsxs("label", { style: { display: "flex", alignItems: "center", gap: "10px", fontSize: "0.86rem" }, children: [
                    /* @__PURE__ */ e.jsx("span", { children: "Günlük okuma hedefin:" }),
                    /* @__PURE__ */ e.jsxs(
                      "select",
                      {
                        value: J,
                        onChange: (a) => pe(Number(a.target.value)),
                        style: { width: "auto", padding: "6px 12px" },
                        children: [
                          /* @__PURE__ */ e.jsx("option", { value: 5, children: "Günde 5 sayfa (Sakin)" }),
                          /* @__PURE__ */ e.jsx("option", { value: 10, children: "Günde 10 sayfa (İdeal)" }),
                          /* @__PURE__ */ e.jsx("option", { value: 20, children: "Günde 20 sayfa (Dinamik)" }),
                          /* @__PURE__ */ e.jsx("option", { value: 35, children: "Günde 35 sayfa (Hızlı)" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ e.jsx(
                    "button",
                    {
                      type: "button",
                      className: "primary",
                      style: { padding: "10px 16px", background: "#0a6e54", color: "#fff", border: 0, borderRadius: "10px", fontWeight: 700 },
                      onClick: () => i(o.book_id),
                      children: "Okumaya Katıl ve Kitaplığa Ekle"
                    }
                  )
                ] }) })
              ] }) : /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Şu an belirlenmiş bir aktif okuma bulunmuyor." }),
              ["owner", "moderator"].includes(s.role) && /* @__PURE__ */ e.jsxs("div", { style: { marginTop: "20px", borderTop: "1px solid #e1ebe5", paddingTop: "14px" }, children: [
                /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 8px", fontSize: "0.92rem" }, children: "⚙️ Kulüp Aktif Kitabını Belirle" }),
                /* @__PURE__ */ e.jsxs("form", { onSubmit: O, children: [
                  /* @__PURE__ */ e.jsxs("select", { name: "book_id", required: !0, defaultValue: (o == null ? void 0 : o.book_id) || "", children: [
                    /* @__PURE__ */ e.jsx("option", { value: "", children: "Kitap Seç…" }),
                    R.map((a) => /* @__PURE__ */ e.jsxs("option", { value: a.id, children: [
                      a.title,
                      " — ",
                      a.author
                    ] }, a.id))
                  ] }),
                  /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: "8px" }, children: [
                    /* @__PURE__ */ e.jsx("input", { name: "start_date", type: "date", placeholder: "Başlangıç" }),
                    /* @__PURE__ */ e.jsx("input", { name: "target_date", type: "date", placeholder: "Hedef bitiş" })
                  ] }),
                  /* @__PURE__ */ e.jsx("button", { style: { width: "100%" }, children: "Aktif Kitap Olarak Ata" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Okuma Yol Haritan & İlerlemen" }),
              o && /* @__PURE__ */ e.jsxs("div", { children: [
                /* @__PURE__ */ e.jsx("div", { className: "club-roadmap", children: (fe = m == null ? void 0 : m.milestones) == null ? void 0 : fe.map((a) => /* @__PURE__ */ e.jsxs(
                  "div",
                  {
                    className: `club-roadmap-node ${a.reached ? "reached" : ""}`,
                    children: [
                      /* @__PURE__ */ e.jsx("div", { className: "node-dot", children: a.reached ? "✓" : `%${a.percent}` }),
                      /* @__PURE__ */ e.jsx("strong", { children: a.title }),
                      /* @__PURE__ */ e.jsxs("span", { children: [
                        "s. ",
                        a.page
                      ] })
                    ]
                  },
                  a.percent
                )) }),
                /* @__PURE__ */ e.jsx("div", { style: { background: "#fff", border: "1px solid #dae5df", borderRadius: "12px", padding: "14px", margin: "16px 0" }, children: /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
                  /* @__PURE__ */ e.jsxs("div", { children: [
                    /* @__PURE__ */ e.jsx("span", { style: { fontSize: "0.78rem", color: "#687770" }, children: "Bireysel İlerleme" }),
                    /* @__PURE__ */ e.jsxs("p", { style: { margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#144c3b" }, children: [
                      "s. ",
                      (m == null ? void 0 : m.current_page) || 0,
                      " / ",
                      (m == null ? void 0 : m.total_pages) || o.page_count || 200,
                      " (%",
                      (m == null ? void 0 : m.percent) || 0,
                      ")"
                    ] })
                  ] }),
                  /* @__PURE__ */ e.jsxs("div", { style: { textAlign: "right" }, children: [
                    /* @__PURE__ */ e.jsx("span", { style: { fontSize: "0.78rem", color: "#687770" }, children: "Tahmini Bitiş" }),
                    /* @__PURE__ */ e.jsx("p", { style: { margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#096e54" }, children: m != null && m.days_left ? `${m.days_left} gün kaldı` : "Tamamlandı! 🏆" })
                  ] })
                ] }) }),
                /* @__PURE__ */ e.jsxs("form", { onSubmit: p, style: { display: "grid", gap: "8px" }, children: [
                  /* @__PURE__ */ e.jsx("input", { type: "hidden", name: "book_id", value: o.book_id }),
                  /* @__PURE__ */ e.jsxs("label", { style: { fontSize: "0.84rem", fontWeight: 600 }, children: [
                    "Bugün geldiğin sayfa:",
                    /* @__PURE__ */ e.jsx(
                      "input",
                      {
                        name: "current_page",
                        type: "number",
                        min: "0",
                        max: o.page_count || 9999,
                        defaultValue: (m == null ? void 0 : m.current_page) || 0,
                        required: !0
                      }
                    )
                  ] }),
                  /* @__PURE__ */ e.jsxs("label", { style: { fontSize: "0.84rem", fontWeight: 600 }, children: [
                    "Günlük hedef (sayfa/gün):",
                    /* @__PURE__ */ e.jsx(
                      "input",
                      {
                        name: "daily_target_pages",
                        type: "number",
                        min: "1",
                        max: "300",
                        defaultValue: (m == null ? void 0 : m.daily_target_pages) || 10
                      }
                    )
                  ] }),
                  /* @__PURE__ */ e.jsx("button", { className: "primary", style: { background: "#0a6e54", color: "#fff", border: 0, borderRadius: "10px", padding: "10px" }, children: "İlerlemeyi Kaydet ve Tartışmaları Aç" })
                ] })
              ] })
            ] })
          ] }),
          N === "discussions" && /* @__PURE__ */ e.jsxs("div", { className: "club-tab-content", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }, children: [
                /* @__PURE__ */ e.jsx("h3", { style: { margin: 0 }, children: "Yeni Alıntı, Yorum veya Soru Paylaş" }),
                /* @__PURE__ */ e.jsxs(
                  "button",
                  {
                    type: "button",
                    className: "btn-ocr-trigger",
                    onClick: () => A(!0),
                    style: {
                      background: "linear-gradient(135deg, #0a6e54 0%, #1f9d78 100%)",
                      color: "#fff",
                      border: 0,
                      borderRadius: "8px",
                      padding: "7px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(10,110,84,0.25)"
                    },
                    children: [
                      /* @__PURE__ */ e.jsx("span", { children: "📸" }),
                      " Kameradan Alıntı Tara (OCR)"
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ e.jsxs("p", { style: { fontSize: "0.86rem", color: "#65776f", margin: "0 0 14px" }, children: [
                "🛡️ ",
                /* @__PURE__ */ e.jsx("strong", { children: "Spoiler Koruması Aktif:" }),
                " Paylaştığın sayfa numarasına henüz ulaşmamış üyeler içeriği görmez."
              ] }),
              /* @__PURE__ */ e.jsxs("form", { onSubmit: T, style: { display: "grid", gap: "10px" }, children: [
                /* @__PURE__ */ e.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }, children: [
                  /* @__PURE__ */ e.jsxs("label", { style: { fontSize: "0.84rem" }, children: [
                    "Kitap",
                    /* @__PURE__ */ e.jsx("select", { name: "book_id", required: !0, defaultValue: (o == null ? void 0 : o.book_id) || "", children: s.reads.map((a) => /* @__PURE__ */ e.jsx("option", { value: a.book_id, children: a.title }, a.book_id)) })
                  ] }),
                  /* @__PURE__ */ e.jsxs("label", { style: { fontSize: "0.84rem" }, children: [
                    "Paylaşım Türü",
                    /* @__PURE__ */ e.jsxs(
                      "select",
                      {
                        name: "discussion_type",
                        value: Z,
                        onChange: (a) => G(a.target.value),
                        children: [
                          /* @__PURE__ */ e.jsx("option", { value: "discussion", children: "💬 Tartışma & Yorum" }),
                          /* @__PURE__ */ e.jsx("option", { value: "quote", children: "📜 Alıntı & Pasaj" }),
                          /* @__PURE__ */ e.jsx("option", { value: "question", children: "❓ Kulübe Soru" }),
                          /* @__PURE__ */ e.jsx("option", { value: "analysis", children: "🔍 Karakter / Tematik Analiz" })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ e.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }, children: [
                  /* @__PURE__ */ e.jsx("input", { name: "chapter_title", placeholder: "Bölüm / Konu başlığı (isteğe bağlı)" }),
                  /* @__PURE__ */ e.jsx(
                    "input",
                    {
                      name: "page_number",
                      type: "number",
                      min: "1",
                      placeholder: "Sayfa numarası (isteğe bağlı)",
                      value: z,
                      onChange: (a) => U(a.target.value)
                    }
                  )
                ] }),
                /* @__PURE__ */ e.jsx(
                  "textarea",
                  {
                    name: "content",
                    placeholder: "Bu bölüm ya da alıntı sende nasıl bir düşünce uyandırdı? Düşüncelerini kulüple paylaş…",
                    required: !0,
                    value: C,
                    onChange: (a) => $(a.target.value),
                    rows: 4
                  }
                ),
                /* @__PURE__ */ e.jsx("button", { className: "primary", style: { background: "#0a6e54", color: "#fff", border: 0, padding: "10px" }, children: "Kulüple Paylaş" })
              ] })
            ] }),
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Tartışma Akışı" }),
              s.discussions.length === 0 ? /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Henüz bu kulüpte bir paylaşım yapılmadı. İlk kıvılcımı sen çak!" }) : /* @__PURE__ */ e.jsx("div", { style: { display: "grid", gap: "12px" }, children: s.discussions.map((a) => {
                if (a.is_spoiler_locked)
                  return /* @__PURE__ */ e.jsxs("div", { className: "spoiler-locked-card", children: [
                    /* @__PURE__ */ e.jsx("span", { children: "🔒" }),
                    /* @__PURE__ */ e.jsxs("div", { children: [
                      /* @__PURE__ */ e.jsxs("strong", { children: [
                        "s. ",
                        a.page_number,
                        " Tartışması Kilitli (Spoiler Koruması)"
                      ] }),
                      /* @__PURE__ */ e.jsx("p", { style: { margin: "2px 0 0", fontSize: "0.8rem" }, children: "Bu bölüme ulaştığında ve sayfanı kaydettiğinde tartışma otomatik olarak açılacaktır." })
                    ] })
                  ] }, a.id);
                const t = a.discussion_type === "quote" ? "📜 Alıntı" : a.discussion_type === "question" ? "❓ Soru" : a.discussion_type === "analysis" ? "🔍 Analiz" : "💬 Tartışma";
                return /* @__PURE__ */ e.jsxs(
                  "div",
                  {
                    style: {
                      border: "1px solid #d9e5df",
                      borderRadius: "14px",
                      padding: "16px",
                      background: "#fff"
                    },
                    children: [
                      /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
                        /* @__PURE__ */ e.jsxs("div", { children: [
                          /* @__PURE__ */ e.jsx("strong", { style: { fontSize: "0.95rem", color: "#133d30" }, children: a.display_name }),
                          /* @__PURE__ */ e.jsxs("span", { style: { marginLeft: "8px", fontSize: "0.78rem", color: "#687b72" }, children: [
                            a.book_title,
                            a.page_number ? ` · s. ${a.page_number}` : "",
                            a.chapter_title ? ` (${a.chapter_title})` : ""
                          ] })
                        ] }),
                        /* @__PURE__ */ e.jsx(
                          "span",
                          {
                            style: {
                              fontSize: "0.75rem",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "#edf6f1",
                              color: "#08634c",
                              fontWeight: 700
                            },
                            children: t
                          }
                        )
                      ] }),
                      /* @__PURE__ */ e.jsx("p", { style: { margin: "10px 0 12px", fontSize: "0.92rem", color: "#273630", lineHeight: 1.5, whiteSpace: "pre-wrap" }, children: a.content }),
                      /* @__PURE__ */ e.jsx("div", { className: "club-reaction-bar", children: [
                        { type: "thoughtful", icon: "🤔", label: "Düşündürücü" },
                        { type: "agree", icon: "👍", label: "Katılıyorum" },
                        { type: "heart", icon: "❤️", label: "Sevdim" },
                        { type: "bookmark", icon: "🔖", label: "Not Aldım" }
                      ].map((n) => {
                        var ae;
                        const h = a.reactions && a.reactions[n.type] || 0, ee = (ae = a.user_reactions) == null ? void 0 : ae.includes(n.type);
                        return /* @__PURE__ */ e.jsxs(
                          "button",
                          {
                            type: "button",
                            className: `club-reaction-btn ${ee ? "active" : ""}`,
                            onClick: () => D(a.id, n.type),
                            title: n.label,
                            children: [
                              /* @__PURE__ */ e.jsx("span", { children: n.icon }),
                              /* @__PURE__ */ e.jsx("span", { children: n.label }),
                              h > 0 && /* @__PURE__ */ e.jsx("strong", { children: h })
                            ]
                          },
                          n.type
                        );
                      }) })
                    ]
                  },
                  a.id
                );
              }) })
            ] })
          ] }),
          N === "live_room" && /* @__PURE__ */ e.jsx("div", { className: "club-tab-content", children: /* @__PURE__ */ e.jsx(
            Ee,
            {
              clubId: s.id,
              activeBookTitle: o == null ? void 0 : o.title,
              activeBookId: o == null ? void 0 : o.book_id,
              userCurrentPage: (m == null ? void 0 : m.current_page) || 0,
              onSessionFinished: () => ie(s.id)
            }
          ) }),
          N === "events" && /* @__PURE__ */ e.jsxs("div", { className: "club-grid-2", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Kulüp Buluşmaları & Etkinlik Takvimi" }),
              ((ke = s.events) == null ? void 0 : ke.length) === 0 ? /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Henüz planlanmış bir etkinlik bulunmuyor." }) : /* @__PURE__ */ e.jsx("div", { style: { display: "grid", gap: "12px" }, children: (ve = s.events) == null ? void 0 : ve.map((a) => /* @__PURE__ */ e.jsxs("div", { className: "event-card", children: [
                /* @__PURE__ */ e.jsxs("div", { className: "event-card-header", children: [
                  /* @__PURE__ */ e.jsx("span", { className: `event-type-badge event-type-${a.event_type}`, children: a.event_type === "kickoff" ? "Başlangıç Buluşması" : a.event_type === "midpoint" ? "Ara Değerlendirme" : a.event_type === "final" ? "Kapanış Toplantısı" : "Genel Buluşma" }),
                  /* @__PURE__ */ e.jsxs("span", { style: { fontSize: "0.78rem", color: "#6c7c74" }, children: [
                    "📅 ",
                    a.event_date ? new Date(a.event_date).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "Tarih belirtilmedi"
                  ] })
                ] }),
                /* @__PURE__ */ e.jsx("h4", { style: { margin: "4px 0 2px", fontSize: "1.05rem", color: "#16382c" }, children: a.title }),
                /* @__PURE__ */ e.jsx("p", { style: { margin: "0 0 6px", fontSize: "0.86rem", color: "#4d5d56" }, children: a.description }),
                a.location && /* @__PURE__ */ e.jsxs("p", { style: { margin: 0, fontSize: "0.8rem", color: "#096e54" }, children: [
                  "📍 Konum / Bağlantı: ",
                  a.location
                ] }),
                /* @__PURE__ */ e.jsxs("div", { style: { marginTop: "8px", borderTop: "1px solid #e9f0ec", paddingTop: "8px" }, children: [
                  /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#55665f", marginBottom: "6px" }, children: [
                    /* @__PURE__ */ e.jsxs("span", { children: [
                      a.rsvp_counts.attending,
                      " Katılıyor · ",
                      a.rsvp_counts.maybe,
                      " Belki · ",
                      a.rsvp_counts.declined,
                      " Katılamıyor"
                    ] }),
                    a.user_rsvp && /* @__PURE__ */ e.jsxs("strong", { children: [
                      "Seçimin: ",
                      a.user_rsvp === "attending" ? "Katılıyorum" : a.user_rsvp === "maybe" ? "Belki" : "Katılamıyorum"
                    ] })
                  ] }),
                  /* @__PURE__ */ e.jsxs("div", { className: "rsvp-buttons", children: [
                    /* @__PURE__ */ e.jsx(
                      "button",
                      {
                        type: "button",
                        className: `rsvp-btn ${a.user_rsvp === "attending" ? "active" : ""}`,
                        onClick: () => M(a.id, "attending"),
                        children: "✅ Katılıyorum"
                      }
                    ),
                    /* @__PURE__ */ e.jsx(
                      "button",
                      {
                        type: "button",
                        className: `rsvp-btn ${a.user_rsvp === "maybe" ? "active" : ""}`,
                        onClick: () => M(a.id, "maybe"),
                        children: "🤔 Belki"
                      }
                    ),
                    /* @__PURE__ */ e.jsx(
                      "button",
                      {
                        type: "button",
                        className: `rsvp-btn ${a.user_rsvp === "declined" ? "active" : ""}`,
                        onClick: () => M(a.id, "declined"),
                        children: "❌ Katılamıyorum"
                      }
                    )
                  ] })
                ] })
              ] }, a.id)) })
            ] }),
            ["owner", "moderator"].includes(s.role) ? /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Yeni Etkinlik / Buluşma Oluştur" }),
              /* @__PURE__ */ e.jsxs("form", { onSubmit: q, style: { display: "grid", gap: "10px" }, children: [
                /* @__PURE__ */ e.jsx("input", { name: "title", placeholder: "Buluşma başlığı (örn. Kapanış ve Kitap Sonu Değerlendirmesi)", required: !0 }),
                /* @__PURE__ */ e.jsxs("select", { name: "event_type", defaultValue: "kickoff", children: [
                  /* @__PURE__ */ e.jsx("option", { value: "kickoff", children: "🚀 Başlangıç Buluşması (Kickoff)" }),
                  /* @__PURE__ */ e.jsx("option", { value: "midpoint", children: "⚖️ Ara Değerlendirme Buluşması" }),
                  /* @__PURE__ */ e.jsx("option", { value: "final", children: "🎉 Kapanış Toplantısı ve Kitap Sonu" }),
                  /* @__PURE__ */ e.jsx("option", { value: "general", children: "☕ Genel Sohbet & Buluşma" })
                ] }),
                /* @__PURE__ */ e.jsx("input", { name: "event_date", type: "datetime-local", required: !0 }),
                /* @__PURE__ */ e.jsx("input", { name: "location", placeholder: "Online Meet / Zoom linki veya buluşma mekânı" }),
                /* @__PURE__ */ e.jsx("textarea", { name: "description", placeholder: "Etkinlik detayları ve gündem maddeleri..." }),
                /* @__PURE__ */ e.jsx("button", { className: "primary", style: { background: "#0a6e54", color: "#fff", border: 0, padding: "10px" }, children: "Etkinliği Yayınla" })
              ] })
            ] }) : /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Kulüp Etkinlik Kuralları" }),
              /* @__PURE__ */ e.jsx("p", { style: { fontSize: "0.88rem", color: "#55665f" }, children: "Buluşmalar kulüp yöneticileri tarafından organize edilir. Başlangıç, ara ve final buluşmalarına katılarak kulüp kapanış değerlendirmesinde yer alabilir ve özel katılım rozetleri kazanabilirsiniz." })
            ] })
          ] }),
          N === "lobby" && /* @__PURE__ */ e.jsxs("div", { className: "club-grid-2", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Kulüp Lobisi & Kurallar" }),
              /* @__PURE__ */ e.jsxs("div", { style: { background: "#fff", border: "1px solid #dbe6df", borderRadius: "12px", padding: "16px", marginBottom: "16px" }, children: [
                /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 6px", color: "#163a2d" }, children: "Kulüp Vizyonu" }),
                /* @__PURE__ */ e.jsx("p", { style: { margin: 0, fontSize: "0.9rem", color: "#4a5c53" }, children: s.description || "Henüz açıklama girilmedi." })
              ] }),
              /* @__PURE__ */ e.jsxs("div", { style: { background: "#fff", border: "1px solid #dbe6df", borderRadius: "12px", padding: "16px" }, children: [
                /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 6px", color: "#163a2d" }, children: "Kulüp Kuralları" }),
                /* @__PURE__ */ e.jsx("p", { style: { margin: 0, fontSize: "0.88rem", color: "#4a5c53", whiteSpace: "pre-wrap" }, children: s.rules || `1. Spoiler korumasına dikkat ediniz.
2. Tartışmalarda yapıcı ve düşünceyi derinleştirici yorumlar paylaşınız.
3. Okuma hedefinize sadık kalmaya özen gösteriniz.` })
              ] }),
              /* @__PURE__ */ e.jsxs("div", { style: { marginTop: "16px", padding: "14px", borderRadius: "12px", background: "#edf7f1" }, children: [
                /* @__PURE__ */ e.jsx("span", { style: { fontSize: "0.8rem", color: "#096a51", fontWeight: 700 }, children: "Davet Bağlantısı ve Kodu" }),
                /* @__PURE__ */ e.jsx("p", { style: { margin: "4px 0 8px", fontSize: "0.88rem", wordBreak: "break-all" }, children: /* @__PURE__ */ e.jsx("code", { children: s.invite_code }) }),
                /* @__PURE__ */ e.jsx(
                  "button",
                  {
                    type: "button",
                    style: { padding: "6px 12px", fontSize: "0.8rem" },
                    onClick: () => {
                      navigator.clipboard.writeText(s.invite_code), r("Davet kodu kopyalandı!");
                    },
                    children: "Davet Kodunu Kopyala"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsxs("h3", { children: [
                "Kulüp Üyeleri (",
                ((Ne = s.members) == null ? void 0 : Ne.length) || 1,
                ")"
              ] }),
              /* @__PURE__ */ e.jsx("ul", { style: { margin: 0 }, children: (Se = s.members) == null ? void 0 : Se.map((a) => /* @__PURE__ */ e.jsxs("li", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
                /* @__PURE__ */ e.jsxs("div", { children: [
                  /* @__PURE__ */ e.jsx("strong", { children: a.display_name }),
                  /* @__PURE__ */ e.jsxs("span", { children: [
                    a.role === "owner" ? "👑 Sahip" : a.role === "moderator" ? "🛡️ Moderatör" : "📖 Üye",
                    " · Katıldı: ",
                    new Date(a.joined_at).toLocaleDateString("tr-TR")
                  ] })
                ] }),
                s.role === "owner" && a.role !== "owner" && /* @__PURE__ */ e.jsxs(
                  "select",
                  {
                    value: a.role,
                    onChange: (t) => re(a.user_id, t.target.value),
                    style: { width: "auto", padding: "4px 8px", fontSize: "0.78rem" },
                    children: [
                      /* @__PURE__ */ e.jsx("option", { value: "member", children: "Üye Yap" }),
                      /* @__PURE__ */ e.jsx("option", { value: "moderator", children: "Moderatör Yap" })
                    ]
                  }
                )
              ] }, a.user_id)) })
            ] })
          ] }),
          N === "library" && /* @__PURE__ */ e.jsxs("div", { className: "club-grid-2", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Sıradaki Kitap Oylamaları" }),
              ["owner", "moderator"].includes(s.role) && /* @__PURE__ */ e.jsxs("form", { onSubmit: X, style: { marginBottom: "20px", borderBottom: "1px solid #e1ebe5", paddingBottom: "16px" }, children: [
                /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 8px", fontSize: "0.92rem" }, children: "Yeni Kitap Oylaması Başlat" }),
                /* @__PURE__ */ e.jsx("input", { name: "title", placeholder: "Örn: Gelecek Ay Hangi Klasik Kitabı Okuyalım?", required: !0 }),
                /* @__PURE__ */ e.jsx("select", { name: "option_book_ids", multiple: !0, size: 4, required: !0, style: { margin: "8px 0" }, children: R.map((a) => /* @__PURE__ */ e.jsxs("option", { value: a.id, children: [
                  a.title,
                  " — ",
                  a.author
                ] }, a.id)) }),
                /* @__PURE__ */ e.jsx("small", { style: { display: "block", color: "#65776f", marginBottom: "8px" }, children: "Ctrl tuşuna basılı tutarak birden fazla kitap seçebilirsin." }),
                /* @__PURE__ */ e.jsx("button", { className: "primary", style: { background: "#0a6e54", color: "#fff", border: 0, padding: "8px 14px" }, children: "Oylamayı Başlat" })
              ] }),
              ((we = s.polls) == null ? void 0 : we.length) === 0 ? /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Şu an aktif bir oylama bulunmuyor." }) : s.polls.map((a) => /* @__PURE__ */ e.jsxs("div", { className: "club-poll", style: { background: "#fff", border: "1px solid #d9e5df", borderRadius: "12px", padding: "14px", marginBottom: "12px" }, children: [
                /* @__PURE__ */ e.jsx("strong", { style: { fontSize: "1rem", color: "#144636" }, children: a.title }),
                /* @__PURE__ */ e.jsx("div", { style: { display: "grid", gap: "8px", marginTop: "10px" }, children: a.options.map((t) => /* @__PURE__ */ e.jsxs(
                  "button",
                  {
                    className: t.selected ? "selected" : "",
                    type: "button",
                    onClick: () => le(a.id, t.id),
                    style: { display: "flex", justifyContent: "space-between", padding: "10px 14px" },
                    children: [
                      /* @__PURE__ */ e.jsxs("span", { children: [
                        t.title,
                        " — ",
                        t.author
                      ] }),
                      /* @__PURE__ */ e.jsxs("strong", { children: [
                        t.vote_count,
                        " Oy ",
                        t.selected ? "✓" : ""
                      ] })
                    ]
                  },
                  t.id
                )) })
              ] }, a.id))
            ] }),
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Kulüp Geçmişi & Tamamlanan Okumalar" }),
              s.reads.filter((a) => a.status === "completed").length === 0 ? /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Henüz tamamlanan bir kulüp okuması yok." }) : /* @__PURE__ */ e.jsx("ul", { style: { margin: 0 }, children: s.reads.filter((a) => a.status === "completed").map((a) => /* @__PURE__ */ e.jsx("li", { children: /* @__PURE__ */ e.jsxs("div", { children: [
                /* @__PURE__ */ e.jsx("strong", { children: a.title }),
                /* @__PURE__ */ e.jsxs("span", { children: [
                  a.author,
                  " · Tamamlandı 🏆"
                ] })
              ] }) }, a.book_id)) })
            ] })
          ] }),
          N === "stats" && /* @__PURE__ */ e.jsxs("div", { className: "club-tab-content", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Kulüp İstatistikleri" }),
              /* @__PURE__ */ e.jsxs("div", { className: "growth-metrics", children: [
                /* @__PURE__ */ e.jsxs("b", { children: [
                  ((_e = s.stats) == null ? void 0 : _e.member_count) || ((Te = s.members) == null ? void 0 : Te.length) || 1,
                  /* @__PURE__ */ e.jsx("small", { children: "Toplam Üye" })
                ] }),
                /* @__PURE__ */ e.jsxs("b", { children: [
                  ((Ke = s.stats) == null ? void 0 : Ke.total_discussions) || ((Ce = s.discussions) == null ? void 0 : Ce.length) || 0,
                  /* @__PURE__ */ e.jsx("small", { children: "Tartışma & Alıntı" })
                ] }),
                /* @__PURE__ */ e.jsxs("b", { children: [
                  ((ze = s.stats) == null ? void 0 : ze.completed_books_count) || 0,
                  /* @__PURE__ */ e.jsx("small", { children: "Tamamlanan Kitap" })
                ] }),
                /* @__PURE__ */ e.jsxs("b", { children: [
                  ((Oe = s.events) == null ? void 0 : Oe.length) || 0,
                  /* @__PURE__ */ e.jsx("small", { children: "Buluşma / Etkinlik" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
              /* @__PURE__ */ e.jsx("h3", { children: "Kazanılan Kulüp Rozetleri" }),
              /* @__PURE__ */ e.jsx("div", { className: "club-grid-3", children: (Be = s.badges) == null ? void 0 : Be.map((a) => /* @__PURE__ */ e.jsxs("div", { className: "badge-item", children: [
                /* @__PURE__ */ e.jsx("div", { className: "badge-icon", children: a.icon }),
                /* @__PURE__ */ e.jsx("strong", { children: a.title }),
                /* @__PURE__ */ e.jsx("p", { children: a.description })
              ] }, a.code)) })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ e.jsx(
      $e,
      {
        isOpen: j,
        onClose: () => A(!1),
        initialBookTitle: (Ae = s == null ? void 0 : s.active_read) == null ? void 0 : Ae.title,
        onUseQuote: (a, t) => {
          $(a), t && U(t.toString()), G("quote"), f("discussions"), r("📸 Alıntı metni başarıyla tartışma formuna aktarıldı!");
        }
      }
    )
  ] });
}
export {
  Me as ProductGrowthHub
};
