import { r as a, j as e, a as z } from "./main-BcGABlrt.js";
const I = [
  { id: "cozy", label: "Rahat çalışma odası", icon: "🪴", image: "/static/themes/cozy-study.webp", sound: "room" },
  { id: "rain", label: "Yağmurlu pencere", icon: "🌧️", image: "/static/themes/rainy-window.webp", sound: "rain" },
  { id: "library", label: "Sessiz kütüphane", icon: "📚", image: "/static/themes/quiet-library.webp", sound: "library" },
  { id: "forest", label: "Doğa ve orman", icon: "🌲", image: "/static/themes/forest-retreat.webp", sound: "forest" },
  { id: "minimal", label: "Minimal koyu", icon: "◐", sound: "silent" },
  { id: "sunny", label: "Güneşli masa", icon: "☀️", image: "/static/themes/sunny-desk.webp", sound: "morning" },
  { id: "sea-sunset", label: "Gün batımı sahili", icon: "🌅", image: "/static/themes/sea-sunset.webp", sound: "ocean" },
  { id: "cove", label: "Turkuaz koy", icon: "🏝️", image: "/static/themes/turquoise-cove.webp", sound: "ocean" },
  { id: "moon-sea", label: "Ay ışıklı deniz", icon: "🌙", image: "/static/themes/moonlit-sea.webp", sound: "ocean" }
];
function ne({ activeBook: s, onSessionSaved: p }) {
  const c = a.useRef(null), [r, f] = a.useState("pomodoro"), [m, d] = a.useState(1500), [i, o] = a.useState(0), [g, _] = a.useState(!1), [x, $] = a.useState(!1), [E, y] = a.useState(!1), [n, N] = a.useState(() => {
    const t = window.localStorage.getItem("mihenk-focus-theme");
    return I.some((l) => l.id === t) ? t : "cozy";
  }), [h, R] = a.useState(!1), [v, u] = a.useState(!1), j = a.useRef(null), b = I.find((t) => t.id === n) || I[0], [q, L] = a.useState((s == null ? void 0 : s.current_page) || 0), [K, Y] = a.useState(((s == null ? void 0 : s.current_page) || 0) + 15), [H, G] = a.useState(!1), [J, D] = a.useState("");
  a.useEffect(() => {
    s && (L(s.current_page), Y(s.current_page + 10));
  }, [s]), a.useEffect(() => {
    window.localStorage.setItem("mihenk-focus-theme", n);
  }, [n]), a.useEffect(() => {
    const t = () => u(document.fullscreenElement === c.current);
    return document.addEventListener("fullscreenchange", t), () => document.removeEventListener("fullscreenchange", t);
  }, []), a.useEffect(() => {
    var W;
    if ((W = j.current) == null || W.call(j), j.current = null, !h || b.sound === "silent") return;
    const t = window.AudioContext || window.webkitAudioContext;
    if (!t) return;
    const l = new t(), w = l.sampleRate, Q = l.createBuffer(1, w * 3, w), U = Q.getChannelData(0);
    let T = 0;
    for (let A = 0; A < U.length; A += 1) {
      const X = Math.random() * 2 - 1;
      T = b.sound === "rain" ? X : (T + 0.025 * X) / 1.025, U[A] = T;
    }
    const M = l.createBufferSource(), O = l.createBiquadFilter(), F = l.createGain(), k = {
      rain: { type: "bandpass", frequency: 2600, volume: 0.115 },
      forest: { type: "lowpass", frequency: 950, volume: 0.075 },
      library: { type: "lowpass", frequency: 380, volume: 0.035 },
      room: { type: "lowpass", frequency: 720, volume: 0.048 },
      morning: { type: "lowpass", frequency: 1100, volume: 0.042 },
      ocean: { type: "lowpass", frequency: 680, volume: 0.075, modulation: 0.032 }
    }[b.sound];
    M.buffer = Q, M.loop = !0, O.type = k.type, O.frequency.value = k.frequency, F.gain.value = k.volume, M.connect(O).connect(F).connect(l.destination);
    const S = k.modulation ? l.createOscillator() : null, P = k.modulation ? l.createGain() : null;
    S && P && k.modulation && (S.type = "sine", S.frequency.value = 0.11, P.gain.value = k.modulation, S.connect(P).connect(F.gain), S.start()), M.start(), l.resume();
    const V = () => {
      try {
        S == null || S.stop();
      } catch {
      }
      try {
        M.stop();
      } catch {
      }
      l.close();
    };
    return j.current = V, V;
  }, [h, b.sound]), a.useEffect(() => {
    let t = null;
    return g && (t = setInterval(() => {
      r === "pomodoro" ? d((l) => l <= 1 ? x ? ($(!1), 1500) : ($(!0), 300) : l - 1) : o((l) => l + 1);
    }, 1e3)), () => clearInterval(t);
  }, [g, r, x]);
  const B = (t) => {
    const l = Math.floor(t / 60), w = t % 60;
    return `${l.toString().padStart(2, "0")}:${w.toString().padStart(2, "0")}`;
  }, Z = () => {
    _(!g);
  }, C = () => {
    _(!1), $(!1), d(1500), o(0);
  }, ee = () => {
    _(!1), y(!0);
  }, se = async () => {
    var t;
    try {
      document.fullscreenElement ? await document.exitFullscreen() : await ((t = c.current) == null ? void 0 : t.requestFullscreen());
    } catch {
      D("Tam ekran modu bu tarayıcıda açılamadı.");
    }
  }, te = b.sound === "ocean", ae = async (t) => {
    if (t.preventDefault(), !s) return;
    D(""), G(!0);
    const l = r === "pomodoro" ? Math.max(1, Math.round(((x ? 300 : 1500) - m) / 60)) : Math.max(1, Math.round(i / 60));
    try {
      await z("/me/reading-sessions", {
        method: "POST",
        body: JSON.stringify({
          book_id: s.is_custom ? void 0 : s.id,
          custom_book_id: s.is_custom ? s.id : void 0,
          start_page: Number(q),
          end_page: Number(K),
          duration_minutes: l
        })
      }), y(!1), C(), p();
    } catch (w) {
      D(w.message || "Seans kaydedilemedi.");
    } finally {
      G(!1);
    }
  };
  return /* @__PURE__ */ e.jsxs("div", { ref: c, className: `bento-tile bento-timer focus-theme focus-theme-${b.id}`, children: [
    /* @__PURE__ */ e.jsx(
      "div",
      {
        className: "focus-theme-backdrop",
        style: b.image ? { backgroundImage: `url(${b.image})` } : void 0,
        "aria-hidden": "true"
      },
      b.id
    ),
    /* @__PURE__ */ e.jsxs("div", { className: "focus-theme-content", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "bento-header focus-theme-header", children: [
        /* @__PURE__ */ e.jsxs("span", { className: "bento-badge", children: [
          "⏱️ ",
          r === "pomodoro" ? x ? "Mola vakti" : "Odaklanma seansı" : "Serbest kronometre"
        ] }),
        /* @__PURE__ */ e.jsxs("div", { className: "focus-theme-controls", children: [
          /* @__PURE__ */ e.jsxs("label", { className: "focus-theme-select", children: [
            /* @__PURE__ */ e.jsx("span", { children: "Ortam" }),
            /* @__PURE__ */ e.jsx("select", { value: n, onChange: (t) => N(t.target.value), children: I.map((t) => /* @__PURE__ */ e.jsxs("option", { value: t.id, children: [
              t.icon,
              " ",
              t.label
            ] }, t.id)) })
          ] }),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              type: "button",
              className: `ambient-sound-toggle ${h ? "active" : ""}`,
              onClick: () => R((t) => !t),
              disabled: b.sound === "silent",
              "aria-pressed": h,
              title: b.sound === "silent" ? "Bu tema sessizdir" : "Ortam sesini aç veya kapat",
              children: b.sound === "silent" ? "🔇 Sessiz" : te ? h ? "🔊 Deniz sesi açık" : "🌊 Deniz sesi" : h ? "🔊 Ses açık" : "🔈 Ortam sesi"
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              type: "button",
              className: "focus-fullscreen-toggle",
              onClick: se,
              "aria-pressed": v,
              title: v ? "Tam ekrandan çık" : "Tam ekran yap",
              children: v ? "↙ Tam ekrandan çık" : "⛶ Tam ekran"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "timer-mode-selector", children: [
        /* @__PURE__ */ e.jsx(
          "button",
          {
            type: "button",
            className: r === "pomodoro" ? "active" : "",
            onClick: () => {
              f("pomodoro"), C();
            },
            children: "Pomodoro (25/5)"
          }
        ),
        /* @__PURE__ */ e.jsx(
          "button",
          {
            type: "button",
            className: r === "stopwatch" ? "active" : "",
            onClick: () => {
              f("stopwatch"), C();
            },
            children: "Kronometre"
          }
        )
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "timer-display", children: [
        /* @__PURE__ */ e.jsx("div", { className: `timer-clock ${x ? "break" : ""} ${g ? "running" : ""}`, children: B(r === "pomodoro" ? m : i) }),
        /* @__PURE__ */ e.jsxs("p", { className: "timer-book-title", children: [
          "📖 ",
          s ? s.title : "Kitap seçilmedi (Seans açık)"
        ] })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "timer-controls", children: [
        /* @__PURE__ */ e.jsx(
          "button",
          {
            type: "button",
            className: `btn-timer-primary ${g ? "pause" : "start"}`,
            onClick: Z,
            children: g ? "⏸️ Duraklat" : "▶️ Başlat"
          }
        ),
        /* @__PURE__ */ e.jsx("button", { type: "button", className: "btn-timer-secondary", onClick: C, children: "🔄 Sıfırla" }),
        /* @__PURE__ */ e.jsx(
          "button",
          {
            type: "button",
            className: "btn-timer-finish",
            onClick: ee,
            disabled: !s,
            children: "⏹️ Okumayı Bitir"
          }
        )
      ] })
    ] }),
    E && /* @__PURE__ */ e.jsx("div", { className: "product-modal", role: "presentation", children: /* @__PURE__ */ e.jsxs("form", { className: "product-dialog bento-modal", onSubmit: ae, children: [
      /* @__PURE__ */ e.jsx("p", { className: "product-eyebrow", children: "Seans tamamlama" }),
      /* @__PURE__ */ e.jsxs("h2", { children: [
        "📖 ",
        s == null ? void 0 : s.title
      ] }),
      /* @__PURE__ */ e.jsx("p", { className: "modal-sub", children: "Bugünkü seansında kaçıncı sayfaya ulaştın?" }),
      /* @__PURE__ */ e.jsxs("div", { className: "product-grid", children: [
        /* @__PURE__ */ e.jsxs("label", { children: [
          "Başlangıç Sayfası",
          /* @__PURE__ */ e.jsx(
            "input",
            {
              type: "number",
              min: "0",
              value: q,
              onChange: (t) => L(Number(t.target.value)),
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ e.jsxs("label", { children: [
          "Bitiş Sayfası",
          /* @__PURE__ */ e.jsx(
            "input",
            {
              type: "number",
              min: q,
              value: K,
              onChange: (t) => Y(Number(t.target.value)),
              required: !0
            }
          )
        ] })
      ] }),
      J && /* @__PURE__ */ e.jsx("p", { className: "product-error", children: J }),
      /* @__PURE__ */ e.jsxs("div", { className: "product-actions", children: [
        /* @__PURE__ */ e.jsx("button", { type: "button", onClick: () => y(!1), children: "İptal" }),
        /* @__PURE__ */ e.jsx("button", { type: "submit", className: "primary", disabled: H, children: H ? "Kaydediliyor…" : "Seansı Kaydet" })
      ] })
    ] }) })
  ] });
}
function le(s, p = /* @__PURE__ */ new Date()) {
  var r;
  const c = [];
  for (let f = 364; f >= 0; f--) {
    const m = new Date(p);
    m.setDate(m.getDate() - f);
    const d = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`, i = ((r = s == null ? void 0 : s.heatmap_data) == null ? void 0 : r[d]) || 0;
    let o = 0;
    i > 0 && i <= 15 ? o = 1 : i > 15 && i <= 30 ? o = 2 : i > 30 && i <= 50 ? o = 3 : i > 50 && (o = 4), c.push({ dateStr: d, pages: i, intensity: o });
  }
  return c;
}
function ie({ stats: s, goal: p = null, year: c = (/* @__PURE__ */ new Date()).getFullYear(), loading: r = !1, error: f = "", onRetry: m }) {
  const d = le(s), i = Math.min(100, Math.max(0, (p == null ? void 0 : p.progress_percent) || 0));
  return /* @__PURE__ */ e.jsxs("div", { className: "bento-tile bento-heatmap", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "bento-header", children: [
      /* @__PURE__ */ e.jsx("span", { className: "bento-badge", children: "🟩 Yıllık Okuma Takvimi & Hedef" }),
      /* @__PURE__ */ e.jsx("span", { className: "bento-subtext", children: s ? `${s.total_pages_read} sayfa · ${s.total_minutes} dk okundu` : r ? "Yükleniyor…" : f || "Henüz okuma verisi yok" })
    ] }),
    !r && f && /* @__PURE__ */ e.jsxs("div", { className: "heatmap-error", role: "alert", children: [
      /* @__PURE__ */ e.jsx("span", { children: f }),
      m && /* @__PURE__ */ e.jsx("button", { type: "button", onClick: m, children: "Yeniden dene" })
    ] }),
    p && /* @__PURE__ */ e.jsxs("div", { className: "annual-goal", "aria-label": `${c} yıllık okuma hedefi`, children: [
      /* @__PURE__ */ e.jsxs("div", { children: [
        /* @__PURE__ */ e.jsxs("strong", { children: [
          c,
          " hedefi"
        ] }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          p.completed_books,
          " / ",
          p.target_books,
          " kitap"
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("div", { className: "annual-goal-track", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": i, children: /* @__PURE__ */ e.jsx("i", { style: { width: `${i}%` } }) }),
      /* @__PURE__ */ e.jsxs("b", { children: [
        "%",
        i
      ] })
    ] }),
    /* @__PURE__ */ e.jsx("div", { className: "heatmap-grid-container", children: /* @__PURE__ */ e.jsx("div", { className: "heatmap-grid", "aria-label": "Son 365 günlük okuma etkinliği", children: d.map((o) => /* @__PURE__ */ e.jsx(
      "div",
      {
        className: `heatmap-cell level-${o.intensity}`,
        title: `${o.dateStr}: ${o.pages} sayfa okundu`
      },
      o.dateStr
    )) }) }),
    /* @__PURE__ */ e.jsxs("div", { className: "heatmap-footer", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "heatmap-legend", children: [
        /* @__PURE__ */ e.jsx("span", { children: "Az" }),
        /* @__PURE__ */ e.jsx("div", { className: "heatmap-cell level-0" }),
        /* @__PURE__ */ e.jsx("div", { className: "heatmap-cell level-1" }),
        /* @__PURE__ */ e.jsx("div", { className: "heatmap-cell level-2" }),
        /* @__PURE__ */ e.jsx("div", { className: "heatmap-cell level-3" }),
        /* @__PURE__ */ e.jsx("div", { className: "heatmap-cell level-4" }),
        /* @__PURE__ */ e.jsx("span", { children: "Çok" })
      ] }),
      s && /* @__PURE__ */ e.jsxs("div", { className: "stats-inline", children: [
        /* @__PURE__ */ e.jsxs("span", { children: [
          "⚡ Hız: ",
          /* @__PURE__ */ e.jsxs("strong", { children: [
            s.average_reading_speed_pages_per_min,
            " sayfa/dk"
          ] })
        ] }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          "⏱️ 300 Sayfalık Kitap Tahmini: ",
          /* @__PURE__ */ e.jsxs("strong", { children: [
            s.estimated_hours_for_300_page_book,
            " saat"
          ] })
        ] })
      ] })
    ] })
  ] });
}
const re = a.lazy(() => import("./ISBNScannerModal-DFidSIKe.js").then((s) => ({ default: s.ISBNScannerModal })));
function de() {
  const [s, p] = a.useState([]), [c, r] = a.useState(null), [f, m] = a.useState(null), [d, i] = a.useState(null), [o, g] = a.useState(""), [_, x] = a.useState(!1), [$, E] = a.useState(!0), y = async () => {
    E(!0), g("");
    try {
      const n = (/* @__PURE__ */ new Date()).getFullYear(), [N, h, R] = await Promise.all([
        z("/me/reading-sessions/stats").catch((u) => (console.error("Okuma istatistikleri yüklenemedi.", u), g("Okuma istatistikleri yüklenemedi."), null)),
        z("/me/profile"),
        z(`/me/reading-dashboard?year=${n}`).catch(() => null)
      ]);
      m(N), i(R);
      const v = [
        ...h.reading_books || [],
        ...h.to_read_books || [],
        ...h.read_books || []
      ].map((u) => ({
        ...u,
        current_page: Number(u.current_page || 0),
        is_custom: !!u.is_custom
      }));
      p(v), r((u) => v.find((j) => j.id === (u == null ? void 0 : u.id) && j.is_custom === (u == null ? void 0 : u.is_custom)) || v[0] || null);
    } catch (n) {
      console.error(n);
    } finally {
      E(!1);
    }
  };
  return a.useEffect(() => {
    y();
    const n = () => {
      y();
    };
    return window.addEventListener("pkm-refresh", n), window.addEventListener("focus", n), () => {
      window.removeEventListener("pkm-refresh", n), window.removeEventListener("focus", n);
    };
  }, []), /* @__PURE__ */ e.jsxs("section", { className: "bento-container", "aria-label": "Okuma Modu ve PKM Paneli", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "bento-banner", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "bento-banner-info", children: [
        /* @__PURE__ */ e.jsx("h2", { children: "📖 Mihenk Okuma Seansı & PKM Modu" }),
        /* @__PURE__ */ e.jsx("p", { children: "Okuma ritmini koru, sürtünmesiz kitap ekle ve yıllık ilerlemeni tek yerde izle." })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "bento-banner-actions", children: [
        s.length > 0 && /* @__PURE__ */ e.jsx(
          "select",
          {
            className: "active-book-select",
            value: c ? `${c.is_custom ? "custom" : "catalog"}:${c.id}` : "",
            onChange: (n) => {
              const N = s.find(
                (h) => `${h.is_custom ? "custom" : "catalog"}:${h.id}` === n.target.value
              );
              N && r(N);
            },
            children: s.map((n) => /* @__PURE__ */ e.jsxs(
              "option",
              {
                value: `${n.is_custom ? "custom" : "catalog"}:${n.id}`,
                children: [
                  "📖 ",
                  n.title,
                  " (S. ",
                  n.current_page,
                  " / ",
                  n.total_pages || "?",
                  ")"
                ]
              },
              `${n.is_custom ? "custom" : "catalog"}:${n.id}`
            ))
          }
        ),
        /* @__PURE__ */ e.jsx(
          "button",
          {
            type: "button",
            className: "btn-isbn-scan-banner primary",
            onClick: () => x(!0),
            children: "📱 ISBN Barkod ile Kitap Ekle"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { className: "bento-grid", children: [
      /* @__PURE__ */ e.jsx(ne, { activeBook: c, onSessionSaved: y }),
      /* @__PURE__ */ e.jsx(
        ie,
        {
          stats: f,
          goal: (d == null ? void 0 : d.goal) || null,
          year: d == null ? void 0 : d.year,
          loading: $,
          error: o,
          onRetry: y
        }
      )
    ] }),
    _ && /* @__PURE__ */ e.jsx(a.Suspense, { fallback: /* @__PURE__ */ e.jsx("p", { role: "status", children: "ISBN tarayıcı yükleniyor…" }), children: /* @__PURE__ */ e.jsx(
      re,
      {
        onClose: () => x(!1),
        onBookAdded: y
      }
    ) })
  ] });
}
export {
  de as BentoReadingDashboard
};
