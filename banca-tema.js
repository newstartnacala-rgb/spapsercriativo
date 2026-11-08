/* SPAP Banca — tema moderno: troca os emojis por ícones 3D (os mesmos da
   plataforma principal) e monta a marca no cabeçalho. Não muda funções. */
(function () {
  // Versão da Banca desta página (vem do ?v= do próprio ficheiro)
  var EU_VERSAO = '0';
  try { EU_VERSAO = new URL(document.currentScript.src).searchParams.get('v') || '0'; } catch (e) {}
  var MAPA = {
    '🛒': 'cart', '📦': 'package', '🧾': 'receipt', '↩️': 'refresh', '↩': 'refresh', '🚚': 'truck', '🌐': 'globe',
    '💬': 'chat', '🚪': 'door', '📊': 'barchart', '🏷️': 'label', '🏷': 'label', '📈': 'chartup', '📉': 'chartdown',
    '🔎': 'lupa-r', '🔍': 'lupa-r', '➕': 'plus', '👤': 'person', '🔧': 'ferramentas', '🪪': 'person', '💾': 'floppy',
    '📲': 'install', '💰': 'moneybag', '⚠️': 'warning', '⚠': 'warning', '💼': 'bank', '💸': 'dinheiro-voa',
    '📅': 'calendar', '🏪': 'store', '📧': 'envelope', '🔑': 'key', '📱': 'telemovel', '🔁': 'refresh',
    '🔐': 'cadeado', '💳': 'card', '📷': 'camera', '💵': 'dinheiro-voa', '✅': 'check', '🖨️': 'page', '🖨': 'page',
    '🗑': 'lixo', '🗑️': 'lixo', '☰': null, '📩': 'envelope', '⏳': 'hourglass', '🚫': 'prohibited', '🔒': 'cadeado',
    '📋': 'clipboard', '🔄': 'refresh', '⚙️': 'gear', '⚙': 'gear', '🔔': 'bell', '⭐': 'star', '🏆': 'trophy', '📌': 'pin', '🎁': 'gem'
  };
  var chaves = Object.keys(MAPA).sort(function (a, b) { return b.length - a.length; });
  var RE = new RegExp('(' + chaves.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\uFE0F?', 'g');
  var IGNORAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, OPTION: 1, TITLE: 1, SELECT: 1 };

  function trocarNo(t) {
    var s = t.nodeValue; if (!s || !RE.test(s)) return; RE.lastIndex = 0;
    var pai = t.parentNode; if (!pai || IGNORAR[pai.nodeName] || pai.closest && pai.closest('[data-sem-icones]')) return;
    var frag = document.createDocumentFragment(), ult = 0, m;
    while ((m = RE.exec(s))) {
      if (m.index > ult) frag.appendChild(document.createTextNode(s.slice(ult, m.index)));
      var nome = MAPA[m[1]];
      if (nome) { var img = document.createElement('img'); img.className = 'e3d'; img.alt = ''; img.src = 'icons3d/' + nome + '.png'; frag.appendChild(img); }
      ult = RE.lastIndex;
      // tira o espaço logo a seguir ao ícone removido (☰) para não ficar desalinhado
      if (!nome && s.charAt(ult) === ' ') ult++;
    }
    if (ult < s.length) frag.appendChild(document.createTextNode(s.slice(ult)));
    pai.replaceChild(frag, t);
  }
  function varrer(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { trocarNo(raiz); return; }
    if (raiz.nodeType !== 1 || IGNORAR[raiz.nodeName]) return;
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, null), lista = [], n;
    while ((n = w.nextNode())) lista.push(n);
    lista.forEach(trocarNo);
  }

  function marcaTopo() {
    document.querySelectorAll('.topo').forEach(function (tp) {
      if (tp.querySelector('.tp-marca')) return;
      var txt = tp.firstElementChild; if (!txt || txt.tagName === 'BUTTON') return;
      var marca = document.createElement('div'); marca.className = 'tp-marca';
      var logo = document.createElement('img'); logo.className = 'tp-logo'; logo.alt = ''; logo.src = 'ssteam-logo.png';
      tp.insertBefore(marca, txt); marca.appendChild(logo); marca.appendChild(txt); txt.classList.add('tp-txt');
    });
  }

  // Menu do topo: só as três barras
  var HAMB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6h16a1 1 0 1 1 0 2H4a1 1 0 0 1 0-2zm0 5h16a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2zm0 5h16a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2z"/></svg>';
  function menuTresBarras() {
    document.querySelectorAll('.topo button[onclick*="abrirMenu"]').forEach(function (b) {
      if (b.classList.contains('bt-menu3') && b.querySelector('svg')) return;
      b.classList.add('bt-menu3'); b.innerHTML = HAMB; b.setAttribute('aria-label', 'Menu');
    });
  }
  // Ondulação ao tocar (como na Loja)
  function ripple(e) {
    var alvo = e.target.closest && e.target.closest('.card,.btn,.barra-carrinho button,#bt-entrega-dia,.menu-grid .mi,.periodo button,.nav a,.teclado button,.notas button');
    if (!alvo || alvo.disabled) return;
    var r = alvo.getBoundingClientRect(), d = Math.max(r.width, r.height);
    var s = document.createElement('span'); s.className = 'bt-ripple';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    alvo.appendChild(s); setTimeout(function () { s.remove(); }, 650);
    if (alvo.matches('.menu-grid .mi')) { alvo.classList.remove('cg-clique'); void alvo.offsetWidth; alvo.classList.add('cg-clique'); setTimeout(function () { alvo.classList.remove('cg-clique'); }, 560); }
  }
  // Produto: salta, mostra +1 e voa para o carrinho
  function animarProduto(e) {
    var card = e.target.closest && e.target.closest('#grelha .card'); if (!card) return;
    card.classList.remove('toque'); void card.offsetWidth; card.classList.add('toque');
    setTimeout(function () { card.classList.remove('toque'); }, 650);
    var destino = document.getElementById('btn-abrir-cart'), fonte = card.querySelector('.img');
    if (!destino || !fonte || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var a = fonte.getBoundingClientRect(), b = destino.getBoundingClientRect();
    var v = document.createElement('div'); v.className = 'voar';
    var img = fonte.tagName === 'IMG' ? fonte : fonte.querySelector('img');
    if (img) { var c = document.createElement('img'); c.src = img.src; c.alt = ''; if (fonte.tagName === 'IMG') { c.style.width = '100%'; c.style.height = '100%'; c.style.objectFit = 'cover'; } v.appendChild(c); }
    v.style.cssText += 'left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px;';
    document.body.appendChild(v);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      v.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.18)'; v.style.opacity = '.4';
    }); });
    setTimeout(function () {
      v.remove();
      var bc = document.querySelector('.barra-carrinho'); if (bc) { bc.classList.remove('salto'); void bc.offsetWidth; bc.classList.add('salto'); }
      var t = document.getElementById('cart-tot'); if (t) { t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
    }, 560);
  }
  function numerarMenus() {
    document.querySelectorAll('.menu-grid').forEach(function (g) { Array.prototype.forEach.call(g.children, function (m, i) { m.style.setProperty('--i', i); }); });
  }

  // ===== Atualizações da Banca (separadas da Loja/Monitor principal) =====
  function cmpV(a, b) {
    var x = String(a || '').split('.'), y = String(b || '').split('.');
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0); if (d) return d; }
    return 0;
  }
  function ocupado() {
    // não interromper uma venda: carrinho com produtos ou alguma folha aberta
    try { if (typeof carrinho !== 'undefined' && carrinho.length) return true; } catch (e) {}
    return !!document.querySelector('.folha-fundo.ativa');
  }
  function aplicarAtualizacao() {
    var feito = function () { location.reload(); };
    try {
      if ('caches' in window) caches.keys().then(function (k) { return Promise.all(k.map(function (n) { return caches.delete(n); })); }).then(feito, feito);
      else feito();
    } catch (e) { feito(); }
  }
  function folhaAtualizacao(v, nova) {
    var ov = document.getElementById('folha-att-banca'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.className = 'folha-fundo ativa'; ov.id = 'folha-att-banca';
    var lista = (v.melhorias || []).slice(0, 5).map(function (t) { return '<li>' + String(t).replace(/</g, '&lt;') + '</li>'; }).join('');
    ov.innerHTML = '<div class="folha att-folha"><div class="att-ico">🔄</div>'
      + '<h3>' + (nova ? 'Nova atualização da Banca' : 'A Banca está atualizada') + '</h3>'
      + '<div class="att-v">Versão ' + v.versao + (nova ? ' (tem a ' + EU_VERSAO + ')' : '') + '</div>'
      + (lista ? '<ul>' + lista + '</ul>' : '')
      + (nova ? '<button class="btn" type="button" id="att-sim">Atualizar agora</button><button class="btn cinza" type="button" id="att-nao">Mais tarde</button>'
              : '<button class="btn" type="button" id="att-nao">Fechar</button>')
      + '</div>';
    document.body.appendChild(ov);
    var s1 = ov.querySelector('#att-sim'); if (s1) s1.onclick = function () { s1.disabled = true; s1.textContent = 'A atualizar…'; aplicarAtualizacao(); };
    ov.querySelector('#att-nao').onclick = function () { ov.remove(); };
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
  }
  var avisada = '';
  function verificarAtualizacao(manual) {
    return fetch('banca-version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (!v || !v.versao) { if (manual && window.toast) toast('Não foi possível verificar agora', 'erro'); return; }
        var nova = cmpV(v.versao, EU_VERSAO) > 0;
        if (manual) { folhaAtualizacao(v, nova); return; }
        if (!nova || avisada === v.versao) return;
        avisada = v.versao;
        // sem venda a decorrer: atualiza sozinha; com venda: pergunta
        // proteção: só tenta recarregar sozinha uma vez por versão (evita ciclos)
        var chave = 'banca_att_' + v.versao, ja = false;
        try { ja = sessionStorage.getItem(chave) === '1'; sessionStorage.setItem(chave, '1'); } catch (e) {}
        if (ja) return;
        if (!ocupado()) { if (window.toast) toast('🔄 A atualizar a Banca para a versão ' + v.versao + '…', 'ok'); setTimeout(aplicarAtualizacao, 1800); }
        else folhaAtualizacao(v, true);
      }).catch(function () { if (manual && window.toast) toast('Sem internet para verificar', 'erro'); });
  }
  window.bancaVerificarAtualizacao = verificarAtualizacao;

  // ===== Sincronização em tempo real (≈1 segundo) =====
  // Vendas da Banca → Monitor da Banca; produtos do Monitor → Banca. Canal em tempo real + verificação rápida de reserva.
  var _sync = { ligado: false, t: {} };
  function atrasar(nome, fn, ms) { clearTimeout(_sync.t[nome]); _sync.t[nome] = setTimeout(fn, ms || 150); }
  function recarregarVendas() {
    if (typeof carregarResumo === 'function') atrasar('vendas', function () { try { carregarResumo(); } catch (e) {} if (typeof carregarDescontos === 'function') try { carregarDescontos(); } catch (e) {} });
  }
  function recarregarProdutos() {
    if (typeof carregarProdutos !== 'function') return;
    atrasar('produtos', function () {
      Promise.resolve(carregarProdutos()).then(function () {
        try { if (document.body.classList.contains('pg-vender') && typeof renderProdutos === 'function') renderProdutos(); } catch (e) {}
      }).catch(function () {});
    });
  }
  function ligarTempoReal() {
    if (_sync.ligado) return;
    var s; try { s = sessao; } catch (e) { return; }
    if (!s || !s.lojaId || typeof supabaseClient === 'undefined') return;
    _sync.ligado = true;
    var loja = s.lojaId, filtro = 'loja_id=eq.' + loja, mon = document.body.classList.contains('pg-mon');
    try {
      var ch = supabaseClient.channel('banca-sync-' + loja + '-' + (mon ? 'mon' : 'vend'));
      if (mon) {
        ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vendas', filter: filtro }, function (m) {
          recarregarVendas();
          var v = m && m.new; if (v && window.toast) toast('🛒 Nova venda: MT ' + (parseFloat(v.total) || 0).toFixed(2), 'ok');
        });
        ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'venda_itens', filter: filtro }, recarregarVendas);
        ch.on('postgres_changes', { event: '*', schema: 'public', table: 'descontos', filter: filtro }, recarregarVendas);
      }
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'produtos', filter: filtro }, recarregarProdutos);
      ch.subscribe();
    } catch (e) {}
    // Reserva: se o canal falhar, uma consulta leve de 2 em 2 segundos apanha as mudanças
    var ultVenda = null, ultProd = null;
    setInterval(function () {
      if (document.hidden) return;
      if (mon) {
        supabaseClient.from('vendas').select('id,criado_em').eq('loja_id', loja).order('criado_em', { ascending: false }).limit(1)
          .then(function (r) { var id = r && r.data && r.data[0] ? r.data[0].id : ''; if (ultVenda !== null && id !== ultVenda) recarregarVendas(); ultVenda = id; });
      }
      supabaseClient.from('produtos').select('id', { count: 'exact', head: true }).eq('loja_id', loja)
        .then(function (r) { var n = r ? r.count : null; if (n == null) return; if (ultProd !== null && n !== ultProd) recarregarProdutos(); ultProd = n; });
    }, 2000);
  }
  window.bancaLigarTempoReal = ligarTempoReal;

  // ===== Plano da Banca: grátis 15 dias, depois Mensal ou Anual; ao expirar, bloqueia e abre o pagamento =====
  var _plano = { ok: false, ultimo: null };
  function precos(c) {
    c = Object.assign({ gratis_dias: 15, mensal: 500, anual_desconto: 5 }, c || {});
    var m = +c.mensal || 500, d = +c.anual_desconto || 0;
    return { dias: +c.gratis_dias || 15, mensal: m, desc: d, anual: Math.round(m * 12 * (1 - d / 100)) };
  }
  function mt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function irPagamento(motivo) { location.href = 'planos-banca.html' + (motivo ? '?m=' + motivo : ''); }
  function verificarPlano() {
    var s; try { s = sessao; } catch (e) { return; }
    if (!s || !s.lojaId || typeof supabaseClient === 'undefined') return;
    supabaseClient.from('lojas').select('plano,estado,data_expiracao,tipo_loja').eq('id', s.lojaId).maybeSingle().then(function (r) {
      var l = r && r.data; if (!l) return;
      _plano.ultimo = l;
      if (l.estado === 'suspenso' || l.estado === 'bloqueado') return irPagamento('suspenso');
      var exp = l.data_expiracao ? new Date(l.data_expiracao) : null;
      if (!exp) { if (l.estado === 'pendente' || l.estado === 'pendente_pagamento') irPagamento('pendente'); return; }
      var falta = exp - new Date();
      if (falta <= 0) return irPagamento('expirou');           // bloqueio automático
      var dias = Math.ceil(falta / 864e5);
      mostrarAvisoPlano(l, dias);
      if (!_plano.ok) { _plano.ok = true; boasVindas(l, dias); }
    });
  }
  function mostrarAvisoPlano(l, dias) {
    var ant = document.getElementById('plano-aviso'); if (ant) ant.remove();
    if (!(l.plano === 'banca_free' || dias <= 5)) return;
    var ecra = document.querySelector('.tela.ativa .topo'); if (!ecra) return;
    var d = document.createElement('div'); d.className = 'plano-aviso'; d.id = 'plano-aviso';
    d.innerHTML = (l.plano === 'banca_free' ? 'Plano grátis: <b>' + dias + ' dia' + (dias === 1 ? '' : 's') + '</b> restantes' : 'O seu plano termina em <b>' + dias + ' dia' + (dias === 1 ? '' : 's') + '</b>')
      + '<span class="pa-btn">Ver planos</span>';
    d.onclick = function () { location.href = 'planos-banca.html?ver=1'; };
    ecra.parentNode.insertBefore(d, ecra.nextSibling);
  }
  function boasVindas(l, dias) {
    if (l.plano !== 'banca_free') return;
    var s; try { s = sessao; } catch (e) { return; }
    var chave = 'banca_boasvindas_' + s.lojaId;
    try { if (localStorage.getItem(chave)) return; localStorage.setItem(chave, '1'); } catch (e) { return; }
    supabaseClient.from('config_global').select('valor').eq('chave', 'planos_banca').maybeSingle().then(function (r) {
      var c = null; try { c = r && r.data && r.data.valor ? (typeof r.data.valor === 'string' ? JSON.parse(r.data.valor) : r.data.valor) : null; } catch (e) {}
      var p = precos(c);
      var ov = document.createElement('div'); ov.className = 'folha-fundo ativa'; ov.id = 'folha-boasvindas';
      ov.innerHTML = '<div class="folha att-folha"><div class="att-ico">⭐</div><h3>Bem-vindo à SPAP Banca!</h3>'
        + '<div class="att-v">Plano grátis activo: ' + dias + ' dia' + (dias === 1 ? '' : 's') + '</div>'
        + '<div class="pl-lista" style="text-align:left">'
        + '<div class="pl-card pl-gratis"><div class="pl-t"><b>Grátis</b><small>' + p.dias + ' dias, só para a primeira conta</small></div><div class="pl-p">0 MT</div><span class="pl-selo">Activo agora</span></div>'
        + '<div class="pl-card"><div class="pl-t"><b>Pro</b><small>Pagamento mensal</small></div><div class="pl-p">' + mt(p.mensal) + ' MT<small>/mês</small></div></div>'
        + '<div class="pl-card pl-anual"><div class="pl-t"><b>Anual</b><small>Poupa ' + p.desc + '% (' + mt(p.mensal * 12 - p.anual) + ' MT)</small></div><div class="pl-p">' + mt(p.anual) + ' MT<small>/ano</small></div></div>'
        + '</div><button class="btn" type="button" id="bv-ok">Começar a vender</button></div>';
      document.body.appendChild(ov);
      ov.querySelector('#bv-ok').onclick = function () { ov.remove(); };
    });
  }
  window.bancaVerificarPlano = verificarPlano;

  // ===== Tradução da página inteira (Português, English, Français, 中文) — o mesmo tradutor da Loja principal =====
  var NAO_TRADUZIR = '.card .n, .item .nn, .row .nn, #nome-loja, .topo .nome, #nome-banca, .tp-lang, .pl-p, #cb-input';
  function marcarNaoTraduzir(raiz) {
    try {
      var lista = raiz.querySelectorAll ? raiz.querySelectorAll(NAO_TRADUZIR) : [];
      Array.prototype.forEach.call(lista, function (e) { e.classList.add('notranslate'); e.setAttribute('translate', 'no'); });
      if (raiz.matches && raiz.matches(NAO_TRADUZIR)) { raiz.classList.add('notranslate'); raiz.setAttribute('translate', 'no'); }
    } catch (e) {}
  }
  function linguaGuardada() { try { var l = localStorage.getItem('banca_lang') || 'pt'; return /^(pt|en|fr|zh)$/.test(l) ? l : 'pt'; } catch (e) { return 'pt'; } }
  function cookieLingua(l) {
    var val = (!l || l === 'pt') ? '' : '/pt/' + (l === 'zh' ? 'zh-CN' : l);
    var exp = val ? '' : ';expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'googtrans=' + val + ';path=/' + exp;
    try { document.cookie = 'googtrans=' + val + ';path=/;domain=.' + location.hostname + exp; } catch (e) {}
    return val;
  }
  function carregarTradutor() {
    if (window._bancaTradutor) return; window._bancaTradutor = true;
    var d = document.createElement('div'); d.id = 'google_translate_element'; d.style.display = 'none'; document.body.appendChild(d);
    var st = document.createElement('style');
    st.textContent = '.goog-te-banner-frame.skiptranslate,.goog-te-gadget{display:none!important}body{top:0!important}.goog-logo-link,.goog-te-gadget span{display:none!important}#goog-gt-tt,.goog-te-balloon-frame{display:none!important}font.goog-text-highlight{background:none!important;box-shadow:none!important}.skiptranslate iframe{visibility:hidden!important;height:0!important}';
    document.head.appendChild(st);
    window.googleTranslateElementInit = function () {
      try { new google.translate.TranslateElement({ pageLanguage: 'pt', includedLanguages: 'pt,en,fr,zh-CN', autoDisplay: false }, 'google_translate_element'); } catch (e) {}
    };
    var sc = document.createElement('script'); sc.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; sc.async = true;
    document.body.appendChild(sc);
  }
  window.bancaTraduzir = function (l) {
    try { localStorage.setItem('banca_lang', l); } catch (e) {}
    var val = cookieLingua(l);
    var combo = document.querySelector('.goog-te-combo');
    if (combo && val) { combo.value = (l === 'zh' ? 'zh-CN' : l); combo.dispatchEvent(new Event('change')); if (window.toast) toast('🌐 ' + ({ en: 'English', fr: 'Français', zh: '中文' }[l] || l), 'ok'); }
    else location.reload();   // voltar ao Português (ou o tradutor ainda a carregar): recarrega já na língua certa
  };

  function iniciar() {
    try { marcaTopo(); menuTresBarras(); numerarMenus(); } catch (e) {}
    marcarNaoTraduzir(document.body);
    // a língua escolhida acompanha todas as páginas da Banca
    if (linguaGuardada() !== 'pt') cookieLingua(linguaGuardada());
    carregarTradutor();
    if (document.getElementById('tela-resumo')) document.body.classList.add('pg-mon');
    if (document.getElementById('tela-vender')) document.body.classList.add('pg-vender');
    document.addEventListener('pointerdown', ripple, true);
    document.addEventListener('click', animarProduto, true);
    varrer(document.body);
    try {
      new MutationObserver(function (lista) {
        lista.forEach(function (m) {
          if (m.type === 'characterData') trocarNo(m.target);
          else { m.addedNodes.forEach(function (n) { varrer(n); if (n.nodeType === 1) marcarNaoTraduzir(n); }); if (m.addedNodes.length) { try { numerarMenus(); } catch (e) {} } }
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
    // liga a sincronização assim que a sessão da banca estiver pronta
    var tentativas = 0, espera = setInterval(function () { tentativas++; ligarTempoReal(); if (_sync.ligado || tentativas > 120) clearInterval(espera); }, 500);
    if (!/planos-banca|login|registo/i.test(location.pathname)) {
      var t2 = 0, espPlano = setInterval(function () { t2++; var s; try { s = sessao; } catch (e) {} if (s && s.lojaId) { clearInterval(espPlano); verificarPlano(); } else if (t2 > 120) clearInterval(espPlano); }, 500);
      setInterval(verificarPlano, 60000);   // bloqueia sozinha no momento em que o plano expira
    }
    setTimeout(function () { verificarAtualizacao(false); }, 6000);
    setInterval(function () { verificarAtualizacao(false); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) verificarAtualizacao(false); });
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', '#f4f8ff');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
