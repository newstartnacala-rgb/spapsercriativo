/* Banca — tema moderno: troca os emojis por ícones 3D (os mesmos da
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
    '📋': 'clipboard', '🔄': 'refresh', '🌙': 'moon', '☀️': 'sun', '☀': 'sun', '🔦': 'lampada', '⚙️': 'gear', '⚙': 'gear', '🔔': 'bell', '⭐': 'star', '🏆': 'trophy', '📌': 'pin', '🎁': 'gem'
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
  function aplicarAtualizacao(versao) {
    // pede a página nova ao servidor (o endereço muda, por isso não usa a cópia guardada do telemóvel)
    var feito = function () {
      var q = new URLSearchParams(location.search); q.set('atualizado', versao || Date.now());
      location.replace(location.pathname + '?' + q.toString() + location.hash);
    };
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
    var s1 = ov.querySelector('#att-sim'); if (s1) s1.onclick = function () { s1.disabled = true; s1.textContent = 'A atualizar…'; aplicarAtualizacao(v.versao); };
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
        if (!ocupado()) { if (window.toast) toast('🔄 A atualizar a Banca para a versão ' + v.versao + '…', 'ok'); setTimeout(function () { aplicarAtualizacao(v.versao); }, 1800); }
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
    var m = +c.mensal || 500, dp = +c.mensal_desconto || 0, ba = +c.anual_preco || m, d = +c.anual_desconto || 0;
    return { dias: +c.gratis_dias || 15, base: m, descPro: dp, mensal: Math.round(m * (1 - dp / 100)), baseAnual: ba, desc: d,
      anual: Math.round(ba * 12 * (1 - d / 100)), poupaAnual: Math.round(ba * 12 * d / 100),
      nomeGratis: c.gratis_nome || 'Grátis', nomePro: c.mensal_nome || 'Pro', nomeAnual: c.anual_nome || 'Anual' };
  }
  window.bancaPrecos = precos;

  // ===== Janelas próprias (em vez das caixas do navegador que mostram o endereço do site) =====
  function _escD(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function janela(o) {
    return new Promise(function (res) {
      var ant = document.getElementById('bj-fundo'); if (ant) ant.remove();
      var ov = document.createElement('div'); ov.id = 'bj-fundo'; ov.className = 'notranslate-x';
      var temCampo = o.tipo === 'texto' || o.tipo === 'numero';
      ov.innerHTML = '<div class="bj" role="dialog" aria-modal="true">'
        + '<div class="bj-ico' + (o.perigo ? ' perigo' : '') + '">' + (o.icone || (o.perigo ? '⚠️' : temCampo ? '✏️' : 'ℹ️')) + '</div>'
        + '<h3>' + _escD(o.titulo || '') + '</h3>'
        + (o.texto ? '<p>' + _escD(o.texto).replace(/\n/g, '<br>') + '</p>' : '')
        + (temCampo ? '<input class="bj-in" ' + (o.tipo === 'numero' ? 'type="text" inputmode="decimal"' : 'type="text"') + ' placeholder="' + _escD(o.placeholder || '') + '" value="' + _escD(o.valor == null ? '' : o.valor) + '">' : '')
        + '<div class="bj-erro"></div>'
        + '<div class="bj-bts">' + (o.tipo === 'aviso' ? '' : '<button type="button" class="bj-can">' + _escD(o.cancelar || 'Cancelar') + '</button>')
        + '<button type="button" class="bj-ok' + (o.perigo ? ' perigo' : '') + '">' + _escD(o.ok || 'OK') + '</button></div></div>';
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add('ativo'); });
      var inp = ov.querySelector('.bj-in'), er = ov.querySelector('.bj-erro'), feito = false;
      function fim(v) { if (feito) return; feito = true; ov.classList.remove('ativo'); setTimeout(function () { ov.remove(); }, 200); res(v); }
      function ok() {
        if (!temCampo) return fim(true);
        var v = inp.value.trim();
        if (o.tipo === 'numero') { if (v === '' && o.vazioOk) return fim(''); var n = parseFloat(v.replace(',', '.')); if (isNaN(n) || (o.min != null && n < o.min)) { er.textContent = o.erroNumero || 'Escreve um número válido.'; inp.focus(); return; } return fim(v.replace(',', '.')); }
        if (!v && !o.vazioOk) { er.textContent = 'Escreve um valor.'; inp.focus(); return; }
        fim(v);
      }
      ov.querySelector('.bj-ok').onclick = ok;
      var c = ov.querySelector('.bj-can'); if (c) c.onclick = function () { fim(temCampo ? null : false); };
      ov.addEventListener('click', function (e) { if (e.target === ov) fim(o.tipo === 'aviso' ? true : (temCampo ? null : false)); });
      if (inp) { inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); }); inp.addEventListener('input', function () { er.textContent = ''; }); setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) {} }, 60); }
    });
  }
  window.bancaPedir = function (titulo, texto, valor, extra) { return janela(Object.assign({ tipo: 'texto', titulo: titulo, texto: texto, valor: valor, ok: 'Guardar' }, extra || {})); };
  window.bancaPedirNumero = function (titulo, texto, valor, extra) { return janela(Object.assign({ tipo: 'numero', titulo: titulo, texto: texto, valor: valor, ok: 'Confirmar', min: 0 }, extra || {})); };
  window.bancaConfirmar = function (titulo, texto, extra) { return janela(Object.assign({ tipo: 'confirmar', titulo: titulo, texto: texto, ok: 'Confirmar' }, extra || {})); };
  // ===== Código de barras já existe (cadastro de produtos na Banca) =====
  window.bancaDupProcurar = async function (codigo, ignorarId) {
    codigo = String(codigo || '').trim(); if (!codigo) return null;
    var igual = function (x) { return x && String(x.id) !== String(ignorarId || '') && (String(x.codbarras || '').trim() === codigo || String(x.codigo || '').trim() === codigo); };
    var lista = []; try { lista = produtos || []; } catch (e) {}
    var ex = lista.find(igual); if (ex) return ex;
    var s; try { s = sessao; } catch (e) {}
    if (!s || !s.lojaId || navigator.onLine === false || typeof supabaseClient === 'undefined') return null;
    try {
      var C = 'id,nome,codigo,codbarras,preco,stock,imagem';
      var r = await Promise.all([supabaseClient.from('produtos').select(C).eq('loja_id', s.lojaId).eq('codbarras', codigo).limit(3),
                                 supabaseClient.from('produtos').select(C).eq('loja_id', s.lojaId).eq('codigo', codigo).limit(3)]);
      ex = [].concat((r[0] && r[0].data) || [], (r[1] && r[1].data) || []).find(igual) || null;
    } catch (e) {}
    return ex;
  };
  function dupCartao(ex) {
    var st = parseInt(ex.stock) || 0, f = function (n) { return 'MT ' + (parseFloat(n) || 0).toFixed(2).replace('.', ','); };
    return '<div class="bd-prod"><div class="bd-ph">' + (ex.imagem ? '<img src="' + _escD(ex.imagem) + '" alt="" onerror="this.remove()">' : '📦') + '</div>'
      + '<div class="bd-in"><b>' + _escD(ex.nome || '(sem nome)') + '</b><small>' + f(ex.preco) + ' · stock ' + st + '</small><small>Código: ' + _escD(ex.codbarras || ex.codigo || '—') + '</small></div></div>';
  }
  var _bdT = null;
  // verifica ao escrever/ler; mostra por baixo do campo o produto que já existe
  window.bancaDupCampo = function (inputId, caixaId, ignorarId, abrir, ja) {
    return new Promise(function (res) {
      clearTimeout(_bdT);
      _bdT = setTimeout(async function () {
        var inp = document.getElementById(inputId), cx = document.getElementById(caixaId); if (!inp || !cx) return res(null);
        var c = inp.value.trim();
        if (!c) { cx.hidden = true; cx.innerHTML = ''; inp.classList.remove('bd-erro'); return res(null); }
        var ex = await bancaDupProcurar(c, typeof ignorarId === 'function' ? ignorarId() : ignorarId);
        if (inp.value.trim() !== c) return res(null);
        inp.classList.toggle('bd-erro', !!ex);
        if (ex) {
          cx.innerHTML = '<div class="bd-tit">⛔ Este código já existe — o produto já está cadastrado</div>' + dupCartao(ex) + '<button type="button" class="bd-bt">Abrir o produto existente</button>';
          cx.hidden = false; cx.querySelector('.bd-bt').onclick = function () { abrir && abrir(ex); };
        } else { cx.hidden = true; cx.innerHTML = ''; }
        res(ex);
      }, ja ? 0 : 350);
    });
  };
  window.bancaDupJanela = function (ex, codigo, abrir) {
    var ant = document.getElementById('bj-fundo'); if (ant) ant.remove();
    var ov = document.createElement('div'); ov.id = 'bj-fundo';
    ov.innerHTML = '<div class="bj"><div class="bj-ico perigo">⛔</div><h3>Produto já cadastrado</h3><p>O código <b>' + _escD(codigo) + '</b> já pertence a este produto. Não é preciso cadastrar duas vezes.</p>'
      + dupCartao(ex) + '<div class="bj-bts" style="margin-top:14px"><button type="button" class="bj-can">Fechar</button><button type="button" class="bj-ok">Abrir produto</button></div></div>';
    document.body.appendChild(ov); requestAnimationFrame(function () { ov.classList.add('ativo'); });
    try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {}
    var fim = function () { ov.classList.remove('ativo'); setTimeout(function () { ov.remove(); }, 200); };
    ov.querySelector('.bj-can').onclick = fim;
    ov.querySelector('.bj-ok').onclick = function () { fim(); abrir && abrir(ex); };
    ov.addEventListener('click', function (e) { if (e.target === ov) fim(); });
  };
  window.bancaAviso = function (titulo, texto, extra) { return janela(Object.assign({ tipo: 'aviso', titulo: titulo, texto: texto, ok: 'Entendi' }, extra || {})); };

  function mt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function irPagamento(motivo) { location.href = 'planos-banca.html' + (motivo ? '?m=' + motivo : ''); }
  function verificarPlano() {
    if (window.spapEuSuper && spapEuSuper()) return;   // o Super Admin está sempre activo, sem plano
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
      clearTimeout(_plano.t); if (falta < 2147483000) _plano.t = setTimeout(function () { irPagamento('expirou'); }, falta + 500);   // fecha no segundo exato
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
      ov.innerHTML = '<div class="folha att-folha"><div class="att-ico">⭐</div><h3>Bem-vindo à Banca!</h3>'
        + '<div class="att-v">Plano grátis activo: ' + dias + ' dia' + (dias === 1 ? '' : 's') + '</div>'
        + '<div class="pl-lista" style="text-align:left">'
        + '<div class="pl-card pl-gratis"><div class="pl-t"><b>' + p.nomeGratis + '</b><small>' + p.dias + ' dias, só para a primeira conta</small></div><div class="pl-p">0 MT</div><span class="pl-selo">Activo agora</span></div>'
        + '<div class="pl-card"><div class="pl-t"><b>' + p.nomePro + '</b><small>' + (p.descPro ? 'Desconto ' + p.descPro + '% (era ' + mt(p.base) + ' MT)' : 'Pagamento mensal') + '</small></div><div class="pl-p">' + mt(p.mensal) + ' MT<small>/mês</small></div></div>'
        + '<div class="pl-card pl-anual"><div class="pl-t"><b>' + p.nomeAnual + '</b><small>Poupa ' + p.desc + '% (' + mt(p.poupaAnual) + ' MT)</small></div><div class="pl-p">' + mt(p.anual) + ' MT<small>/ano</small></div></div>'
        + '</div><button class="btn" type="button" id="bv-ok">Começar a vender</button></div>';
      document.body.appendChild(ov);
      ov.querySelector('#bv-ok').onclick = function () { ov.remove(); };
    });
  }
  window.bancaVerificarPlano = verificarPlano;

  // ===== Online / Offline (qualquer botão .tp-net) =====
  window.bancaNet = function (avisar) {
    var on = navigator.onLine !== false;
    document.querySelectorAll('.tp-net').forEach(function (b) { b.classList.toggle('off', !on); var t = b.querySelector('span'); if (t) t.textContent = on ? 'Online' : 'Offline'; });
    if (window.bancaPintarFila) bancaPintarFila();
    if (avisar && window.toast) {
      var n = window.bancaFila ? bancaFila().length : 0;
      toast(on ? (n ? '☁️ ' + n + ' registo(s) a enviar agora…' : '✅ Ligado à internet: tudo sincroniza na hora') : '📵 Sem internet: continua a vender, fica tudo guardado no telemóvel', on ? 'ok' : 'erro');
    }
  };
  addEventListener('online', function () { bancaNet(); });
  addEventListener('offline', function () { bancaNet(); });

  // ===== Modo escuro (lua) / claro (sol) =====
  function aplicarTema(escuro) {
    document.documentElement.classList.toggle('escuro', !!escuro);
    document.querySelectorAll('.tp-tema').forEach(function (b) { b.setAttribute('aria-label', escuro ? 'Modo claro' : 'Modo escuro'); });
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', escuro ? '#0b1020' : '#f4f8ff');
  }
  try { aplicarTema(localStorage.getItem('banca_escuro') === '1'); } catch (e) {}
  window.bancaTema = function () {
    var novo = !document.documentElement.classList.contains('escuro');
    try { localStorage.setItem('banca_escuro', novo ? '1' : '0'); } catch (e) {}
    aplicarTema(novo);
    if (window.toast) toast(novo ? '🌙 Modo escuro' : '☀️ Modo claro', 'ok');
  };

  // ===== Leitor de códigos de barras (ecrã próprio com moldura e linha de leitura) =====
  var FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar', 'qr_code'];
  window.bancaScanner = function (aoLer) {
    var ant = document.getElementById('leitor-ecra'); if (ant) ant.remove();
    var ov = document.createElement('div'); ov.id = 'leitor-ecra'; ov.className = 'notranslate';
    ov.innerHTML = '<div class="le-topo"><b>Ler código de barras</b><button type="button" class="le-fechar" aria-label="Fechar">✕</button></div>'
      + '<div class="le-video"><video playsinline muted autoplay></video><div id="le-html5"></div>'
      + '<div class="le-mira"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><span class="le-laser"></span></div></div>'
      + '<div class="le-dica" id="le-dica">Aponte para o código de barras, dentro da moldura</div>'
      + '<div class="le-botoes"><button type="button" class="le-luz" hidden>🔦 Lanterna</button><button type="button" class="le-foto">📷 Ler a partir de uma foto</button></div>';
    document.body.appendChild(ov);
    var video = ov.querySelector('video'), dica = ov.querySelector('#le-dica'), fluxo = null, parar = false, h5 = null, lido = false;
    function fim() {
      parar = true;
      try { if (fluxo) fluxo.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      try { if (h5) h5.stop().catch(function () {}); } catch (e) {}
      ov.remove();
    }
    function sucesso(code) {
      if (lido) return; lido = true;
      try { navigator.vibrate && navigator.vibrate(80); } catch (e) {}
      try { var ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 1250; g.gain.value = .12; o.connect(g); g.connect(ac.destination); o.start(); setTimeout(function () { o.stop(); ac.close(); }, 120); } catch (e) {}
      ov.classList.add('le-ok'); setTimeout(function () { fim(); aoLer(String(code).trim()); }, 220);
    }
    ov.querySelector('.le-fechar').onclick = fim;
    ov.querySelector('.le-foto').onclick = function () { fim(); window.bancaLerPorFoto && bancaLerPorFoto(aoLer); };
    function semCamara(e) {
      var negado = e && /NotAllowed|Permission|denied/i.test((e.name || '') + (e.message || ''));
      var naApp = /SPAPApp/i.test(navigator.userAgent || '') || !!window.SPAPNative;
      dica.innerHTML = naApp
        ? '⚠️ Esta versão da app ainda não deixa usar a câmara. Toque em «Atualizar a app», instale e volte a abrir.'
        : (negado ? '⚠️ A câmara não foi autorizada. Toque no cadeado ao lado do endereço, permita a câmara e tente de novo.' : '⚠️ Não foi possível abrir a câmara deste aparelho.');
      ov.classList.add('le-erro');
      if (naApp && window.spapInstalarApp) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'le-foto'; bt.textContent = 'Atualizar a app';
        bt.onclick = function () { fim(); spapInstalarApp('android'); };
        ov.querySelector('.le-botoes').insertBefore(bt, ov.querySelector('.le-botoes').firstChild);
        ov.querySelector('.le-foto:not(:first-child)') && (ov.querySelector('.le-botoes').lastChild.className = 'le-sec');
      }
    }
    // 1) leitor nativo do telemóvel (mais rápido e certeiro)
    function comNativo() {
      var det;
      try { det = new BarcodeDetector({ formats: FORMATOS }); } catch (e) { return comHtml5(); }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then(function (s) {
          if (parar) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
          fluxo = s; video.srcObject = s; video.play().catch(function () {});
          try {
            var tr = s.getVideoTracks()[0], cap = tr.getCapabilities ? tr.getCapabilities() : {};
            if (cap.torch) { var bl = ov.querySelector('.le-luz'), on = false; bl.hidden = false; bl.onclick = function () { on = !on; tr.applyConstraints({ advanced: [{ torch: on }] }).catch(function () {}); bl.classList.toggle('on', on); }; }
            if (cap.focusMode && cap.focusMode.indexOf('continuous') >= 0) tr.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(function () {});
          } catch (e) {}
          (function ciclo() {
            if (parar || lido) return;
            if (video.readyState >= 2) {
              det.detect(video).then(function (r) { if (r && r.length) sucesso(r[0].rawValue); else setTimeout(ciclo, 120); }).catch(function () { setTimeout(ciclo, 250); });
            } else setTimeout(ciclo, 120);
          })();
        }).catch(semCamara);
    }
    // 2) leitor em JavaScript (para telemóveis sem leitor nativo)
    function comHtml5() {
      if (typeof Html5Qrcode === 'undefined') return semCamara();
      ov.classList.add('le-js');
      var cfg = { fps: 15, qrbox: function (w, h) { var lw = Math.max(160, Math.min(w * .82, 360)); var lh = Math.max(90, Math.min(h * .5, lw * .55)); return { width: Math.round(Math.min(lw, Math.max(w, 160))), height: Math.round(Math.min(lh, Math.max(h, 90))) }; } };
      try {
        var F = window.Html5QrcodeSupportedFormats;
        h5 = F ? new Html5Qrcode('le-html5', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.CODE_93, F.ITF, F.CODABAR, F.QR_CODE], experimentalFeatures: { useBarCodeDetectorIfSupported: true }, verbose: false })
               : new Html5Qrcode('le-html5');
      } catch (e) { h5 = new Html5Qrcode('le-html5'); }
      h5.start({ facingMode: 'environment' }, cfg, sucesso, function () {})
        .catch(function () {
          return Html5Qrcode.getCameras().then(function (cams) {
            if (!cams || !cams.length) throw new Error('sem câmara');
            var c = cams.filter(function (x) { return /back|rear|traseira|environment/i.test(x.label || ''); })[0] || cams[cams.length - 1];
            return h5.start(c.id, cfg, sucesso, function () {});
          });
        }).catch(semCamara);
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return semCamara();
    if ('BarcodeDetector' in window && BarcodeDetector.getSupportedFormats) {
      BarcodeDetector.getSupportedFormats().then(function (f) { if (f && f.indexOf('ean_13') >= 0) comNativo(); else comHtml5(); }).catch(comHtml5);
    } else comHtml5();
  };

  // ===== Câmara: alternativas quando a câmara ao vivo não abre =====
  window.bancaCamaraAlternativa = function (inst, cfg, onCode) {
    if (typeof Html5Qrcode === 'undefined') return Promise.resolve(false);
    return Html5Qrcode.getCameras().then(function (cams) {
      if (!cams || !cams.length) return false;
      var c = cams.filter(function (x) { return /back|rear|traseira|environment|trás/i.test(x.label || ''); })[0] || cams[cams.length - 1];
      return inst.start(c.id, cfg, onCode, function () {}).then(function () { return true; });
    }).catch(function () { return false; });
  };
  window.bancaLerPorFoto = function (cb) {
    if (typeof Html5Qrcode === 'undefined') { if (window.toast) toast('Câmara indisponível', 'erro'); return; }
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment'); inp.style.display = 'none';
    var caixa = document.getElementById('leitor-foto');
    if (!caixa) { caixa = document.createElement('div'); caixa.id = 'leitor-foto'; caixa.style.display = 'none'; document.body.appendChild(caixa); }
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      if (window.toast) toast('🔍 A ler o código…');
      new Html5Qrcode('leitor-foto').scanFile(f, false)
        .then(function (code) { cb(code); })
        .catch(function () { if (window.toast) toast('Não deu para ler o código. Tire outra foto, de perto e com boa luz.', 'erro'); });
    };
    document.body.appendChild(inp);
    if (window.toast) toast('📷 Tire uma foto ao código de barras', 'ok');
    inp.click();
  };

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

  function versaoNasDefinicoes() {
    var f = document.querySelector('#folha-definicoes .conteudo'); if (!f || f.querySelector('.def-versao')) return;
    var d = document.createElement('div'); d.className = 'def-versao notranslate';
    d.textContent = 'Banca · versão ' + EU_VERSAO; f.appendChild(d);
  }
  // ===== Ecrã de carregamento (igual ao das lojas principais): carrinho + contagem em % =====
  (function carregamento() {
    var tc = document.getElementById('carregando'); if (!tc || !tc.classList.contains('tc-banca')) return;
    var t0 = Date.now(), MAX = 6000, MIN = 1600, fechado = false, atual = 0, alvoFim = null, aSair = false;
    var mon = !!document.getElementById('tela-resumo');
    var passos = mon ? [[0, 'A ligar à banca…'], [25, 'A contar as vendas…'], [50, 'A preparar o stock…'], [75, 'A abrir o Monitor…']]
                     : [[0, 'A ligar à banca…'], [25, 'A carregar produtos…'], [50, 'A preparar o carrinho…'], [75, 'A abrir a Venda…']];
    var prog = document.getElementById('tc-prog'), pct = document.getElementById('tc-pct'), msg = document.getElementById('tc-msg');
    function pintar(v, texto) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      if (prog) prog.style.width = v + '%'; if (pct) pct.textContent = v + '%';
      if (msg) { if (!texto) { for (var i = passos.length - 1; i >= 0; i--) if (v >= passos[i][0]) { texto = passos[i][1]; break; } } msg.textContent = texto; }
    }
    var relogio = setInterval(function () {
      if (alvoFim) { var k = Math.min(1, (Date.now() - alvoFim.ini) / alvoFim.dur); atual = alvoFim.de + (100 - alvoFim.de) * k; pintar(atual); return; }
      var t = Date.now() - t0; if (t >= MAX) { pintar(96, 'Quase pronto…'); return; }
      atual = 96 * (1 - Math.pow(1 - t / MAX, 1.7)); pintar(atual);
    }, 60);
    function terminar() {
      if (fechado) return; fechado = true;
      var espera = Math.max(400, MIN - (Date.now() - t0));
      alvoFim = { de: atual, ini: Date.now(), dur: espera };
      setTimeout(function () {
        clearInterval(relogio); pintar(100, 'Pronto!');
        setTimeout(function () { tc.classList.add('tc-partir'); }, 160);
        setTimeout(function () { tc.classList.add('tc-sair'); }, 560);
        setTimeout(function () { aSair = true; tc.style.display = 'none'; }, 920);
      }, espera);
    }
    // a página esconde o ecrã quando os dados chegam: em vez de sumir de repente, a barra termina e o carrinho parte
    new MutationObserver(function () {
      if (aSair) return;
      if (tc.style.display === 'none') { tc.style.display = ''; terminar(); }
    }).observe(tc, { attributes: true, attributeFilter: ['style'] });
    if (tc.style.display === 'none') { tc.style.display = ''; terminar(); }   // os dados chegaram antes desta animação começar
    setTimeout(terminar, 12000);
  })();

  function iniciar() {
    try { marcaTopo(); menuTresBarras(); numerarMenus(); } catch (e) {}
    try { versaoNasDefinicoes(); } catch (e) {}
    document.querySelectorAll('.folha-fundo').forEach(function (f) { f.classList.add('ja-vista'); });
    marcarNaoTraduzir(document.body);
    try { bancaNet(); } catch (e) {}
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

/* ===== Botão «Atualizar» no topo (Banca e Monitor da Banca) — sem precisar de minimizar a app ===== */
(function () {
  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';
  function atualizar(btn) {
    if (btn.classList.contains('gira')) return;
    btn.classList.add('gira');
    if (navigator.onLine === false) {
      // sem internet: recarrega só os dados guardados neste telemóvel
      try { if (typeof atualizarDados === 'function') atualizarDados(); else if (typeof renderProdutos === 'function') renderProdutos(); } catch (e) {}
      try { (window.toast || function () {})('Sem internet — mostrámos os dados deste telemóvel.', 'erro'); } catch (e) {}
      setTimeout(function () { btn.classList.remove('gira'); }, 900);
      return;
    }
    // com internet: recarrega a página toda (dados e versão mais recentes)
    setTimeout(function () { location.reload(); }, 250);
  }
  function por() {
    document.querySelectorAll('.tp-acoes').forEach(function (a) {
      if (a.querySelector('.tp-refresh')) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tp-refresh'; b.title = 'Atualizar'; b.setAttribute('aria-label', 'Atualizar a página');
      b.innerHTML = SVG;
      b.addEventListener('click', function () { atualizar(b); });
      var net = a.querySelector('.tp-net');
      if (net && net.nextSibling) a.insertBefore(b, net.nextSibling); else a.insertBefore(b, a.firstChild);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', por); else por();
})();

/* ===== Funcionar sem internet: a Banca e o Monitor da Banca registam o «service worker»
   (guarda as páginas e os ficheiros no telemóvel para abrirem mesmo offline) ===== */
(function () {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  function reg() { navigator.serviceWorker.register('sw.js').catch(function () {}); }
  if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg);
})();
