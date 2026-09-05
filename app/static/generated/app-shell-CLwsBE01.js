import { a as g } from "./main-C_P-n60J.js";
const t = (e) => document.querySelector(e), P = (e) => [...document.querySelectorAll(e)], l = { mode: "login", user: null, profile: null, books: [], offers: [], preferences: null, dashboard: null, gamification: null, alerts: [], notifications: [], shelf: "reading", chatHistory: [], chatSessionId: null, compareIds: /* @__PURE__ */ new Set(), lastRecommendations: [], lastDiscoveryQuery: "", recommendationId: null, recommendationVariant: null, catalog: { offset: 0, limit: 12, total: 0, timer: null, coverage: null, items: [] } }, Xe = ["İçe dönük", "Analitik", "Stratejik", "Melankolik", "Maceracı", "İdealist", "Meraklı", "Bağımsız", "Duygusal"];
function n(e, a = "", i = "") {
  const r = document.createElement(e);
  return r.textContent = a, i && (r.className = i), r;
}
function ze(e) {
  return e.split(/\s+/).slice(0, 2).map((a) => a[0]).join("").toLocaleUpperCase("tr");
}
function N(e, a = "TRY") {
  return e == null ? "—" : `${(e / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${a}`;
}
let Se;
function f(e, a = !1) {
  const i = t("#toast");
  i.textContent = e, i.className = `toast show${a ? " error" : ""}`, clearTimeout(Se), Se = setTimeout(() => i.className = "toast", 3200);
}
function ue(e, a = {}) {
  return l.user ? g("/me/product-events", { method: "POST", body: JSON.stringify({ event_name: e, properties: a }) }).catch(() => {
  }) : Promise.resolve();
}
const H = window.matchMedia("(max-width: 1100px)");
function j() {
  const e = H.matches, a = !e && document.body.classList.contains("sidebar-collapsed"), i = e && document.body.classList.contains("sidebar-open"), r = e ? i : !a, s = t("#sidebar-toggle"), o = t("#primary-sidebar");
  s.setAttribute("aria-expanded", String(r)), s.setAttribute("aria-label", e ? i ? "Menüyü kapat" : "Menüyü aç" : a ? "Menüyü genişlet" : "Menüyü daralt"), s.querySelector("span").textContent = e ? i ? "×" : "☰" : a ? "›" : "☰", o.setAttribute("aria-hidden", String(e && !i)), o.inert = e && !i;
}
function pe() {
  document.body.classList.remove("sidebar-open"), j();
}
function Ze() {
  document.body.classList.toggle("reduce-motion", localStorage.getItem("mihenk-reduced-motion") === "true"), !H.matches && localStorage.getItem("mihenk-sidebar-collapsed") === "true" && document.body.classList.add("sidebar-collapsed"), t("#sidebar-toggle").onclick = () => {
    H.matches ? document.body.classList.toggle("sidebar-open") : (document.body.classList.toggle("sidebar-collapsed"), localStorage.setItem("mihenk-sidebar-collapsed", String(document.body.classList.contains("sidebar-collapsed")))), j();
  }, t("#sidebar-backdrop").onclick = pe, H.addEventListener("change", () => {
    document.body.classList.remove("sidebar-open"), document.body.classList.toggle("sidebar-collapsed", !H.matches && localStorage.getItem("mihenk-sidebar-collapsed") === "true"), j(), ve();
  }), document.addEventListener("keydown", (e) => {
    e.key === "Escape" && document.body.classList.contains("sidebar-open") && pe();
  }), j();
}
function Te(e) {
  const a = n("span", "", `cover-fallback cover-theme-${et(e.genre)}`), i = n("span", (e.genre || "Edebiyat").split("/")[0].trim(), "cover-genre"), r = n("strong", e.title), s = n("small", e.author || "");
  return a.append(i, r, s), a;
}
function et(e = "") {
  const a = e.toLocaleLowerCase("tr");
  return /tarih|biyografi|politika/.test(a) ? "burgundy" : /bilim|fantastik|distopya/.test(a) ? "cosmic" : /şiir|deneme|edebiyat/.test(a) ? "ink" : /çocuk|genç/.test(a) ? "sun" : /polisiye|gizem|gerilim/.test(a) ? "noir" : "forest";
}
function F(e, a = "cover-wrap") {
  const i = n("div", "", a);
  if (e.cover_url) {
    const r = new Image();
    r.src = e.cover_url, r.alt = `${e.title} kapağı`, r.loading = "lazy", r.referrerPolicy = "no-referrer", r.onerror = () => i.replaceChildren(Te(e)), i.append(r);
  } else i.append(Te(e));
  return i;
}
function Q(e) {
  l.mode = e;
  const a = e === "login";
  t("#auth-title").textContent = a ? "Tekrar hoş geldin" : "Hesap oluştur", t("#auth-submit").textContent = a ? "Giriş yap" : "Kayıt ol", t("#auth-switch").textContent = a ? "Yeni hesap oluştur" : "Zaten hesabım var", t("#name-field").classList.toggle("hidden", a), t("#auth-name").required = !a, t("#forgot-password").classList.toggle("hidden", !a), t("#auth-password").autocomplete = a ? "current-password" : "new-password", t("#auth-error").textContent = "";
}
t("#auth-switch").onclick = () => Q(l.mode === "login" ? "register" : "login");
function tt() {
  Q("login");
  const e = t("#login-dialog");
  e.open || e.showModal(), setTimeout(() => t("#auth-email").focus(), 0);
}
P("[data-open-login]").forEach((e) => e.onclick = tt);
t("#demo-open").onclick = () => {
  t("#demo-form").classList.toggle("hidden"), t("#demo-form").classList.contains("hidden") || t("#demo-query").focus();
};
t("#demo-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = t("#demo-query").value.trim(), i = t("#demo-status"), r = t("#demo-results"), s = e.submitter;
  s.disabled = !0, i.textContent = "Katalog taranıyor…";
  try {
    const o = await g("/demo/recommendations", { method: "POST", body: JSON.stringify({ character_description: a, limit: 3 }) });
    r.replaceChildren(...o.recommended_books.map((c) => {
      const p = n("article", "", "demo-result");
      return p.append(n("strong", c.book_title), n("span", `${c.author} · %${Math.round(c.match_score * 100)} uyum`), n("p", c.reasoning)), p;
    })), i.textContent = o.character_analysis_summary;
  } catch (o) {
    i.textContent = o.message;
  } finally {
    s.disabled = !1;
  }
};
t("#login-close").onclick = () => t("#login-dialog").close();
t("#login-dialog").addEventListener("click", (e) => {
  e.target === t("#login-dialog") && t("#login-dialog").close();
});
t("#password-toggle").onclick = () => {
  const e = t("#auth-password"), a = e.type === "password";
  e.type = a ? "text" : "password", t("#password-toggle").textContent = a ? "Gizle" : "Göster", t("#password-toggle").setAttribute("aria-label", a ? "Parolayı gizle" : "Parolayı göster");
};
t("#auth-password").addEventListener("keyup", (e) => t("#caps-lock-warning").classList.toggle("hidden", !e.getModifierState("CapsLock")));
t("#forgot-password").onclick = () => {
  const e = t("#auth-email").value;
  t("#recovery-status").textContent = "", t("#recovery-dialog").showModal(), t("#recovery-email").value = e;
};
t("[data-close-recovery]").onclick = () => t("#recovery-dialog").close();
t("#recovery-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = e.submitter;
  a.disabled = !0, a.textContent = "Gönderiliyor…";
  try {
    const i = await g("/auth/password/forgot", { method: "POST", body: JSON.stringify({ email: t("#recovery-email").value }) });
    t("#recovery-status").textContent = i.message;
  } catch (i) {
    t("#recovery-status").textContent = i.message;
  } finally {
    a.disabled = !1, a.textContent = "Bağlantı gönder";
  }
};
const be = new URLSearchParams(location.hash.replace(/^#/, "")), Re = be.get("access_token") || new URLSearchParams(location.search).get("recovery_token");
be.has("error") && (history.replaceState({}, "", location.pathname), setTimeout(() => {
  t("#recovery-status").textContent = "Bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı isteyin.", t("#recovery-dialog").showModal();
}, 0));
Re && (be.get("type") === "recovery" || location.search.includes("recovery_token=")) && setTimeout(() => t("#password-reset-dialog").showModal(), 0);
t("#password-reset-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = t("#new-password").value, i = t("#new-password-confirm").value, r = e.submitter;
  if (a !== i) {
    t("#password-reset-status").textContent = "Parolalar eşleşmiyor.";
    return;
  }
  r.disabled = !0, r.textContent = "Güncelleniyor…";
  try {
    const s = await g("/auth/password/reset", { method: "POST", body: JSON.stringify({ recovery_token: Re, new_password: a }) });
    t("#password-reset-status").textContent = s.message, history.replaceState({}, "", location.pathname), setTimeout(() => {
      t("#password-reset-dialog").close(), Q("login");
    }, 1200);
  } catch (s) {
    t("#password-reset-status").textContent = s.message;
  } finally {
    r.disabled = !1, r.textContent = "Parolayı güncelle";
  }
};
t("#auth-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = t("#auth-submit"), i = { email: t("#auth-email").value, password: t("#auth-password").value };
  l.mode === "register" && (i.display_name = t("#auth-name").value), a.disabled = !0, a.textContent = l.mode === "login" ? "Giriş yapılıyor…" : "Hesap oluşturuluyor…", t("#auth-error").textContent = "";
  try {
    if (l.user = await g(`/auth/${l.mode}`, { method: "POST", body: JSON.stringify(i) }), l.user.email_confirmation_required) {
      Q("login"), t("#auth-error").textContent = "E-posta adresine gönderilen bağlantıyla hesabını doğrula.";
      return;
    }
    await Ie();
  } catch (r) {
    t("#auth-error").textContent = r.message, t("#auth-error").focus();
  } finally {
    a.disabled = !1, a.textContent = l.mode === "login" ? "Giriş yap" : "Kayıt ol";
  }
};
function K(e, a = !1) {
  const i = t("#profile-menu-panel"), r = t("#profile-menu-button");
  i.classList.toggle("hidden", !e), r.setAttribute("aria-expanded", String(e)), e && a && setTimeout(() => {
    var s;
    return (s = i.querySelector('[role="menuitem"]')) == null ? void 0 : s.focus();
  }, 0);
}
t("#profile-menu-button").onclick = () => K(t("#profile-menu-panel").classList.contains("hidden"));
t("#profile-menu-button").onkeydown = (e) => {
  e.key === "ArrowDown" && (e.preventDefault(), K(!0, !0));
};
t("#profile-menu-panel").onkeydown = (e) => {
  const a = [...t("#profile-menu-panel").querySelectorAll('[role="menuitem"]')], i = a.indexOf(document.activeElement);
  if (e.key === "Escape")
    e.preventDefault(), K(!1), t("#profile-menu-button").focus();
  else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
    e.preventDefault();
    const r = e.key === "Home" ? 0 : e.key === "End" ? a.length - 1 : e.key === "ArrowDown" ? (i + 1) % a.length : (i - 1 + a.length) % a.length;
    a[r].focus();
  }
};
document.addEventListener("click", (e) => {
  t("#profile-menu-root").contains(e.target) || K(!1);
});
document.addEventListener("keydown", (e) => {
  e.key === "Escape" && !t("#profile-menu-panel").classList.contains("hidden") && (K(!1), t("#profile-menu-button").focus());
});
t("#profile-overview").onclick = () => {
  K(!1), q("insights");
};
t("#change-password").onclick = () => {
  const e = t("#profile-menu-email").textContent.trim();
  K(!1), t("#recovery-status").textContent = "", t("#recovery-dialog").showModal(), t("#recovery-email").value = e;
};
t("#logout").onclick = async () => {
  var e, a;
  await g("/auth/logout", { method: "POST" }), (a = (e = navigator.serviceWorker) == null ? void 0 : e.controller) == null || a.postMessage({ type: "CLEAR_PRIVATE_CACHE" }), location.reload();
};
t("#sidebar-logout").onclick = () => t("#logout").click();
t("#settings-logout").onclick = () => t("#logout").click();
t("#settings-password").onclick = () => t("#change-password").click();
t("#settings-compact").onchange = (e) => {
  localStorage.setItem("mihenk-sidebar-collapsed", String(e.target.checked)), document.body.classList.toggle("sidebar-collapsed", e.target.checked && !H.matches), j(), f(e.target.checked ? "Kompakt menü etkinleştirildi." : "Geniş menü etkinleştirildi.");
};
t("#settings-reduced-motion").onchange = (e) => {
  document.body.classList.toggle("reduce-motion", e.target.checked), localStorage.setItem("mihenk-reduced-motion", String(e.target.checked)), f(e.target.checked ? "Hareketler azaltıldı." : "Standart hareketler etkinleştirildi.");
};
t("#beta-feedback-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = e.currentTarget, i = a.querySelector('button[type="submit"]'), r = t("#beta-feedback-status"), s = t("#beta-feedback-rating").value;
  i.disabled = !0, r.textContent = "Gönderiliyor…";
  try {
    await g("/me/beta-feedback", { method: "POST", body: JSON.stringify({ category: t("#beta-feedback-category").value, rating: s === "" ? null : Number(s), message: t("#beta-feedback-message").value.trim(), context: { view: me || "settings", viewport: `${window.innerWidth}x${window.innerHeight}` } }) }), a.reset(), r.textContent = "Teşekkürler, geri bildirimin kaydedildi.", f("Geri bildirimin ürün ekibine ulaştı.");
  } catch (o) {
    r.textContent = o.message, f(o.message, !0);
  } finally {
    i.disabled = !1;
  }
};
function at() {
  Q("login"), K(!1), t("#login-dialog").open && t("#login-dialog").close(), t("#app").classList.add("hidden"), t("#chat-toggle").classList.add("hidden"), t("#auth-screen").classList.remove("hidden");
}
async function Ie(e = !1) {
  if (!e) {
    const i = await g("/me/bootstrap");
    Object.assign(l, i);
  }
  t("#login-dialog").open && t("#login-dialog").close(), t("#auth-screen").classList.add("hidden"), t("#app").classList.remove("hidden"), t("#chat-toggle").classList.remove("hidden"), t("#admin-nav").classList.toggle("hidden", !["editor", "admin"].includes(l.user.app_role)), nt(), W(), re(), le(), ye(), Rt(), Bt(), rt(), z(!0).catch(() => {
  }), ue("session_started", { source: "web" });
  const a = await Promise.allSettled([g("/books"), g("/market/offers"), g(`/me/reading-dashboard?year=${(/* @__PURE__ */ new Date()).getFullYear()}`), g("/me/price-alerts"), g("/me/onboarding")]);
  a[0].status === "fulfilled" && (l.books = a[0].value), a[1].status === "fulfilled" && (l.offers = a[1].value), a[2].status === "fulfilled" && (l.dashboard = a[2].value), a[3].status === "fulfilled" && (l.alerts = a[3].value), W(), re(), Ue(), ye(), Mt(), a[4].status === "fulfilled" && !a[4].value.onboarding_completed && (q("growth"), ue("onboarding_started", { source: "first_session" }), f("Önce birkaç tercihini seç; önerilerin sana göre şekillensin.")), window.dispatchEvent(new CustomEvent("pkm-refresh"));
}
function nt() {
  var a, i;
  const e = new Set(((a = l.preferences) == null ? void 0 : a.selected_traits) || []);
  P("#traits .tag").forEach((r) => r.classList.toggle("active", e.has(r.textContent))), (i = l.preferences) != null && i.personality_text && (t("#character").value = l.preferences.personality_text), X();
}
function W() {
  const e = l.user.display_name || "Okur", a = l.user.email || "", i = ze(e), r = l.gamification;
  t("#top-name").textContent = e, t("#profile-menu-name").textContent = e, t("#profile-menu-email").textContent = a, t("#side-name").textContent = e, t("#side-email").textContent = a, t("#recovery-email").value = a, t("#side-level").textContent = r ? `Seviye ${r.level.number} · ${r.level.name}` : "", t("#side-level-number").textContent = (r == null ? void 0 : r.level.number) || 1, t("#side-xp-fill").style.width = `${(r == null ? void 0 : r.level.progress_percent) || 0}%`, t("#side-level-card").style.setProperty("--level-progress", `${((r == null ? void 0 : r.level.progress_percent) || 0) * 3.6}deg`), t("#side-level-next").textContent = (r == null ? void 0 : r.level.next_xp) == null ? "En yüksek okur seviyesindesin" : `${(r.level.next_xp - r.xp).toLocaleString("tr-TR")} XP sonra yeni seviye`, t("#welcome-name").textContent = e.split(/\s+/)[0], t("#top-avatar").textContent = i, t("#profile-menu-avatar").textContent = i, t("#side-avatar").textContent = i, t("#stat-reading").textContent = l.profile.reading_books.length, t("#stat-read").textContent = l.profile.read_books.length, t("#stat-fav").textContent = l.profile.favorite_books.length;
  const s = l.notifications.filter((o) => !o.read_at).length;
  t("#notification-count").textContent = s, t("#notification-count").classList.toggle("hidden", !s), ve(), it();
}
function ve() {
  var i, r;
  if (!t("#settings-view")) return;
  const e = ((i = l.user) == null ? void 0 : i.display_name) || "Okur", a = ((r = l.user) == null ? void 0 : r.email) || "";
  t("#settings-name").textContent = e, t("#settings-email").textContent = a, t("#settings-avatar").textContent = ze(e), t("#settings-compact").checked = localStorage.getItem("mihenk-sidebar-collapsed") === "true", t("#settings-reduced-motion").checked = document.body.classList.contains("reduce-motion");
}
function it() {
  var i, r;
  const e = ((i = l.dashboard) == null ? void 0 : i.goal) || {}, a = [[l.profile.reading_books.length, "Şu an okunuyor", "library"], [`${e.completed_books || 0}/${e.target_books || 12}`, "Yıllık hedef", "insights"], [((r = l.dashboard) == null ? void 0 : r.total_pages_read) || 0, "Okunan sayfa", "insights"]];
  t("#home-summary").replaceChildren(...a.map(([s, o, c]) => {
    const p = n("button", "", "home-metric");
    return p.type = "button", p.title = `${o} bölümünü aç`, p.append(n("b", s), n("span", o)), p.onclick = () => q(c), p;
  })), Ke();
}
function Le(e, a) {
  const i = n("button", e, "bento-link");
  return i.type = "button", i.onclick = () => q(a), i;
}
function Ke() {
  var h;
  if (!l.profile || !l.gamification) return;
  const e = t("#home-reading-card"), a = t("#home-badge-card"), i = t("#home-ai-card"), r = l.profile.reading_books[0], s = r || l.books.find((b) => b.cover_url) || l.books[0];
  e.replaceChildren();
  const o = n("div", "", "bento-copy");
  if (o.append(n("p", r ? "ŞU ANKİ YOLCULUK" : "RAFINDAN BİR BAŞLANGIÇ", "eyebrow"), n("h3", r ? r.title : "Yeni bir dünya seç"), n("p", r ? r.total_pages ? `%${r.progress_percent} tamamlandı · ${r.current_page}/${r.total_pages} sayfa` : `${r.current_page || 0} sayfa ilerledin` : "Kataloğundaki renkli kapaklar arasından ruh hâline uygun bir eser bul.", "muted")), r) {
    const b = n("div", "", "progress-bar"), v = n("i");
    v.style.width = `${r.progress_percent || 0}%`, b.append(v), o.append(b);
  }
  o.append(Le(r ? "Okumaya devam et" : "Kataloğu keşfet", r ? "library" : "catalog")), s && e.append(F(s, "bento-cover")), e.append(o);
  const c = l.gamification.badges.filter((b) => !b.earned).sort((b, v) => v.progress_percent - b.progress_percent || b.goal - v.goal)[0];
  a.replaceChildren();
  const p = n("div", "", "bento-badge-visual");
  p.append(c ? ie(c, !0) : n("span", "🏆", "bento-trophy"));
  const u = n("div", "", "bento-copy");
  u.append(n("p", c ? "SIRADAKİ BAŞARIM" : "TÜMÜ TAMAM", "eyebrow"), n("h3", c ? c.name : "Edebiyat ustasısın"), n("p", c ? `${Math.max(0, c.goal - c.progress)} adım sonra +${c.xp_reward} XP kazanacaksın.` : "Tüm temel rozetleri kazandın.", "muted"), Le("Rozetlerini gör", "insights")), a.append(p, u);
  const d = (((h = l.preferences) == null ? void 0 : h.selected_traits) || []).slice(0, 3);
  i.replaceChildren(n("div", "✦", "bento-ai-orb"));
  const m = n("div", "", "bento-copy");
  m.append(n("p", "BAĞLAMI BİLEN ASİSTAN", "eyebrow"), n("h3", "Bu ekranı seninle okuyor"), n("p", d.length ? `${d.join(", ")} sinyallerini ve okuma geçmişini önerilere katıyorum.` : "Kitapları, raflarını ve tercihlerini konuşmanın bağlamına katıyorum.", "muted"));
  const y = n("button", "Asistana sor", "bento-link");
  y.type = "button", y.onclick = () => t("#chat-toggle").click(), m.append(y), i.append(m);
}
const ce = ["Melankolik bir kış akşamı için distopik bir bilim kurgu romanı arıyorum…", "Kısa, atmosferik ve şaşırtıcı sonlu bir polisiye istiyorum…", "İçe dönük bir karakterin umut veren dönüşüm hikâyesini arıyorum…", "Savaş temalı olmayan, kolay okunan bir tarihî roman öner…"];
let Ee = null, ne = 0;
function rt() {
  const e = t("#character");
  clearInterval(Ee), e.value || (e.placeholder = ce[ne]), Ee = setInterval(() => {
    document.activeElement === e || e.value || (ne = (ne + 1) % ce.length, e.classList.add("placeholder-shift"), setTimeout(() => {
      e.placeholder = ce[ne], e.classList.remove("placeholder-shift");
    }, 180));
  }, 4400), X();
}
function X() {
  const e = P("#traits .tag.active").map((s) => s.textContent), a = t("#character").value.trim(), i = t("#search-signal-summary");
  if (!i) return;
  const r = [];
  e.length && r.push(`${e.length} karakter sinyali`), a && r.push(`${Math.min(100, Math.max(15, a.length))}% sorgu ayrıntısı`), i.classList.toggle("active", r.length > 0), i.querySelector("p").textContent = r.length ? `${r.join(" · ")} — Gemma ve katalog sıralaması birlikte çalışacak.` : "Tür, atmosfer veya karakter seç; Mihenk sinyalleri birlikte yorumlasın.";
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-view]");
  a && (q(a.dataset.view), H.matches && pe());
});
t("#home-brand").onclick = () => q("discover");
let me = "";
function q(e) {
  P(".view").forEach((i) => i.classList.toggle("hidden", i.id !== `${e}-view`)), P(".nav-button").forEach((i) => {
    const r = i.dataset.view === e;
    i.classList.toggle("active", r), i.setAttribute("aria-current", r ? "page" : "false");
  });
  const a = { discover: "Keşfet", growth: "Okur Merkezi", catalog: "Katalog", community: "Topluluk", library: "Kitaplığım", insights: "Okuma analizi", alerts: "Bildirimler", settings: "Ayarlar", quality: "Kalite", "reading-mode": "Okuma Modu (PKM)" };
  document.title = `${a[e] || "Mihenk"} · Mihenk`, e === "quality" && Fe(), e === "community" && bt(), e === "settings" && ve(), e === "reading-mode" && window.dispatchEvent(new CustomEvent("pkm-refresh")), e === "growth" && window.dispatchEvent(new CustomEvent("growth-refresh")), e !== me && (me = e, ue("view_opened", { view: e })), I(), window.scrollTo({ top: 0, behavior: document.body.classList.contains("reduce-motion") ? "auto" : "smooth" });
}
P("#quick-prompts button").forEach((e) => e.onclick = () => {
  const a = t("#character");
  a.value = e.dataset.prompt, a.focus(), a.setSelectionRange(a.value.length, a.value.length), X();
});
Xe.forEach((e) => {
  var i;
  const a = n("button", e, "tag");
  a.type = "button", a.classList.toggle("active", (((i = l.preferences) == null ? void 0 : i.selected_traits) || []).includes(e)), a.onclick = () => {
    a.classList.toggle("active");
    const r = e.toLocaleLowerCase("tr");
    a.classList.contains("active") && !t("#character").value.toLocaleLowerCase("tr").includes(r) && (t("#character").value = t("#character").value.trim() ? `${t("#character").value.trim()}, ${r}` : r), X();
  }, t("#traits").append(a);
});
t("#character").addEventListener("input", X);
t("#recommend").onclick = async () => {
  const e = t("#character").value.trim();
  if (e.length < 3) {
    f("Karakter veya atmosfer için biraz daha ayrıntı yaz.", !0);
    return;
  }
  const a = t("#recommend");
  a.disabled = !0, t("#recommend-status").textContent = "Katalog ve Gemma 4 birlikte düşünüyor…", Ce("Arama sonuçlarını inceliyorum…", !0);
  try {
    await ot(e);
    const i = await g("/me/recommendations", { method: "POST", body: JSON.stringify({ character_description: e, limit: 6 }) });
    l.lastDiscoveryQuery = e, l.lastRecommendations = [...i.recommended_books, ...i.ai_discoveries || []], l.recommendationId = i.recommendation_id, l.recommendationVariant = i.experiment_variant, t("#recommendation-summary").textContent = i.character_analysis_summary, t("#recommendations").replaceChildren(...i.recommended_books.map((r, s) => lt(r, s + 1))), dt(i.ai_discoveries || []), t("#recommendations-panel").classList.remove("hidden"), I(), t("#recommendations-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (i) {
    I(), f(i.message, !0);
  } finally {
    a.disabled = !1, t("#recommend-status").textContent = "";
  }
};
function Be(e = {}) {
  const a = l.preferences || {};
  return { personality_text: a.personality_text || "", selected_traits: a.selected_traits || [], preferred_genres: a.preferred_genres || [], disliked_genres: a.disliked_genres || [], liked_styles: a.liked_styles || [], disliked_styles: a.disliked_styles || [], pace_preference: a.pace_preference || "mixed", focus_preference: a.focus_preference || "balanced", tone_preference: a.tone_preference || "balanced", violence_sensitivity: a.violence_sensitivity || 0, romance_sensitivity: a.romance_sensitivity || 0, spoiler_sensitivity: a.spoiler_sensitivity ?? 2, length_preference: a.length_preference || "any", ...e };
}
async function ot(e) {
  l.preferences = await g("/me/preferences", { method: "PUT", body: JSON.stringify(Be({ personality_text: e, selected_traits: P("#traits .active").map((a) => a.textContent) })) }), Ke();
}
function J(e, a) {
  const i = n("div", "", "score-component"), r = n("header");
  r.append(n("span", e), n("span", `%${Math.round(a.raw_score * 100)}`));
  const s = n("div", "", "mini-bar"), o = n("i");
  return o.style.width = `${a.raw_score * 100}%`, s.append(o), i.append(r, s), i;
}
function st(e) {
  const a = Math.round(e * 100), i = n("div", "", "match-visual");
  return i.style.setProperty("--match", `${a * 3.6}deg`), i.setAttribute("aria-label", `Yüzde ${a} uyum`), i.append(n("b", `%${a}`), n("small", "UYUM")), i;
}
function V(e, a, i, r = {}) {
  return !l.recommendationId || !l.recommendationVariant || !(a != null && a.id) ? Promise.resolve() : g("/me/recommendation-interactions", { method: "POST", body: JSON.stringify({ recommendation_id: l.recommendationId, book_id: a.id, event_type: e, position: i, experiment_variant: l.recommendationVariant, query_text: l.lastDiscoveryQuery || null, metadata: r }) }).catch(() => {
  });
}
function lt(e, a) {
  const i = l.books.find((m) => m.title === e.book_title) || { title: e.book_title, author: e.author, genre: e.genre }, r = n("article", "", "card recommendation-card"), s = n("div"), o = n("div", "", "book-head"), c = n("div");
  r.dataset.recommendationPosition = String(a), r.addEventListener("click", () => {
    r.dataset.clickTracked || (r.dataset.clickTracked = "1", V("click", i, a));
  }), c.append(n("h3", e.book_title), n("p", `${e.author} · ${e.genre}`, "book-meta")), o.append(c, st(e.match_score));
  const p = n("div", "", "why-book");
  p.append(n("span", "✦ NEDEN BU KİTAP?"), n("p", e.reasoning, "reason")), s.append(o, p);
  const u = e.score_breakdown, d = n("div", "", "score-grid");
  if (Number.isFinite(u.ai_score) ? (s.append(n("p", "Nihai puan · %80 Gemma 4 + %20 katalog sinyalleri", "score-method")), d.classList.add("blended-score-grid"), d.append(J("Gemma 4 · %80", { raw_score: u.ai_score }), J("Katalog · %20", { raw_score: u.catalog_score }))) : d.append(J("Karakter", u.character), J("Tema", u.themes), J("Geçmiş", u.reading_history)), s.append(d), u.matched_signals.length) {
    const m = n("div", "", "signal-list");
    u.matched_signals.forEach((y) => m.append(n("span", `✓ ${y}`))), s.append(m);
  }
  if (i.id) {
    s.append(ke(i));
    const m = n("div", "", "feedback-actions");
    [["✓ Tam isabet", "great_match"], ["× Bana göre değil", "not_for_me"], ["Biliyorum", "already_know"], ["+ Benzerleri", "more_like_this"]].forEach(([y, h]) => {
      const b = n("button", y);
      b.type = "button", b.onclick = () => ct(i, h, b, a), m.append(b);
    }), s.append(m);
  }
  return r.append(F(i), s), r;
}
async function ct(e, a, i, r) {
  try {
    await g("/me/recommendation-feedback", { method: "PUT", body: JSON.stringify({ book_id: e.id, feedback_type: a, query_text: l.lastDiscoveryQuery || null }) }), await V(["great_match", "more_like_this"].includes(a) ? "like" : "dislike", e, r, { feedback_type: a }), i.classList.add("selected"), i.disabled = !0, f("Geri bildirimin sonraki önerilere eklendi.");
  } catch (s) {
    f(s.message, !0);
  }
}
function dt(e) {
  t("#ai-discoveries-panel").classList.toggle("hidden", !e.length), t("#ai-discoveries").replaceChildren(...e.map(ut));
}
function ut(e) {
  const a = n("article", "", "card ai-discovery-card"), i = n("div", "✦", "ai-book-mark"), r = n("div");
  r.append(n("span", "GEMMA 4 ÖNERİSİ", "ai-source"), n("h3", e.book_title), n("p", `${e.author} · ${e.genre}`, "book-meta"), n("p", e.reasoning, "reason"));
  const s = n("button", "+ Kitaplığıma ekle", "ghost");
  return s.type = "button", s.onclick = () => se({ title: e.book_title, author: e.author, genre: e.genre, shelf: "to_read" }), r.append(s), a.append(i, r), a;
}
function pt(e) {
  return l.offers.filter((a) => a.book_id === e).sort((a, i) => a.price_minor - i.price_minor);
}
function mt(e) {
  const a = n("div", "", "offer-list"), i = pt(e.id);
  return i.length ? (i.slice(0, 4).forEach((r, s) => {
    const o = n("a", "", `offer-row${r.is_stale ? " stale" : ""}`), c = n("span", r.retailer_name), p = n("span");
    s === 0 && p.append(n("small", "EN UCUZ", "cheapest")), p.append(n("b", N(r.price_minor, r.currency))), o.href = r.product_url, o.target = "_blank", o.rel = "noopener noreferrer nofollow", o.title = `${r.stock_status === "in_stock" ? "Stokta" : "Stok durumu belirsiz"} · Son kontrol ${new Date(r.checked_at).toLocaleString("tr-TR")}`, o.append(c, p), a.append(o);
  }), a) : (a.append(n("p", "Henüz doğrulanmış mağaza fiyatı yok.", "muted")), a);
}
function ke(e) {
  const a = n("div", "", "book-actions"), i = oe(e) || e, r = { to_read: "Okuyacağım", reading: "Okuyorum", read: "Okudum" }, s = n("details", "", "shelf-picker"), o = n("summary", i != null && i.shelf ? `✓ ${r[i.shelf]}` : "+ Kitaplığa ekle"), c = n("div", "", "shelf-menu");
  o.setAttribute("aria-label", i != null && i.shelf ? `Raf: ${r[i.shelf]}. Değiştir` : `${e.title} kitabını kitaplığa ekle`), s.ontoggle = () => {
    s.open && P(".shelf-picker[open]").filter((m) => m !== s).forEach((m) => m.open = !1);
  }, [["Okuyacağım", "to_read"], ["Okuyorum", "reading"], ["Okudum", "read"]].forEach(([m, y]) => {
    const h = n("button", `${(i == null ? void 0 : i.shelf) === y ? "✓ " : ""}${m}`);
    h.type = "button", h.onclick = () => {
      s.open = !1, y === "reading" ? _t(e) : Me(e, y);
    }, c.append(h);
  }), s.append(o, c), a.append(s);
  const p = n("div", "", "compact-actions"), u = !!(i != null && i.is_favorite), d = n("button", u ? "♥" : "♡", "compact-action");
  if (d.type = "button", d.title = u ? "Favorilerden çıkar" : "Favorilere ekle", d.setAttribute("aria-label", d.title), d.setAttribute("aria-pressed", String(u)), d.onclick = () => Me(e, (i == null ? void 0 : i.shelf) || "to_read", !u), p.append(d), e.is_custom) {
    const m = n("button", "✎", "compact-action");
    m.type = "button", m.title = "Kitabı düzenle", m.setAttribute("aria-label", m.title), m.onclick = () => se(e);
    const y = n("button", "×", "compact-action danger");
    y.type = "button", y.title = "Kitabı sil", y.setAttribute("aria-label", y.title), y.onclick = () => wt(e), p.append(m, y);
  } else {
    const m = n("button", "♢", "compact-action");
    m.type = "button", m.title = "Fiyat alarmı kur", m.setAttribute("aria-label", m.title), m.onclick = () => Lt(e), p.append(m);
  }
  return a.append(p), a;
}
function oe(e) {
  return [...l.profile.read_books, ...l.profile.reading_books, ...l.profile.to_read_books].find((a) => a.id === e.id);
}
function He(e, a = {}) {
  return { title: e.title, author: e.author || "Bilinmeyen yazar", genre: e.genre || "Genel", cover_url: e.cover_url || null, shelf: e.shelf, is_favorite: e.is_favorite || !1, current_page: e.current_page || 0, total_pages: e.total_pages || null, ...a };
}
async function Me(e, a, i) {
  const r = oe(e) || e;
  try {
    if (e.is_custom)
      await g(`/me/custom-books/${encodeURIComponent(e.id)}`, { method: "PUT", body: JSON.stringify(He(r, { shelf: a, is_favorite: i ?? r.is_favorite ?? !1, current_page: a === "read" ? r.total_pages || r.current_page || 0 : r.current_page || 0 })) });
    else {
      await g("/me/library", { method: "PUT", body: JSON.stringify({ book_id: e.id, shelf: a, is_favorite: i ?? (r == null ? void 0 : r.is_favorite) ?? !1, current_page: a === "read" ? (r == null ? void 0 : r.total_pages) || (r == null ? void 0 : r.current_page) || 0 : (r == null ? void 0 : r.current_page) || 0, total_pages: (r == null ? void 0 : r.total_pages) || null }) });
      const s = l.lastRecommendations.findIndex((o) => (o.book_title || o.title) === e.title) + 1;
      s && (await V("library_add", e, s, { shelf: a }), a === "reading" && await V("reading_start", e, s), a === "read" && await V("reading_finish", e, s));
    }
    await D(), f(`${e.title} kitaplığına kaydedildi.`);
  } catch (s) {
    f(s.message, !0);
  }
}
function gt(e) {
  const a = n("article", "", "catalog-card"), i = n("div", "", "catalog-info"), r = n("button", e.title, "book-title-button");
  r.type = "button", r.onclick = () => ge(e), i.append(r, n("p", `${e.author} · ${e.genre}`, "book-meta"), n("p", e.rating_count ? `★ ${Number(e.rating_average).toFixed(1)} · ${e.rating_count} okur puanı` : "Henüz puanlanmadı", "community-summary"));
  const s = ke(e), o = n("button", "Ayrıntılar", "detail-button"), c = n("button", "☆ Puanla ve yorumla", "community-button"), p = n("button", l.compareIds.has(e.id) ? "✓ Seçildi" : "⇄ Karşılaştır", "compare-button");
  return o.type = "button", o.onclick = () => ge(e), c.type = "button", c.onclick = () => ft(e), p.type = "button", p.onclick = () => {
    l.compareIds.has(e.id) ? l.compareIds.delete(e.id) : l.compareIds.size < 4 ? l.compareIds.add(e.id) : f("En fazla dört kitap karşılaştırılabilir.", !0), z(), Ge();
  }, s.append(o, c, p), a.append(F(e), i, n("p", e.description, "summary"), mt(e), s), a;
}
function Ge() {
  const e = l.compareIds.size;
  t("#compare-count").textContent = `${e} kitap seçildi`, t("#compare-tray").classList.toggle("hidden", e < 1), t("#compare-run").disabled = e < 2;
}
t("#compare-clear").onclick = () => {
  l.compareIds.clear(), t("#comparison-results").classList.add("hidden"), z(), Ge();
};
t("#compare-run").onclick = async () => {
  try {
    const e = await g("/me/books/compare", { method: "POST", body: JSON.stringify({ book_ids: [...l.compareIds] }) }), a = n("table", "", "comparison-table"), i = n("tr");
    ["Kitap", "Tür", "Sayfa", "Tempo", "Zorluk", "Fiyat"].forEach((r) => i.append(n("th", r))), a.append(i, ...e.map((r) => {
      const s = n("tr");
      return [r.title, r.genre, r.page_count || "—", r.narrative_pace || "—", r.difficulty, r.price_minor ? N(r.price_minor) : "—"].forEach((o) => s.append(n("td", o))), s;
    })), t("#comparison-results").replaceChildren(a), t("#comparison-results").classList.remove("hidden");
  } catch (e) {
    f(e.message, !0);
  }
};
async function z(e = !1) {
  e && (l.catalog.offset = 0);
  const a = t("#catalog-grid"), i = t("#orbit-count");
  a.setAttribute("aria-busy", "true"), i && !l.catalog.total && i.setAttribute("aria-busy", "true"), a.replaceChildren(...Array.from({ length: 6 }, () => n("div", "", "skeleton")));
  const r = new URLSearchParams({ limit: l.catalog.limit, offset: l.catalog.offset, sort: t("#catalog-sort").value }), s = t("#catalog-search").value.trim();
  s && r.set("q", s);
  try {
    const [o, c] = await Promise.all([g(`/catalog/books?${r}`), l.catalog.coverage ? Promise.resolve(l.catalog.coverage) : g("/catalog/coverage")]);
    l.catalog.total = o.total, l.catalog.items = o.items, l.catalog.coverage = c, a.replaceChildren(...o.items.length ? o.items.map(gt) : [ht(s)]), t("#catalog-coverage").textContent = `${o.total} kitap · ${c.priced_books} kitapta ${c.offers} doğrulanmış teklif`, i && !s && (i.textContent = o.total.toLocaleString("tr-TR"), i.setAttribute("aria-busy", "false"));
    const p = n("button", "← Önceki", "ghost"), u = n("button", "Sonraki →", "ghost");
    p.disabled = l.catalog.offset === 0, u.disabled = l.catalog.offset + l.catalog.limit >= o.total, p.onclick = () => {
      l.catalog.offset = Math.max(0, l.catalog.offset - l.catalog.limit), z();
    }, u.onclick = () => {
      l.catalog.offset += l.catalog.limit, z();
    }, t("#catalog-pagination").replaceChildren(p, n("span", `Sayfa ${Math.floor(l.catalog.offset / l.catalog.limit) + 1}`, "muted"), u), I();
  } finally {
    a.setAttribute("aria-busy", "false");
  }
}
function ht(e) {
  const a = n("div", "", "empty");
  return a.append(n("span", "⌕", "empty-icon"), n("h3", "Eşleşen kitap bulunamadı"), n("p", e ? `“${e}” için farklı bir yazar, tür veya kelime deneyebilirsin.` : "Katalog şu an boş görünüyor.", "muted")), a;
}
t("#catalog-search").oninput = () => {
  clearTimeout(l.catalog.timer), l.catalog.timer = setTimeout(() => z(!0).catch((e) => f(e.message, !0)), 250);
};
t("#catalog-clear").onclick = () => {
  t("#catalog-search").value = "", z(!0);
};
t("#catalog-sort").onchange = () => z(!0).catch((e) => f(e.message, !0));
async function ft(e) {
  t("#community-title").textContent = `${e.title} — ${e.author}`, t("#community-book-id").value = e.id, t("#community-dialog").showModal(), await U(e.id);
}
t("[data-close-community]").onclick = () => t("#community-dialog").close();
t("#community-comment-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = t("#community-book-id").value, i = t("#community-parent-id").value || null, r = e.submitter;
  r.disabled = !0;
  try {
    await g("/me/book-comments", { method: "POST", body: JSON.stringify({ book_id: a, parent_comment_id: i, content: t("#community-comment").value, contains_spoiler: t("#community-spoiler").checked }) }), e.target.reset(), t("#community-book-id").value = a, t("#community-parent-id").value = "", t("#community-reply-context").classList.add("hidden"), await U(a), await he(), f(i ? "Yanıtın yayınlandı." : "Yorumun yayınlandı.");
  } catch (s) {
    f(s.message, !0);
  } finally {
    r.disabled = !1;
  }
};
async function U(e) {
  const a = await g(`/books/${e}/community`);
  t("#community-rating").replaceChildren(...[1, 2, 3, 4, 5].map((u) => {
    const d = n("button", "★", u <= a.own_rating ? "active" : "");
    return d.type = "button", d.title = `${u} yıldız`, d.setAttribute("aria-label", `${u} yıldız ver`), d.onclick = async () => {
      await g(`/me/book-ratings/${e}`, { method: "PUT", body: JSON.stringify({ rating: u }) }), await U(e), await he(), await z(), f("Puanın kaydedildi.");
    }, d;
  }));
  const r = a.rating_distribution || {}, s = t("#community-rating-summary");
  s.replaceChildren(n("strong", a.rating_count ? `${Number(a.rating_average).toFixed(1)} / 5` : "İlk puanı sen ver"), n("span", `${a.rating_count || 0} okur puanı`));
  const o = n("div", "", "rating-bars"), c = Math.max(1, ...Object.values(r));
  [5, 4, 3, 2, 1].forEach((u) => {
    const d = n("div", "", "rating-bar-row"), m = n("i");
    m.style.width = `${(r[u] || 0) / c * 100}%`, d.append(n("span", `${u} ★`), n("b", ""), n("small", r[u] || 0)), d.querySelector("b").append(m), o.append(d);
  }), s.append(o), t("#community-comments").replaceChildren(...a.comments.length ? a.comments.map((u) => {
    const d = n("article", "", `community-comment${u.contains_spoiler ? " spoiler" : ""}${u.parent_comment_id ? " reply" : ""}`), m = n("header"), y = n("strong", u.author.display_name);
    u.author.is_verified && y.append(n("span", " ✓", "verified-badge")), m.append(y, n("time", new Date(u.created_at).toLocaleDateString("tr-TR")));
    const h = n("p", u.contains_spoiler ? "Spoiler — görmek için tıkla" : u.content);
    u.contains_spoiler && (h.tabIndex = 0, h.onclick = () => h.textContent = u.content, h.onkeydown = ($) => {
      $.key === "Enter" && h.click();
    });
    const b = n("div", "", "comment-actions"), v = n("button", "Yanıtla", "text-button"), w = n("button", `${u.own_helpful ? "✓ " : ""}Faydalı · ${u.helpful_count || 0}`, "text-button");
    if (v.onclick = () => {
      t("#community-parent-id").value = u.id, t("#community-reply-context").textContent = `${u.author.display_name} adlı okura yanıt veriyorsun.`, t("#community-reply-context").classList.remove("hidden"), t("#community-comment").focus();
    }, w.onclick = async () => {
      await g(`/me/comments/${u.id}/helpful`, { method: u.own_helpful ? "DELETE" : "PUT" }), await U(e);
    }, b.append(v, w), u.is_mine) {
      const $ = n("button", "Yorumu sil", "text-button");
      $.onclick = async () => {
        await g(`/me/book-comments/${u.id}`, { method: "DELETE" }), await U(e), await he();
      }, b.append($);
    } else {
      const $ = n("button", u.following_author ? "Takibi bırak" : "Takip et", "text-button"), S = n("button", "Şikâyet", "text-button");
      $.onclick = async () => {
        await g(`/me/follows/${u.author.id}`, { method: u.following_author ? "DELETE" : "PUT" }), await U(e);
      }, S.onclick = () => {
        t("#report-form").reset(), t("#report-comment-id").value = u.id, t("#report-dialog").showModal();
      }, b.append($, S);
    }
    return d.append(m, h, b), d;
  }) : [n("p", "İlk yorumu sen paylaş.", "muted")]);
}
async function ge(e) {
  const a = t("#book-detail-dialog"), i = t("#book-detail-content");
  i.replaceChildren(n("div", "", "skeleton"), n("div", "", "skeleton")), a.showModal();
  try {
    const r = await g(`/books/${e.id}/details`), s = n("div", "", "detail-hero"), o = n("div");
    o.append(n("p", `${r.book.genre} · ${r.book.page_count || "—"} sayfa`, "eyebrow"), n("h2", r.book.title), n("p", r.book.author, "book-meta"), n("p", r.book.description, "detail-description")), s.append(F(r.book, "detail-cover"), o);
    const c = n("section", "", "detail-match"), p = n("strong", `%${Math.round(r.ai_match.score * 100)} uyum`), u = n("ul");
    r.ai_match.reasons.forEach((h) => {
      const b = n("li", h);
      u.append(b);
    }), c.append(p, u);
    const d = n("section", "", "detail-section");
    d.append(n("h3", "Güncel fiyatlar")), d.append(...r.offers.length ? r.offers.slice(0, 8).map((h) => {
      const b = n("a", `${h.retailer_name} · ${N(h.price_minor, h.currency)}`, "detail-offer");
      return b.href = h.product_url, b.target = "_blank", b.rel = "noopener noreferrer", b;
    }) : [n("p", "Henüz doğrulanmış mağaza fiyatı yok.", "muted")]);
    const m = n("section", "", "detail-section"), y = r.price_history.slice().reverse().slice(-24);
    if (m.append(n("h3", "Fiyat geçmişi")), y.length) {
      const h = n("div", "", "price-sparkline"), b = Math.min(...y.map((w) => w.price_minor)), v = Math.max(...y.map((w) => w.price_minor));
      y.forEach((w) => {
        const $ = n("i");
        $.style.height = `${20 + (v - w.price_minor) / Math.max(1, v - b) * 70}%`, $.title = `${N(w.price_minor, w.currency)} · ${new Date(w.observed_at).toLocaleDateString("tr-TR")}`, h.append($);
      }), m.append(h);
    } else m.append(n("p", "Fiyat geçmişi veri toplandıkça oluşacak.", "muted"));
    i.replaceChildren(s, c, d, m);
  } catch (r) {
    i.replaceChildren(n("p", r.message, "error-line"));
  }
}
t("[data-close-book-detail]").onclick = () => t("#book-detail-dialog").close();
function yt(e, a) {
  const i = n("div", "", "price-timeline"), r = document.createElement("canvas"), s = n("div", "", "price-legend");
  return r.width = 760, r.height = 230, r.setAttribute("aria-label", "Gerçek ve tahmini fiyat grafiği"), r.setAttribute("role", "img"), s.append(n("span", "Gerçek fiyat", "actual"), n("span", "15 günlük tahmin", "forecast")), i.append(r, s), requestAnimationFrame(() => {
    const o = r.getContext("2d"), c = e.slice().reverse().slice(-45).map((_) => ({ value: _.price_minor, label: _.observed_at })), p = a.map((_) => ({ value: _.predicted_price_minor, low: _.lower_price_minor, high: _.upper_price_minor, label: _.forecast_date })), u = [...c, ...p], d = u.flatMap((_) => [_.value, _.low, _.high].filter(Number.isFinite));
    if (!d.length) return;
    const m = { x: 44, y: 24, b: 34 }, y = r.width - m.x - 18, h = r.height - m.y - m.b, b = Math.min(...d) * 0.96, v = Math.max(...d) * 1.04, w = Math.max(1, v - b), $ = (_) => m.x + _ / Math.max(1, u.length - 1) * y, S = (_) => m.y + (v - _) / w * h;
    o.clearRect(0, 0, r.width, r.height), o.strokeStyle = "#dfe5df", o.fillStyle = "#68766f", o.font = "12px Inter, sans-serif";
    for (let _ = 0; _ < 4; _++) {
      const T = m.y + _ * h / 3, L = Math.round(v - _ * w / 3);
      o.beginPath(), o.moveTo(m.x, T), o.lineTo(r.width - 18, T), o.stroke(), o.fillText(`${Math.round(L / 100)} TL`, 2, T + 4);
    }
    p.length && (o.fillStyle = "rgba(213,154,69,.14)", o.beginPath(), p.forEach((_, T) => o.lineTo($(c.length + T), S(_.high))), [...p].reverse().forEach((_, T) => o.lineTo($(u.length - 1 - T), S(_.low))), o.closePath(), o.fill());
    const A = (_, T, L, B = !1) => {
      o.beginPath(), o.strokeStyle = L, o.lineWidth = 3, o.setLineDash(B ? [7, 6] : []), _.forEach((ee, k) => {
        const x = $(T + k), C = S(ee.value);
        k ? o.lineTo(x, C) : o.moveTo(x, C);
      }), o.stroke(), o.setLineDash([]);
    };
    if (A(c, 0, "#08745a"), p.length) {
      const _ = c.length ? [c.at(-1), ...p] : p;
      A(_, Math.max(0, c.length - 1), "#d59a45", !0);
    }
    o.fillStyle = "#68766f", o.fillText(c.length ? new Date(c[0].label).toLocaleDateString("tr-TR") : "", m.x, r.height - 9), o.textAlign = "right", o.fillText(u.length ? new Date(u.at(-1).label).toLocaleDateString("tr-TR") : "", r.width - 18, r.height - 9);
  }), i;
}
ge = async function(e) {
  var r, s;
  const a = t("#book-detail-dialog"), i = t("#book-detail-content");
  i.replaceChildren(n("div", "", "skeleton"), n("div", "", "skeleton")), a.showModal();
  try {
    const o = await g(`/books/${e.id}/details`), c = n("div", "", "detail-hero"), p = n("div");
    p.append(n("p", `${o.book.genre} · ${o.book.page_count ? o.book.page_count + " sayfa" : "Sayfa bilgisi yok"}`, "eyebrow"), n("h2", o.book.title), n("p", o.book.author, "book-meta"), n("p", o.book.description, "detail-description")), c.append(F(o.book, "detail-cover"), p);
    const u = n("section", "", "detail-match"), d = n("ul");
    o.ai_match.reasons.forEach((b) => d.append(n("li", b))), u.append(n("strong", `%${Math.round(o.ai_match.score * 100)} uyum`), d);
    const m = n("section", "", "detail-section");
    m.append(n("h3", "Güncel fiyatlar"), ...o.offers.length ? o.offers.slice(0, 8).map((b) => {
      const v = n("a", `${b.retailer_name} · ${N(b.price_minor, b.currency)}`, "detail-offer");
      return v.href = b.product_url, v.target = "_blank", v.rel = "noopener noreferrer", v;
    }) : [n("p", "Henüz doğrulanmış mağaza fiyatı yok.", "muted")]);
    const y = n("section", "", "detail-section price-intelligence"), h = o.price_intelligence || {};
    if (y.append(n("p", "FİYAT ZEKÂSI", "eyebrow"), n("h3", "Geçmiş ve 15 günlük görünüm")), h.status === "ready") {
      const b = n("div", "", "price-signal-grid"), v = ((r = h.windows) == null ? void 0 : r["30"]) || {};
      b.append(n("div", `${N(h.current_price_minor)}|Güncel en düşük`, "price-signal"), n("div", `${N(v.lowest_price_minor)}|30 günün en düşüğü`, "price-signal"), n("div", `${h.deal_score}/100|${h.deal_label}`, "price-signal")), [...b.children].forEach(($) => {
        const [S, A] = $.textContent.split("|");
        $.replaceChildren(n("strong", S), n("small", A));
      }), y.append(b, yt(o.price_history || [], o.price_forecasts || []));
      const w = (s = o.price_forecasts) == null ? void 0 : s.at(-1);
      w && y.append(n("p", `Model: ${w.model_name} · Son veri: ${new Date(w.trained_through).toLocaleDateString("tr-TR")} · Tahminler kesin fiyat vaadi değildir.`, "forecast-note"));
    } else y.append(n("p", "Anlamlı bir eğilim için en az üç farklı günlük fiyat ölçümü gerekiyor.", "muted"));
    i.replaceChildren(c, u, m, y);
  } catch (o) {
    i.replaceChildren(n("p", o.message, "error-line"));
  }
};
t("[data-close-report]").onclick = () => t("#report-dialog").close();
t("#report-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = e.submitter;
  a.disabled = !0;
  try {
    await g(`/me/comments/${t("#report-comment-id").value}/reports`, { method: "POST", body: JSON.stringify({ reason: t("#report-reason").value, details: t("#report-details").value.trim() || null }) }), t("#report-dialog").close(), f("Şikâyetin inceleme kuyruğuna alındı.");
  } catch (i) {
    f(i.message, !0);
  } finally {
    a.disabled = !1;
  }
};
async function bt() {
  const e = t("#community-feed");
  e.replaceChildren(n("div", "", "skeleton"), n("div", "", "skeleton"));
  try {
    const a = await g("/me/community-feed");
    e.replaceChildren(...a.length ? a.map((i) => {
      const r = n("article", "", "card feed-card"), s = n("header"), o = n("strong", i.display_name || "Okur");
      return i.is_verified && o.append(n("span", " ✓", "verified-badge")), s.append(o, n("time", new Date(i.created_at).toLocaleDateString("tr-TR"))), r.append(s, n("h3", i.book_title), n("p", i.contains_spoiler ? "Spoiler içeren yorum" : i.content), n("small", i.book_author || "", "muted")), r;
    }) : [n("div", "Henüz takip akışın yok. Kitap yorumlarında ilgini çeken okurları takip ederek başlayabilirsin.", "empty-state")]);
  } catch (a) {
    e.replaceChildren(n("p", a.message, "error-line"));
  }
}
P(".tab").forEach((e) => e.onclick = () => {
  l.shelf = e.dataset.shelf, P(".tab").forEach((a) => a.classList.toggle("active", a === e)), re();
});
function qe() {
  return l.shelf === "favorite" ? l.profile.favorite_books : l.profile[`${l.shelf}_books`] || [];
}
function vt(e) {
  const a = n("article", "", "card library-card"), i = n("div", "", "library-card-body");
  if (i.append(n("h3", e.title), n("p", `${e.author} · ${e.genre}`, "book-meta")), e.shelf === "reading") {
    const s = n("div", "", "progress-bar"), o = n("i");
    o.style.width = `${e.progress_percent}%`, s.append(o), i.append(s, n("p", e.total_pages ? `${e.current_page} / ${e.total_pages} sayfa · %${e.progress_percent}` : `${e.current_page} sayfa`, "muted"));
  }
  i.append(ke(e));
  const r = n("button", "◷ Okuma planı", "ghost reading-plan-button");
  return r.type = "button", r.onclick = () => kt(e), i.append(r), a.append(F(e), i), a;
}
async function kt(e) {
  try {
    const a = await window.BookPusulasiUI.openReadingPlan(e);
    a && f(`Plan hazır: günde ${a.daily_pages} sayfa.`);
  } catch (a) {
    f(a.message, !0);
  }
}
function re() {
  const e = qe();
  if (e.length) {
    t("#library-grid").replaceChildren(...e.map(vt)), I();
    return;
  }
  const a = n("div", "", "empty"), i = n("div", "", "empty-shelf");
  i.setAttribute("aria-hidden", "true"), i.append(n("i"), n("i"), n("i"), n("span"));
  const r = n("h3", l.shelf === "favorite" ? "Favori rafın seni bekliyor" : "Bu rafta henüz kitap yok"), s = n("p", l.shelf === "reading" ? "Okumaya başladığın kitabı ekle; ilerlemeni buradan takip et." : "Hemen yeni dünyalar keşfet ve ilgini çeken kitapları bu rafa yerleştir.", "muted"), o = n("div", "", "empty-actions"), c = n("button", "Kataloğu keşfet", "primary"), p = n("button", "Kendi kitabımı ekle", "ghost");
  c.type = p.type = "button", c.onclick = () => q("catalog"), p.onclick = () => se(), o.append(c, p), a.append(i, r, s, o), t("#library-grid").replaceChildren(a), I();
}
function _t(e) {
  const a = oe(e) || e;
  t("#progress-book-id").value = e.id, t("#progress-book-id").dataset.custom = e.is_custom ? "1" : "", t("#progress-title").textContent = e.title, t("#current-page").value = (a == null ? void 0 : a.current_page) || 0, t("#total-pages").value = (a == null ? void 0 : a.total_pages) || "", t("#progress-dialog").showModal();
}
t("#progress-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = t("#progress-book-id").value, i = t("#progress-book-id").dataset.custom === "1", r = i ? [...l.profile.read_books, ...l.profile.reading_books, ...l.profile.to_read_books].find((o) => o.id === a) : l.books.find((o) => o.id === a), s = oe(r) || r;
  try {
    const o = { shelf: "reading", is_favorite: (s == null ? void 0 : s.is_favorite) || !1, current_page: Number(t("#current-page").value), total_pages: Number(t("#total-pages").value) };
    await g(i ? `/me/custom-books/${encodeURIComponent(a)}` : "/me/library", { method: "PUT", body: JSON.stringify(i ? He(r, o) : { book_id: a, ...o }) }), t("#progress-dialog").close(), await D(), f("Okuma ilerlemesi güncellendi.");
  } catch (o) {
    f(o.message, !0);
  }
};
function se(e = null) {
  t("#custom-book-form").reset(), t("#custom-book-id").value = (e == null ? void 0 : e.id) || "", t("#custom-book-title").textContent = e != null && e.id ? "Kitabı düzenle" : "Kitap ekle", t("#custom-title").value = (e == null ? void 0 : e.title) || "", t("#custom-author").value = (e == null ? void 0 : e.author) || "", t("#custom-genre").value = (e == null ? void 0 : e.genre) || "", t("#custom-shelf").value = (e == null ? void 0 : e.shelf) || "to_read", t("#custom-current-page").value = (e == null ? void 0 : e.current_page) || 0, t("#custom-total-pages").value = (e == null ? void 0 : e.total_pages) || "", t("#custom-cover-url").value = (e == null ? void 0 : e.cover_url) || "", t("#custom-favorite").checked = (e == null ? void 0 : e.is_favorite) || !1, t("#custom-book-dialog").showModal();
}
t("#add-custom-book").onclick = () => se();
t("[data-close-custom]").onclick = () => t("#custom-book-dialog").close();
t("#custom-book-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = t("#custom-book-id").value, i = { title: t("#custom-title").value.trim(), author: t("#custom-author").value.trim() || "Bilinmeyen yazar", genre: t("#custom-genre").value.trim() || "Genel", cover_url: t("#custom-cover-url").value.trim() || null, shelf: t("#custom-shelf").value, is_favorite: t("#custom-favorite").checked, current_page: Number(t("#custom-current-page").value || 0), total_pages: t("#custom-total-pages").value ? Number(t("#custom-total-pages").value) : null };
  try {
    await g(a ? `/me/custom-books/${encodeURIComponent(a)}` : "/me/custom-books", { method: a ? "PUT" : "POST", body: JSON.stringify(i) }), t("#custom-book-dialog").close(), await D(), f(a ? "Kitap güncellendi." : "Kitap kitaplığına eklendi.");
  } catch (r) {
    f(r.message, !0);
  }
};
async function wt(e) {
  if (confirm(`“${e.title}” kişisel kitaplığından silinsin mi?`))
    try {
      await g(`/me/custom-books/${encodeURIComponent(e.id)}`, { method: "DELETE" }), await D(), f("Kişisel kitap silindi.");
    } catch (a) {
      f(a.message, !0);
    }
}
async function D() {
  [l.profile, l.dashboard, l.gamification, l.alerts, l.notifications] = await Promise.all([g("/me/profile"), g(`/me/reading-dashboard?year=${(/* @__PURE__ */ new Date()).getFullYear()}`), g("/me/gamification"), g("/me/price-alerts"), g("/me/notifications")]), W(), re(), Ue(), ye();
}
async function he() {
  l.gamification = await g("/me/gamification"), W(), le();
}
function Ue() {
  const e = l.dashboard, a = e.goal;
  t("#goal-year").textContent = e.year, t("#heatmap-year").textContent = e.year, t("#goal-target").value = a.target_books;
  const i = [[`%${a.progress_percent}`, "Yıllık hedef"], [e.total_pages_read, "Okunan sayfa"], [e.active_days, "Aktif gün"], [`${e.current_streak} gün`, "Güncel seri"]];
  t("#insight-stats").replaceChildren(...i.map(([r, s]) => {
    const o = n("article", "", "card metric");
    return o.append(n("b", r), n("span", s)), o;
  })), le(), Ct(e), St(e.genre_distribution), Tt(e.series_progress), xt();
}
function fe(e) {
  return e.xp_reward >= 100 ? "gold" : e.xp_reward >= 60 ? "silver" : "bronze";
}
function ie(e, a = !1) {
  const i = n("span", "", `badge-medallion ${fe(e)}${a ? " large" : ""}`), r = n("span", e.icon, "badge-symbol");
  return r.setAttribute("aria-hidden", "true"), i.append(r), e.earned || i.append(n("span", "🔒", "badge-lock")), i;
}
function le() {
  const e = l.gamification;
  if (!e) return;
  const a = e.level, i = t("#achievement-level-fill"), r = i.parentElement;
  t("#achievement-level-number").textContent = a.number, t("#achievement-title").textContent = a.name, t("#achievement-xp").textContent = `${e.xp.toLocaleString("tr-TR")} XP`, i.style.width = `${a.progress_percent}%`, r.setAttribute("aria-valuenow", a.progress_percent), t("#achievement-level-next").textContent = a.next_xp == null ? "En yüksek seviyeye ulaştın." : `Sonraki seviye için ${(a.next_xp - e.xp).toLocaleString("tr-TR")} XP kaldı.`, t("#earned-count").textContent = `${e.earned_count} / ${e.total_badges}`, t("#showcase-count").textContent = `${e.showcase.length} / 3`;
  const s = Object.fromEntries(e.badges.map((d) => [d.code, d])), o = e.showcase.map((d) => s[d]).filter(Boolean);
  t("#badge-showcase").replaceChildren(...o.length ? o.map((d) => {
    const m = n("div", "", `showcase-badge ${fe(d)}`);
    return m.append(ie(d, !0), n("strong", d.name), n("small", `+${d.xp_reward} XP`)), m;
  }) : [n("p", "Vitrinin boş. İlk rozetini kazandığında burada gösterebilirsin.", "muted showcase-empty")]);
  const c = e.badges.filter((d) => !d.earned).sort((d, m) => m.progress_percent - d.progress_percent || d.goal - m.goal), p = c[0], u = t("#badge-motivation");
  if (u.replaceChildren(), p) {
    u.append(ie(p), n("div", "", "motivation-copy"));
    const d = u.lastChild, m = Math.max(0, p.goal - p.progress);
    d.append(n("small", "SIRADAKİ ROZET"), n("strong", p.name), n("span", m === 1 ? "Sadece 1 adım kaldı!" : `Hedefe ${m} adım kaldı · %${p.progress_percent} tamamlandı`));
  } else
    u.append(n("span", "🏆", "motivation-trophy"), n("div", "Tüm temel rozetleri kazandın! Yeni dönemsel başarımlar yakında.", "motivation-complete"));
  t("#badge-grid").replaceChildren(...e.badges.map((d) => {
    const m = fe(d), y = n("article", "", `badge-card ${m}${d.earned ? " earned" : " locked"}${d.showcased ? " showcased" : ""}`), h = n("div", "", "badge-visual"), b = n("span", d.earned ? "KAZANILDI" : `%${d.progress_percent}`, `badge-status${d.earned ? " won" : ""}`);
    h.append(ie(d, !0), b);
    const v = n("h4", d.name), w = n("span", `+${d.xp_reward} XP`, "badge-reward");
    y.append(h, v, w, n("p", d.description, "muted"));
    const $ = n("div", "", "badge-progress"), S = n("div", "", "progress-bar"), A = n("i");
    A.style.width = `${d.progress_percent}%`, S.append(A);
    const _ = Math.max(0, d.goal - d.progress), T = d.earned ? "Başarım tamamlandı" : _ === 1 ? "1 adım kaldı" : `${d.progress} / ${d.goal}`;
    if ($.append(S, n("small", T, "muted")), y.append($), d.earned) {
      const L = n("button", d.showcased ? "✓ Vitrinde" : "Vitrinde göster", d.showcased ? "ghost badge-toggle active" : "ghost badge-toggle");
      L.type = "button", L.setAttribute("aria-pressed", String(d.showcased)), L.onclick = () => $t(d.code, L), y.append(L);
    }
    return y;
  }));
}
async function $t(e, a) {
  const i = [...l.gamification.showcase], r = i.indexOf(e);
  if (r >= 0) i.splice(r, 1);
  else if (i.length < 3) i.push(e);
  else {
    f("Vitrinde en fazla üç rozet gösterebilirsin.", !0);
    return;
  }
  a.disabled = !0;
  try {
    l.gamification = await g("/me/gamification/showcase", { method: "PUT", body: JSON.stringify({ badge_codes: i }) }), W(), le(), f(r >= 0 ? "Rozet vitrinden kaldırıldı." : "Rozet profiline eklendi.");
  } catch (s) {
    a.disabled = !1, f(s.message, !0);
  }
}
function xt() {
  const e = l.preferences || {};
  t("#taste-pace").value = e.pace_preference || "mixed", t("#taste-focus").value = e.focus_preference || "balanced", t("#taste-tone").value = e.tone_preference || "balanced", t("#taste-length").value = e.length_preference || "any", t("#taste-violence").value = e.violence_sensitivity || 0, t("#taste-romance").value = e.romance_sensitivity || 0, t("#taste-spoiler").value = e.spoiler_sensitivity ?? 2;
}
t("#taste-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    l.preferences = await g("/me/preferences", { method: "PUT", body: JSON.stringify(Be({ pace_preference: t("#taste-pace").value, focus_preference: t("#taste-focus").value, tone_preference: t("#taste-tone").value, length_preference: t("#taste-length").value, violence_sensitivity: Number(t("#taste-violence").value), romance_sensitivity: Number(t("#taste-romance").value), spoiler_sensitivity: Number(t("#taste-spoiler").value) })) }), f("Okuma zevki profilin kaydedildi.");
  } catch (a) {
    f(a.message, !0);
  }
};
function Ct(e) {
  const a = Object.fromEntries(e.calendar.map((o) => [o.activity_date, o.pages_read])), i = new Date(e.year, 0, 1), r = new Date(e.year, 11, 31), s = [];
  for (let o = new Date(i); o <= r; o.setDate(o.getDate() + 1)) {
    const c = `${o.getFullYear()}-${String(o.getMonth() + 1).padStart(2, "0")}-${String(o.getDate()).padStart(2, "0")}`, p = a[c] || 0, u = p === 0 ? 0 : p < 10 ? 1 : p < 25 ? 2 : p < 50 ? 3 : 4, d = n("i");
    d.dataset.level = u, d.title = `${c}: ${p} sayfa`, s.push(d);
  }
  t("#heatmap").replaceChildren(...s);
}
function St(e) {
  const a = Math.max(1, ...e.map((i) => i.count));
  t("#genre-chart").replaceChildren(...e.length ? e.map((i) => {
    const r = n("div", "", "bar-row"), s = n("header");
    s.append(n("span", i.genre), n("b", i.count));
    const o = n("div", "", "bar"), c = n("i");
    return c.style.width = `${i.count / a * 100}%`, o.append(c), r.append(s, o), r;
  }) : [n("p", "Tamamlanan kitaplar tür dağılımını oluşturacak.", "muted")]);
}
function Tt(e) {
  t("#series-progress").replaceChildren(...e.length ? e.map((a) => {
    const i = n("div", "", "series-row"), r = n("div", "", "progress-bar"), s = n("i");
    return s.style.width = `${a.progress_percent}%`, r.append(s), i.append(n("strong", a.series_name), r, n("span", `${a.read_books}/${a.total_books}`, "muted")), i;
  }) : [n("p", "Katalogda seri bilgisi oluştuğunda ilerleme burada görünecek.", "muted")]);
}
t("#goal-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await g("/me/reading-goal", { method: "PUT", body: JSON.stringify({ goal_year: (/* @__PURE__ */ new Date()).getFullYear(), target_books: Number(t("#goal-target").value) }) }), await D(), f("Yıllık okuma hedefin kaydedildi.");
  } catch (a) {
    f(a.message, !0);
  }
};
function Lt(e) {
  const a = l.alerts.find((i) => i.book_id === e.id);
  t("#alert-book-id").value = e.id, t("#alert-title").textContent = e.title, t("#target-price").value = a ? a.target_price_minor / 100 : "", t("#alert-dialog").showModal();
}
t("#alert-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await g("/me/price-alerts", { method: "PUT", body: JSON.stringify({ book_id: t("#alert-book-id").value, target_price_minor: Math.round(Number(t("#target-price").value) * 100), currency: "TRY", is_active: !0 }) }), t("#alert-dialog").close(), await D(), f("Fiyat alarmın kuruldu.");
  } catch (a) {
    f(a.message, !0);
  }
};
function ye() {
  const e = l.alerts.length ? l.alerts.map((i) => {
    const r = n("div", "", "alert-row"), s = n("div"), o = n("div", "", "price-pair");
    s.append(n("strong", i.title), n("p", i.author || "", "muted")), o.append(n("span", `Hedef ${N(i.target_price_minor, i.currency)}`), n("b", `Güncel ${N(i.current_price_minor, i.currency)}`)), s.append(o);
    const c = n("button", "Sil", "ghost");
    return c.onclick = async () => {
      await g(`/me/price-alerts/${encodeURIComponent(i.book_id)}`, { method: "DELETE" }), await D();
    }, r.append(s, c), r;
  }) : [n("p", "Henüz fiyat alarmı kurmadın. Katalogdan bir kitap seçebilirsin.", "muted")];
  t("#alerts-list").replaceChildren(...e);
  const a = l.notifications.length ? l.notifications.map((i) => {
    const r = n("div", "", `notification-row${i.read_at ? "" : " unread"}`), s = n("div");
    if (s.append(n("strong", i.title), n("p", i.body, "muted"), n("small", new Date(i.created_at).toLocaleString("tr-TR"), "muted")), i.read_at)
      r.append(s);
    else {
      const o = n("button", "Okundu", "ghost");
      o.onclick = () => Dt(i.id), r.append(s, o);
    }
    return r;
  }) : [n("p", "Yeni bildirim yok.", "muted")];
  t("#notifications-list").replaceChildren(...a);
}
function Et(e) {
  const a = "=".repeat((4 - e.length % 4) % 4), i = atob((e + a).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...i].map((r) => r.charCodeAt(0)));
}
async function Mt() {
  const e = t("#enable-push");
  if (!(!e || !("serviceWorker" in navigator) || !("PushManager" in window)))
    try {
      const a = await g("/notifications/capabilities");
      if (!a.push || !a.vapid_public_key) return;
      e.classList.remove("hidden"), e.onclick = async () => {
        e.disabled = !0;
        try {
          const i = await navigator.serviceWorker.ready;
          if (await Notification.requestPermission() !== "granted") throw new Error("Bildirim izni verilmedi.");
          const s = await i.pushManager.subscribe({ userVisibleOnly: !0, applicationServerKey: Et(a.vapid_public_key) }), o = s.toJSON();
          await g("/me/push-subscriptions", { method: "POST", body: JSON.stringify({ endpoint: o.endpoint, p256dh: o.keys.p256dh, auth: o.keys.auth }) }), e.textContent = "Push açık", f("Push bildirimleri açıldı.");
        } catch (i) {
          f(i.message, !0);
        } finally {
          e.disabled = !1;
        }
      };
    } catch {
    }
}
function Pt(e, a) {
  return a > 0 ? Math.max(0, Math.min(100, Math.round(Number(e || 0) / a * 100))) : 0;
}
function At(e, a, i, r, s = "green") {
  const o = n("div", "", `donut-chart tone-${s}`), c = n("div"), p = n("div", "", "donut-copy");
  o.style.setProperty("--value", `${a}%`), c.append(n("strong", `%${a}`), n("small", "tam")), o.append(c), p.append(n("b", i), n("p", r, "muted")), e.replaceChildren(o, p);
}
function Ot(e, a) {
  const i = Math.max(1, ...a.map((r) => Number(r.value || 0)));
  e.replaceChildren(...a.map((r) => {
    const s = n("div", "", "compact-bar-row"), o = n("div"), c = n("div", "", "compact-bar-track"), p = n("i");
    return o.append(n("span", r.label), n("b", r.value)), p.style.width = `${Number(r.value || 0) / i * 100}%`, p.className = r.tone || "", c.append(p), s.append(o, c), s;
  }));
}
function Ye(e, a, i, r = "green") {
  const s = n("article", "", "card metric admin-kpi"), o = n("span", i, `admin-kpi-icon tone-${r}`), c = n("div", "", "admin-kpi-copy");
  return o.setAttribute("aria-hidden", "true"), c.append(n("span", a), n("b", e)), s.append(o, c), s;
}
async function Fe() {
  const e = t("#quality-metrics");
  e.replaceChildren(n("p", "Kalite metrikleri yükleniyor…", "muted"));
  try {
    const a = await g("/admin/quality"), i = Number(a.books || 0), r = Math.max(0, i - Number(a.missing_covers || 0)), s = [[i, "Katalog", "▦", "green"], [a.verified_turkish_editions, "Doğrulanmış baskı", "◇", "green"], [a.zero_result_queries, "Sonuçsuz arama", "⌕", "red"], [`${a.average_latency_ms} ms`, "Ortalama yanıt", "◷", "blue"]];
    e.replaceChildren(...s.map((p) => Ye(...p))), At(t("#catalog-health-chart"), Pt(r, i), "Kapak bütünlüğü", `${r} / ${i} kitapta kapak mevcut`), Ot(t("#catalog-risk-chart"), [{ label: "Eksik kapak", value: a.missing_covers, tone: "amber" }, { label: "Tekrar eser", value: a.duplicate_works, tone: "blue" }, { label: "Şüpheli kayıt", value: a.suspicious_records, tone: "red" }]);
    const o = Object.entries(a.feedback || {}), c = Math.max(1, ...o.map(([, p]) => p));
    t("#quality-feedback").replaceChildren(...o.length ? o.map(([p, u]) => {
      const d = n("div", "", "bar-row"), m = n("header"), y = n("div", "", "bar"), h = n("i");
      return m.append(n("span", p), n("b", u)), h.style.width = `${u / c * 100}%`, y.append(h), d.append(m, y), d;
    }) : [n("p", "Henüz geri bildirim yok.", "muted")]);
  } catch (a) {
    e.replaceChildren(n("p", a.message, "error-line"));
  }
}
async function Dt(e) {
  await g(`/me/notifications/${e}/read`, { method: "PUT" }), await D();
}
t("#read-all").onclick = async () => {
  await g("/me/notifications/read-all", { method: "PUT" }), await D();
};
async function _e() {
  try {
    const [e, a] = await Promise.all([g("/admin/catalog/issues"), g("/admin/catalog/jobs")]);
    t("#catalog-issues").replaceChildren(...e.length ? e.map((i) => {
      const r = n("div", "", "admin-row"), s = n("div"), o = n("div", "", "actions");
      return s.append(n("strong", i.title || i.book_id), n("p", `${i.issue_type} · ${i.severity}`, "muted")), [["Çözüldü", "resolved"], ["Yok say", "dismissed"]].forEach(([c, p]) => {
        const u = n("button", c, "ghost");
        u.onclick = async () => {
          await g(`/admin/catalog/issues/${i.id}`, { method: "PATCH", body: JSON.stringify({ status: p }) }), await _e();
        }, o.append(u);
      }), r.append(s, o), r;
    }) : [n("p", "Açık katalog incelemesi yok.", "muted")]), t("#catalog-jobs").replaceChildren(...a.length ? a.map((i) => n("div", `${i.job_type} · ${i.status} · ${i.attempts}/${i.max_attempts}`, "admin-row")) : [n("p", "Kuyrukta veri işi yok.", "muted")]);
  } catch (e) {
    f(e.message, !0);
  }
}
t("#admin-nav").addEventListener("click", _e);
t("#admin-nav").addEventListener("click", () => Z().catch((e) => f(e.message, !0)));
t("#admin-nav").addEventListener("click", () => Je().catch((e) => f(e.message, !0)));
async function Je() {
  const e = await g("/admin/beta-dashboard?days=30"), a = e.average_rating == null ? "—" : `${Number(e.average_rating).toFixed(1)}/10`;
  t("#admin-beta-metrics").replaceChildren(...[[e.active_users, "Aktif beta kullanıcısı"], [e.onboarding_completed, "Onboarding tamamlayan"], [e.feedback_count, "Geri bildirim"], [a, "Ortalama puan"]].map(([s, o]) => {
    const c = n("div", "", "beta-metric");
    return c.append(n("strong", s), n("span", o)), c;
  }));
  const i = { session_started: "Oturum", view_opened: "Görünüm", onboarding_started: "Onboarding başlangıcı", onboarding_completed: "Onboarding tamamlandı", notification_opt_in: "Bildirim izni" }, r = Object.entries(e.events || {}).map(([s, o]) => ({ label: i[s] || s.replaceAll("_", " "), value: Number(o || 0), tone: s.includes("completed") ? "green" : "blue" })).sort((s, o) => o.value - s.value);
  t("#admin-beta-events").replaceChildren(...r.length ? r.map((s) => {
    const o = Math.max(1, ...r.map((m) => m.value)), c = n("div", "", "compact-bar-row"), p = n("div"), u = n("div", "", "compact-bar-track"), d = n("i", "", s.tone);
    return p.append(n("span", s.label), n("b", s.value)), d.style.width = `${s.value / o * 100}%`, u.append(d), c.append(p, u), c;
  }) : [n("p", "Henüz davranış olayı yok.", "muted")]), t("#admin-beta-feedback").replaceChildren(...(e.recent_feedback || []).length ? e.recent_feedback.slice(0, 5).map((s) => {
    const o = n("div", "", "admin-row beta-feedback-row"), c = n("div"), p = [s.category, s.rating == null ? null : `${s.rating}/10`, new Date(s.created_at).toLocaleDateString("tr-TR")].filter(Boolean).join(" · ");
    return c.append(n("strong", p), n("p", s.message, "muted")), o.append(c), o;
  }) : [n("p", "Henüz beta geri bildirimi yok.", "muted")]);
}
async function Z() {
  var ee;
  if (l.user.app_role !== "admin") {
    t("#admin-social-metrics").replaceChildren(n("p", "Topluluk yönetimi yalnızca adminlere açıktır.", "muted"));
    return;
  }
  const e = t("#admin-user-search").value.trim(), a = e ? `?q=${encodeURIComponent(e)}` : "", [i, r, s, o, c] = await Promise.all([g("/admin/dashboard"), g("/admin/logs?limit=30"), g(`/admin/users${a}`), g("/admin/community/reports?status=open"), g("/admin/metrics")]), p = ((ee = c.routes) == null ? void 0 : ee["/auth/login"]) || {}, u = c.business || {}, d = [[i.users, "Toplam kullanıcı", "♙", "amber"], [i.verified_users, "Doğrulanmış", "◇", "green"], [i.banned_users, "Banlı hesap", "♙", "green"], [o.length, "Açık şikâyet", "⚑", "amber"]];
  t("#admin-social-metrics").replaceChildren(...d.map((k) => Ye(...k)));
  const m = [{ label: "Kullanıcı", value: i.users, tone: "green" }, { label: "Yorum", value: i.comments, tone: "amber" }, { label: "Yıldız", value: i.ratings, tone: "blue" }, { label: "Teklif", value: i.offers, tone: "purple" }], y = Math.max(1, ...m.map((k) => Number(k.value || 0)));
  t("#admin-community-chart").replaceChildren(...m.map((k) => {
    const x = n("div", "", "chart-column"), C = n("div", "", "chart-bar-slot"), E = n("i", "", `tone-${k.tone}`), O = Number(k.value || 0);
    return E.style.setProperty("--height", O ? `${Math.max(7, O / y * 100)}%` : "0%"), C.append(E), x.append(n("b", k.value), C, n("span", k.label)), x;
  }));
  const h = Math.round(Number(u.login_failure_rate || 0) * 100), b = Math.max(0, 100 - h), v = Number(p.p95_ms || 0), w = Number(u.suspicious_login_attempts || 0), $ = c.alerts || [];
  t("#admin-alert-count").textContent = `${$.length} uyarı`, t("#admin-alert-count").className = `status-chip ${$.length ? "status-warn" : "status-good"}`, t("#admin-ops-health").replaceChildren(...[[`${b}%`, "Giriş başarısı", b, "green"], [`${v} ms`, "Giriş P95", Math.min(100, v / 1500 * 100), v >= 1500 ? "red" : "blue"], [w, "Şüpheli giriş", Math.min(100, w / 10 * 100), w >= 10 ? "red" : "amber"]].map(([k, x, C, E]) => {
    const O = n("div", "", "ops-item"), R = n("div", "", "ops-track"), te = n("i", "", `tone-${E}`);
    return te.style.width = `${C}%`, R.append(te), O.append(n("strong", k), n("span", x), R), O;
  }));
  const S = i.top_books || [], A = Math.max(1, ...S.map((k) => Number(k.rating_count || 0)));
  t("#admin-top-books").replaceChildren(...S.length ? S.slice(0, 6).map((k, x) => {
    const C = n("div", "", "rank-row"), E = n("div"), O = n("div", "", "rank-track"), R = n("i");
    return E.append(n("span", `${x + 1}`, "rank-number"), n("b", k.title), n("small", `★ ${Number(k.rating_average || 0).toFixed(1)} · ${k.rating_count}`)), R.style.width = `${Math.max(4, Number(k.rating_count || 0) / A * 100)}%`, O.append(R), C.append(E, O), C;
  }) : [n("p", "Henüz topluluk puanı yok.", "muted")]);
  const _ = { success: 0, warning: 0, error: 0 };
  r.forEach((k) => {
    const x = Number(k.status_code || 0);
    k.level === "error" || x >= 500 ? _.error++ : k.level === "warning" || x >= 400 ? _.warning++ : _.success++;
  });
  const T = Math.max(1, r.length), L = n("div", "", "log-stack");
  Object.entries(_).forEach(([k, x]) => {
    const C = n("i", "", k);
    C.style.width = `${x / T * 100}%`, L.append(C);
  });
  const B = n("div", "", "log-legend");
  [["success", "Başarılı"], ["warning", "Uyarı"], ["error", "Hata"]].forEach(([k, x]) => B.append(n("span", `${x} ${_[k]}`, k))), t("#admin-log-chart").replaceChildren(L, B), t("#system-logs").replaceChildren(...r.length ? r.slice(0, 6).map((k) => {
    const x = n("div", "", `admin-row log-${k.level}`);
    return x.append(n("strong", `${k.status_code || "—"} ${k.route || k.event_type}`), n("small", `${k.duration_ms || 0} ms`)), x;
  }) : [n("p", "Henüz sistem kaydı yok.", "muted")]), t("#admin-users").replaceChildren(...s.length ? s.map((k) => {
    const x = n("div", "", "admin-row"), C = n("div"), E = n("button", "Yönet", "ghost");
    return C.append(n("strong", `${k.display_name}${k.is_verified ? " ✓" : ""}`), n("p", `${k.app_role || "user"} · ${k.is_banned ? "BANLI" : k.rating_count || "0 puan, " + (k.comment_count || 0) + " yorum"}`, "muted")), E.onclick = () => Nt(k), x.append(C, E), x;
  }) : [n("p", "Kullanıcı bulunamadı.", "muted")]), t("#report-queue-count").textContent = `${o.length} açık`, t("#admin-reports").replaceChildren(...o.length ? o.map((k) => {
    var R;
    const x = n("div", "", "admin-row"), C = n("div"), E = n("div", "", "actions"), O = k.content || ((R = k.comment) == null ? void 0 : R.content) || "";
    return C.append(n("strong", k.reason), n("p", O, "muted")), [["İncele", "reviewing", null], ["Kaldır", "resolved", "removed"], ["Reddet", "dismissed", null]].forEach(([te, We, Qe]) => {
      const ae = n("button", te, "ghost");
      ae.onclick = async () => {
        ae.disabled = !0;
        try {
          await g(`/admin/community/reports/${k.id}`, { method: "PATCH", body: JSON.stringify({ status: We, comment_status: Qe }) }), await Z();
        } finally {
          ae.disabled = !1;
        }
      }, E.append(ae);
    }), x.append(C, E), x;
  }) : [n("p", "Açık yorum şikâyeti yok.", "muted")]);
}
async function we() {
  const [e, a] = await Promise.all([g("/admin/pipelines/runs?limit=20"), g("/admin/pipelines/logs?limit=30")]), i = e[0];
  t("#pipeline-summary").replaceChildren(...i ? [["Durum", i.status], ["Kontrol", i.checked_count], ["Başarılı", i.success_count], ["Hata", i.failure_count]].map(([r, s]) => {
    const o = n("div", "", "pipeline-stat");
    return o.append(n("small", r), n("strong", s)), o;
  }) : [n("p", "Henüz pipeline çalışması yok.", "muted")]), t("#pipeline-runs").replaceChildren(...e.length ? e.map((r) => {
    const s = n("button", "", `admin-row pipeline-run status-${r.status}`);
    return s.type = "button", s.append(n("strong", `${r.job_type} · ${r.status}`), n("small", `${new Date(r.started_at).toLocaleString("tr-TR")} · ${r.success_count}/${r.checked_count}`)), s.onclick = async () => Pe(await g(`/admin/pipelines/logs?run_id=${encodeURIComponent(r.id)}&limit=100`)), s;
  }) : [n("p", "Henüz çalışma yok.", "muted")]), Pe(a);
}
function Pe(e) {
  t("#pipeline-logs").replaceChildren(...e.length ? e.map((a) => {
    const i = n("div", "", `admin-row pipeline-log log-${a.level}`);
    return i.append(n("strong", `${a.stage} · ${a.message}`), n("small", new Date(a.created_at).toLocaleString("tr-TR"))), i;
  }) : [n("p", "Pipeline logu yok.", "muted")]);
}
t("#admin-nav").addEventListener("click", () => we().catch((e) => f(e.message, !0)));
t("#admin-refresh").onclick = async () => {
  const e = t("#admin-refresh");
  e.disabled = !0, e.innerHTML = '<span aria-hidden="true">↻</span> Yenileniyor…';
  try {
    await Promise.all([Fe(), Z(), Je(), we()]), f("Yönetim verileri güncellendi.");
  } catch (a) {
    f(a.message, !0);
  } finally {
    e.disabled = !1, e.innerHTML = '<span aria-hidden="true">↻</span> Verileri yenile';
  }
};
t("#run-price-pipeline").onclick = async () => {
  const e = t("#run-price-pipeline");
  e.disabled = !0, e.textContent = "Başlatılıyor…";
  try {
    const a = `price-refresh:admin:${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}:${Date.now()}`;
    await g("/admin/pipelines/prices", { method: "POST", body: JSON.stringify({ idempotency_key: a, limit: 20, discover_books: 5, retailers: ["kitapsec", "kitapsepeti", "bkmkitap"], refresh_existing: !0 }) }), f("Fiyat hattı arka planda başlatıldı."), setTimeout(() => we().catch((i) => f(i.message, !0)), 1200);
  } catch (a) {
    f(a.message, !0);
  } finally {
    e.disabled = !1, e.textContent = "Şimdi çalıştır";
  }
};
let M = null;
function Nt(e) {
  M = { ...e }, t("#admin-user-id").value = e.id, t("#admin-user-title").textContent = e.display_name, t("#admin-user-verified").checked = !!e.is_verified, t("#admin-user-label").value = e.verification_label || "", t("#admin-user-banned").checked = !!e.is_banned, t("#admin-user-ban-reason").value = e.ban_reason || "", t("#admin-user-ban-days").value = "", t("#admin-user-error").textContent = "", t("#admin-user-dialog").showModal();
}
t("[data-close-admin-user]").onclick = () => t("#admin-user-dialog").close();
t("#admin-user-form").onsubmit = async (e) => {
  e.preventDefault();
  const a = e.submitter || e.currentTarget.querySelector('[type="submit"]'), i = t("#admin-user-error"), r = t("#admin-user-id").value, s = t("#admin-user-verified").checked, o = t("#admin-user-label").value.trim(), c = t("#admin-user-banned").checked, p = t("#admin-user-ban-reason").value.trim(), u = t("#admin-user-ban-days").value, d = s !== !!(M != null && M.is_verified) || o !== ((M == null ? void 0 : M.verification_label) || ""), m = c !== !!(M != null && M.is_banned) || c && (p !== ((M == null ? void 0 : M.ban_reason) || "") || !!u);
  if (i.textContent = "", c && !p) {
    i.textContent = "Ban nedeni zorunludur.";
    return;
  }
  if (!d && !m) {
    i.textContent = "Kaydedilecek bir değişiklik yok.";
    return;
  }
  a.disabled = !0, a.textContent = "Kaydediliyor…";
  try {
    d && await g(`/admin/users/${r}/verification`, { method: "PATCH", body: JSON.stringify({ verified: s, label: s && o ? o : null }) }), m && await g(`/admin/users/${r}/ban`, { method: "PATCH", body: JSON.stringify({ banned: c, reason: c ? p : null, duration_days: c && u ? Number(u) : null }) }), t("#admin-user-dialog").close(), await Z(), f("Kullanıcı ayarları güncellendi.");
  } catch (y) {
    i.textContent = y.message, f(y.message, !0);
  } finally {
    a.disabled = !1, a.textContent = "Kaydet";
  }
};
let Ae;
t("#admin-user-search").oninput = () => {
  clearTimeout(Ae), Ae = setTimeout(() => Z().catch((e) => f(e.message, !0)), 250);
};
t("#run-evaluation").onclick = async () => {
  const e = t("#run-evaluation");
  e.disabled = !0, t("#evaluation-results").textContent = "Kalite testleri çalışıyor…";
  try {
    const a = await g("/admin/evaluations/recommendations", { method: "POST", body: "{}" }), i = a.summary;
    t("#evaluation-results").replaceChildren(n("strong", `nDCG@10: ${i.ndcg_at_10} · P@5: ${i.precision_at_5}`), n("p", `${i.passed}/${i.cases} senaryo geçti · ${i.violation_count} kural ihlali`, "muted"));
  } catch (a) {
    f(a.message, !0);
  } finally {
    e.disabled = !1;
  }
};
t("#queue-quality-scan").onclick = async () => {
  try {
    await g("/admin/catalog/jobs", { method: "POST", body: JSON.stringify({ job_type: "quality_scan", limit: 200 }) }), await _e(), f("Kalite taraması kuyruğa eklendi.");
  } catch (e) {
    f(e.message, !0);
  }
};
let Oe = !1;
function G(e, a, i = [], r = !0) {
  const s = n("div", a, `chat-message ${e}`);
  if (i.length) {
    const o = n("div", "", "chat-books");
    i.forEach((c) => o.append(n("div", `${c.title} · ${c.author}`, "chat-book"))), s.append(o);
  }
  t("#chat-messages").append(s), t("#chat-messages").scrollTop = t("#chat-messages").scrollHeight, r && (l.chatHistory.push({ role: e, content: a }), l.chatHistory = l.chatHistory.slice(-8));
}
function Y(e) {
  t("#chat-suggestions").replaceChildren(...e.map((a) => {
    const i = n("button", a);
    return i.type = "button", i.onclick = () => Ve(a), i;
  }));
}
async function $e() {
  try {
    const e = await g("/me/chat/sessions"), a = t("#chat-session-select");
    a.replaceChildren(new Option("Yeni konuşma", ""), ...e.map((i) => new Option(i.title, i.id))), a.value = l.chatSessionId || "", t("#chat-delete").disabled = !l.chatSessionId;
  } catch (e) {
    f(e.message, !0);
  }
}
function xe() {
  l.chatSessionId = null, l.chatHistory = [], t("#chat-messages").replaceChildren(), G("assistant", "Yeni bir konuşma başladı. Nasıl bir kitap aradığını anlatabilirsin.", [], !1), Y(["Kısa ve atmosferik bir roman", "Şu an ne okuyorum?"]), t("#chat-session-select").value = "", t("#chat-delete").disabled = !0;
}
async function zt(e) {
  if (!e) {
    xe();
    return;
  }
  try {
    const a = await g(`/me/chat/sessions/${encodeURIComponent(e)}/messages`);
    l.chatSessionId = e, l.chatHistory = [], t("#chat-messages").replaceChildren(), a.forEach((i) => G(i.role, i.content, i.books || [], !0)), t("#chat-delete").disabled = !1, Y(["Konuşmaya devam et", "Benzer kitaplar bul"]);
  } catch (a) {
    f(a.message, !0);
  }
}
t("#chat-session-select").onchange = (e) => zt(e.target.value);
t("#chat-new").onclick = xe;
t("#chat-delete").onclick = async () => {
  if (!(!l.chatSessionId || !confirm("Bu konuşma ve mesajları silinsin mi?")))
    try {
      await g(`/me/chat/sessions/${encodeURIComponent(l.chatSessionId)}`, { method: "DELETE" }), xe(), await $e(), f("Konuşma silindi.");
    } catch (e) {
      f(e.message, !0);
    }
};
function Rt() {
  Oe || (Oe = !0, G("assistant", "Merhaba! Kitaplar, yazarlar ve edebî kavramlar hakkında konuşabilir; ekrandaki sonuçları yorumlayabilir ve okuma yolculuğuna eşlik edebilirim.", [], !1), Y(["Ekrandaki kitapları karşılaştır", "Roman ile novella farkı nedir?", "Yıllık hedefim nasıl gidiyor?"]), $e(), I());
}
t("#chat-toggle").onclick = () => {
  const e = t("#chat-panel").classList.toggle("hidden") === !1;
  t("#chat-toggle").setAttribute("aria-expanded", String(e)), t("#chat-toggle").setAttribute("aria-label", e ? "Kitap asistanını kapat" : "Kitap asistanını aç"), e && t("#chat-input").focus();
};
t("#chat-close").onclick = () => {
  t("#chat-panel").classList.add("hidden"), t("#chat-toggle").setAttribute("aria-expanded", "false"), t("#chat-toggle").setAttribute("aria-label", "Kitap asistanını aç"), t("#chat-toggle").focus();
};
function It() {
  var e;
  return ((e = t(".view:not(.hidden)")) == null ? void 0 : e.id.replace("-view", "")) || "discover";
}
function Kt(e, a) {
  const i = l.books.find((r) => r.id === e.id || r.title === e.book_title || r.title === e.title);
  return { id: e.id || (i == null ? void 0 : i.id) || null, title: e.title || e.book_title, author: e.author || (i == null ? void 0 : i.author) || "Bilinmeyen yazar", genre: e.genre || (i == null ? void 0 : i.genre) || "Genel", position: a };
}
function je() {
  const e = It();
  let a = [], i = null;
  return e === "discover" && !t("#recommendations-panel").classList.contains("hidden") ? (a = l.lastRecommendations, i = l.lastDiscoveryQuery) : e === "catalog" ? (a = l.catalog.items, i = t("#catalog-search").value.trim() || null) : e === "library" && (a = qe()), { view: e, query: i, books: a.slice(0, 10).map((r, s) => Kt(r, s + 1)) };
}
function Ce(e, a = !1) {
  const i = t("#chat-context");
  i && (i.classList.toggle("loading", a), i.querySelector("span").textContent = e);
}
function I() {
  if (!t("#chat-context")) return;
  const e = je(), a = { discover: "eşleştirme", catalog: "katalog", library: "kitaplık", insights: "okuma analizi", alerts: "fiyat alarmı", quality: "kalite" };
  Ce(e.books.length ? `${e.books.length} ${a[e.view]} kitabı bu sohbete bağlı.` : `${a[e.view]} ekranını görebiliyorum.`);
}
let de = !1;
async function Ve(e) {
  const a = e.trim();
  if (a.length < 2 || de) return;
  de = !0;
  const i = l.chatHistory.slice(-8), r = je(), s = t("#chat-input"), o = t("#chat-form button"), c = new AbortController(), p = setTimeout(() => c.abort(), 3e4);
  G("user", a), s.value = "", s.disabled = !0, o.disabled = !0, Y([]), Ce("Yanıt hazırlanıyor…", !0);
  const u = n("div", r.books.length ? "Ekrandaki kitapları ve konuşmayı inceliyorum…" : "Pusula düşünüyor…", "chat-typing");
  u.setAttribute("role", "status"), t("#chat-messages").append(u), t("#chat-messages").scrollTop = t("#chat-messages").scrollHeight;
  try {
    const d = await g("/me/chat", { method: "POST", signal: c.signal, body: JSON.stringify({ message: a, history: i, active_view_context: r, session_id: l.chatSessionId }) });
    l.chatSessionId = d.session_id, u.remove(), G("assistant", d.answer || "Yanıt oluşturulamadı.", d.books || []), Y(d.suggestions || []), d.pending_action && await window.BookPusulasiUI.confirmAction(d.pending_action) && (await D(), G("assistant", "İşlem onayından sonra güvenle tamamlandı.", [], !1), f("Asistan işlemi tamamladı."));
  } catch (d) {
    G("assistant", d.message || "Asistan yanıtı tamamlanamadı."), Y(["Tekrar dene", "Şu an ne okuyorum?"]);
  } finally {
    clearTimeout(p), u.remove(), de = !1, s.disabled = !1, o.disabled = !1, I(), s.focus();
  }
}
t("#chat-form").onsubmit = (e) => {
  e.preventDefault(), Ve(t("#chat-input").value).finally($e);
};
let De = !1;
function Bt() {
  if (De) return;
  const e = t("#ambient-canvas"), a = e == null ? void 0 : e.parentElement;
  if (!e || !a) return;
  De = !0;
  const i = e.getContext("2d"), r = matchMedia("(prefers-reduced-motion: reduce)").matches, s = ["#08745a", "#d59a45", "#315f73", "#9a5751", "#907c5b", "#3f9278"];
  let o = 0, c = 0;
  const p = Array.from({ length: 12 }, (y, h) => ({ angle: h / 12 * Math.PI * 2 + 0.18, orbit: h % 3 === 0 ? 1 : 0, speed: (h % 2 ? 1 : -1) * (55e-6 + h * 2e-6), w: 14 + h % 3 * 2, h: 31 + h % 4 * 3, color: s[h % s.length], tilt: (h % 5 - 2) * 0.045 }));
  function u() {
    const y = a.getBoundingClientRect(), h = Math.min(devicePixelRatio || 1, 2);
    o = y.width, c = y.height, e.width = Math.max(1, Math.round(o * h)), e.height = Math.max(1, Math.round(c * h)), i.setTransform(h, 0, 0, h, 0, 0), r && m(performance.now());
  }
  function d(y, h, b, v, w, $ = []) {
    i.save(), i.strokeStyle = `rgba(8,116,90,${w})`, i.lineWidth = 1, i.setLineDash($), i.beginPath(), i.ellipse(y, h, b, v, -0.13, 0, Math.PI * 2), i.stroke(), i.restore();
  }
  function m(y) {
    i.clearRect(0, 0, o, c);
    const h = o / 2, b = c / 2;
    d(h, b, o * 0.31, c * 0.25, 0.17, [4, 7]), d(h, b, o * 0.41, c * 0.34, 0.09, [2, 10]), i.save(), i.fillStyle = "rgba(8,116,90,.16)", [[0.12, 0.2], [0.87, 0.3], [0.17, 0.78], [0.82, 0.82]].forEach(([v, w]) => {
      i.beginPath(), i.arc(o * v, c * w, 2.2, 0, Math.PI * 2), i.fill();
    }), i.restore(), p.forEach((v) => {
      const w = v.angle + (r ? 0 : y * v.speed), $ = v.orbit === 1, S = o * ($ ? 0.39 : 0.3), A = c * ($ ? 0.31 : 0.23), _ = (Math.sin(w) + 1) / 2, T = h + Math.cos(w) * S, L = b + Math.sin(w) * A, B = 0.76 + _ * 0.28;
      i.save(), i.translate(T, L), i.rotate(v.tilt + Math.cos(w) * 0.09), i.scale(B, B), i.globalAlpha = 0.68 + _ * 0.28, i.shadowColor = "rgba(13,49,38,.18)", i.shadowBlur = 12, i.shadowOffsetY = 7, i.fillStyle = v.color, i.beginPath(), i.roundRect(-v.w / 2, -v.h / 2, v.w, v.h, 3), i.fill(), i.strokeStyle = "rgba(255,255,255,.28)", i.lineWidth = 0.8, i.stroke(), i.fillStyle = "rgba(255,255,255,.55)", i.fillRect(-v.w / 2 + 2.5, -v.h / 2 + 4, 1.2, v.h - 8), i.fillStyle = "rgba(255,255,255,.35)", i.fillRect(-v.w / 2 + 5, -v.h / 2 + 7, v.w - 7, 1), i.restore();
    }), i.globalAlpha = 1, r || requestAnimationFrame(m);
  }
  new ResizeObserver(u).observe(a), u(), r || requestAnimationFrame(m);
}
document.addEventListener("click", (e) => {
  e.target.closest(".shelf-picker") || P(".shelf-picker[open]").forEach((a) => a.open = !1);
});
document.addEventListener("keydown", (e) => {
  e.key === "Escape" && (P(".shelf-picker[open]").forEach((a) => a.open = !1), t("#chat-panel").classList.contains("hidden") || t("#chat-close").click());
});
"serviceWorker" in navigator && location.protocol !== "file:" && window.addEventListener("load", () => navigator.serviceWorker.register("/static/service-worker.js").catch(() => {
}));
async function Ht() {
  at();
  try {
    const e = await g("/me/bootstrap");
    Object.assign(l, e), await Ie(!0);
  } catch (e) {
    e.status !== 401 && f("Oturum doğrulanamadı. Giriş yaparak devam edebilirsin.", !0);
  }
}
let Ne = !1;
function qt() {
  Ne || (Ne = !0, Ze(), Ht());
}
export {
  qt as initializeAppShell
};
