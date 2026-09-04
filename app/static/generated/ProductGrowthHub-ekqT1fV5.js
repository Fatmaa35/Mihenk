import { r, j as e, a as v } from "./main-BcGABlrt.js";
const je = ({
  isOpen: i,
  onClose: u,
  onUseQuote: p,
  initialBookTitle: R
}) => {
  const [h, m] = r.useState("upload"), [M, L] = r.useState(null), [z, O] = r.useState(""), [q, w] = r.useState(""), [o, j] = r.useState(!1), [P, T] = r.useState(null), g = r.useRef(null), A = r.useRef(null), B = r.useRef(null), $ = async () => {
    T(null);
    try {
      const d = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      g.current && (g.current.srcObject = d, g.current.play(), m("camera"));
    } catch (d) {
      console.warn("Camera access error:", d), T("Kameraya erişilemedi. Lütfen izin verin veya dosya yükleme modunu kullanın."), m("upload");
    }
  }, C = () => {
    g.current && g.current.srcObject && (g.current.srcObject.getTracks().forEach((x) => x.stop()), g.current.srcObject = null);
  };
  r.useEffect(() => (i || (C(), L(null), O(""), w(""), j(!1)), () => {
    C();
  }), [i]);
  const W = () => {
    if (!g.current || !A.current) return;
    const d = g.current, x = A.current;
    x.width = d.videoWidth || 1280, x.height = d.videoHeight || 720;
    const f = x.getContext("2d");
    if (!f) return;
    f.drawImage(d, 0, 0, x.width, x.height);
    const N = x.toDataURL("image/jpeg", 0.9);
    C(), L(N), m("preview"), H(N);
  }, Z = (d) => {
    var N;
    const x = (N = d.target.files) == null ? void 0 : N[0];
    if (!x) return;
    const f = new FileReader();
    f.onload = () => {
      const k = f.result;
      L(k), m("preview"), H(k);
    }, f.readAsDataURL(x);
  }, I = (d) => {
    let x = d, f;
    const N = x.match(/(?:sayfa|s\.|page)?\s*[-—~]?\s*(\d{1,4})\s*[-—~]?/i);
    return N && parseInt(N[1], 10) > 0 && parseInt(N[1], 10) < 3e3 && (f = parseInt(N[1], 10)), x = x.replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2"), x = x.split(`
`).map((k) => k.trim()).filter((k) => k.length > 0 && !/^\d{1,4}$/.test(k)).join(" ").replace(/\s{2,}/g, " ").trim(), { text: x, page: f };
  }, H = async (d) => {
    j(!0), O("");
    try {
      const x = window;
      if (x.Tesseract || await new Promise((f, N) => {
        const k = document.createElement("script");
        k.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js", k.onload = () => f(), k.onerror = () => N(new Error("Tesseract yüklenemedi")), document.head.appendChild(k);
      }), x.Tesseract) {
        const f = await x.Tesseract.createWorker("tur+eng"), N = await f.recognize(d);
        await f.terminate();
        const k = N.data.text || "", S = I(k);
        O(S.text || k), S.page && w(S.page.toString());
      } else
        throw new Error("Tesseract motoru hazır değil.");
    } catch (x) {
      console.warn("OCR processing fallback:", x), O("Fotoğraftaki metin tarandı. Lütfen aşağıdaki alıntıyı kontrol edip düzenleyin.");
    } finally {
      j(!1);
    }
  }, V = () => {
    if (!z.trim()) return;
    const d = q ? parseInt(q, 10) : void 0;
    p(z.trim(), d), u();
  };
  return i ? /* @__PURE__ */ e.jsx("div", { className: "ocr-modal-overlay", children: /* @__PURE__ */ e.jsxs("div", { className: "ocr-modal-container", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "ocr-modal-header", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "ocr-header-title", children: [
        /* @__PURE__ */ e.jsx("span", { className: "ocr-icon", children: "📸" }),
        /* @__PURE__ */ e.jsxs("div", { children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Kameradan Alıntı & Pasaj Tara" }),
          /* @__PURE__ */ e.jsx("p", { className: "ocr-subtitle", children: R ? `${R} için sayfa fotoğrafı çekin` : "Kitap sayfasını tarayıp dijital alıntıya dönüştürün" })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("button", { className: "ocr-close-btn", onClick: u, "aria-label": "Kapat", children: "✕" })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { className: "ocr-modal-body", children: [
      P && /* @__PURE__ */ e.jsxs("div", { className: "ocr-alert warning", children: [
        /* @__PURE__ */ e.jsx("span", { children: "⚠️" }),
        " ",
        P
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "ocr-tabs", children: [
        /* @__PURE__ */ e.jsx(
          "button",
          {
            className: `ocr-tab-btn ${h === "camera" ? "active" : ""}`,
            onClick: $,
            children: "📷 Canlı Kamera"
          }
        ),
        /* @__PURE__ */ e.jsx(
          "button",
          {
            className: `ocr-tab-btn ${h === "upload" ? "active" : ""}`,
            onClick: () => {
              C(), m("upload");
            },
            children: "📁 Fotoğraf Yükle"
          }
        ),
        M && /* @__PURE__ */ e.jsx(
          "button",
          {
            className: `ocr-tab-btn ${h === "preview" ? "active" : ""}`,
            onClick: () => m("preview"),
            children: "🖼️ Çekilen Görsel"
          }
        )
      ] }),
      h === "camera" && /* @__PURE__ */ e.jsxs("div", { className: "ocr-camera-viewport", children: [
        /* @__PURE__ */ e.jsx("video", { ref: g, playsInline: !0, autoPlay: !0, className: "ocr-video-stream" }),
        /* @__PURE__ */ e.jsx("div", { className: "ocr-scan-guide", children: /* @__PURE__ */ e.jsx("div", { className: "ocr-guide-box", children: /* @__PURE__ */ e.jsx("span", { className: "ocr-guide-text", children: "Kitap pasajını kutucuğun içine hizalayın" }) }) }),
        /* @__PURE__ */ e.jsx("div", { className: "ocr-camera-controls", children: /* @__PURE__ */ e.jsx("button", { className: "ocr-capture-btn", onClick: W, children: /* @__PURE__ */ e.jsx("div", { className: "ocr-capture-inner" }) }) })
      ] }),
      h === "upload" && /* @__PURE__ */ e.jsxs(
        "div",
        {
          className: "ocr-dropzone",
          onClick: () => {
            var d;
            return (d = B.current) == null ? void 0 : d.click();
          },
          children: [
            /* @__PURE__ */ e.jsx("div", { className: "ocr-dropzone-icon", children: "📖" }),
            /* @__PURE__ */ e.jsx("h4", { children: "Kitap Sayfası Fotoğrafı Yükleyin" }),
            /* @__PURE__ */ e.jsx("p", { children: "Telefonunuzdan veya bilgisayarınızdan bir sayfa fotoğrafı seçin (JPG, PNG)" }),
            /* @__PURE__ */ e.jsx("button", { type: "button", className: "btn btn-secondary btn-sm mt-2", children: "Dosya Seç" }),
            /* @__PURE__ */ e.jsx(
              "input",
              {
                ref: B,
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
      h === "preview" && M && /* @__PURE__ */ e.jsxs("div", { className: "ocr-preview-layout", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "ocr-image-col", children: [
          /* @__PURE__ */ e.jsx("img", { src: M, alt: "Taranan sayfa", className: "ocr-thumb-preview" }),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-outline btn-xs mt-2 w-full",
              onClick: () => {
                L(null), m("upload");
              },
              children: "🔄 Yeniden Çek / Yükle"
            }
          )
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "ocr-text-col", children: [
          /* @__PURE__ */ e.jsxs("div", { className: "ocr-text-header", children: [
            /* @__PURE__ */ e.jsx("label", { className: "text-sm font-semibold", children: "Taranan ve Temizlenen Metin" }),
            o && /* @__PURE__ */ e.jsx("span", { className: "ocr-badge processing", children: "⚡ Metin Okunuyor..." })
          ] }),
          /* @__PURE__ */ e.jsx(
            "textarea",
            {
              className: "ocr-textarea",
              rows: 6,
              placeholder: o ? "Türkçe karakterler taranıyor, lütfen bekleyin..." : "Taranan metin burada görünecektir. Gerekirse düzenleyebilirsiniz.",
              value: z,
              onChange: (d) => O(d.target.value),
              disabled: o
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
                  value: q,
                  onChange: (d) => w(d.target.value)
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
                    const d = I(z);
                    O(d.text);
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
                    O(`"${z.replace(/^"|"$/g, "")}"`);
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
      /* @__PURE__ */ e.jsx("button", { className: "btn btn-outline", onClick: u, children: "Vazgeç" }),
      /* @__PURE__ */ e.jsx(
        "button",
        {
          className: "btn btn-primary",
          disabled: !z.trim() || o,
          onClick: V,
          children: "✅ Bu Alıntıyı Aktar"
        }
      )
    ] })
  ] }) }) : null;
}, be = ({
  clubId: i,
  activeBookTitle: u,
  activeBookId: p,
  userCurrentPage: R = 0,
  onSessionFinished: h
}) => {
  var se, te, s, _;
  const [m, M] = r.useState(null), [L, z] = r.useState(!0), [O, q] = r.useState(null), [w, o] = r.useState("reading"), [j, P] = r.useState(25), [T, g] = r.useState(1500), [A, B] = r.useState(!1), [$] = r.useState(R), [C, W] = r.useState(R), [Z, I] = r.useState(""), [H, V] = r.useState(!1), [d, x] = r.useState("none"), [f, N] = r.useState(0.5), k = r.useRef(null), S = r.useRef(null), [F, c] = r.useState(""), [ee, Q] = r.useState(!1), G = async () => {
    try {
      const t = await fetch(`/me/book-clubs/${i}/room`);
      if (!t.ok) throw new Error("Oda bilgisi alınamadı.");
      const y = await t.json();
      M(y);
    } catch (t) {
      q(t.message || "Odaya bağlanırken hata oluştu.");
    } finally {
      z(!1);
    }
  };
  r.useEffect(() => {
    G();
    const t = setInterval(G, 1e4);
    return () => clearInterval(t);
  }, [i]), r.useEffect(() => {
    let t = null;
    return A && T > 0 ? t = setInterval(() => {
      g((y) => y - 1);
    }, 1e3) : T === 0 && A && (B(!1), ie(), w === "reading" ? (o("break"), g(300)) : w === "break" ? (o("discussion"), g(600)) : (o("reading"), g(j * 60))), () => clearInterval(t);
  }, [A, T, w, j]);
  const ie = () => {
    try {
      const t = new (window.AudioContext || window.webkitAudioContext)(), y = t.createOscillator(), K = t.createGain();
      y.type = "sine", y.frequency.setValueAtTime(587.33, t.currentTime), y.frequency.exponentialRampToValueAtTime(880, t.currentTime + 0.5), K.gain.setValueAtTime(0.3, t.currentTime), K.gain.exponentialRampToValueAtTime(1e-3, t.currentTime + 1.5), y.connect(K), K.connect(t.destination), y.start(), y.stop(t.currentTime + 1.5);
    } catch (t) {
      console.warn("Audio play failed", t);
    }
  };
  r.useEffect(() => {
    if (S.current && (S.current.stop(), S.current = null), d !== "none") {
      try {
        const t = new (window.AudioContext || window.webkitAudioContext)();
        k.current = t;
        const y = t.sampleRate * 2, K = t.createBuffer(1, y, t.sampleRate), E = K.getChannelData(0);
        let U = 0;
        for (let D = 0; D < y; D++) {
          const ue = Math.random() * 2 - 1;
          if (d === "rain")
            E[D] = (U + 0.02 * ue) / 1.02, U = E[D], E[D] *= 3.5;
          else if (d === "fireplace") {
            const me = Math.random() > 0.997 ? (Math.random() - 0.5) * 4 : 0;
            E[D] = (U + 0.04 * ue) / 1.04 + me, U = E[D];
          } else
            E[D] = (U + 0.08 * ue) / 1.08, U = E[D];
        }
        const ne = t.createBufferSource();
        ne.buffer = K, ne.loop = !0;
        const oe = t.createBiquadFilter();
        oe.type = d === "rain" ? "lowpass" : "bandpass", oe.frequency.value = d === "rain" ? 800 : 1200;
        const de = t.createGain();
        de.gain.value = f * 0.4, ne.connect(oe), oe.connect(de), de.connect(t.destination), ne.start(0), S.current = {
          stop: () => {
            try {
              ne.stop(), t.close();
            } catch {
            }
          }
        };
      } catch (t) {
        console.warn("Ambient audio init failed", t);
      }
      return () => {
        S.current && (S.current.stop(), S.current = null);
      };
    }
  }, [d, f]);
  const J = (t) => {
    P(t), g(t * 60), o("reading"), B(!0), V(!1);
  }, Y = async () => {
    const t = Math.max(0, C - $);
    try {
      const y = await fetch(`/me/book-clubs/${i}/room/complete-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: m == null ? void 0 : m.id,
          book_id: p,
          minutes_read: j,
          pages_read: t,
          current_page: C > 0 ? C : void 0,
          notes: Z.trim() || void 0
        })
      });
      if (!y.ok) throw new Error("Seans kaydedilemedi.");
      const K = await y.json();
      M(K), V(!0), h && h();
    } catch (y) {
      alert(y.message || "Seans kaydedilirken hata oluştu.");
    }
  }, le = async (t) => {
    if (t.preventDefault(), !(!F.trim() || !m)) {
      Q(!0);
      try {
        const y = await fetch(`/me/book-clubs/${i}/room/messages?room_id=${m.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: F.trim() })
        });
        if (!y.ok) throw new Error("Mesaj gönderilemedi.");
        const K = await y.json();
        M(K), c("");
      } catch (y) {
        console.warn("Send msg error:", y);
      } finally {
        Q(!1);
      }
    }
  }, re = (t) => {
    const y = Math.floor(t / 60), K = t % 60;
    return `${y.toString().padStart(2, "0")}:${K.toString().padStart(2, "0")}`;
  }, ae = w === "reading" ? j * 60 : w === "break" ? 300 : 600, X = Math.min(100, Math.max(0, (ae - T) / ae * 100));
  return L ? /* @__PURE__ */ e.jsx("div", { className: "p-8 text-center text-muted", children: "Canlı okuma odası yükleniyor..." }) : O ? /* @__PURE__ */ e.jsx("div", { className: "p-4 alert warning", children: O }) : /* @__PURE__ */ e.jsxs("div", { className: "live-room-container", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "live-room-header", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "live-room-badge", children: [
        /* @__PURE__ */ e.jsx("span", { className: "live-dot" }),
        " CANLI OKUMA ODASI"
      ] }),
      /* @__PURE__ */ e.jsx("h2", { className: "live-room-title", children: (m == null ? void 0 : m.title) || "Mihenk Birlikte Okuyoruz Seansı" }),
      /* @__PURE__ */ e.jsxs("p", { className: "live-room-subtitle", children: [
        "📖 Aktif Kitap: ",
        /* @__PURE__ */ e.jsx("strong", { children: u || "Kulüp Kitabı" })
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
                o("reading"), g(j * 60), B(!1);
              },
              children: [
                "📚 Odaklanma (",
                j,
                " dk)"
              ]
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: `phase-pill ${w === "break" ? "active" : ""}`,
              onClick: () => {
                o("break"), g(300), B(!1);
              },
              children: "☕ Mola (5 dk)"
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: `phase-pill ${w === "discussion" ? "active" : ""}`,
              onClick: () => {
                o("discussion"), g(600), B(!1);
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
                strokeDashoffset: 276.46 - 276.46 * X / 100
              }
            )
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "timer-content", children: [
            /* @__PURE__ */ e.jsx("span", { className: "timer-time", children: re(T) }),
            /* @__PURE__ */ e.jsx("span", { className: "timer-phase-label", children: w === "reading" ? "📖 Sessiz Okuma" : w === "break" ? "☕ Çay & Kahve Molası" : "💬 Canlı Değerlendirme" })
          ] })
        ] }) }),
        /* @__PURE__ */ e.jsxs("div", { className: "timer-action-buttons", children: [
          A ? /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-secondary btn-lg",
              onClick: () => B(!1),
              children: "⏸ Duraklat"
            }
          ) : /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-primary btn-lg",
              onClick: () => B(!0),
              children: "▶ Seansı Başlat"
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-outline",
              onClick: () => J(25),
              children: "🔄 25 dk Sıfırla"
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              className: "btn btn-outline",
              onClick: () => J(45),
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
                className: `btn btn-xs ${d === "none" ? "btn-primary" : "btn-outline"}`,
                onClick: () => x("none"),
                children: "Sessiz"
              }
            ),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                className: `btn btn-xs ${d === "rain" ? "btn-primary" : "btn-outline"}`,
                onClick: () => x("rain"),
                children: "🌧️ Yağmur"
              }
            ),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                className: `btn btn-xs ${d === "fireplace" ? "btn-primary" : "btn-outline"}`,
                onClick: () => x("fireplace"),
                children: "🔥 Şömine"
              }
            ),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                className: `btn btn-xs ${d === "whitenoise" ? "btn-primary" : "btn-outline"}`,
                onClick: () => x("whitenoise"),
                children: "☕ Beyaz Gürültü"
              }
            )
          ] }),
          d !== "none" && /* @__PURE__ */ e.jsx("div", { className: "ambient-volume", children: /* @__PURE__ */ e.jsx(
            "input",
            {
              type: "range",
              min: "0.1",
              max: "1.0",
              step: "0.05",
              value: f,
              onChange: (t) => N(parseFloat(t.target.value))
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
                  value: C,
                  min: $,
                  onChange: (t) => W(parseInt(t.target.value, 10) || $)
                }
              )
            ] }),
            /* @__PURE__ */ e.jsx("div", { className: "session-diff-badge", children: /* @__PURE__ */ e.jsxs("span", { children: [
              "+",
              Math.max(0, C - $),
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
                onChange: (t) => I(t.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "mt-3 flex justify-between items-center", children: [
            H ? /* @__PURE__ */ e.jsx("span", { className: "text-success font-semibold text-sm", children: "✅ Seans okuma geçmişine başarıyla işlendi!" }) : /* @__PURE__ */ e.jsx("span", { className: "text-muted text-xs", children: "Seans tamamlanınca kulüp yol haritana yansır." }),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                className: "btn btn-success btn-sm",
                onClick: Y,
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
            ((se = m == null ? void 0 : m.participants) == null ? void 0 : se.length) || 0,
            ")"
          ] }) }),
          /* @__PURE__ */ e.jsx("div", { className: "participants-list", children: (te = m == null ? void 0 : m.participants) == null ? void 0 : te.map((t) => /* @__PURE__ */ e.jsxs("div", { className: "participant-item", children: [
            /* @__PURE__ */ e.jsx("div", { className: "participant-avatar", children: t.display_name.charAt(0).toUpperCase() }),
            /* @__PURE__ */ e.jsxs("div", { className: "participant-info", children: [
              /* @__PURE__ */ e.jsxs("div", { className: "participant-name", children: [
                t.display_name,
                t.role === "owner" && /* @__PURE__ */ e.jsx("span", { className: "role-tag owner", children: "Kurucu" }),
                t.role === "moderator" && /* @__PURE__ */ e.jsx("span", { className: "role-tag mod", children: "Moderatör" })
              ] }),
              /* @__PURE__ */ e.jsxs("div", { className: "participant-sub", children: [
                "📖 ",
                t.reading_book_title || u || "Kitap",
                " • s. ",
                t.current_page || 0
              ] })
            ] })
          ] }, t.user_id)) })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "live-chat-card", children: [
          /* @__PURE__ */ e.jsxs("div", { className: "chat-header", children: [
            /* @__PURE__ */ e.jsx("h3", { children: "💬 Canlı Seans Sohbeti" }),
            /* @__PURE__ */ e.jsx("span", { className: "text-xs text-muted", children: "Mola ve tartışma fazında aktiftir" })
          ] }),
          /* @__PURE__ */ e.jsx("div", { className: "chat-messages-container", children: ((s = m == null ? void 0 : m.messages) == null ? void 0 : s.length) === 0 ? /* @__PURE__ */ e.jsx("div", { className: "chat-empty", children: "Henüz mesaj yok. Seans molasında ilk düşünceni yaz!" }) : (_ = m == null ? void 0 : m.messages) == null ? void 0 : _.map((t) => /* @__PURE__ */ e.jsxs("div", { className: "chat-bubble", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "chat-meta", children: [
              /* @__PURE__ */ e.jsx("strong", { children: t.display_name }),
              /* @__PURE__ */ e.jsx("span", { children: new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })
            ] }),
            /* @__PURE__ */ e.jsx("div", { className: "chat-text", children: t.content })
          ] }, t.id)) }),
          /* @__PURE__ */ e.jsxs("form", { onSubmit: le, className: "chat-input-form", children: [
            /* @__PURE__ */ e.jsx(
              "input",
              {
                type: "text",
                placeholder: "Düşünceni veya okuduğun sayfayı yaz...",
                value: F,
                onChange: (t) => c(t.target.value),
                disabled: ee
              }
            ),
            /* @__PURE__ */ e.jsx("button", { type: "submit", className: "btn btn-primary btn-sm", disabled: ee || !F.trim(), children: "Gönder" })
          ] })
        ] })
      ] })
    ] })
  ] });
};
function ge({
  activeClub: i,
  activeRead: u,
  activeUserProgress: p,
  clubWorkspaceRef: R,
  clubTab: h,
  setClubTab: m,
  setActiveClub: M,
  setStatus: L,
  books: z,
  targetDailyPages: O,
  setTargetDailyPages: q,
  discContent: w,
  discPage: o,
  discType: j,
  setDiscContent: P,
  setDiscPage: T,
  setDiscType: g,
  setIsOCRModalOpen: A,
  handleJoinReading: B,
  saveClubProgress: $,
  createDiscussion: C,
  toggleReaction: W,
  createEvent: Z,
  rsvpEvent: I,
  createPoll: H,
  vote: V,
  saveClubRead: d,
  updateMemberRole: x,
  openClub: f
}) {
  var N, k, S, F, c, ee, Q, G, ie, J, Y, le, re, ae, X, se, te;
  return /* @__PURE__ */ e.jsxs("article", { ref: R, className: "growth-card club-workspace", children: [
    /* @__PURE__ */ e.jsxs("header", { children: [
      /* @__PURE__ */ e.jsxs("div", { children: [
        /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "KULÜP MERKEZİ" }),
        /* @__PURE__ */ e.jsx("h2", { children: i.name }),
        /* @__PURE__ */ e.jsx("p", { children: i.description || "Kitapları birlikte derinlemesine keşfetme alanı." }),
        /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: "10px", alignItems: "center", marginTop: "6px", fontSize: "0.82rem", color: "#4a5b53" }, children: [
          /* @__PURE__ */ e.jsxs("span", { children: [
            "👥 ",
            ((N = i.stats) == null ? void 0 : N.member_count) || ((k = i.members) == null ? void 0 : k.length) || 1,
            " Üye"
          ] }),
          /* @__PURE__ */ e.jsx("span", { children: "·" }),
          /* @__PURE__ */ e.jsxs("span", { children: [
            "Rolün: ",
            /* @__PURE__ */ e.jsx("strong", { children: i.role === "owner" ? "👑 Sahip" : i.role === "moderator" ? "🛡️ Moderatör" : "📖 Üye" })
          ] }),
          i.invite_code && /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
            /* @__PURE__ */ e.jsx("span", { children: "·" }),
            /* @__PURE__ */ e.jsxs(
              "button",
              {
                type: "button",
                style: { padding: "3px 8px", fontSize: "0.75rem" },
                onClick: () => {
                  navigator.clipboard.writeText(i.invite_code), L("Davet kodu panoya kopyalandı!");
                },
                children: [
                  "🔑 Davet Kodu: ",
                  i.invite_code.slice(0, 8),
                  "…"
                ]
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("button", { type: "button", onClick: () => M(null), children: "Kulübü Kapat" })
    ] }),
    /* @__PURE__ */ e.jsxs("nav", { className: "club-nav-tabs", "aria-label": "Kulüp sekmeleri", children: [
      /* @__PURE__ */ e.jsx(
        "button",
        {
          type: "button",
          className: h === "reading" ? "active" : "",
          onClick: () => m("reading"),
          children: "📖 Aktif Okuma & Yol Haritası"
        }
      ),
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          type: "button",
          className: h === "discussions" ? "active" : "",
          onClick: () => m("discussions"),
          children: [
            "💬 Bölüm Tartışmaları ",
            i.upcoming_spoilers_count ? `(🔒 ${i.upcoming_spoilers_count} Kilitli)` : ""
          ]
        }
      ),
      /* @__PURE__ */ e.jsx(
        "button",
        {
          type: "button",
          className: h === "live_room" ? "active live-room-tab-btn" : "live-room-tab-btn",
          onClick: () => m("live_room"),
          children: "🎙️ Birlikte Okuyoruz (Canlı Oda)"
        }
      ),
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          type: "button",
          className: h === "events" ? "active" : "",
          onClick: () => m("events"),
          children: [
            "📅 Etkinlikler & Buluşmalar (",
            ((S = i.events) == null ? void 0 : S.length) || 0,
            ")"
          ]
        }
      ),
      /* @__PURE__ */ e.jsx(
        "button",
        {
          type: "button",
          className: h === "lobby" ? "active" : "",
          onClick: () => m("lobby"),
          children: "🏛️ Kulüp Lobisi & Kurallar"
        }
      ),
      /* @__PURE__ */ e.jsx(
        "button",
        {
          type: "button",
          className: h === "library" ? "active" : "",
          onClick: () => m("library"),
          children: "📚 Kulüp Kitaplığı & Oylamalar"
        }
      ),
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          type: "button",
          className: h === "stats" ? "active" : "",
          onClick: () => m("stats"),
          children: [
            "🏆 İstatistikler & Rozetler (",
            ((F = i.badges) == null ? void 0 : F.length) || 0,
            ")"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ e.jsxs("div", { className: "club-tab-content", children: [
      h === "reading" && /* @__PURE__ */ e.jsxs("div", { className: "club-grid-2", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Ayın Aktif Kitabı" }),
          u ? /* @__PURE__ */ e.jsxs("div", { children: [
            /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", gap: "16px", alignItems: "flex-start" }, children: [
              u.cover_url && /* @__PURE__ */ e.jsx(
                "img",
                {
                  src: u.cover_url,
                  alt: u.title,
                  style: { width: "80px", height: "115px", objectFit: "cover", borderRadius: "8px" }
                }
              ),
              /* @__PURE__ */ e.jsxs("div", { style: { flex: 1 }, children: [
                /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 4px", fontSize: "1.2rem", color: "#13392c" }, children: u.title }),
                /* @__PURE__ */ e.jsx("p", { style: { margin: "0 0 8px", color: "#096e54", fontWeight: 600 }, children: u.author }),
                /* @__PURE__ */ e.jsxs("p", { style: { margin: 0, fontSize: "0.84rem", color: "#65776f" }, children: [
                  u.page_count ? `${u.page_count} sayfa` : "Sayfa bilgisi belirtilmedi",
                  u.target_date && ` · Hedef: ${u.target_date}`
                ] })
              ] })
            ] }),
            /* @__PURE__ */ e.jsxs("div", { style: { marginTop: "16px", padding: "12px 14px", borderRadius: "12px", background: "#edf5f0" }, children: [
              /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700, color: "#184737" }, children: [
                /* @__PURE__ */ e.jsxs("span", { children: [
                  "Ortak Kulüp İlerlemesi (",
                  u.active_readers_count || 0,
                  " okur)"
                ] }),
                /* @__PURE__ */ e.jsxs("span", { children: [
                  "%",
                  u.joint_progress_percent || 0
                ] })
              ] }),
              /* @__PURE__ */ e.jsx("div", { className: "club-progress-bar-wrap", children: /* @__PURE__ */ e.jsx(
                "div",
                {
                  className: "club-progress-bar-fill",
                  style: { width: `${u.joint_progress_percent || 0}%` }
                }
              ) })
            ] }),
            /* @__PURE__ */ e.jsx("div", { style: { marginTop: "16px", borderTop: "1px solid #e1ebe5", paddingTop: "14px" }, children: p != null && p.in_library ? /* @__PURE__ */ e.jsx("div", { style: { fontSize: "0.85rem", color: "#096a51", fontWeight: 700 }, children: "✓ Kitap kitaplığında aktif olarak okunuyor." }) : /* @__PURE__ */ e.jsxs("div", { style: { display: "grid", gap: "10px" }, children: [
              /* @__PURE__ */ e.jsx("p", { style: { margin: 0, fontSize: "0.88rem", fontWeight: 600 }, children: "📌 Bu kitabı okuma listene ekle ve hedefini belirle:" }),
              /* @__PURE__ */ e.jsxs("label", { style: { display: "flex", alignItems: "center", gap: "10px", fontSize: "0.86rem" }, children: [
                /* @__PURE__ */ e.jsx("span", { children: "Günlük okuma hedefin:" }),
                /* @__PURE__ */ e.jsxs(
                  "select",
                  {
                    value: O,
                    onChange: (s) => q(Number(s.target.value)),
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
                  onClick: () => B(u.book_id),
                  children: "Okumaya Katıl ve Kitaplığa Ekle"
                }
              )
            ] }) })
          ] }) : /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Şu an belirlenmiş bir aktif okuma bulunmuyor." }),
          ["owner", "moderator"].includes(i.role) && /* @__PURE__ */ e.jsxs("div", { style: { marginTop: "20px", borderTop: "1px solid #e1ebe5", paddingTop: "14px" }, children: [
            /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 8px", fontSize: "0.92rem" }, children: "⚙️ Kulüp Aktif Kitabını Belirle" }),
            /* @__PURE__ */ e.jsxs("form", { onSubmit: d, children: [
              /* @__PURE__ */ e.jsxs("select", { name: "book_id", required: !0, defaultValue: (u == null ? void 0 : u.book_id) || "", children: [
                /* @__PURE__ */ e.jsx("option", { value: "", children: "Kitap Seç…" }),
                z.map((s) => /* @__PURE__ */ e.jsxs("option", { value: s.id, children: [
                  s.title,
                  " — ",
                  s.author
                ] }, s.id))
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
          u && /* @__PURE__ */ e.jsxs("div", { children: [
            /* @__PURE__ */ e.jsx("div", { className: "club-roadmap", children: (c = p == null ? void 0 : p.milestones) == null ? void 0 : c.map((s) => /* @__PURE__ */ e.jsxs(
              "div",
              {
                className: `club-roadmap-node ${s.reached ? "reached" : ""}`,
                children: [
                  /* @__PURE__ */ e.jsx("div", { className: "node-dot", children: s.reached ? "✓" : `%${s.percent}` }),
                  /* @__PURE__ */ e.jsx("strong", { children: s.title }),
                  /* @__PURE__ */ e.jsxs("span", { children: [
                    "s. ",
                    s.page
                  ] })
                ]
              },
              s.percent
            )) }),
            /* @__PURE__ */ e.jsx("div", { style: { background: "#fff", border: "1px solid #dae5df", borderRadius: "12px", padding: "14px", margin: "16px 0" }, children: /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
              /* @__PURE__ */ e.jsxs("div", { children: [
                /* @__PURE__ */ e.jsx("span", { style: { fontSize: "0.78rem", color: "#687770" }, children: "Bireysel İlerleme" }),
                /* @__PURE__ */ e.jsxs("p", { style: { margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#144c3b" }, children: [
                  "s. ",
                  (p == null ? void 0 : p.current_page) || 0,
                  " / ",
                  (p == null ? void 0 : p.total_pages) || u.page_count || 200,
                  " (%",
                  (p == null ? void 0 : p.percent) || 0,
                  ")"
                ] })
              ] }),
              /* @__PURE__ */ e.jsxs("div", { style: { textAlign: "right" }, children: [
                /* @__PURE__ */ e.jsx("span", { style: { fontSize: "0.78rem", color: "#687770" }, children: "Tahmini Bitiş" }),
                /* @__PURE__ */ e.jsx("p", { style: { margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#096e54" }, children: p != null && p.days_left ? `${p.days_left} gün kaldı` : "Tamamlandı! 🏆" })
              ] })
            ] }) }),
            /* @__PURE__ */ e.jsxs("form", { onSubmit: $, style: { display: "grid", gap: "8px" }, children: [
              /* @__PURE__ */ e.jsx("input", { type: "hidden", name: "book_id", value: u.book_id }),
              /* @__PURE__ */ e.jsxs("label", { style: { fontSize: "0.84rem", fontWeight: 600 }, children: [
                "Bugün geldiğin sayfa:",
                /* @__PURE__ */ e.jsx(
                  "input",
                  {
                    name: "current_page",
                    type: "number",
                    min: "0",
                    max: u.page_count || 9999,
                    defaultValue: (p == null ? void 0 : p.current_page) || 0,
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
                    defaultValue: (p == null ? void 0 : p.daily_target_pages) || 10
                  }
                )
              ] }),
              /* @__PURE__ */ e.jsx("button", { className: "primary", style: { background: "#0a6e54", color: "#fff", border: 0, borderRadius: "10px", padding: "10px" }, children: "İlerlemeyi Kaydet ve Tartışmaları Aç" })
            ] })
          ] })
        ] })
      ] }),
      h === "discussions" && /* @__PURE__ */ e.jsxs("div", { className: "club-tab-content", children: [
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
          /* @__PURE__ */ e.jsxs("form", { onSubmit: C, style: { display: "grid", gap: "10px" }, children: [
            /* @__PURE__ */ e.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }, children: [
              /* @__PURE__ */ e.jsxs("label", { style: { fontSize: "0.84rem" }, children: [
                "Kitap",
                /* @__PURE__ */ e.jsx("select", { name: "book_id", required: !0, defaultValue: (u == null ? void 0 : u.book_id) || "", children: i.reads.map((s) => /* @__PURE__ */ e.jsx("option", { value: s.book_id, children: s.title }, s.book_id)) })
              ] }),
              /* @__PURE__ */ e.jsxs("label", { style: { fontSize: "0.84rem" }, children: [
                "Paylaşım Türü",
                /* @__PURE__ */ e.jsxs(
                  "select",
                  {
                    name: "discussion_type",
                    value: j,
                    onChange: (s) => g(s.target.value),
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
                  value: o,
                  onChange: (s) => T(s.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ e.jsx(
              "textarea",
              {
                name: "content",
                placeholder: "Bu bölüm ya da alıntı sende nasıl bir düşünce uyandırdı? Düşüncelerini kulüple paylaş…",
                required: !0,
                value: w,
                onChange: (s) => P(s.target.value),
                rows: 4
              }
            ),
            /* @__PURE__ */ e.jsx("button", { className: "primary", style: { background: "#0a6e54", color: "#fff", border: 0, padding: "10px" }, children: "Kulüple Paylaş" })
          ] })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Tartışma Akışı" }),
          i.discussions.length === 0 ? /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Henüz bu kulüpte bir paylaşım yapılmadı. İlk kıvılcımı sen çak!" }) : /* @__PURE__ */ e.jsx("div", { style: { display: "grid", gap: "12px" }, children: i.discussions.map((s) => {
            if (s.is_spoiler_locked)
              return /* @__PURE__ */ e.jsxs("div", { className: "spoiler-locked-card", children: [
                /* @__PURE__ */ e.jsx("span", { children: "🔒" }),
                /* @__PURE__ */ e.jsxs("div", { children: [
                  /* @__PURE__ */ e.jsxs("strong", { children: [
                    "s. ",
                    s.page_number,
                    " Tartışması Kilitli (Spoiler Koruması)"
                  ] }),
                  /* @__PURE__ */ e.jsx("p", { style: { margin: "2px 0 0", fontSize: "0.8rem" }, children: "Bu bölüme ulaştığında ve sayfanı kaydettiğinde tartışma otomatik olarak açılacaktır." })
                ] })
              ] }, s.id);
            const _ = s.discussion_type === "quote" ? "📜 Alıntı" : s.discussion_type === "question" ? "❓ Soru" : s.discussion_type === "analysis" ? "🔍 Analiz" : "💬 Tartışma";
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
                      /* @__PURE__ */ e.jsx("strong", { style: { fontSize: "0.95rem", color: "#133d30" }, children: s.display_name }),
                      /* @__PURE__ */ e.jsxs("span", { style: { marginLeft: "8px", fontSize: "0.78rem", color: "#687b72" }, children: [
                        s.book_title,
                        s.page_number ? ` · s. ${s.page_number}` : "",
                        s.chapter_title ? ` (${s.chapter_title})` : ""
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
                        children: _
                      }
                    )
                  ] }),
                  /* @__PURE__ */ e.jsx("p", { style: { margin: "10px 0 12px", fontSize: "0.92rem", color: "#273630", lineHeight: 1.5, whiteSpace: "pre-wrap" }, children: s.content }),
                  /* @__PURE__ */ e.jsx("div", { className: "club-reaction-bar", children: [
                    { type: "thoughtful", icon: "🤔", label: "Düşündürücü" },
                    { type: "agree", icon: "👍", label: "Katılıyorum" },
                    { type: "heart", icon: "❤️", label: "Sevdim" },
                    { type: "bookmark", icon: "🔖", label: "Not Aldım" }
                  ].map((t) => {
                    var E;
                    const y = s.reactions && s.reactions[t.type] || 0, K = (E = s.user_reactions) == null ? void 0 : E.includes(t.type);
                    return /* @__PURE__ */ e.jsxs(
                      "button",
                      {
                        type: "button",
                        className: `club-reaction-btn ${K ? "active" : ""}`,
                        onClick: () => W(s.id, t.type),
                        title: t.label,
                        children: [
                          /* @__PURE__ */ e.jsx("span", { children: t.icon }),
                          /* @__PURE__ */ e.jsx("span", { children: t.label }),
                          y > 0 && /* @__PURE__ */ e.jsx("strong", { children: y })
                        ]
                      },
                      t.type
                    );
                  }) })
                ]
              },
              s.id
            );
          }) })
        ] })
      ] }),
      h === "live_room" && /* @__PURE__ */ e.jsx("div", { className: "club-tab-content", children: /* @__PURE__ */ e.jsx(
        be,
        {
          clubId: i.id,
          activeBookTitle: u == null ? void 0 : u.title,
          activeBookId: u == null ? void 0 : u.book_id,
          userCurrentPage: (p == null ? void 0 : p.current_page) || 0,
          onSessionFinished: () => f(i.id)
        }
      ) }),
      h === "events" && /* @__PURE__ */ e.jsxs("div", { className: "club-grid-2", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Kulüp Buluşmaları & Etkinlik Takvimi" }),
          ((ee = i.events) == null ? void 0 : ee.length) === 0 ? /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Henüz planlanmış bir etkinlik bulunmuyor." }) : /* @__PURE__ */ e.jsx("div", { style: { display: "grid", gap: "12px" }, children: (Q = i.events) == null ? void 0 : Q.map((s) => /* @__PURE__ */ e.jsxs("div", { className: "event-card", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "event-card-header", children: [
              /* @__PURE__ */ e.jsx("span", { className: `event-type-badge event-type-${s.event_type}`, children: s.event_type === "kickoff" ? "Başlangıç Buluşması" : s.event_type === "midpoint" ? "Ara Değerlendirme" : s.event_type === "final" ? "Kapanış Toplantısı" : "Genel Buluşma" }),
              /* @__PURE__ */ e.jsxs("span", { style: { fontSize: "0.78rem", color: "#6c7c74" }, children: [
                "📅 ",
                s.event_date ? new Date(s.event_date).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "Tarih belirtilmedi"
              ] })
            ] }),
            /* @__PURE__ */ e.jsx("h4", { style: { margin: "4px 0 2px", fontSize: "1.05rem", color: "#16382c" }, children: s.title }),
            /* @__PURE__ */ e.jsx("p", { style: { margin: "0 0 6px", fontSize: "0.86rem", color: "#4d5d56" }, children: s.description }),
            s.location && /* @__PURE__ */ e.jsxs("p", { style: { margin: 0, fontSize: "0.8rem", color: "#096e54" }, children: [
              "📍 Konum / Bağlantı: ",
              s.location
            ] }),
            /* @__PURE__ */ e.jsxs("div", { style: { marginTop: "8px", borderTop: "1px solid #e9f0ec", paddingTop: "8px" }, children: [
              /* @__PURE__ */ e.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#55665f", marginBottom: "6px" }, children: [
                /* @__PURE__ */ e.jsxs("span", { children: [
                  s.rsvp_counts.attending,
                  " Katılıyor · ",
                  s.rsvp_counts.maybe,
                  " Belki · ",
                  s.rsvp_counts.declined,
                  " Katılamıyor"
                ] }),
                s.user_rsvp && /* @__PURE__ */ e.jsxs("strong", { children: [
                  "Seçimin: ",
                  s.user_rsvp === "attending" ? "Katılıyorum" : s.user_rsvp === "maybe" ? "Belki" : "Katılamıyorum"
                ] })
              ] }),
              /* @__PURE__ */ e.jsxs("div", { className: "rsvp-buttons", children: [
                /* @__PURE__ */ e.jsx(
                  "button",
                  {
                    type: "button",
                    className: `rsvp-btn ${s.user_rsvp === "attending" ? "active" : ""}`,
                    onClick: () => I(s.id, "attending"),
                    children: "✅ Katılıyorum"
                  }
                ),
                /* @__PURE__ */ e.jsx(
                  "button",
                  {
                    type: "button",
                    className: `rsvp-btn ${s.user_rsvp === "maybe" ? "active" : ""}`,
                    onClick: () => I(s.id, "maybe"),
                    children: "🤔 Belki"
                  }
                ),
                /* @__PURE__ */ e.jsx(
                  "button",
                  {
                    type: "button",
                    className: `rsvp-btn ${s.user_rsvp === "declined" ? "active" : ""}`,
                    onClick: () => I(s.id, "declined"),
                    children: "❌ Katılamıyorum"
                  }
                )
              ] })
            ] })
          ] }, s.id)) })
        ] }),
        ["owner", "moderator"].includes(i.role) ? /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Yeni Etkinlik / Buluşma Oluştur" }),
          /* @__PURE__ */ e.jsxs("form", { onSubmit: Z, style: { display: "grid", gap: "10px" }, children: [
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
      h === "lobby" && /* @__PURE__ */ e.jsxs("div", { className: "club-grid-2", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Kulüp Lobisi & Kurallar" }),
          /* @__PURE__ */ e.jsxs("div", { style: { background: "#fff", border: "1px solid #dbe6df", borderRadius: "12px", padding: "16px", marginBottom: "16px" }, children: [
            /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 6px", color: "#163a2d" }, children: "Kulüp Vizyonu" }),
            /* @__PURE__ */ e.jsx("p", { style: { margin: 0, fontSize: "0.9rem", color: "#4a5c53" }, children: i.description || "Henüz açıklama girilmedi." })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { background: "#fff", border: "1px solid #dbe6df", borderRadius: "12px", padding: "16px" }, children: [
            /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 6px", color: "#163a2d" }, children: "Kulüp Kuralları" }),
            /* @__PURE__ */ e.jsx("p", { style: { margin: 0, fontSize: "0.88rem", color: "#4a5c53", whiteSpace: "pre-wrap" }, children: i.rules || `1. Spoiler korumasına dikkat ediniz.
2. Tartışmalarda yapıcı ve düşünceyi derinleştirici yorumlar paylaşınız.
3. Okuma hedefinize sadık kalmaya özen gösteriniz.` })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { style: { marginTop: "16px", padding: "14px", borderRadius: "12px", background: "#edf7f1" }, children: [
            /* @__PURE__ */ e.jsx("span", { style: { fontSize: "0.8rem", color: "#096a51", fontWeight: 700 }, children: "Davet Bağlantısı ve Kodu" }),
            /* @__PURE__ */ e.jsx("p", { style: { margin: "4px 0 8px", fontSize: "0.88rem", wordBreak: "break-all" }, children: /* @__PURE__ */ e.jsx("code", { children: i.invite_code }) }),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                type: "button",
                style: { padding: "6px 12px", fontSize: "0.8rem" },
                onClick: () => {
                  navigator.clipboard.writeText(i.invite_code), L("Davet kodu kopyalandı!");
                },
                children: "Davet Kodunu Kopyala"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsxs("h3", { children: [
            "Kulüp Üyeleri (",
            ((G = i.members) == null ? void 0 : G.length) || 1,
            ")"
          ] }),
          /* @__PURE__ */ e.jsx("ul", { style: { margin: 0 }, children: (ie = i.members) == null ? void 0 : ie.map((s) => /* @__PURE__ */ e.jsxs("li", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ e.jsxs("div", { children: [
              /* @__PURE__ */ e.jsx("strong", { children: s.display_name }),
              /* @__PURE__ */ e.jsxs("span", { children: [
                s.role === "owner" ? "👑 Sahip" : s.role === "moderator" ? "🛡️ Moderatör" : "📖 Üye",
                " · Katıldı: ",
                new Date(s.joined_at).toLocaleDateString("tr-TR")
              ] })
            ] }),
            i.role === "owner" && s.role !== "owner" && /* @__PURE__ */ e.jsxs(
              "select",
              {
                value: s.role,
                onChange: (_) => x(s.user_id, _.target.value),
                style: { width: "auto", padding: "4px 8px", fontSize: "0.78rem" },
                children: [
                  /* @__PURE__ */ e.jsx("option", { value: "member", children: "Üye Yap" }),
                  /* @__PURE__ */ e.jsx("option", { value: "moderator", children: "Moderatör Yap" })
                ]
              }
            )
          ] }, s.user_id)) })
        ] })
      ] }),
      h === "library" && /* @__PURE__ */ e.jsxs("div", { className: "club-grid-2", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Sıradaki Kitap Oylamaları" }),
          ["owner", "moderator"].includes(i.role) && /* @__PURE__ */ e.jsxs("form", { onSubmit: H, style: { marginBottom: "20px", borderBottom: "1px solid #e1ebe5", paddingBottom: "16px" }, children: [
            /* @__PURE__ */ e.jsx("h4", { style: { margin: "0 0 8px", fontSize: "0.92rem" }, children: "Yeni Kitap Oylaması Başlat" }),
            /* @__PURE__ */ e.jsx("input", { name: "title", placeholder: "Örn: Gelecek Ay Hangi Klasik Kitabı Okuyalım?", required: !0 }),
            /* @__PURE__ */ e.jsx("select", { name: "option_book_ids", multiple: !0, size: 4, required: !0, style: { margin: "8px 0" }, children: z.map((s) => /* @__PURE__ */ e.jsxs("option", { value: s.id, children: [
              s.title,
              " — ",
              s.author
            ] }, s.id)) }),
            /* @__PURE__ */ e.jsx("small", { style: { display: "block", color: "#65776f", marginBottom: "8px" }, children: "Ctrl tuşuna basılı tutarak birden fazla kitap seçebilirsin." }),
            /* @__PURE__ */ e.jsx("button", { className: "primary", style: { background: "#0a6e54", color: "#fff", border: 0, padding: "8px 14px" }, children: "Oylamayı Başlat" })
          ] }),
          ((J = i.polls) == null ? void 0 : J.length) === 0 ? /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Şu an aktif bir oylama bulunmuyor." }) : i.polls.map((s) => /* @__PURE__ */ e.jsxs("div", { className: "club-poll", style: { background: "#fff", border: "1px solid #d9e5df", borderRadius: "12px", padding: "14px", marginBottom: "12px" }, children: [
            /* @__PURE__ */ e.jsx("strong", { style: { fontSize: "1rem", color: "#144636" }, children: s.title }),
            /* @__PURE__ */ e.jsx("div", { style: { display: "grid", gap: "8px", marginTop: "10px" }, children: s.options.map((_) => /* @__PURE__ */ e.jsxs(
              "button",
              {
                className: _.selected ? "selected" : "",
                type: "button",
                onClick: () => V(s.id, _.id),
                style: { display: "flex", justifyContent: "space-between", padding: "10px 14px" },
                children: [
                  /* @__PURE__ */ e.jsxs("span", { children: [
                    _.title,
                    " — ",
                    _.author
                  ] }),
                  /* @__PURE__ */ e.jsxs("strong", { children: [
                    _.vote_count,
                    " Oy ",
                    _.selected ? "✓" : ""
                  ] })
                ]
              },
              _.id
            )) })
          ] }, s.id))
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Kulüp Geçmişi & Tamamlanan Okumalar" }),
          i.reads.filter((s) => s.status === "completed").length === 0 ? /* @__PURE__ */ e.jsx("p", { style: { color: "#687770" }, children: "Henüz tamamlanan bir kulüp okuması yok." }) : /* @__PURE__ */ e.jsx("ul", { style: { margin: 0 }, children: i.reads.filter((s) => s.status === "completed").map((s) => /* @__PURE__ */ e.jsx("li", { children: /* @__PURE__ */ e.jsxs("div", { children: [
            /* @__PURE__ */ e.jsx("strong", { children: s.title }),
            /* @__PURE__ */ e.jsxs("span", { children: [
              s.author,
              " · Tamamlandı 🏆"
            ] })
          ] }) }, s.book_id)) })
        ] })
      ] }),
      h === "stats" && /* @__PURE__ */ e.jsxs("div", { className: "club-tab-content", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Kulüp İstatistikleri" }),
          /* @__PURE__ */ e.jsxs("div", { className: "growth-metrics", children: [
            /* @__PURE__ */ e.jsxs("b", { children: [
              ((Y = i.stats) == null ? void 0 : Y.member_count) || ((le = i.members) == null ? void 0 : le.length) || 1,
              /* @__PURE__ */ e.jsx("small", { children: "Toplam Üye" })
            ] }),
            /* @__PURE__ */ e.jsxs("b", { children: [
              ((re = i.stats) == null ? void 0 : re.total_discussions) || ((ae = i.discussions) == null ? void 0 : ae.length) || 0,
              /* @__PURE__ */ e.jsx("small", { children: "Tartışma & Alıntı" })
            ] }),
            /* @__PURE__ */ e.jsxs("b", { children: [
              ((X = i.stats) == null ? void 0 : X.completed_books_count) || 0,
              /* @__PURE__ */ e.jsx("small", { children: "Tamamlanan Kitap" })
            ] }),
            /* @__PURE__ */ e.jsxs("b", { children: [
              ((se = i.events) == null ? void 0 : se.length) || 0,
              /* @__PURE__ */ e.jsx("small", { children: "Buluşma / Etkinlik" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "club-card-section", children: [
          /* @__PURE__ */ e.jsx("h3", { children: "Kazanılan Kulüp Rozetleri" }),
          /* @__PURE__ */ e.jsx("div", { className: "club-grid-3", children: (te = i.badges) == null ? void 0 : te.map((s) => /* @__PURE__ */ e.jsxs("div", { className: "badge-item", children: [
            /* @__PURE__ */ e.jsx("div", { className: "badge-icon", children: s.icon }),
            /* @__PURE__ */ e.jsx("strong", { children: s.title }),
            /* @__PURE__ */ e.jsx("p", { children: s.description })
          ] }, s.code)) })
        ] })
      ] })
    ] })
  ] });
}
const fe = ["Roman", "Bilim Kurgu", "Fantastik", "Polisiye", "Tarih", "Psikoloji", "Felsefe", "Şiir"];
function ve() {
  var xe;
  const [i, u] = r.useState(null), [p, R] = r.useState(null), [h, m] = r.useState(null), [M, L] = r.useState([]), [z, O] = r.useState([]), [q, w] = r.useState([]), [o, j] = r.useState(null), [P, T] = r.useState("reading"), [g, A] = r.useState(!1), [B, $] = r.useState(""), [C, W] = r.useState(""), [Z, I] = r.useState("discussion"), [H, V] = r.useState([]), [d, x] = r.useState(""), [f, N] = r.useState("mixed"), [k, S] = r.useState(""), [F, c] = r.useState(""), [ee, Q] = r.useState(!0), [G, ie] = r.useState(10), J = r.useRef(null);
  async function Y() {
    Q(!0), c("");
    const a = await Promise.allSettled([
      v("/me/weekly-summary"),
      v("/me/onboarding"),
      v("/me/notification-preferences"),
      v("/me/reading-lists"),
      v("/me/book-clubs"),
      v("/books")
    ]);
    a[0].status === "fulfilled" && u(a[0].value), a[1].status === "fulfilled" && (R(a[1].value), x(a[1].value.liked_authors.join(", ")), V(a[1].value.preferred_genres || []), N(a[1].value.pace_preference || "mixed")), a[2].status === "fulfilled" && m(a[2].value), a[3].status === "fulfilled" && L(a[3].value), a[4].status === "fulfilled" && O(a[4].value), a[5].status === "fulfilled" && w(a[5].value), a.some((n) => n.status === "rejected") && c("Bazı ürün verileri yüklenemedi; yeniden deneyebilirsin."), Q(!1);
  }
  r.useEffect(() => {
    Y();
  }, []);
  async function le(a) {
    a.preventDefault(), c("Kaydediliyor…");
    const n = await v("/me/onboarding", {
      method: "PUT",
      body: JSON.stringify({
        liked_authors: d.split(",").map((l) => l.trim()).filter(Boolean).slice(0, 20),
        liked_book_ids: [],
        preferred_genres: H,
        pace_preference: f,
        tone_preference: "balanced",
        focus_preference: "balanced",
        completed: !0
      })
    });
    R(n), c("Zevk profilin önerilere eklendi.");
  }
  async function re(a) {
    a.preventDefault(), c("Kitaplık içe aktarılıyor…");
    const n = await v("/me/library/import", { method: "POST", body: JSON.stringify({ csv_text: k }) });
    c(
      `${n.imported} kitap aktarıldı · ${n.catalog_matches} katalog eşleşmesi · ${n.custom_books} kişisel kayıt.`
    ), S(""), window.dispatchEvent(new CustomEvent("pkm-refresh"));
  }
  async function ae(a) {
    a && S(await a.text());
  }
  async function X(a) {
    m(a), await v("/me/notification-preferences", { method: "PUT", body: JSON.stringify(a) }), c("Bildirim tercihlerin kaydedildi.");
  }
  async function se(a) {
    a.preventDefault();
    const n = new FormData(a.currentTarget);
    await v("/me/reading-lists", {
      method: "POST",
      body: JSON.stringify({
        title: n.get("title"),
        description: n.get("description"),
        visibility: n.get("visibility")
      })
    }), a.currentTarget.reset(), await Y();
  }
  async function te(a) {
    a.preventDefault();
    const n = new FormData(a.currentTarget), l = await v("/me/book-clubs", {
      method: "POST",
      body: JSON.stringify({
        name: n.get("name"),
        description: n.get("description"),
        rules: n.get("rules") || "",
        visibility: n.get("visibility") || "private"
      })
    });
    a.currentTarget.reset(), await Y(), j(l), T("lobby"), c("Kulübün başarıyla oluşturuldu!");
  }
  async function s(a) {
    a.preventDefault();
    const n = a.currentTarget, l = new FormData(n);
    c("Kulübe katılınıyor…");
    try {
      const b = await v("/me/book-clubs/join", {
        method: "POST",
        body: JSON.stringify({ invite_code: l.get("invite_code") })
      });
      n.reset(), await Y(), j(b), T("reading"), c("Kulübe katıldın. Aktif okumaya hoş geldin!"), requestAnimationFrame(
        () => {
          var pe;
          return (pe = J.current) == null ? void 0 : pe.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      );
    } catch (b) {
      c(b instanceof Error ? b.message : "Kulübe katılınamadı.");
    }
  }
  async function _(a) {
    c("Kulüp açılıyor…");
    try {
      const n = await v(`/me/book-clubs/${a}`);
      j(n), T("reading"), c(""), requestAnimationFrame(
        () => {
          var l;
          return (l = J.current) == null ? void 0 : l.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      );
    } catch (n) {
      c(n instanceof Error ? n.message : "Kulüp açılamadı.");
    }
  }
  async function t(a) {
    if (o) {
      c("Kitaplığına ekleniyor ve okuma başlatılıyor…");
      try {
        const n = await v(`/me/book-clubs/${o.id}/join-reading`, {
          method: "POST",
          body: JSON.stringify({
            book_id: a,
            daily_target_pages: G,
            shelf: "reading"
          })
        });
        j(n), c(`Okumaya katıldın! Günlük hedefin: günde ${G} sayfa.`), window.dispatchEvent(new CustomEvent("pkm-refresh"));
      } catch (n) {
        c(n instanceof Error ? n.message : "Okumaya katılınamadı.");
      }
    }
  }
  async function y(a) {
    if (a.preventDefault(), !o) return;
    const n = new FormData(a.currentTarget), l = String(n.get("book_id")), b = Number(n.get("current_page")), pe = Number(n.get("daily_target_pages")) || G, he = q.find((ce) => ce.id === l);
    try {
      const ce = await v(`/me/book-clubs/${o.id}/progress`, {
        method: "PUT",
        body: JSON.stringify({
          book_id: l,
          current_page: b,
          total_pages: (he == null ? void 0 : he.page_count) || null,
          daily_target_pages: pe
        })
      });
      j(ce), c(`İlerlemen kaydedildi (s. ${b}). Ulaştığın tartışmalar açıldı!`), window.dispatchEvent(new CustomEvent("pkm-refresh"));
    } catch (ce) {
      c(ce instanceof Error ? ce.message : "İlerleme kaydedilemedi.");
    }
  }
  async function K(a) {
    if (a.preventDefault(), !o) return;
    const n = a.currentTarget, l = new FormData(n);
    try {
      const b = await v(`/me/book-clubs/${o.id}/discussions`, {
        method: "POST",
        body: JSON.stringify({
          book_id: l.get("book_id"),
          content: l.get("content"),
          page_number: l.get("page_number") ? Number(l.get("page_number")) : null,
          chapter_title: l.get("chapter_title") || null,
          discussion_type: l.get("discussion_type") || "discussion"
        })
      });
      j(b), n.reset(), c("Paylaşımın kulüp tartışmalarına eklendi.");
    } catch (b) {
      c(b instanceof Error ? b.message : "Tartışma oluşturulamadı.");
    }
  }
  async function E(a, n) {
    if (o)
      try {
        const l = await v(
          `/me/book-clubs/${o.id}/discussions/${a}/reactions`,
          {
            method: "POST",
            body: JSON.stringify({ reaction_type: n })
          }
        );
        j(l);
      } catch (l) {
        c(l instanceof Error ? l.message : "Tepki kaydedilemedi.");
      }
  }
  async function U(a) {
    if (a.preventDefault(), !o) return;
    const n = a.currentTarget, l = new FormData(n);
    try {
      const b = await v(`/me/book-clubs/${o.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          title: l.get("title"),
          description: l.get("description"),
          event_type: l.get("event_type") || "general",
          event_date: l.get("event_date"),
          location: l.get("location") || ""
        })
      });
      j(b), n.reset(), c("Yeni kulüp buluşması takvime eklendi.");
    } catch (b) {
      c(b instanceof Error ? b.message : "Etkinlik oluşturulamadı.");
    }
  }
  async function ne(a, n) {
    if (o)
      try {
        const l = await v(
          `/me/book-clubs/${o.id}/events/${a}/rsvp`,
          {
            method: "PUT",
            body: JSON.stringify({ status: n })
          }
        );
        j(l), c(`Katılım durumun kaydedildi: ${n === "attending" ? "Katılıyorum" : n === "maybe" ? "Belki" : "Katılamıyorum"}`);
      } catch (l) {
        c(l instanceof Error ? l.message : "Katılım durumu kaydedilemedi.");
      }
  }
  async function oe(a) {
    if (a.preventDefault(), !o) return;
    const n = a.currentTarget, l = new FormData(n);
    try {
      const b = await v(`/me/book-clubs/${o.id}/polls`, {
        method: "POST",
        body: JSON.stringify({
          title: l.get("title"),
          option_book_ids: l.getAll("option_book_ids")
        })
      });
      j(b), n.reset(), c("Yeni kitap oylaması açıldı.");
    } catch (b) {
      c(b instanceof Error ? b.message : "Oylama açılamadı.");
    }
  }
  async function de(a, n) {
    if (o)
      try {
        const l = await v(
          `/me/book-clubs/${o.id}/polls/${a}/vote`,
          {
            method: "PUT",
            body: JSON.stringify({ option_id: n })
          }
        );
        j(l), c("Oyun kaydedildi!");
      } catch (l) {
        c(l instanceof Error ? l.message : "Oy verilemedi.");
      }
  }
  async function D(a) {
    if (a.preventDefault(), !o) return;
    const n = new FormData(a.currentTarget);
    try {
      const l = await v(`/me/book-clubs/${o.id}/reads`, {
        method: "PUT",
        body: JSON.stringify({
          book_id: n.get("book_id"),
          status: n.get("status") || "reading",
          start_date: n.get("start_date") || null,
          target_date: n.get("target_date") || null
        })
      });
      j(l), c("Kulübün okuma planı güncellendi.");
    } catch (l) {
      c(l instanceof Error ? l.message : "Okuma güncellenemedi.");
    }
  }
  async function ue(a, n) {
    if (o)
      try {
        const l = await v(
          `/me/book-clubs/${o.id}/members/${a}/role`,
          {
            method: "PUT",
            body: JSON.stringify({ role: n })
          }
        );
        j(l), c("Üye yetkisi güncellendi.");
      } catch (l) {
        c(l instanceof Error ? l.message : "Yetki güncellenemedi.");
      }
  }
  const me = (o == null ? void 0 : o.active_read) || (o == null ? void 0 : o.reads.find((a) => a.status === "reading")) || null, ye = o == null ? void 0 : o.user_progress.find((a) => me && a.book_id === me.book_id);
  return ee ? /* @__PURE__ */ e.jsxs("div", { className: "growth-skeleton", role: "status", "aria-label": "Okur merkezi yükleniyor", children: [
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
      /* @__PURE__ */ e.jsxs("button", { type: "button", className: "btn-growth-refresh", onClick: Y, children: [
        /* @__PURE__ */ e.jsx("span", { children: "🔄" }),
        " Yenile"
      ] })
    ] }),
    F && /* @__PURE__ */ e.jsx("p", { className: "growth-status", role: "status", children: F }),
    /* @__PURE__ */ e.jsxs("div", { className: "growth-grid", children: [
      /* @__PURE__ */ e.jsxs("article", { className: "growth-card growth-weekly", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "card-header-line", children: [
          /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "BU HAFTA" }),
          /* @__PURE__ */ e.jsx("h2", { children: "Okuma özetin" })
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "growth-metrics", children: [
          /* @__PURE__ */ e.jsxs("div", { className: "growth-metric-card", children: [
            /* @__PURE__ */ e.jsx("span", { className: "metric-icon", children: "⏱️" }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-num", children: (i == null ? void 0 : i.minutes_read) || 0 }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-label", children: "dakika" })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "growth-metric-card", children: [
            /* @__PURE__ */ e.jsx("span", { className: "metric-icon", children: "📄" }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-num", children: (i == null ? void 0 : i.pages_read) || 0 }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-label", children: "sayfa" })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "growth-metric-card", children: [
            /* @__PURE__ */ e.jsx("span", { className: "metric-icon", children: "🎯" }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-num", children: (i == null ? void 0 : i.sessions) || 0 }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-label", children: "seans" })
          ] }),
          /* @__PURE__ */ e.jsxs("div", { className: "growth-metric-card", children: [
            /* @__PURE__ */ e.jsx("span", { className: "metric-icon", children: "📚" }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-num", children: (i == null ? void 0 : i.books_finished) || 0 }),
            /* @__PURE__ */ e.jsx("span", { className: "metric-label", children: "biten kitap" })
          ] })
        ] }),
        /* @__PURE__ */ e.jsx("h3", { className: "section-subheading", children: "Bu hafta senin için" }),
        /* @__PURE__ */ e.jsx("ul", { className: "recommendations-clean-list", children: i == null ? void 0 : i.recommendations.slice(0, 3).map((a) => /* @__PURE__ */ e.jsxs("li", { className: "rec-book-item", children: [
          /* @__PURE__ */ e.jsxs("div", { className: "rec-book-info", children: [
            /* @__PURE__ */ e.jsx("strong", { className: "rec-book-title", children: a.title }),
            /* @__PURE__ */ e.jsx("span", { className: "rec-book-author", children: a.author })
          ] }),
          /* @__PURE__ */ e.jsx("span", { className: "rec-book-badge", children: "Öneri" })
        ] }, a.id)) })
      ] }),
      /* @__PURE__ */ e.jsxs("form", { className: "growth-card", onSubmit: le, children: [
        /* @__PURE__ */ e.jsxs("div", { className: "card-header-line", children: [
          /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "60 SANİYELİK ZEVK TESTİ" }),
          /* @__PURE__ */ e.jsx("h2", { children: "Okuma pusulan" })
        ] }),
        /* @__PURE__ */ e.jsxs("label", { className: "field-group", children: [
          /* @__PURE__ */ e.jsx("span", { className: "field-label", children: "Sevdiğin yazarlar" }),
          /* @__PURE__ */ e.jsx(
            "input",
            {
              value: d,
              onChange: (a) => x(a.target.value),
              placeholder: "Ursula K. Le Guin, Oğuz Atay, Tolstoy…"
            }
          )
        ] }),
        /* @__PURE__ */ e.jsxs("fieldset", { className: "field-group", children: [
          /* @__PURE__ */ e.jsx("legend", { className: "field-label", children: "Türler" }),
          /* @__PURE__ */ e.jsx("div", { className: "growth-chips", children: fe.map((a) => {
            const n = H.includes(a);
            return /* @__PURE__ */ e.jsxs("label", { className: `growth-chip-label ${n ? "active" : ""}`, children: [
              /* @__PURE__ */ e.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: n,
                  onChange: () => V(
                    (l) => l.includes(a) ? l.filter((b) => b !== a) : [...l, a]
                  )
                }
              ),
              /* @__PURE__ */ e.jsx("span", { children: n ? `✓ ${a}` : a })
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
              className: `pace-pill ${f === a.id ? "active" : ""}`,
              onClick: () => N(a.id),
              children: [
                /* @__PURE__ */ e.jsx("strong", { children: a.label }),
                /* @__PURE__ */ e.jsx("small", { children: a.desc })
              ]
            },
            a.id
          )) })
        ] }),
        /* @__PURE__ */ e.jsx("button", { className: "primary btn-submit-taste", children: "Profili tamamla" }),
        /* @__PURE__ */ e.jsx("ul", { className: "growth-tasks-list", children: p == null ? void 0 : p.tasks.map((a) => /* @__PURE__ */ e.jsxs("li", { className: `growth-task-item ${a.done ? "done" : ""}`, children: [
          /* @__PURE__ */ e.jsx("span", { className: "task-indicator", children: a.done ? "✓" : "○" }),
          /* @__PURE__ */ e.jsx("span", { children: a.title })
        ] }, a.key)) })
      ] }),
      /* @__PURE__ */ e.jsxs("form", { className: "growth-card", onSubmit: re, children: [
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
                var n;
                return ae((n = a.target.files) == null ? void 0 : n[0]);
              }
            }
          )
        ] }),
        /* @__PURE__ */ e.jsx(
          "textarea",
          {
            value: k,
            onChange: (a) => S(a.target.value),
            placeholder: `Title,Author,Exclusive Shelf
Dune,Frank Herbert,read`,
            required: !0,
            rows: 4
          }
        ),
        /* @__PURE__ */ e.jsx("button", { className: "primary btn-submit-taste", children: "Kitaplığı aktar" })
      ] }),
      h && /* @__PURE__ */ e.jsxs("article", { className: "growth-card", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "card-header-line", children: [
          /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "BİLDİRİM KONTROLÜ" }),
          /* @__PURE__ */ e.jsx("h2", { children: "Ne zaman haber verelim?" })
        ] }),
        /* @__PURE__ */ e.jsxs("label", { className: "growth-switch main-consent", children: [
          /* @__PURE__ */ e.jsx(
            "input",
            {
              type: "checkbox",
              checked: h.consent_granted,
              onChange: (a) => X({ ...h, consent_granted: a.target.checked })
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
        ].map(([a, n]) => /* @__PURE__ */ e.jsxs("label", { className: "growth-switch", children: [
          /* @__PURE__ */ e.jsx(
            "input",
            {
              type: "checkbox",
              disabled: !h.consent_granted,
              checked: !!h[a],
              onChange: (l) => X({ ...h, [a]: l.target.checked })
            }
          ),
          /* @__PURE__ */ e.jsx("span", { children: n })
        ] }, a)) }),
        /* @__PURE__ */ e.jsxs("label", { className: "field-group", style: { marginTop: "12px" }, children: [
          /* @__PURE__ */ e.jsx("span", { className: "field-label", children: "Bildirim Sıklığı" }),
          /* @__PURE__ */ e.jsxs(
            "select",
            {
              value: h.frequency,
              disabled: !h.consent_granted,
              onChange: (a) => X({
                ...h,
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
        /* @__PURE__ */ e.jsxs("form", { onSubmit: se, style: { display: "grid", gap: "10px" }, children: [
          /* @__PURE__ */ e.jsx("input", { name: "title", placeholder: "Örn. Sonbahar okumaları", required: !0 }),
          /* @__PURE__ */ e.jsx("textarea", { name: "description", placeholder: "Liste notu (isteğe bağlı)...", rows: 2 }),
          /* @__PURE__ */ e.jsxs("select", { name: "visibility", defaultValue: "unlisted", children: [
            /* @__PURE__ */ e.jsx("option", { value: "private", children: "Özel" }),
            /* @__PURE__ */ e.jsx("option", { value: "unlisted", children: "Bağlantıya sahip olanlar" }),
            /* @__PURE__ */ e.jsx("option", { value: "public", children: "Herkese açık" })
          ] }),
          /* @__PURE__ */ e.jsx("button", { className: "primary btn-submit-taste", children: "Liste oluştur" })
        ] }),
        /* @__PURE__ */ e.jsx("ul", { className: "unified-resource-list", children: M.map((a) => /* @__PURE__ */ e.jsxs("li", { className: "resource-list-row", children: [
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
        /* @__PURE__ */ e.jsxs("form", { onSubmit: te, style: { display: "grid", gap: "10px" }, children: [
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
        /* @__PURE__ */ e.jsx("form", { className: "growth-join-form", onSubmit: s, children: /* @__PURE__ */ e.jsxs("label", { className: "field-group", children: [
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
          z.length === 0 ? /* @__PURE__ */ e.jsx("p", { className: "card-empty-hint", children: "Henüz bir kulübe üye değilsin. Yukarıdan yeni bir kulüp kur veya davet koduyla katıl!" }) : /* @__PURE__ */ e.jsx("ul", { className: "unified-resource-list", children: z.map((a) => /* @__PURE__ */ e.jsxs("li", { className: "resource-list-row", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "resource-info", children: [
              /* @__PURE__ */ e.jsx("strong", { className: "club-row-name", children: a.name }),
              /* @__PURE__ */ e.jsx("span", { className: "club-row-role", children: a.role === "owner" ? "👑 Kurucu" : a.role === "moderator" ? "🛡️ Moderatör" : "📖 Üye" })
            ] }),
            /* @__PURE__ */ e.jsxs("div", { className: "club-row-actions", children: [
              /* @__PURE__ */ e.jsx("button", { type: "button", className: "btn-club-primary", onClick: () => _(a.id), children: "Kulübü Aç" }),
              a.invite_code && /* @__PURE__ */ e.jsx(
                "button",
                {
                  type: "button",
                  className: "btn-club-secondary",
                  title: "Davet kodunu kopyala",
                  onClick: () => {
                    navigator.clipboard.writeText(a.invite_code), c("Davet kodu panoya kopyalandı!");
                  },
                  children: "Kodu Kopyala"
                }
              )
            ] })
          ] }, a.id)) })
        ] })
      ] }),
      o && /* @__PURE__ */ e.jsx(
        ge,
        {
          activeClub: o,
          activeRead: me,
          activeUserProgress: ye,
          clubWorkspaceRef: J,
          clubTab: P,
          setClubTab: T,
          setActiveClub: j,
          setStatus: c,
          books: q,
          targetDailyPages: G,
          setTargetDailyPages: ie,
          discContent: B,
          discPage: C,
          discType: Z,
          setDiscContent: $,
          setDiscPage: W,
          setDiscType: I,
          setIsOCRModalOpen: A,
          handleJoinReading: t,
          saveClubProgress: y,
          createDiscussion: K,
          toggleReaction: E,
          createEvent: U,
          rsvpEvent: ne,
          createPoll: oe,
          vote: de,
          saveClubRead: D,
          updateMemberRole: ue,
          openClub: _
        }
      )
    ] }),
    /* @__PURE__ */ e.jsx(
      je,
      {
        isOpen: g,
        onClose: () => A(!1),
        initialBookTitle: (xe = o == null ? void 0 : o.active_read) == null ? void 0 : xe.title,
        onUseQuote: (a, n) => {
          $(a), n && W(n.toString()), I("quote"), T("discussions"), c("📸 Alıntı metni başarıyla tartışma formuna aktarıldı!");
        }
      }
    )
  ] });
}
export {
  ve as ProductGrowthHub
};
