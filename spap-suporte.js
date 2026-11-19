/* SPAP — Suporte técnico (Loja, Banca, Monitores e site).
   Todos os botões/links de suporte abrem uma janela onde a pessoa escolhe: ligar por telefone ou falar no WhatsApp
   (número 86 166 7843). O grupo oficial fica como opção secundária.
   spapAbrirSuporte()  → mostra a janela de escolha.
   Links <a> para o grupo (ou o antigo wa.me do suporte) são apanhados automaticamente. */
(function () {
  var LINK = 'https://chat.whatsapp.com/I8lB2zT6hxfFNJ3xcqJ8Sh?s=cl&p=a&iam=2';
  window.SPAP_SUPORTE = LINK;
  // Canal oficial «Atualizações» no WhatsApp (novidades das apps)
  var CANAL = 'https://whatsapp.com/channel/0029VbEMaws84OmAnGWr0m3c';
  window.SPAP_CANAL_ATUALIZACOES = CANAL;
  // o link guardado no painel só substitui se também for um grupo do WhatsApp
  window.spapLinkSuporte = function (cfg) {
    var v = typeof cfg === 'string' ? cfg.trim() : '';
    return /^https:\/\/chat\.whatsapp\.com\//i.test(v) ? v : LINK;
  };
  var css = ''
    + '#ssp{position:fixed;inset:0;z-index:100070;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,20,14,.58);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .22s;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}'
    + '#ssp.on{opacity:1;}'
    + '#ssp .ssp-c{width:100%;max-width:390px;background:#fff;border-radius:26px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35);transform:translateY(18px) scale(.97);transition:transform .28s cubic-bezier(.2,.9,.3,1);color:#0f172a;}'
    + '#ssp.on .ssp-c{transform:none;}'
    + '.ssp-topo{position:relative;padding:26px 20px 20px;text-align:center;background:radial-gradient(120% 90% at 50% 0%,#34d399 0%,#16a34a 45%,#065f46 100%);color:#fff;}'
    + '.ssp-topo::after{content:"";position:absolute;inset:0;background:radial-gradient(60% 40% at 80% 10%,rgba(255,255,255,.22),transparent 70%);pointer-events:none;}'
    + '.ssp-ico{position:relative;width:76px;height:76px;margin:0 auto 12px;border-radius:24px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);display:grid;place-items:center;box-shadow:0 12px 26px rgba(0,0,0,.18);}'
    + '.ssp-ico svg{width:44px;height:44px;}'
    + '.ssp-ico i{position:absolute;right:-6px;bottom:-6px;width:30px;height:30px;border-radius:50%;background:#fff;color:#16a34a;display:grid;place-items:center;box-shadow:0 4px 10px rgba(0,0,0,.2);}'
    + '.ssp-ico i svg{width:18px;height:18px;}'
    + '.ssp-tit{position:relative;font-size:20px;font-weight:800;letter-spacing:-.01em;}'
    + '.ssp-sub{position:relative;font-size:13px;opacity:.92;margin-top:4px;}'
    + '.ssp-corpo{padding:18px 20px 20px;}'
    + '.ssp-txt{font-size:14px;line-height:1.55;color:#334155;margin:0 0 14px;text-align:center;}'
    + '.ssp-lista{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}'
    + '.ssp-it{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:#f0fdf4;border:1px solid #dcfce7;font-size:13px;color:#14532d;font-weight:600;}'
    + '.ssp-it span{width:30px;height:30px;border-radius:10px;background:#dcfce7;display:grid;place-items:center;flex-shrink:0;}'
    + '.ssp-it svg{width:17px;height:17px;color:#16a34a;}'
    + '.ssp-ok{width:100%;height:54px;border:0;border-radius:16px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 12px 24px rgba(22,163,74,.32);transition:transform .15s;}'
    + '.ssp-ok:active{transform:scale(.98);} .ssp-ok svg{width:22px;height:22px;}'
    + '.ssp-nao{width:100%;height:46px;margin-top:8px;border:0;border-radius:14px;background:#f1f5f9;color:#475569;font-size:14.5px;font-weight:700;font-family:inherit;cursor:pointer;}'
    + '.ssp-nota{text-align:center;font-size:11.5px;color:#94a3b8;margin-top:12px;}'
    + 'html.escuro #ssp{filter:invert(1) hue-rotate(180deg);}';
  var WA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke-width="3"/></svg>';
  var GRUPO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 4.6a3.2 3.2 0 0 1 0 6.2M18 14.8c1.8.7 3 2.6 3 5.2"/></svg>';
  var ESC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
  var CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var APP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>';
  function estilo() { if (document.getElementById('ssp-css')) return; var s = document.createElement('style'); s.id = 'ssp-css'; s.textContent = css; document.head.appendChild(s); }
  function linkFinal() {
    return new Promise(function (ok) {
      var feito = false, fim = function (v) { if (!feito) { feito = true; ok(spapLinkSuporte(v)); } };
      setTimeout(function () { fim(''); }, 1500);
      try {
        if (typeof supabaseClient === 'undefined' || !navigator.onLine) return fim('');
        supabaseClient.from('config_global').select('valor').eq('chave', 'link_suporte_whatsapp').maybeSingle()
          .then(function (r) { var v = r && r.data && r.data.valor; try { v = JSON.parse(v); } catch (e) {} fim(v); }, function () { fim(''); });
      } catch (e) { fim(''); }
    });
  }
  // Número oficial do suporte (chamada e WhatsApp)
  var NUM = '861667843', NUM_INT = '258' + NUM;
  window.SPAP_SUPORTE_TEL = NUM;
  function infoApp() {
    var P = location.pathname;
    var app = /admin/.test(P) ? 'Administração' : /mobile-monitor/.test(P) ? 'Monitor da Banca' : /mobile\.html/.test(P) ? 'Banca' : /monitor/.test(P) ? 'Monitor da Loja' : /login|registo|planos/.test(P) ? 'Entrada' : 'Loja';
    var v = (window.APP_VERSAO || window.MONITOR_VERSAO || window.BANCA_VERSAO || '').toString();
    var loja = '';
    try { var w = window; loja = (w.sessaoAtual && (w.sessaoAtual.nomeEmpresa || w.sessaoAtual.nomeLoja)) || (w.sessao && w.sessao.nomeLoja) || (typeof w.nomeLoja === 'string' ? w.nomeLoja : '') || ''; } catch (e) {}
    return { app: app, versao: v, loja: loja };
  }
  function msgWhats() {
    var i = infoApp();
    return 'Olá, suporte SSTEAM. Preciso de ajuda com a app *' + i.app + '*' + (i.loja ? ' (' + i.loja + ')' : '') + (i.versao ? ' — versão ' + i.versao : '') + '.\nProblema: ';
  }
  var TEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
  var MEGA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var css2 = ''
    + '.ssp-op{display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;border-radius:18px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;text-align:left;font-family:inherit;transition:transform .12s, box-shadow .2s, border-color .2s;margin-bottom:10px;}'
    + '.ssp-op:active{transform:scale(.98);} .ssp-op:hover{border-color:#86efac;box-shadow:0 8px 22px rgba(22,163,74,.12);}'
    + '.ssp-op .ssp-op-ic{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;flex-shrink:0;color:#fff;box-shadow:0 8px 18px rgba(0,0,0,.14);}'
    + '.ssp-op .ssp-op-ic svg{width:26px;height:26px;}'
    + '.ssp-op.ssp-canal .ssp-op-ic{background:linear-gradient(135deg,#14b8a6,#0f766e);} .ssp-op.ssp-tel .ssp-op-ic{background:linear-gradient(135deg,#3b82f6,#1d4ed8);} .ssp-op.ssp-wa .ssp-op-ic{background:linear-gradient(135deg,#22c55e,#15803d);}'
    + '.ssp-op b{display:block;font-size:16px;font-weight:800;color:#0f172a;} .ssp-op small{display:block;font-size:12.5px;color:#64748b;margin-top:2px;line-height:1.35;}'
    + '.ssp-op .ssp-op-seta{margin-left:auto;color:#94a3b8;font-size:22px;line-height:1;}'
    + '.ssp-num{display:inline-flex;align-items:center;gap:8px;margin:0 auto 14px;padding:8px 14px;border-radius:99px;background:#f1f5f9;color:#0f172a;font-weight:900;font-size:18px;letter-spacing:.06em;font-variant-numeric:tabular-nums;}'
    + '.ssp-num i{font-style:normal;font-size:11px;font-weight:800;color:#64748b;letter-spacing:.08em;}'
    + '.ssp-grupo{display:block;width:100%;margin-top:4px;background:none;border:0;color:#16a34a;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer;padding:8px;}'
    + '@media(max-width:380px){.ssp-op b{font-size:15px;} .ssp-op small{font-size:12px;}}';
  // ---- abrir o WhatsApp de forma robusta ----
  function guardarLink(l) { try { if (/^https:\/\/chat\.whatsapp\.com\//i.test(l || '')) localStorage.setItem('spap_link_suporte', l); } catch (e) {} }
  function linkJa(pedido) {
    if (pedido && /chat\.whatsapp\.com/i.test(pedido)) return pedido;
    var l = ''; try { l = localStorage.getItem('spap_link_suporte') || ''; } catch (e) {}
    return spapLinkSuporte(l);
  }
  function ehApp() {
    try { if (typeof spapEhApp === 'function' && spapEhApp()) return true; } catch (e) {}
    return /SPAPApp|; wv\)/.test(navigator.userAgent || '') || !!window.SPAPNative || window.navigator.standalone === true;
  }
  function abrirWhats(l) {
    // Dentro da app: a própria app entrega o link ao WhatsApp e a página fica onde está
    if (ehApp()) { location.href = l; return; }
    var w = null; try { w = window.open(l, '_blank'); } catch (e) {}
    if (!w) location.href = l;
  }
  window.spapAbrirWhatsSuporte = function () { abrirWhats(linkJa('')); };
  window.spapAbrirCanalAtualizacoes = function () { abrirWhats(CANAL); };
  window.spapAbrirSuporte = function (linkPedido) {
    estilo();
    if (!document.getElementById('ssp-css2')) { var s2 = document.createElement('style'); s2.id = 'ssp-css2'; s2.textContent = css2; document.head.appendChild(s2); }
    if (document.getElementById('ssp')) return;
    var d = document.createElement('div'); d.id = 'ssp';
    d.innerHTML = '<div class="ssp-c" role="dialog" aria-modal="true" aria-labelledby="ssp-t">'
      + '<div class="ssp-topo"><div class="ssp-ico">' + CHAT + '<i>' + ESC + '</i></div>'
      + '<div class="ssp-tit" id="ssp-t">Suporte técnico SSTEAM</div><div class="ssp-sub">Como preferes falar connosco?</div></div>'
      + '<div class="ssp-corpo" style="text-align:center;">'
      + '<div class="ssp-num"><i>SUPORTE</i>' + NUM.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3') + '</div>'
      + '<button type="button" class="ssp-op ssp-tel"><span class="ssp-op-ic">' + TEL + '</span><span><b>Ligar por telefone</b><small>Chamada directa para o suporte</small></span><span class="ssp-op-seta">›</span></button>'
      + '<button type="button" class="ssp-op ssp-wa"><span class="ssp-op-ic">' + WA + '</span><span><b>Falar no WhatsApp</b><small>Grupo oficial de suporte — fica registado por escrito</small></span><span class="ssp-op-seta">›</span></button>'
      + '<button type="button" class="ssp-op ssp-canal"><span class="ssp-op-ic">' + MEGA + '</span><span><b>Info. de atualização</b><small>Siga o canal «Atualizações» no WhatsApp</small></span><span class="ssp-op-seta">›</span></button>'
      + '<button type="button" class="ssp-nao">Agora não</button>'
      + '<div class="ssp-nota">Nunca partilhes a tua senha com ninguém</div>'
      + '</div></div>';
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('on'); });
    var pLink = linkPedido && /chat\.whatsapp\.com/i.test(linkPedido) ? Promise.resolve(linkPedido) : linkFinal();
    function fechar() { d.classList.remove('on'); setTimeout(function () { d.remove(); }, 230); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') fechar(); }
    document.addEventListener('keydown', tecla);
    d.addEventListener('click', function (e) { if (e.target === d) fechar(); });
    d.querySelector('.ssp-nao').onclick = fechar;
    d.querySelector('.ssp-op.ssp-tel').onclick = function () { location.href = 'tel:+' + NUM_INT; fechar(); };
    // WhatsApp = o grupo oficial de suporte. Abre logo no toque (sem janelas em branco pelo meio),
    // tanto no navegador como dentro das apps Android/iPhone.
    d.querySelector('.ssp-op.ssp-wa').onclick = function () { abrirWhats(linkJa(linkPedido)); fechar(); };
    pLink.then(function (l) { guardarLink(l); }, function () {});
    d.querySelector('.ssp-op.ssp-canal').onclick = function () { abrirWhats(CANAL); fechar(); };
  };
  // Apanha qualquer link de suporte (o grupo novo ou o antigo número de suporte)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/chat\.whatsapp\.com\/I8lB2zT6hxfFNJ3xcqJ8Sh|wa\.me\/258866577722/i.test(h) || a.hasAttribute('data-suporte')) {
      e.preventDefault();
      spapAbrirSuporte(/chat\.whatsapp\.com/i.test(h) ? h : '');
    }
  }, true);
  // os links antigos passam a apontar para o grupo
  function trocar() { try { document.querySelectorAll('a[href*="wa.me/258866577722"]').forEach(function (a) { a.href = LINK; }); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', trocar); else trocar();
})();
