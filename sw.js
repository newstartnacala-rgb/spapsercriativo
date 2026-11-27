const CACHE_NAME = 'spap-pdv-v373';
// Fotos dos produtos (armazém Supabase): guardadas no aparelho para sempre — cada foto é descarregada UMA vez.
// Um URL de foto nunca muda de conteúdo (foto nova = URL novo), por isso a cópia guardada está sempre certa.
const CACHE_FOTOS = 'spap-fotos';
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
  './spap-dourado.js',
  './spap-vidro.js',
  './spap-rolagem.js',
  './spap-teclado.js',
  './spap-navegador.js',
  './spap-erros.js',
  './icons3d/personalizar.svg',
  './icons3d/cart.png',
  './spap-pc.js',
  './spap-fotos.js',
  './spap-alertas.js',
  './spap-personalizar.js',
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
  './supabase-js-2.84.0.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js',
  './banca-tema.css',
  './spap-carrinho.css',
  './spap-teclado.js',
  './spap-navegador.js',
  './spap-personalizar.js'
];
// Ao actualizar, copia da cache antiga tudo o que já lá estava (fotos, ficheiros com ?v=…):
// assim a app continua a abrir SEM internet logo a seguir a uma actualização.

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

// Activa: passa para a cache nova o que a antiga tinha e ainda falta, e só depois apaga as antigas
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try {
      const nova = await caches.open(CACHE_NAME);
      const velhas = (await caches.keys()).filter(k => k !== CACHE_NAME && k !== CACHE_FOTOS && k !== 'spap-dados');   // as fotos ficam sempre
      for (const k of velhas) {
        try {
          const c = await caches.open(k);
          for (const req of await c.keys()) {
            if (!(await nova.match(req))) { const r = await c.match(req); if (r) await nova.put(req, r); }
          }
        } catch (er) {}
        await caches.delete(k);
      }
    } catch (er) {}
  })());
  self.clients.claim();
});
// Sem internet: procura na cache também sem o «?v=…» (a versão antiga do ficheiro é melhor que nenhuma)
function daCache(req) {
  return caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true }));
}
const _fotosAPedir = new Map();   // várias imagens iguais no ecrã → um só download
async function fotoDoAparelho(req) {
  const chave = req.url;
  const cache = await caches.open(CACHE_FOTOS);
  const guardada = await cache.match(chave);
  if (guardada) return guardada;
  if (_fotosAPedir.has(chave)) { try { const r = await _fotosAPedir.get(chave); if (r) return r.clone(); } catch (e) {} }
  const p = (async () => {
    // pedido «cors» (não opaco): a cópia guardada ocupa o tamanho real e pode ser lida sem internet
    const r = await fetch(chave, { mode: 'cors', credentials: 'omit' });
    if (r && r.ok) { try { await cache.put(chave, r.clone()); } catch (e) {} }
    return r;
  })();
  _fotosAPedir.set(chave, p);
  try { const r = await p; return r.clone(); }
  catch (e) { return new Response('', { status: 504 }); }
  finally { setTimeout(() => _fotosAPedir.delete(chave), 2000); }
}
function vazio(req) {
  const ehJS = /\.js(\?|$)/.test(req.url) || req.destination === 'script';
  return new Response(ehJS ? '/* sem internet */' : '', { status: 200, headers: { 'Content-Type': ehJS ? 'application/javascript' : 'text/plain' } });
}

// Intercepta pedidos
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Fotos no armazém Supabase — do APARELHO primeiro; só vai à internet a primeira vez (zero tráfego depois)
  if (url.hostname.includes('supabase.co') && url.pathname.indexOf('/storage/v1/object/public/') === 0 && e.request.method === 'GET') {
    e.respondWith(fotoDoAparelho(e.request));
    return;
  }
  // Supabase API — vai sempre direto à rede. Sem internet, o pedido falha de verdade
  // (assim a app sabe que não foi gravado e guarda na fila do telemóvel).
  if (url.hostname.includes('supabase.co')) { return; }

  // CDN (supabase-js) — cache first
  if (url.hostname.includes('jsdelivr') || url.hostname.includes('cdn')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        if (r && (r.ok || r.type === 'opaque')) { const clone = r.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, clone)); }
        return r;
      }).catch(() => daCache(e.request).then(c => c || vazio(e.request))))
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
      }).catch(() => daCache(e.request).then(c => c || vazio(e.request)));
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
