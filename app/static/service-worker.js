const CACHE = 'mihenk-shell-v20';
const PRIVATE_CACHE = 'mihenk-private-v1';
const SHELL = ['/', '/static/styles.css?v=20260820_chat_v8', '/static/app.js?v=20260820_chat_v8', '/static/generated/product-ui.css?v=20260820_qr_v7', '/static/generated/product-ui.js?v=20260820_qr_v7', '/static/brand-logo.svg', '/static/landing-hero.webp', '/static/favicon.svg', '/static/manifest.webmanifest', '/static/pwa-icon-192.png', '/static/pwa-icon-512.png', '/static/themes/cozy-study.webp', '/static/themes/rainy-window.webp', '/static/themes/quiet-library.webp', '/static/themes/forest-retreat.webp', '/static/themes/sunny-desk.webp', '/static/themes/sea-sunset.webp', '/static/themes/turquoise-cove.webp', '/static/themes/moonlit-sea.webp'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
    })));
    return;
  }
  if (url.pathname === '/me/profile') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) caches.open(PRIVATE_CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  if (url.pathname === '/' || url.pathname === '/catalog/books' || url.pathname === '/books') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
    }).catch(() => caches.match(event.request).then(hit => hit || caches.match('/'))));
  }
});
self.addEventListener('message', event => {
  if (event.data?.type === 'CLEAR_PRIVATE_CACHE') event.waitUntil(caches.delete(PRIVATE_CACHE));
});
