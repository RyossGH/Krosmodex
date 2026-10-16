// Service worker Krosmodex : garde l'appli en cache pour qu'elle s'ouvre sans réseau.
// Changer VERSION à chaque publication pour que les iPhone récupèrent la nouvelle version.
const VERSION = 'krosmodex-5';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'sets.js', 'cards.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== IMG_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Images des cartes (nokazu.fr) : gardées dans un cache à part, pour les revoir hors ligne.
const IMG_CACHE = 'krosmodex-images';
const IMG_MAX = 800;

async function cardImage(request) {
  const cache = await caches.open(IMG_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const resp = await fetch(request);
  if (resp.ok || resp.type === 'opaque') {
    await cache.put(request, resp.clone());
    const keys = await cache.keys();
    for (const k of keys.slice(0, Math.max(0, keys.length - IMG_MAX))) await cache.delete(k);
  }
  return resp;
}

// réseau d'abord (pour avoir la dernière version), cache si hors ligne
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === 'GET' && url.hostname === 'nokazu.fr' && url.pathname.startsWith('/images/')) {
    e.respondWith(cardImage(e.request));
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then((resp) => {
    if (resp.ok) { const copy = resp.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return resp;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('./'))));
});
