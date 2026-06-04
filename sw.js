// sw.js — KreditProfi Deutschland Service Worker
// Stratégie : Network-first pour les pages, Cache-first pour les assets statiques

const CACHE_NAME    = 'kreditprofi-v1';
const OFFLINE_URL   = '/offline.html';

// Assets à précacher au premier chargement
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/css/main.css',
  '/assets/css/components.css',
  '/assets/css/layout.css',
  '/assets/css/responsive.css',
  '/assets/css/loader.css',
  '/assets/js/config.js',
  '/assets/js/api.js',
  '/assets/js/ui.js',
  '/assets/js/loader.js',
  '/favicon.svg',
  '/manifest.json'
];

// ── Installation : précacher les assets essentiels ──────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.warn('[SW] Precache partiel:', err.message));
    }).then(() => self.skipWaiting())
  );
});

// ── Activation : nettoyer les vieux caches ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie par type de ressource ─────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes API, les ressources externes, non-GET
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (!url.origin.includes(self.location.origin) &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) return;

  // Fonts Google → Cache-first avec fallback
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.match(request).then(cached => cached ||
        fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Assets statiques (CSS, JS, images, fonts) → Cache-first
  if (/\.(css|js|woff2?|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Pages HTML → Network-first avec fallback cache/offline
  if (request.headers.get('accept')?.includes('text/html') ||
      url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then(res => {
          // Mettre en cache si succès
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }
});

// ── Message : forcer la mise à jour ─────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
