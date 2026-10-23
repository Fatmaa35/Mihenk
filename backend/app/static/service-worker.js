const CACHE = 'mihenk-shell-v38';
const SHELL = ['/', '/static/manifest.webmanifest', '/static/brand/favicon.png', '/static/brand/mark-light.webp', '/static/brand/mark-dark.webp', '/static/pwa-icon-192.png', '/static/pwa-icon-512.png'];
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
  // Uygulama rotaları (/bugun, /kesfet …) aynı HTML kabuğunu kullanır; çevrimdışıyken önbellekteki kabuk açılır.
  if (event.request.mode === 'navigate' && !url.pathname.startsWith('/me/') && !url.pathname.startsWith('/admin')) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
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
