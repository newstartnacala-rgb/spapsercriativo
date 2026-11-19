/* SPAP — navegador demasiado antigo? (escrito em JavaScript antigo, de propósito, para correr em qualquer navegador)
   A app precisa de um navegador de 2017 para cá (Chrome 60+, Firefox 60+, Edge 79+, Safari 12+).
   Num navegador mais antigo, em vez de ficar sem produtos e sem vender, mostra o que fazer. */
(function () {
  var ok = true;
  try { new Function('async function a(){ await 1; } var b = () => 1; let c = `x`; class D {} var e = Object.assign({}, {}); return Promise.resolve(1);')(); }
  catch (e) { ok = false; }
  if (ok && (typeof fetch !== 'function' || typeof Promise === 'undefined' || !window.localStorage)) ok = false;
  if (ok) return;
  var ua = navigator.userAgent || '', xp = /Windows NT 5\./.test(ua), w7 = /Windows NT 6\.[01]/.test(ua);
  var dica = xp ? 'Este computador tem <b>Windows XP</b>, que já não tem navegadores compatíveis. Usa o telemóvel com a app Android, ou um computador com Windows 7 ou mais recente.'
    : w7 ? 'Este computador tem <b>Windows 7</b>. Instala o <b>Google Chrome 109</b> (a última versão para Windows 7) ou o <b>Firefox 115 ESR</b> e abre a Loja por aí.'
    : 'Actualiza o navegador (Google Chrome, Firefox ou Edge) e abre a Loja outra vez.';
  function mostrar() {
    var d = document.createElement('div');
    d.setAttribute('style', 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;background:#0f172a;color:#fff;font-family:Arial,sans-serif;display:block;padding:40px 20px;text-align:center;overflow:auto');
    d.innerHTML = '<div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:18px;padding:28px 24px;">'
      + '<div style="font-size:46px">🌐</div><h2 style="margin:10px 0 8px;font-size:22px">Este navegador é antigo demais</h2>'
      + '<p style="font-size:15px;line-height:1.6;color:#cbd5e1">Por isso os produtos não aparecem e não dá para vender. Nada se perdeu — é só o navegador.</p>'
      + '<p style="font-size:15px;line-height:1.6;color:#fde68a">' + dica + '</p>'
      + '<p style="font-size:12px;color:#94a3b8;margin-top:16px">Navegador: ' + ua.replace(/</g, '&lt;').slice(0, 160) + '</p></div>';
    document.body.appendChild(d);
  }
  if (document.body) mostrar(); else document.addEventListener('DOMContentLoaded', mostrar);
})();
