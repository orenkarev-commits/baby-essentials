// Baby Essentials (public) service worker. Pages and data: network first, so prices are always the latest,
// falling back to the last copy when offline. Icons: cache first.
const VERSION = 'be-pub-20261121T063443Z';
const SHELL = ['./', './index.html', './search.html', './manifest.webmanifest', './data/updated.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req, {cache: 'no-cache'});
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, {ignoreSearch: true});
    if (hit) return hit;
    if (req.mode === 'navigate') { const home = await cache.match('./'); if (home) return home; }
    throw err;
  }
}
async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
  return res;
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(url.pathname.includes('/icons/') ? cacheFirst(req) : networkFirst(req));
});
