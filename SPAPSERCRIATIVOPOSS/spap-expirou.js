/* SPAP — quando o plano expira, a Loja / Monitor fecha sozinha e abre a lista de planos.
   spapVigiarExpiracao(lojaId, dataExpiracao, 'monitor' | 'loja')
     • fecha no segundo exato em que o plano expira (se a página estiver aberta);
     • confirma na base de dados a cada minuto (se o admin renovar, continua aberta).
   spapIrPlanosExpirou(dataExpiracao, origem) → planos.html com o aviso "O seu plano expirou". */
(function () {
  function ehSuper() { try { return !!(window.spapEuSuper && spapEuSuper()); } catch (e) { return false; } }
  window.spapIrPlanosExpirou = function (exp, origem) {
    var q = '?m=expirou' + (exp ? '&exp=' + encodeURIComponent(new Date(exp).toISOString()) : '') + (origem ? '&de=' + origem : '');
    try { localStorage.setItem('pdv_login_destino', origem === 'monitor' ? 'monitor.html' : 'index.html'); } catch (e) {}
    location.href = 'planos.html' + q;
  };
  window.spapVigiarExpiracao = function (lojaId, exp, origem) {
    if (ehSuper() || !lojaId) return;
    clearTimeout(window._spapExpT); clearInterval(window._spapExpI);
    function agendar(e) {
      clearTimeout(window._spapExpT);
      if (!e) return;
      var ms = new Date(e).getTime() - Date.now();
      if (ms <= 0) return spapIrPlanosExpirou(e, origem);
      if (ms < 2147483000) window._spapExpT = setTimeout(function () { spapIrPlanosExpirou(e, origem); }, ms + 500);
    }
    agendar(exp);
    window._spapExpI = setInterval(function () {
      if (typeof supabaseClient === 'undefined') return;
      supabaseClient.from('lojas').select('data_expiracao, estado').eq('id', lojaId).maybeSingle().then(function (r) {
        var l = r && r.data; if (!l) return;
        if (l.data_expiracao && new Date(l.data_expiracao) <= new Date()) return spapIrPlanosExpirou(l.data_expiracao, origem);
        agendar(l.data_expiracao);
      }, function () {});
    }, 60000);
  };
})();
