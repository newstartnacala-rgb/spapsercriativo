/* SPAP — bloqueio das apps Android antigas.
   Se a app instalada for mais antiga do que a versão mínima, só aparece o ecrã para baixar a versão nova.
   (A versão da app vem do próprio telemóvel: «SPAPApp/<tipo>/<versão>».) */
(function () {
  var MINIMA = { loja: '2.9.222', monitor: '2.9.222', banca: '3.7.14', bancamonitor: '3.7.14' };
  var NOMES = { loja: 'Loja', monitor: 'Monitor', banca: 'Banca e Vendas', bancamonitor: 'Monitor e Banca' };
  var FICH = { loja: 'loja-latest/Loja.apk', monitor: 'loja-latest/Monitor.apk', banca: 'banca-latest/Banca-e-Vendas.apk', bancamonitor: 'banca-latest/Monitor-e-Banca.apk' };
  var REL = 'https://github.com/newstartnacala-rgb/spapsercriativo/releases/download/';

  var m = (navigator.userAgent || '').match(/SPAPApp\/([a-z]+)\/([\d.]+)/i);
  if (!m) return;
  var tipo = m[1].toLowerCase(), ver = m[2];
  if (!MINIMA[tipo]) return;
  function cmp(a, b) {
    a = String(a).split('.'); b = String(b).split('.');
    for (var i = 0; i < Math.max(a.length, b.length); i++) { var d = (parseInt(a[i], 10) || 0) - (parseInt(b[i], 10) || 0); if (d) return d; }
    return 0;
  }
  if (cmp(ver, MINIMA[tipo]) >= 0) return;
  window.SPAP_APP_BLOQUEADA = true;

  var banca = tipo.indexOf('banca') === 0;
  var cor = banca ? '#f2700f' : '#1d4ed8', cor2 = banca ? '#e05c00' : '#4338ca';
  var link = REL + FICH[tipo];
  var css = '#spap-bloqueio{position:fixed;inset:0;z-index:2147483647;background:#eef3fb;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}'
    + '#spap-bloqueio::before{content:"";position:fixed;inset:-20%;pointer-events:none;background:radial-gradient(40% 35% at 15% 20%,rgba(37,99,235,.20),transparent 70%),radial-gradient(35% 30% at 85% 15%,rgba(226,174,74,.30),transparent 70%),radial-gradient(45% 40% at 70% 90%,rgba(99,102,241,.18),transparent 70%);filter:blur(10px);}'
    + '#spap-bloqueio .sb{position:relative;width:100%;max-width:400px;margin:auto;background:#fff;border-radius:28px;padding:26px 22px 22px;text-align:center;box-shadow:0 30px 60px rgba(15,27,61,.16);}'
    + '#spap-bloqueio img{display:block !important;margin:0 auto !important;width:96px !important;height:96px !important;border-radius:50%;object-fit:contain;filter:drop-shadow(0 12px 22px rgba(156,100,22,.4));}'
    + '#spap-bloqueio .sb-selo{display:table;margin-left:auto !important;margin-right:auto !important;margin-top:12px;background:#fef2f2;color:#b91c1c;font-weight:800;font-size:12px;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:6px 12px;}'
    + '#spap-bloqueio h1{margin:12px 0 6px;font-size:22px;font-weight:800;color:#0f1b3d;line-height:1.25;}'
    + '#spap-bloqueio p{margin:0 0 14px;font-size:14.5px;color:#5b6785;line-height:1.55;}'
    + '#spap-bloqueio .sb-ver{display:flex;justify-content:center;gap:8px;margin:0 0 16px;font-size:13px;font-weight:700;}'
    + '#spap-bloqueio .sb-ver span{background:#f1f5f9;color:#475569;border-radius:999px;padding:6px 12px;}'
    + '#spap-bloqueio .sb-ver span b{color:#0f1b3d;}'
    + '#spap-bloqueio a.sb-bt{display:flex;align-items:center;justify-content:center;gap:10px;height:58px;border-radius:16px;color:#fff;text-decoration:none;font-weight:800;font-size:16.5px;background:linear-gradient(135deg,' + cor + ',' + cor2 + ');box-shadow:0 14px 28px rgba(0,0,0,.18);}'
    + '#spap-bloqueio ol{text-align:left;margin:16px 0 0;padding:12px 14px 12px 34px;background:#f8fafc;border-radius:14px;font-size:13.5px;color:#475569;line-height:1.6;}'
    + '#spap-bloqueio .sb-nota{margin-top:12px;font-size:12px;color:#94a3b8;}';
  function mostrar() {
    if (document.getElementById('spap-bloqueio')) return;
    var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);
    var d = document.createElement('div'); d.id = 'spap-bloqueio'; d.className = 'notranslate';
    d.innerHTML = '<div class="sb"><img src="ssteam-logo.png" alt="SSTEAM" onerror="this.style.display=\'none\'">'
      + '<div class="sb-selo">Atualização obrigatória</div>'
      + '<h1>Há uma nova versão da app ' + NOMES[tipo] + '</h1>'
      + '<p>Esta versão já não está disponível. Baixe a nova versão para continuar — os seus dados e a sua conta ficam iguais.</p>'
      + '<div class="sb-ver"><span>Instalada: <b>' + ver + '</b></span><span>Mínima: <b>' + MINIMA[tipo] + '</b></span></div>'
      + '<a class="sb-bt" href="' + link + '">⬇️ Baixar nova versão</a>'
      + '<ol><li>Toque em «Baixar nova versão».</li><li>Quando terminar, abra o ficheiro descarregado.</li><li>Toque em «Atualizar» — não precisa desinstalar.</li></ol>'
      + '<div class="sb-nota">Spap-Sercriativo · SSTEAM</div></div>';
    (document.body || document.documentElement).appendChild(d);
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
  }
  // trava o resto da página: nada por trás funciona
  if (document.body) mostrar(); else document.addEventListener('DOMContentLoaded', mostrar);
  setInterval(function () { if (!document.getElementById('spap-bloqueio')) mostrar(); }, 1000);
  try { document.addEventListener('keydown', function (e) { if (!e.target.closest || !e.target.closest('#spap-bloqueio')) e.stopPropagation(); }, true); } catch (e) {}
})();
