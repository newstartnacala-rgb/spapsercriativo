/* SPAP — ATUALIZAÇÃO AUTOMÁTICA SEM PERGUNTAS.
   Mostra só um aviso discreto «A atualizar…» (sem janelas nem botões) enquanto:
   • a app Android baixa a versão nova (progresso vindo da app: window.__spapAppProgresso);
   • o site passa para a versão nova (spapAtualizando.quandoLivre → espera que não haja venda/janela aberta).
   ES2017 (computadores antigos). */
(function () {
  'use strict';
  if (window.spapAtualizando) return;
  var CSS = '#spap-att{position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483646;'
    + 'display:flex;align-items:center;gap:10px;background:rgba(15,23,42,.92);color:#fff;font:600 14px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;'
    + 'padding:10px 16px 10px 12px;border-radius:999px;box-shadow:0 10px 28px rgba(2,6,23,.28);pointer-events:none;animation:spapAttIn .25s ease;max-width:calc(100vw - 24px)}'
    + '#spap-att span{display:flex;align-items:center;gap:10px}'
    + '#spap-att i{width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,.3);border-top-color:#f5c542;animation:spapAttG .8s linear infinite;flex:0 0 auto}'
    + '#spap-att b{font-weight:700;white-space:nowrap}#spap-att small{opacity:.75;font-weight:600}'
    + '#spap-att.tela{top:0;left:0;right:0;bottom:0;transform:none;border-radius:0;justify-content:center;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);pointer-events:auto;max-width:none}'
    + '#spap-att.tela span{display:flex;align-items:center;gap:10px;background:rgba(15,23,42,.94);padding:14px 20px 14px 16px;border-radius:999px;box-shadow:0 10px 28px rgba(2,6,23,.3)}'
    + '@keyframes spapAttG{to{transform:rotate(360deg)}}@keyframes spapAttIn{from{opacity:0;margin-top:-10px}}';
  function estilo() { if (document.getElementById('spap-att-css')) return; var s = document.createElement('style'); s.id = 'spap-att-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
  // tela=true: cobre o ecrã (o site vai recarregar já); tela=false: só a pílula no topo (pode continuar a trabalhar)
  function mostrar(texto, tela) {
    estilo();
    var d = document.getElementById('spap-att');
    if (!d) { d = document.createElement('div'); d.id = 'spap-att'; d.setAttribute('role', 'status'); d.innerHTML = '<span><i></i><b></b></span>'; (document.body || document.documentElement).appendChild(d); }
    d.className = tela ? 'tela' : '';
    d.querySelector('b').textContent = texto || 'A atualizar…';
    try { var n = document.getElementById('spap-att-nativo'); if (n) n.remove(); } catch (e) {}
    return d;
  }
  function esconder() { var d = document.getElementById('spap-att'); if (d) d.remove(); }

  // Há venda a decorrer, texto a ser escrito ou alguma janela aberta? (então espera)
  function ocupadoPadrao() {
    try { if (typeof carrinho !== 'undefined' && carrinho && carrinho.length) return true; } catch (e) {}
    try {
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'search' && String(a.value || '').length) return true;
    } catch (e) {}
    var sel = '.modal-fundo.ativo,.modal.ativo,.modal.aberto,.modal.show,.folha-fundo.ativa,.overlay.ativo,#menu-overlay.ativo,.modal-overlay.ativo,.modal-bg.ativo';
    var els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) { if (els[i].id !== 'spap-att' && els[i].offsetParent !== null) return true; }
    return false;
  }
  var _espera = null;
  // corre «acao» assim que o aparelho estiver livre (verifica de 3 em 3 s); mostra «A atualizar…» antes
  function quandoLivre(acao, ocupado) {
    ocupado = ocupado || ocupadoPadrao;
    clearInterval(_espera);
    var tentar = function () {
      var o = true; try { o = ocupado(); } catch (e) { o = false; }
      if (o) return false;
      clearInterval(_espera);
      mostrar('A atualizar…', true);
      setTimeout(function () { try { acao(); } catch (e) { location.reload(); } }, 600);
      return true;
    };
    if (!tentar()) _espera = setInterval(tentar, 3000);
  }

  // Progresso da app Android (baixar o APK novo)
  var antes = window.__spapAppProgresso;
  window.__spapAppProgresso = function (pct, estado) {
    try { if (typeof antes === 'function') antes(pct, estado); } catch (e) {}
    if (estado === 'erro') { esconder(); return; }
    if (estado === 'permissao') { mostrar('Permita instalar para atualizar'); return; }
    if (estado === 'instalar') { mostrar('A atualizar…'); setTimeout(esconder, 8000); return; }
    mostrar('A atualizar… ' + Math.max(0, Math.min(100, Math.round(pct))) + '%');
  };
  // páginas que redefinem __spapAppProgresso depois deste script: voltam a passar por aqui
  try {
    var meu = window.__spapAppProgresso;
    Object.defineProperty(window, '__spapAppProgresso', {
      configurable: true,
      get: function () { return meu; },
      set: function (f) { var outro = f; meu = function (p, e) { try { outro(p, e); } catch (x) {} try { _proprio(p, e); } catch (x) {} }; }
    });
    var _proprio = function (pct, estado) {
      if (estado === 'erro') { esconder(); return; }
      if (estado === 'permissao') { mostrar('Permita instalar para atualizar'); return; }
      if (estado === 'instalar') { mostrar('A atualizar…'); setTimeout(esconder, 8000); return; }
      mostrar('A atualizar… ' + Math.max(0, Math.min(100, Math.round(pct))) + '%');
    };
  } catch (e) {}

  window.spapAtualizando = { mostrar: mostrar, esconder: esconder, quandoLivre: quandoLivre, ocupado: ocupadoPadrao };
})();
