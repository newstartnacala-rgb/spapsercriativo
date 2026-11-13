/* SPAP — Modo vidro (Ponto de Venda da Loja, Monitor da Loja e Monitor da Banca).
   Quando está ligado, TODAS as janelas, folhas e painéis que se abrem ficam em vidro:
   transparentes e desfocados, com o fundo a aparecer por trás.
   Funciona sozinho: vigia a página e põe o efeito em qualquer painel novo que apareça.
   window.spapVidro.ligado()  → true/false
   window.spapVidro.definir(true|false)  → liga/desliga e guarda neste aparelho */
(function () {
  'use strict';
  var P = location.pathname;
  var APP = /mobile-monitor/.test(P) ? 'banca' : /mobile\.html/.test(P) ? 'bancapdv' : /monitor/.test(P) ? 'loja' : 'pdv';
  var BANCA = APP === 'banca' || APP === 'bancapdv';
  var CHAVE = APP === 'pdv' ? 'pdv_m2_vidro' : 'spap_vidro_' + APP;
  function ligado() { try { return localStorage.getItem(CHAVE) === '1'; } catch (e) { return false; } }

  var CSS = ''
    /* cores do vidro (claro por defeito; escuro quando a interface é escura) */
    + 'body.sv{--svc:rgba(255,255,255,.42);--svc2:rgba(255,255,255,.42);--svb:rgba(255,255,255,.7);--svf:rgba(10,16,30,.26);}'
    + 'body.sv.sv-escuro{--svc:rgba(255,255,255,.62);--svc2:rgba(255,255,255,.55);--svb:rgba(255,255,255,.35);--svf:rgba(0,0,0,.4);}'
    + 'body.sv.sv-escuro.gd{--svb:rgba(232,195,106,.22);}'
    /* Ponto de Venda: o fundo colorido da página principal (muda com a interface: Clássica, Dourada Noite/Marfim, escuro) */
    + 'body.sv.gv{--sv-bg:radial-gradient(45% 55% at 12% 18%,var(--gv-a),transparent 70%),radial-gradient(40% 50% at 88% 12%,var(--gv-b),transparent 70%),radial-gradient(55% 60% at 70% 95%,var(--gv-c),transparent 70%),radial-gradient(35% 40% at 30% 85%,var(--gv-b),transparent 70%),var(--gv-base);}'
    /* Atrás de qualquer janela aberta aparece SÓ o fundo colorido da tela inicial (nada de imagens nem textos da página por baixo).
       Uma luz suave no topo e uma sombra leve nos cantos dão profundidade. */
    + 'html body.sv :is(#sv-x,.sv-fundo).sv-fundo,html body.sv.gv.m2-menu-aberto #m2-backdrop{background:var(--svf) !important;-webkit-backdrop-filter:blur(3px) !important;backdrop-filter:blur(3px) !important;animation:svEntra .22s ease both;}'
    + 'html body.sv #gd-pers{background:var(--svf) !important;}'
    + 'html body.sv #gd-pers .gp-caixa{background:linear-gradient(rgba(255,255,255,.45),rgba(255,255,255,.45)),var(--sv-bg) !important;background-attachment:local,fixed !important;}'
    + '@keyframes svEntra{from{opacity:0}to{opacity:1}}'
    /* páginas que cobrem o ecrã todo (sem caixa por dentro): ficam com o mesmo fundo */
    + 'html body.sv :is(#sv-x,.sv-pagina).sv-pagina{background:var(--sv-bg,linear-gradient(180deg,#e9eef7,#dfe7f3)) !important;background-attachment:fixed !important;}'
    + 'html body.sv .sv-pagina :is(#sv-x,.sv-limpo).sv-limpo{background-color:transparent !important;box-shadow:none !important;border-color:transparent !important;}'
    + 'html body.sv .sv-pagina :is(#sv-x,.sv-dentro).sv-dentro{background-color:var(--svc) !important;-webkit-backdrop-filter:blur(18px) saturate(1.6);backdrop-filter:blur(18px) saturate(1.6);}'
    /* a caixa da janela / folha / painel */
    + 'html body.sv :is(#sv-x,.sv-caixa).sv-caixa.sv-caixa{background:linear-gradient(var(--svc),var(--svc)),radial-gradient(120% 70% at 50% -10%,rgba(255,255,255,.35),transparent 60%),var(--sv-bg,linear-gradient(180deg,#e9eef7,#dfe7f3)) !important;background-attachment:local,local,fixed !important;-webkit-backdrop-filter:blur(26px) saturate(1.8) !important;backdrop-filter:blur(26px) saturate(1.8) !important;'
    + 'border:1px solid var(--svb) !important;box-shadow:0 28px 70px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.45) !important;}'
    /* dentro do vidro, os blocos brancos ficam meio-transparentes (continuam a ler-se bem) */
    + 'html body.sv .sv-caixa :is(#sv-x,.sv-dentro).sv-dentro.sv-dentro{background-color:var(--svc2) !important;background-image:none !important;border-color:var(--svb) !important;}'
    /* Monitores: fundo colorido por trás do vidro e cartões em vidro */
    + 'body.sv.sv-mon{--sv-bg:radial-gradient(45% 50% at 10% 15%,rgba(59,130,246,.42),transparent 70%),radial-gradient(40% 45% at 90% 10%,rgba(168,85,247,.32),transparent 70%),radial-gradient(55% 55% at 75% 95%,rgba(16,185,129,.36),transparent 70%),radial-gradient(35% 40% at 25% 85%,rgba(236,72,153,.22),transparent 70%),linear-gradient(180deg,#eef3fb,#e7eefa);background:var(--sv-bg) !important;background-attachment:fixed !important;}'
    + 'body.sv.sv-mon.sv-banca{--sv-bg:radial-gradient(45% 50% at 10% 15%,rgba(249,115,22,.4),transparent 70%),radial-gradient(40% 45% at 90% 10%,rgba(59,130,246,.32),transparent 70%),radial-gradient(55% 55% at 75% 95%,rgba(236,72,153,.28),transparent 70%),radial-gradient(35% 40% at 25% 85%,rgba(250,204,21,.25),transparent 70%),linear-gradient(180deg,#f6f2ee,#eef1f8);}'
    + 'html:has(body.sv.sv-mon){background:transparent !important;}'
    + 'html body.sv.sv-mon :is(#sv-x,.sv-cartao).sv-cartao{background-color:rgba(255,255,255,.46) !important;background-image:none !important;-webkit-backdrop-filter:blur(16px) saturate(1.6);backdrop-filter:blur(16px) saturate(1.6);border-color:rgba(255,255,255,.7) !important;}'
    + 'html body.sv.sv-mon :is(#sv-x,.sv-barra).sv-barra{background:rgba(255,255,255,.55) !important;-webkit-backdrop-filter:blur(20px) saturate(1.7) !important;backdrop-filter:blur(20px) saturate(1.7) !important;border-color:rgba(255,255,255,.65) !important;}';

  function estilos() {
    if (document.getElementById('sv-css')) return;
    var s = document.createElement('style'); s.id = 'sv-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---- deteção dos painéis ---- */
  var NAO = '#m2-sidebar,#m2-backdrop,#sal-sino,#sal-sino *,.m2-voar,#gd-pers,#gd-pers *,[data-sv-nao]';
  var SUSPEITOS = '.modal-fundo,.menu-overlay,[class*="overlay"],[class*="fundo"],[id*="fundo"],[id*="modal"],[class*="modal"],[class*="sheet"],[class*="folha"],[class*="painel"],[role="dialog"],[aria-modal="true"]';
  function opaco(cs) {
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    var m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor || ''); if (!m) return false;
    var p = m[1].split(','); var a = p.length > 3 ? parseFloat(p[3]) : 1; return a > 0.6;
  }
  function visivel(e, cs) { return cs.display !== 'none' && cs.visibility !== 'hidden' && e.getClientRects().length > 0; }
  function ecraTodo(r) { return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.85; }
  // dentro de um fundo de ecrã inteiro, procura a caixa (o primeiro bloco opaco que não ocupa o ecrã todo)
  function caixaDe(fundo) {
    var fila = [[fundo, 0]];
    while (fila.length) {
      var x = fila.shift(), e = x[0], d = x[1];
      for (var i = 0; i < e.children.length; i++) {
        var c = e.children[i]; if (c.matches(NAO)) continue;
        var cs = getComputedStyle(c); if (!visivel(c, cs)) continue;
        var r = c.getBoundingClientRect();
        if (opaco(cs) && r.width > 120 && r.height > 60) return c;   // a caixa (pode ocupar o ecrã todo, como o pagamento)
        if (d < 3) fila.push([c, d + 1]);
      }
    }
    return null;
  }
  // blocos brancos dentro da caixa (cartões internos, listas) → meio-transparentes
  function dentro(cx, pagina) {
    var l = cx.querySelectorAll('div,section,label,li,ul,aside,header,footer,button,a');
    for (var i = 0; i < l.length && i < 500; i++) {
      var e = l[i]; if (e.classList.contains('sv-dentro') || e.classList.contains('sv-limpo')) continue;
      var cs = getComputedStyle(e);
      if (!opaco(cs) || cs.backgroundImage !== 'none') continue;          // cabeçalhos com cor/imagem ficam como estão
      var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cs.backgroundColor || '');
      if (!(m && +m[1] > 225 && +m[2] > 225 && +m[3] > 225)) continue;   // só os blocos brancos/claros
      // numa página inteira, os contentores da largura toda ficam limpos (sem caixa); barras fixas ficam em vidro
      if (pagina && e.getBoundingClientRect().width >= innerWidth * 0.97 && cs.position !== 'sticky' && cs.position !== 'fixed') e.classList.add('sv-limpo');
      else e.classList.add('sv-dentro');
    }
  }
  function marcar() {
    if (!document.body || !document.body.classList.contains('sv')) return;
    var vistos = [];
    var lista = Array.prototype.slice.call(document.body.children);
    try { lista = lista.concat(Array.prototype.slice.call(document.querySelectorAll(SUSPEITOS))); } catch (e) {}
    for (var i = 0; i < lista.length; i++) {
      var e = lista[i]; if (vistos.indexOf(e) >= 0) continue; vistos.push(e);
      if (e.matches(NAO) || /^(SCRIPT|STYLE|LINK|META)$/.test(e.tagName)) continue;
      var cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
      if (!visivel(e, cs)) continue;
      var r = e.getBoundingClientRect();
      if (cs.position === 'fixed' && ecraTodo(r)) {
        // (decide só uma vez: depois de marcado, o nosso próprio fundo não conta como «opaco»)
        if (!e.classList.contains('sv-fundo') && (e.classList.contains('sv-pagina') || (opaco(cs) && e.children.length))) {
          // página de ecrã inteiro (sub-painéis, ecrãs de gestão): fundo da tela inicial e blocos em vidro
          e.classList.remove('sv-fundo'); e.classList.add('sv-pagina');
          var errados = e.querySelectorAll('.sv-caixa'); for (var k = 0; k < errados.length; k++) { if (getComputedStyle(errados[k]).position !== 'fixed') errados[k].classList.remove('sv-caixa'); }
          dentro(e, true);
        } else {
          // janela com fundo escurecido: o fundo passa a ser o da tela inicial e a caixa fica em vidro
          e.classList.add('sv-fundo');
          var cx = caixaDe(e); if (cx && !cx.closest('.sv-pagina')) { cx.classList.add('sv-caixa'); dentro(cx); }
        }
      } else if (cs.position === 'fixed' && opaco(cs) && r.width > 160 && r.height > 90 && !e.closest('#modo2-app')) {
        e.classList.add('sv-caixa'); dentro(e);   // folhas que sobem de baixo, menus soltos, avisos grandes
      }
    }
  }
  // cabeçalhos com letra branca vivem do seu fundo de cor: nunca os pôr em vidro (a letra deixaria de se ler)
  function letraClara(e) { var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(e).color || ''); return !!m && (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) > 215; }
  function limparClaros() { var l = document.querySelectorAll('.sv-caixa,.sv-dentro'); for (var i = 0; i < l.length; i++) { if (!l[i].closest('#gd-pers') && letraClara(l[i])) l[i].classList.remove('sv-caixa', 'sv-dentro'); } }
  var _t = null;
  function agendar() { if (_t) return; _t = setTimeout(function () { _t = null; try { marcar(); limparClaros(); } catch (e) {} }, 80); }

  /* ---- monitores: cartões e barras principais ---- */
  var CARTOES = APP === 'bancapdv' ? '#grelha .card,.barra-carrinho,.lista-vendas .venda,.bv-venda'
    : APP === 'banca'
    ? '.tela .cartao,.tela .stat,.tela .bv-venda,.tela .graf-card,.tela .item,.tela .rt-kpi,.tela .cat-item,.tela .row,.tela .seg-caixa,.tela .bj,.tela .pl-card,.tela .bv-card,.tela .sc-item,.periodo button:not(.on),.tela .data-escolha'
    : '#app .kpi,#app .card,#app .card-gestao,#app .venda-item,#app .ct-card,#app .sc-item,#app .sc-tile,#app .gc-card,#app .btn-filtro-data,#app .indicador-live,#app .section,#app .box';
  var BARRAS = APP === 'bancapdv' ? '.topo,.tp-acoes' : APP === 'banca' ? '.tela > .topo,.nav,.tp-acoes' : '#app .topbar,.bottom-nav,.nav-bottom,.nav-tabs';
  function marcarMonitor() {
    if (APP === 'pdv' || !document.body || !document.body.classList.contains('sv')) return;
    try { document.querySelectorAll(CARTOES).forEach(function (e) { e.classList.add('sv-cartao'); }); } catch (e) {}
    try { document.querySelectorAll(BARRAS).forEach(function (e) { e.classList.add('sv-barra'); }); } catch (e) {}
  }

  function aplicar(on) {
    if (on === undefined) on = ligado();
    estilos();
    var b = document.body; if (!b) return;
    b.classList.toggle('sv', !!on);
    if (APP === 'pdv') b.classList.toggle('gv', !!on);    // nome usado pelo estilo da interface do Ponto de Venda
    else { b.classList.toggle('sv-mon', !!on); b.classList.toggle('sv-banca', BANCA); }
    // vidro escuro quando a interface é escura (Dourada Noite ou modo Escuro)
    b.classList.toggle('sv-escuro', !!on && APP === 'pdv' && (b.classList.contains('m2-escuro') || (b.classList.contains('gd') && !b.classList.contains('gd-marfim'))));
    if (on) { marcar(); marcarMonitor(); }
  }
  window.spapVidro = {
    ligado: ligado,
    definir: function (on) { try { localStorage.setItem(CHAVE, on ? '1' : '0'); } catch (e) {} aplicar(!!on); },
    aplicar: aplicar
  };

  function iniciar() {
    aplicar();
    new MutationObserver(function () { if (document.body.classList.contains('sv')) { agendar(); if (APP !== 'pdv') { clearTimeout(iniciar._m); iniciar._m = setTimeout(marcarMonitor, 120); } } })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'open', 'hidden'] });
    // a interface pode mudar de clara para escura: acerta a cor do vidro
    new MutationObserver(function () { var b = document.body; if (b.classList.contains('sv')) { var e = APP === 'pdv' && (b.classList.contains('m2-escuro') || (b.classList.contains('gd') && !b.classList.contains('gd-marfim'))); if (b.classList.contains('sv-escuro') !== e) b.classList.toggle('sv-escuro', e); } })
      .observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  estilos();
  if (document.body && ligado()) document.body.classList.add('sv');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
