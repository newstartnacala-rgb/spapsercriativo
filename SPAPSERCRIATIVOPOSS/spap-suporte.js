/* SPAP — Suporte técnico (Loja, Banca, Monitores e site).
   Todos os botões/links de suporte abrem o grupo oficial do WhatsApp, depois de uma confirmação.
   spapAbrirSuporte()  → mostra a janela e, ao confirmar, abre o grupo.
   Links <a> para o grupo (ou o antigo wa.me do suporte) são apanhados automaticamente. */
(function () {
  var LINK = 'https://chat.whatsapp.com/I8lB2zT6hxfFNJ3xcqJ8Sh?s=cl&p=a&iam=2';
  window.SPAP_SUPORTE = LINK;
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
  window.spapAbrirSuporte = function (linkPedido) {
    estilo();
    if (document.getElementById('ssp')) return;
    var d = document.createElement('div'); d.id = 'ssp';
    d.innerHTML = '<div class="ssp-c" role="dialog" aria-modal="true" aria-labelledby="ssp-t">'
      + '<div class="ssp-topo"><div class="ssp-ico">' + WA + '<i>' + GRUPO + '</i></div>'
      + '<div class="ssp-tit" id="ssp-t">Suporte técnico SSTEAM</div><div class="ssp-sub">Grupo oficial no WhatsApp</div></div>'
      + '<div class="ssp-corpo">'
      + '<p class="ssp-txt">Vais entrar no <b>grupo oficial de suporte</b> da Spap-Sercriativo no WhatsApp. Confirmas?</p>'
      + '<div class="ssp-lista">'
      + '<div class="ssp-it"><span>' + CHAT + '</span>Tira dúvidas e reporta problemas diretamente à equipa</div>'
      + '<div class="ssp-it"><span>' + APP + '</span>Ajuda com a Loja, a Banca e os Monitores</div>'
      + '<div class="ssp-it"><span>' + ESC + '</span>Nunca partilhes a tua senha no grupo</div>'
      + '</div>'
      + '<button type="button" class="ssp-ok">' + WA + 'Entrar no grupo de suporte</button>'
      + '<button type="button" class="ssp-nao">Agora não</button>'
      + '<div class="ssp-nota">Abre o WhatsApp no teu telemóvel ou computador</div>'
      + '</div></div>';
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('on'); });
    var pLink = linkPedido && /chat\.whatsapp\.com/i.test(linkPedido) ? Promise.resolve(linkPedido) : linkFinal();
    function fechar() { d.classList.remove('on'); setTimeout(function () { d.remove(); }, 230); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') fechar(); }
    document.addEventListener('keydown', tecla);
    d.addEventListener('click', function (e) { if (e.target === d) fechar(); });
    d.querySelector('.ssp-nao').onclick = fechar;
    d.querySelector('.ssp-ok').onclick = function () {
      // abre já (dentro do toque) para o telemóvel não bloquear a janela
      var w = null; try { w = window.open('about:blank', '_blank'); } catch (e) {}
      pLink.then(function (l) {
        if (w && !w.closed) { try { w.location.href = l; } catch (e) { location.href = l; } } else location.href = l;
        fechar();
      });
    };
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
