const CACHE = 'mihenk-shell-v33';
const SHELL = ['/', '/static/styles.css?v=20260904_beta_admin', '/static/generated/product-ui.css?v=20260826_release_v2', '/static/generated/product-ui.js?v=20260826_release_v2', '/static/brand-logo.svg', '/static/landing-hero.webp', '/static/favicon.svg', '/static/manifest.webmanifest', '/static/pwa-icon-192.png', '/static/pwa-icon-512.png', '/static/themes/cozy-study.webp', '/static/themes/rainy-window.webp', '/static/themes/quiet-library.webp', '/static/themes/forest-retreat.webp', '/static/themes/sunny-desk.webp', '/static/themes/sea-sunset.webp', '/static/themes/turquoise-cove.webp', '/static/themes/moonlit-sea.webp'];
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
  if (url.pathname === '/' || url.pathname === '/catalog/books' || url.pathname === '/books') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
    }).catch(() => caches.match(event.request).then(hit => hit || caches.match('/'))));
  }
});
self.addEventListener('push', event => {
  let payload = {title: 'Mihenk', body: 'Okuma hatırlatıcın hazır.', url: '/'};
  try { payload = {...payload, ...event.data.json()}; } catch {}
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body, icon: '/static/pwa-icon-192.png', badge: '/static/favicon.svg',
    data: {url: payload.url || '/'}, tag: 'mihenk-reading-reminder'
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(windows => {
    const existing = windows.find(client => client.url.startsWith(self.location.origin));
    return existing ? existing.focus().then(() => existing.navigate(target)) : clients.openWindow(target);
  }));
});
