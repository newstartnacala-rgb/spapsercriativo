/* SPAP Banca — tema moderno: troca os emojis por ícones 3D (os mesmos da
   plataforma principal) e monta a marca no cabeçalho. Não muda funções. */
(function () {
  var MAPA = {
    '🛒': 'cart', '📦': 'package', '🧾': 'receipt', '↩️': 'refresh', '↩': 'refresh', '🚚': 'truck', '🌐': 'globe',
    '💬': 'chat', '🚪': 'door', '📊': 'barchart', '🏷️': 'label', '🏷': 'label', '📈': 'chartup', '📉': 'chartdown',
    '🔎': 'lupa-r', '🔍': 'lupa-r', '➕': 'plus', '👤': 'person', '🔧': 'ferramentas', '🪪': 'person', '💾': 'floppy',
    '📲': 'install', '💰': 'moneybag', '⚠️': 'warning', '⚠': 'warning', '💼': 'bank', '💸': 'dinheiro-voa',
    '📅': 'calendar', '🏪': 'store', '📧': 'envelope', '🔑': 'key', '📱': 'telemovel', '🔁': 'refresh',
    '🔐': 'cadeado', '💳': 'card', '📷': 'camera', '💵': 'dinheiro-voa', '✅': 'check', '🖨️': 'page', '🖨': 'page',
    '🗑': 'lixo', '🗑️': 'lixo', '☰': null, '📩': 'envelope', '⏳': 'hourglass', '🚫': 'prohibited', '🔒': 'cadeado',
    '📋': 'clipboard', '🔔': 'bell', '⭐': 'star', '🏆': 'trophy', '📌': 'pin'
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

  function iniciar() {
    try { marcaTopo(); menuTresBarras(); numerarMenus(); } catch (e) {}
    if (document.getElementById('tela-resumo')) document.body.classList.add('pg-mon');
    if (document.getElementById('tela-vender')) document.body.classList.add('pg-vender');
    document.addEventListener('pointerdown', ripple, true);
    document.addEventListener('click', animarProduto, true);
    varrer(document.body);
    try {
      new MutationObserver(function (lista) {
        lista.forEach(function (m) {
          if (m.type === 'characterData') trocarNo(m.target);
          else { m.addedNodes.forEach(varrer); if (m.addedNodes.length) { try { numerarMenus(); } catch (e) {} } }
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', '#f4f8ff');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
