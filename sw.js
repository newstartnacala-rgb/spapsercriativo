const CACHE_NAME = 'spap-pdv-v331';
const FICHEIROS = [
  './',
  './index.html',
  './login.html',
  './registo.html',
  './monitor.html',
  './mobile.html',
  './mobile-monitor.html',
  './login-banca.html',
  './registo-banca.html',
  './planos.html',
  './planos-banca.html',
  './banca-tema.js',
  './banca-tema.css',
  './banca-offline.js',
  './spap-premium.css',
  './spap-semzoom.js',
  './spap-recuperar.js',
  './spap-expirou.js',
  './spap-suporte.js',
  './spap-contador.js',
  './spap-alertas.js',
  './spap-leitor.js',
  './spap-migrar.js',
  './spap-dialogo.js',
  './spap-avisos.js',
  './spap-backup.js',
  './spap-imagem.js',
  './spap-carrinho.css',
  './spap-bloqueio.js',
  './app-android.js',
  './supabase-config.js',
  './sw.js',
  './manifest.json',
  './manifest-mobile.json',
  './logo.png',
  './ssteam-logo.png',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js'
];

// Instala e guarda ficheiros em cache (tolerante a falhas)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(FICHEIROS.map(f =>
        cache.add(f).catch(err => console.log('SW: falhou cachear', f))
      ))
    )
  );
  self.skipWaiting();
});

// Activa e limpa caches antigas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Intercepta pedidos
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase API — vai sempre direto à rede. Sem internet, o pedido falha de verdade
  // (assim a app sabe que não foi gravado e guarda na fila do telemóvel).
  if (url.hostname.includes('supabase.co')) { return; }

  // CDN (supabase-js) — cache first
  if (url.hostname.includes('jsdelivr') || url.hostname.includes('cdn')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return r;
      }))
    );
    return;
  }

  // Apps Android (APK + versão) — sempre da rede, nunca da cache
  if (url.pathname.includes('/apps/')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // version.json — NUNCA fazer cache, sempre buscar fresco
  if (url.pathname.includes('version.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() => new Response('{}')));
    return;
  }

  // HTML (navegações) — REDE primeiro (mostra sempre a versão mais recente quando
  // há internet); cai para a cache só quando está offline. Isto garante que as
  // atualizações chegam logo ao ecrã, em vez de ficar preso numa versão antiga.
  const ehHTML = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (ehHTML) {
    e.respondWith(
      // «no-store»: vai SEMPRE buscar a página nova (o GitHub deixa o navegador guardar 10 min)
      fetch(e.request.url, { cache: 'no-store', credentials: 'same-origin' }).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => fetch(e.request)).catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then(cached =>
          cached || caches.match(new URL('index.html', self.registration.scope).href)
        )
      )
    );
    return;
  }

  // Restantes ficheiros (locais e CDN) — cache first, rede como fallback.
  // As chamadas ao Supabase (API) NÃO são cacheadas (são dados ao vivo).
  const ehAPI = url.hostname.includes('supabase.co') || url.pathname.includes('/rest/') || url.pathname.includes('/auth/');
  if (ehAPI) { return; } // deixa passar direto à rede

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }));
    })
  );
});

// Vendas guardadas offline — sincroniza quando voltar internet
self.addEventListener('sync', e => {
  if (e.tag === 'sync-vendas') {
    e.waitUntil(sincronizarVendasOffline());
  }
});

async function sincronizarVendasOffline() {
  // Notifica clientes que estão online novamente
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ tipo: 'online', mensagem: 'A sincronizar vendas...' }));
}

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
