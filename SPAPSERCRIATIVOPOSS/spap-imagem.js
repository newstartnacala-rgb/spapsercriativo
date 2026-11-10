/* SPAP — ver a imagem do produto em ecrã cheio.
   Qualquer imagem com data-zoom="1" abre em ecrã cheio ao tocar DUAS vezes (ou duplo clique).
   spapVerImagem(src, titulo, subtitulo) também pode ser chamado diretamente. */
(function () {
  var css = ''
    + '#svi{position:fixed;inset:0;z-index:100060;background:rgba(5,8,18,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;touch-action:none;}'
    + '#svi.on{opacity:1;}'
    + '#svi img{max-width:94vw;max-height:76vh;max-height:76dvh;object-fit:contain;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.5);transform:scale(.9);transition:transform .25s cubic-bezier(.2,1.2,.3,1);background:#fff;}'
    + '#svi.on img{transform:none;}'
    + '#svi .svi-t{color:#fff;font-weight:800;font-size:18px;margin-top:18px;text-align:center;padding:0 20px;max-width:94vw;}'
    + '#svi .svi-s{color:rgba(255,255,255,.7);font-size:13.5px;margin-top:4px;text-align:center;padding:0 20px;}'
    + '#svi .svi-x{position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;width:46px;height:46px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:22px;font-weight:800;cursor:pointer;}'
    + '#svi .svi-d{position:absolute;bottom:max(18px,env(safe-area-inset-bottom));color:rgba(255,255,255,.55);font-size:12px;}'
    + '[data-zoom]{cursor:zoom-in;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}'
    + 'html.escuro #svi{filter:invert(1) hue-rotate(180deg);} html.escuro #svi img{filter:invert(1) hue-rotate(180deg);}';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function estilo() { if (document.getElementById('svi-css')) return; var s = document.createElement('style'); s.id = 'svi-css'; s.textContent = css; document.head.appendChild(s); }
  if (document.head) estilo(); else document.addEventListener('DOMContentLoaded', estilo);

  window.spapVerImagem = function (src, titulo, sub) {
    if (!src) return;
    estilo();
    if (document.getElementById('svi')) return;     // já aberta (toque duplo + duplo clique no mesmo gesto)
    var d = document.createElement('div'); d.id = 'svi';
    d.innerHTML = '<button class="svi-x" aria-label="Fechar">✕</button><img src="' + esc(src) + '" alt="">'
      + (titulo ? '<div class="svi-t">' + esc(titulo) + '</div>' : '') + (sub ? '<div class="svi-s">' + esc(sub) + '</div>' : '')
      + '<div class="svi-d">Toque em qualquer lado para fechar</div>';
    function fechar() { d.classList.remove('on'); setTimeout(function () { d.remove(); }, 200); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') fechar(); }
    d.addEventListener('click', fechar);
    document.addEventListener('keydown', tecla);
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('on'); });
    try { history.pushState({ svi: 1 }, ''); addEventListener('popstate', function voltar() { removeEventListener('popstate', voltar); if (document.getElementById('svi')) fechar(); }); } catch (e) {}
  };

  // toque duplo (telemóvel) e duplo clique (computador)
  var ult = { t: 0, el: null };
  function abrir(img) { spapVerImagem(img.getAttribute('data-src') || img.currentSrc || img.src, img.getAttribute('data-titulo') || img.alt || '', img.getAttribute('data-sub') || ''); }
  document.addEventListener('dblclick', function (e) { var img = e.target.closest && e.target.closest('[data-zoom]'); if (img) { e.preventDefault(); abrir(img); } });
  document.addEventListener('touchend', function (e) {
    var img = e.target.closest && e.target.closest('[data-zoom]'); if (!img) return;
    var agora = Date.now();
    if (ult.el === img && agora - ult.t < 380) { e.preventDefault(); ult = { t: 0, el: null }; abrir(img); }
    else ult = { t: agora, el: img };
  }, { passive: false });
})();
