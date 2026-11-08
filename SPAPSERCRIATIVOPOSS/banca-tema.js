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
      var logo = document.createElement('img'); logo.className = 'tp-logo'; logo.alt = ''; logo.src = 'icons3d/store.png';
      tp.insertBefore(marca, txt); marca.appendChild(logo); marca.appendChild(txt); txt.classList.add('tp-txt');
    });
  }

  function iniciar() {
    try { marcaTopo(); } catch (e) {}
    varrer(document.body);
    try {
      new MutationObserver(function (lista) {
        lista.forEach(function (m) {
          if (m.type === 'characterData') trocarNo(m.target);
          else m.addedNodes.forEach(varrer);
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', '#f4f8ff');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
