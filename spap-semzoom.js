/* SPAP — ecrãs fixos (sem zoom): login, cadastro e planos, dentro da app e no navegador */
(function () {
  var v = document.querySelector('meta[name="viewport"]');
  if (v) v.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover');
  var st = document.createElement('style');
  /* touch-action evita o zoom com dois toques; 16px nos campos evita o zoom automático do iPhone ao escrever */
  st.textContent = 'html,body{touch-action:pan-x pan-y;-webkit-text-size-adjust:100%;text-size-adjust:100%;}'
    + 'input,select,textarea{font-size:max(16px,1em) !important;}';
  (document.head || document.documentElement).appendChild(st);
  /* iPhone: ignora user-scalable=no — bloqueia o gesto de pinça e o duplo toque */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false }); });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
})();
