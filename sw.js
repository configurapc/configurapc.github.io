// Service worker: la web funciona sin conexión con los últimos precios descargados.
// Va primero a la red, así que no hace falta cambiar VERSION en cada publicación (solo si cambias la lista SHELL).
const VERSION = 'v1';
const CACHE = 'configurapc-' + VERSION;
const SHELL = ['./', 'index.html', 'assets/styles.css', 'assets/app.js', 'assets/engine.js', 'assets/hwdb.js', 'assets/config.js',
  'data/components.js', 'assets/fonts/geist.woff2', 'favicon.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('configurapc-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero la red (precios frescos); si no hay conexión, la copia guardada.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
