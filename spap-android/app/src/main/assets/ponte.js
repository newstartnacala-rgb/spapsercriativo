/* Ponte entre o site SPAP e a app nativa (corre no início de cada página). */
(function () {
  if (window.__spapPonte || typeof SPAPNative === 'undefined') return;
  window.__spapPonte = true;
  window.SPAP_APP_NATIVA = true;

  function paraBase64(blob) {
    return new Promise(function (ok, falha) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); ok(s.substring(s.indexOf(',') + 1)); };
      r.onerror = falha;
      r.readAsDataURL(blob);
    });
  }

  /* Imprimir (window.print) → impressão do Android */
  try { window.print = function () { SPAPNative.imprimir(); }; } catch (e) {}

  /* Descarregar ficheiros (<a download> com blob:/data:) → pasta Transferências */
  function guardarLink(a) {
    var href = a.href || '';
    var nome = a.getAttribute('download') || 'ficheiro';
    if (href.indexOf('blob:') !== 0 && href.indexOf('data:') !== 0) return false;
    fetch(href).then(function (r) { return r.blob(); }).then(function (b) {
      return paraBase64(b).then(function (d) { SPAPNative.guardarFicheiro(d, b.type || 'application/octet-stream', nome); });
    }).catch(function () { SPAPNative.aviso('Não foi possível guardar o ficheiro.'); });
    return true;
  }
  var clicarOriginal = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && guardarLink(this)) return;
    return clicarOriginal.apply(this, arguments);
  };
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[download]') : null;
    if (a && guardarLink(a)) { ev.preventDefault(); ev.stopPropagation(); }
  }, true);

  /* Partilhar (navigator.share) → menu de partilha do Android (também com ficheiros) */
  try { navigator.canShare = function (d) { return !!d; }; } catch (e) {}
  try { navigator.share = function (d) {
    d = d || {};
    var texto = [d.text, d.url].filter(Boolean).join('\n');
    var f = d.files && d.files[0];
    if (!f) { SPAPNative.partilharTexto(d.title || '', texto); return Promise.resolve(); }
    return paraBase64(f).then(function (b64) {
      SPAPNative.partilharFicheiro(b64, f.type || 'application/octet-stream', f.name || 'ficheiro', d.title || '', texto);
    });
  }; } catch (e) {}

  /* Notificações do sistema (new Notification) → notificações do Android */
  function Notificacao(titulo, op) {
    op = op || {};
    this.title = titulo; this.body = op.body || ''; this.tag = op.tag || '';
    this.onclick = null; this.onclose = null;
    try { SPAPNative.notificar(String(titulo || ''), String(op.body || ''), String(op.tag || ''), !!op.requireInteraction); } catch (e) {}
  }
  Notificacao.prototype.close = function () {};
  Notificacao.prototype.addEventListener = function () {};
  Object.defineProperty(Notificacao, 'permission', { get: function () { return SPAPNative.permissaoNotificacoes(); } });
  Notificacao.requestPermission = function (cb) {
    return new Promise(function (ok) {
      window.__spapRespostaNotif = function (p) { if (cb) try { cb(p); } catch (e) {} ok(p); };
      SPAPNative.pedirNotificacoes();
    });
  };
  try { window.Notification = Notificacao; } catch (e) {}

  /* Vibrar */
  try { navigator.vibrate = function (p) { try { SPAPNative.vibrar(JSON.stringify(p)); } catch (e) {} return true; }; } catch (e) {}
})();
