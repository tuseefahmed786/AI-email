// Universal Mail service worker.
// Strategy:
//  - App shell (HTML, CSS, JS) → stale-while-revalidate
//  - API GETs (mail list/thread)→ network-first with cache fallback (offline read)
//  - API POSTs (send, action)   → network-only; if offline, queue would go here
//                                  (kept simple for v1; show error to user)
//  - Static assets              → cache-first

const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const SHELL_FILES = ['/', '/offline.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(SHELL_FILES).catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/mail/list') || url.pathname.startsWith('/api/mail/thread')) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.startsWith('/api/')) return; // never cache AI or auth
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request, '/offline.html'));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(req) {
  const cache = await caches.open(RUNTIME);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    return cached || new Response(JSON.stringify({ threads: [], offline: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(req, fallback) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await fetchPromise) || (fallback && cache.match(fallback)) || new Response('offline', { status: 503 });
}
