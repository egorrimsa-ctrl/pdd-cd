/* Шахматные задачи — работа без интернета.
   Всё приложение (страница, задачи, иконки) лежит в кэше CACHE. При обновлении приложения меняйте номер. */
const CACHE = 'chess-puzzles-2';
const FILES = ['./', 'index.html', 'puzzles.json', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'openings.json', 'sf/stockfish-19-lite-single.js', 'sf/stockfish-19-lite-single.wasm'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

// Удаляем только свои старые кэши: на этом же сайте живёт тренажёр ПДД со своими.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('chess-puzzles-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Страница и задачи: сразу из кэша, свежую версию подтягиваем в фоне для следующего запуска.
  const key = req.mode === 'navigate' ? (url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname) : req;
  e.respondWith(caches.match(key, { ignoreSearch: true }).then(cached => {
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    }).catch(() => cached);
    if (cached) { try { e.waitUntil(net.catch(() => {})); } catch (_) {} return cached; }
    return net;
  }));
});
