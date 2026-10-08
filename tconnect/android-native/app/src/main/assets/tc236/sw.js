// T-Connect — Service Worker (v2.39.5)
// Cache versionado + REDE PRIMEIRO para código (html/js/css/json), para que cada
// publicação chegue aos utilizadores. Imagens/ícones: cache primeiro.
const VERSION = '2.39.5';
const CACHE_NAME = 't-connect-v' + VERSION;
const SCOPE = self.registration.scope;
const abs = p => new URL(p, SCOPE).href;
const APP_SHELL = [
  'guardian/index.html','guardian/css/style.css','guardian/js/app.js','guardian/js/i18n.js','guardian/js/supabase.js','guardian/js/supabase-config.js',
  'js/tc-map-alternative.js','vendor/leaflet/leaflet.js','vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/marker-icon.png','vendor/leaflet/images/marker-icon-2x.png','vendor/leaflet/images/marker-shadow.png','vendor/leaflet/images/layers.png','vendor/leaflet/images/layers-2x.png',
  'assets/terminal-bg.png','assets/icons/tconnect-logo-192.png','assets/icons/tconnect-logo-512.png',
  'assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/icon-maskable-512.png','manifest.webmanifest'
].map(abs);
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Tolerante: um ficheiro em falta não aborta a instalação.
    await Promise.allSettled(APP_SHELL.map(url => cache.add(new Request(url, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('t-connect-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });

function networkFirst(req) {
  return new Promise(resolve => {
    let settled = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true });
    // Rede lenta: se já houver cópia, mostra-a e deixa a rede atualizar a cache.
    const timer = setTimeout(async () => {
      const c = await fromCache();
      if (c && !settled) { settled = true; resolve(c); }
    }, NETWORK_TIMEOUT_MS);
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {}); }
      if (!settled) { settled = true; clearTimeout(timer); resolve(res); }
    }).catch(async () => {
      clearTimeout(timer);
      if (settled) return;
      const c = await fromCache();
      settled = true;
      resolve(c || (req.mode === 'navigate' ? await caches.match(abs('guardian/index.html')) : null) || Response.error());
    });
  });
}

function cacheFirst(req) {
  return caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => Response.error()));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/updates\/t-connect-update\.json$/.test(url.pathname) || /\/sw\.js$/.test(url.pathname)) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req).then(c => c || Response.error())));
    return;
  }
  if (/\.(?:png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname)) { event.respondWith(cacheFirst(req)); return; }
  event.respondWith(networkFirst(req));
});
