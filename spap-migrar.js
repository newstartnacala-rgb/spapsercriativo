/* SPAP — mudança de endereço sem se notar (Vercel → GitHub Pages), com os dados sincronizados.
   • No endereço antigo (*.vercel.app): junta os dados guardados neste aparelho (sessão iniciada, vendas por
     enviar, preferências) e abre a MESMA página no endereço principal, levando os dados com ela.
   • No endereço principal: recebe esses dados, junta-os aos que já existem (sem apagar nada; as filas de
     vendas por enviar são somadas sem duplicar) e limpa o endereço. A pessoa continua com a sessão aberta.
   • Apps Android antigas (que não conhecem o endereço novo) ficam na Vercel, que mostra a versão mais
     recente quando publicar — tudo usa a mesma base de dados, por isso fica sincronizado. */
(function () {
  var PRINCIPAL = 'https://newstartnacala-rgb.github.io/spapsercriativo';
  var host = location.hostname || '';
  var MARCA = 'spapmig=';
  var FILAS = /^(pdv_fila_vendas|banca_fila_v1|pdv_fila_produtos|fila_)/;
  var IMPORTANTES = /(auth-token|fila|sessao|vendedor|lingua|pdv_|banca_)/;
  var MAX = 200000;          // chaves muito grandes (ex.: fotos dos produtos) não vão — voltam a carregar da internet

  function cmpVer(a, b) {
    a = String(a).split('.').map(Number); b = String(b).split('.').map(Number);
    for (var i = 0; i < Math.max(a.length, b.length); i++) { var d = (a[i] || 0) - (b[i] || 0); if (d) return d; }
    return 0;
  }
  function caminhoPrincipal() {
    var p = location.pathname || '/';
    var mapa = { '/monitor': '/monitor.html', '/mobile': '/mobile.html', '/mobile-monitor': '/mobile-monitor.html', '/banca': '/mobile.html',
      '/banca/monitor': '/mobile-monitor.html', '/banca/login': '/login-banca.html', '/banca/registo': '/registo-banca.html',
      '/login': '/login.html', '/registo': '/registo.html', '/reset-senha': '/reset-senha.html', '/admin': '/admin.html' };
    p = p.replace(/\/+$/, '') || '/';
    return mapa[p] || (p === '/' ? '/' : p);
  }

  // ===== 1) Endereço principal: receber os dados =====
  if (host.indexOf('github.io') >= 0 && location.hash.indexOf(MARCA) >= 0) {
    try {
      var bruto = decodeURIComponent(location.hash.slice(location.hash.indexOf(MARCA) + MARCA.length));
      var pacote = JSON.parse(bruto);
      var juntar = function (alvo, dados) {
        Object.keys(dados || {}).forEach(function (k) {
          var novo = dados[k], atual = alvo.getItem(k);
          if (atual === null) { alvo.setItem(k, novo); return; }
          if (FILAS.test(k)) {            // filas por enviar: soma as duas, sem repetir
            try {
              var a = JSON.parse(atual) || [], b = JSON.parse(novo) || [];
              if (Array.isArray(a) && Array.isArray(b)) {
                var ids = {}; a.forEach(function (x) { if (x && x.id) ids[x.id] = 1; });
                b.forEach(function (x) { if (!x || !x.id || !ids[x.id]) a.push(x); });
                alvo.setItem(k, JSON.stringify(a));
              }
            } catch (e) {}
          }
          // as outras chaves: fica a que já existe no endereço principal
        });
      };
      try { juntar(localStorage, pacote.l); } catch (e) {}
      try { juntar(sessionStorage, pacote.s); } catch (e) {}
      try { localStorage.setItem('spap_migrado_de', host + ' ' + new Date().toISOString()); } catch (e) {}
    } catch (e) {}
    try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    return;
  }

  // ===== 2) Endereço antigo (Vercel): levar os dados e abrir o endereço principal =====
  if (/\.vercel\.app$/i.test(host)) {
    var ua = navigator.userAgent || '';
    var app = ua.match(/SPAPApp\/([\w-]+)\/([\d.]+)/);
    if (app) {
      // só as apps novas conhecem o endereço principal; as antigas ficam aqui (abrir fora da app seria pior)
      var banca = /^banca/i.test(app[1]);
      if (cmpVer(app[2], banca ? '3.1.1' : '2.9.205') < 0) return;
    }
    if (/[?&]ficar=1/.test(location.search)) return;          // para testes: ?ficar=1 mantém na Vercel
    var pac = { l: {}, s: {} };
    var recolher = function (fonte, destino) {
      for (var i = 0; i < fonte.length; i++) {
        var k = fonte.key(i), v = fonte.getItem(k);
        if (v == null) continue;
        if (v.length > MAX && !FILAS.test(k) && !/auth-token/.test(k)) continue;
        if (!IMPORTANTES.test(k) && v.length > 20000) continue;
        destino[k] = v;
      }
    };
    try { recolher(localStorage, pac.l); } catch (e) {}
    try { recolher(sessionStorage, pac.s); } catch (e) {}
    var temDados = Object.keys(pac.l).length || Object.keys(pac.s).length;
    try { document.documentElement.style.visibility = 'hidden'; } catch (e) {}   // não mostra a página antiga a piscar
    location.replace(PRINCIPAL + caminhoPrincipal() + location.search + (temDados ? '#' + MARCA + encodeURIComponent(JSON.stringify(pac)) : location.hash));
  }
})();
