/* Анатомия 3D — работа без интернета. Кэш anat-*; чужие кэши (ПДД, шахматы) не трогаем. При обновлении меняйте V. */
const V = 'anat-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'data/structures.json', 'data/notes.js', 'data/questions.js',
  'vendor/three.module.js', 'vendor/three.core.js', 'vendor/OrbitControls.js', 'vendor/GLTFLoader.js', 'vendor/meshopt_decoder.module.js',
  'utils/BufferGeometryUtils.js', 'utils/SkeletonUtils.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'models/skeleton.glb'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('anat-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  }));
});
