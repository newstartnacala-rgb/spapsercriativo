/* SPAP — App para Windows (PC).
   Só no navegador de um computador Windows (nunca dentro das apps):
   • nas Definições (engrenagem) da Loja, Monitor, Banca e Monitor da Banca aparece «App para Windows (PC)»;
   • nas páginas de entrada e no website aparece uma engrenagem dourada para baixar a app.
   A app de computador instala-se sem pedir administrador, funciona sem internet e actualiza-se sozinha. */
(function () {
  'use strict';
  var URL_PC = 'https://github.com/newstartnacala-rgb/spapsercriativo/releases/download/pc-latest/SPAP-Sercriativo-Setup.exe';
  var URL_VER = 'https://newstartnacala-rgb.github.io/spapsercriativo/apps/app-pc-version.json';
  var ua = navigator.userAgent || '';

  function ehApp() { return /SPAPApp|SPAPDesktop/i.test(ua) || !!window.SPAPNative || window.navigator.standalone === true; }
  function ehWindows() { return /Windows NT/i.test(ua) && !/Windows Phone|IEMobile|Mobile/i.test(ua); }
  window.spapEhWindowsWeb = function () { return ehWindows() && !ehApp(); };

  var WIN = '<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path fill="currentColor" d="M3 5.3 10.6 4.2v7.1H3zm8.6-1.25L21 2.7v8.6h-9.4zM3 12.6h7.6v7.2L3 18.7zm8.6 0H21v8.7l-9.4-1.35z"/></svg>';
  var GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true" width="26" height="26"><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.6 7.6 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .2.2.4.5.4h4c.3 0 .5-.2.5-.4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>';

  function estilos() {
    if (document.getElementById('spap-pc-css')) return;
    var s = document.createElement('style'); s.id = 'spap-pc-css';
    s.textContent =
      '#spap-pc-modal{position:fixed;inset:0;z-index:2147483600;background:rgba(10,10,16,.62);display:flex;align-items:center;justify-content:center;padding:18px;font-family:"Segoe UI",system-ui,Roboto,Arial,sans-serif;animation:spcF .18s ease}' +
      '@keyframes spcF{from{opacity:0}to{opacity:1}}@keyframes spcS{from{transform:translateY(14px) scale(.98);opacity:0}to{transform:none;opacity:1}}' +
      '#spap-pc-modal .pc-c{position:relative;width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#16161e;color:#f8f5ee;border:1px solid rgba(243,210,122,.28);border-radius:26px;padding:26px 26px 20px;box-shadow:0 30px 80px rgba(0,0,0,.55);animation:spcS .22s ease}' +
      '#spap-pc-modal .pc-c::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;border-radius:26px 26px 0 0;background:linear-gradient(90deg,#f3d27a,#c99a3b,#0078d4)}' +
      '#spap-pc-modal .pc-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:transparent;color:#cbd5e1;font-size:18px;cursor:pointer}' +
      '#spap-pc-modal .pc-top{display:flex;gap:16px;align-items:center;margin-bottom:12px}' +
      '#spap-pc-modal .pc-ico{width:64px;height:64px;border-radius:18px;flex-shrink:0;display:grid;place-items:center;background:linear-gradient(135deg,#1f1f29,#2a2a36);border:2px solid #d6aa46;color:#f3d27a;box-shadow:0 10px 26px rgba(0,0,0,.45)}' +
      '#spap-pc-modal .pc-ico svg{width:34px;height:34px}' +
      '#spap-pc-modal h3{margin:0;font-size:22px;font-weight:800;line-height:1.2}#spap-pc-modal h3 b{color:#f3d27a}' +
      '#spap-pc-modal .pc-sub{margin:4px 0 0;color:#b9b2a3;font-size:14px;line-height:1.45}' +
      '#spap-pc-modal .pc-chips{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0 16px}' +
      '#spap-pc-modal .pc-chips span{font-size:12px;font-weight:700;color:#f3d27a;border:1px solid rgba(243,210,122,.3);background:rgba(243,210,122,.07);padding:6px 10px;border-radius:999px}' +
      '#spap-pc-modal .pc-baixar{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;box-sizing:border-box;text-decoration:none;border-radius:16px;padding:15px;font-size:16px;font-weight:800;color:#15151d;background:linear-gradient(90deg,#f3d27a,#c99a3b);box-shadow:0 12px 28px rgba(201,154,59,.35);cursor:pointer}' +
      '#spap-pc-modal .pc-baixar:hover{filter:brightness(1.05)}' +
      '#spap-pc-modal .pc-ver{text-align:center;color:#8f897c;font-size:12px;margin:8px 0 4px}' +
      '#spap-pc-modal ol{list-style:none;counter-reset:p;margin:14px 0 6px;padding:0}' +
      '#spap-pc-modal ol li{counter-increment:p;display:flex;gap:10px;align-items:flex-start;padding:8px 0;font-size:14px;line-height:1.4;color:#e7e2d6;border-top:1px solid rgba(255,255,255,.06)}' +
      '#spap-pc-modal ol li::before{content:counter(p);flex-shrink:0;width:24px;height:24px;border-radius:50%;background:#c99a3b;color:#15151d;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}' +
      '#spap-pc-modal ol b{color:#f3d27a}' +
      '#spap-pc-modal .pc-nao{display:block;width:100%;border:0;background:none;color:#9ca3af;font-size:14px;padding:12px 0 2px;cursor:pointer;font-family:inherit}' +
      '#spap-pc-eng{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;align-items:center;gap:0;border:0;padding:0;background:none;cursor:pointer;font-family:"Segoe UI",system-ui,Arial,sans-serif}' +
      '#spap-pc-eng .eg{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;color:#15151d;background:linear-gradient(135deg,#f6dc8c,#c99a3b);box-shadow:0 10px 26px rgba(150,110,30,.45),inset 0 1px 0 rgba(255,255,255,.6);border:2px solid rgba(255,255,255,.7)}' +
      '#spap-pc-eng .eg svg{animation:spcR 9s linear infinite}@keyframes spcR{to{transform:rotate(360deg)}}' +
      '#spap-pc-eng .et{order:-1;margin-right:-14px;padding:9px 24px 9px 14px;border-radius:999px 0 0 999px;background:#16161e;color:#f8f5ee;font-weight:700;font-size:13px;box-shadow:0 8px 22px rgba(0,0,0,.3);display:flex;align-items:center;gap:7px;white-space:nowrap}' +
      '#spap-pc-eng .et svg{color:#5eb3ff;width:16px;height:16px}' +
      '#spap-pc-eng:hover .eg{filter:brightness(1.06)}#spap-pc-eng:active .eg{transform:scale(.95)}' +
      '@media (max-width:640px){#spap-pc-eng .et{display:none}}' +
      '@media (prefers-reduced-motion:reduce){#spap-pc-eng .eg svg{animation:none}}' +
      '.def-plat.def-windows{background:#e0f0ff;color:#0078d4}' +
      '.spap-pc-mi .e svg{width:1.15em;height:1.15em;color:#0078d4;vertical-align:-.15em}' +
      '#m2-instalar-pc .ico svg{width:18px;height:18px;color:currentColor}' +
      'body.modo2 #m2-sidebar #m2-instalar-pc{margin:0 0 6px;background:linear-gradient(135deg,rgba(245,197,66,.28),rgba(200,144,26,.16)) !important;border:1px solid rgba(245,197,66,.55) !important}' +
      'body.modo2 #m2-sidebar #m2-instalar-pc .ico{background:linear-gradient(145deg,#f7d46b,#c8901a) !important;color:#1a1405 !important;border-color:#f5c542 !important}';
    (document.head || document.documentElement).appendChild(s);
  }

  window.spapBaixarPC = function () {
    estilos();
    var v = document.getElementById('spap-pc-modal'); if (v) v.remove();
    var m = document.createElement('div'); m.id = 'spap-pc-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="pc-c">' +
      '<button type="button" class="pc-x" aria-label="Fechar">✕</button>' +
      '<div class="pc-top"><div class="pc-ico">' + WIN + '</div><div><h3>SPAP Sercriativo <b>para Windows</b></h3>' +
      '<p class="pc-sub">Instale no computador: abre como um programa, funciona sem internet e actualiza-se sozinho.</p></div></div>' +
      '<div class="pc-chips"><span>Windows 7, 8, 10 e 11</span><span>Actualiza-se sozinho</span><span>Funciona sem internet</span><span>Loja · Monitor · Banca</span></div>' +
      '<a class="pc-baixar" href="' + URL_PC + '" download>' + WIN + ' Baixar para Windows</a>' +
      '<div class="pc-ver">Ficheiro: SPAP-Sercriativo-Setup.exe</div>' +
      '<ol><li><span>Clique em <b>Baixar para Windows</b> e espere o download terminar.</span></li>' +
      '<li><span>Abra o ficheiro <b>SPAP-Sercriativo-Setup.exe</b>.</span></li>' +
      '<li><span>Se o Windows mostrar «O Windows protegeu o computador», clique em <b>Mais informações</b> e depois <b>Executar assim mesmo</b>.</span></li>' +
      '<li><span>A app instala-se e abre sozinha. Fica um atalho <b>SPAP Sercriativo</b> no Ambiente de Trabalho. Escolha a app (Loja, Monitor, Banca…) e entre como de costume.</span></li></ol>' +
      '<button type="button" class="pc-nao">Agora não</button></div>';
    function fechar() { m.remove(); document.removeEventListener('keydown', esc, true); }
    function esc(e) { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } }
    m.addEventListener('click', function (e) { if (e.target === m) fechar(); });
    m.querySelector('.pc-x').onclick = fechar; m.querySelector('.pc-nao').onclick = fechar;
    document.addEventListener('keydown', esc, true);
    document.body.appendChild(m);
    try {
      fetch(URL_VER + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (j && j.versao) { var el = m.querySelector('.pc-ver'); if (el) el.textContent = 'Versão ' + j.versao + (j.data ? ' · publicada a ' + String(j.data).split('-').reverse().join('/') : '') + ' · SPAP-Sercriativo-Setup.exe'; }
      }).catch(function () {});
    } catch (e) {}
  };

  // ---- entradas nas Definições (engrenagem) de cada app ----
  function depoisDe(ref, novo) { if (ref && ref.parentNode && !document.getElementById(novo.id)) ref.parentNode.insertBefore(novo, ref.nextSibling); }
  function porOnclick(sel, txt) { var l = document.querySelectorAll(sel); for (var i = 0; i < l.length; i++) { if ((l[i].getAttribute('onclick') || '').indexOf(txt) >= 0) return l[i]; } return null; }
  function inserirNasDefinicoes() {
    // Loja (interface nova): menu lateral → Opções
    var ios = document.getElementById('m2-instalar-ios');
    if (ios) {
      var a = document.createElement('div'); a.className = 'm2-nav m2-sub m2-app-op'; a.id = 'm2-instalar-pc';
      a.setAttribute('onclick', "document.body.classList.remove('m2-menu-aberto'); spapBaixarPC();");
      a.innerHTML = '<span class="ico">' + WIN + '</span><span>App para Windows (PC)</span>';
      depoisDe(ios, a);
    }
    // Monitor da Loja: Definições
    var mon = porOnclick('button.def-item', "instalarAppMonitor('ios')");
    if (mon) {
      var b = document.createElement('button'); b.className = 'def-item'; b.id = 'def-instalar-pc';
      b.setAttribute('onclick', 'fecharDefinicoes();spapBaixarPC()');
      b.innerHTML = '<span class="def-plat def-windows">' + WIN + '</span><span>App para Windows (PC)</span><i class="def-seta"></i>';
      depoisDe(mon, b);
    }
    // Banca e Monitor da Banca: Definições
    var bi = porOnclick('.mi', "('ios')");
    if (bi) {
      var c = document.createElement('div'); c.className = 'mi spap-pc-mi'; c.id = 'mi-instalar-pc';
      c.setAttribute('onclick', "fecharFolha('folha-definicoes');spapBaixarPC()");
      c.innerHTML = '<div class="e">' + WIN + '</div><div class="t">App para Windows (PC)</div>';
      depoisDe(bi, c);
    }
  }

  // ---- engrenagem dourada (páginas de entrada e website) ----
  function engrenagem() {
    if (document.getElementById('spap-pc-eng')) return;
    var p = (location.pathname || '').toLowerCase();
    var mostrar = /(login|login-banca|registo|registo-banca|planos|planos-banca)\.html?$/.test(p) || /vendassteam/.test(p) || document.documentElement.hasAttribute('data-spap-pc-engrenagem');
    if (!mostrar) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'spap-pc-eng'; b.title = 'Baixar o SPAP Sercriativo para Windows';
    b.setAttribute('aria-label', 'Baixar a app para Windows');
    b.innerHTML = '<span class="eg">' + GEAR + '</span><span class="et">' + WIN + ' App para Windows</span>';
    b.onclick = window.spapBaixarPC;
    document.body.appendChild(b);
  }

  function iniciar() {
    if (!window.spapEhWindowsWeb()) return;
    estilos(); inserirNasDefinicoes(); engrenagem();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  // algumas Definições são desenhadas mais tarde
  setTimeout(function () { if (window.spapEhWindowsWeb()) inserirNasDefinicoes(); }, 2500);
})();
