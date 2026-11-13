/* SPAP — Registo dos erros do sistema (todas as apps).
   Tudo o que corre mal fica guardado na tabela spap_erros e aparece no Painel de Administração:
   • falhas do banco de dados (servidor em baixo, plano esgotado, projecto em pausa, pedido recusado, tabela em falta…)
   • erros nas páginas (JavaScript) e promessas que falham
   Sem internet: guarda no telemóvel e envia quando a ligação voltar.
   Precisa do SQL v2.9.266. Sem o SQL, simplesmente não envia (nunca estraga a app). */
(function () {
  'use strict';
  if (window.spapErro) return;
  var P = location.pathname;
  var APP = /admin/.test(P) ? 'admin' : /mobile-monitor/.test(P) ? 'banca-monitor' : /mobile\.html/.test(P) ? 'banca'
    : /monitor/.test(P) ? 'monitor' : /login-banca|registo-banca|planos-banca/.test(P) ? 'banca-entrada'
    : /login|registo|planos|reset-senha/.test(P) ? 'entrada' : 'loja';
  var FILA = 'spap_erros_fila', vistos = {}, aEnviar = false, semSql = false;

  function url() { try { return SUPABASE_URL; } catch (e) { return ''; } }
  function chave() { try { return SUPABASE_ANON_KEY; } catch (e) { return ''; } }
  function versao() { var m = document.querySelector('[id*=versao], .versao'); return (window.APP_VERSAO || window.MONITOR_VERSAO || window.BANCA_VERSAO || (m && m.textContent) || '').toString().slice(0, 30); }
  // quem está a usar (para saber em que loja aconteceu)
  function quem() {
    var r = { email: '', loja: '' };
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (!/^sb-.+-auth-token$/.test(k)) continue;
        var s = JSON.parse(localStorage.getItem(k) || '{}'); var u = s.user || (s.currentSession && s.currentSession.user);
        if (u && u.email) { r.email = u.email; break; }
      }
      var w = window; r.loja = String(w.lojaId || w.LOJA_ID || w._lojaId || (w.sessao && w.sessao.lojaId) || (w.lojaAtual && w.lojaAtual.id) || (w.loja && w.loja.id) || '');
    } catch (e) {}
    return r;
  }
  function hash(t) { var h = 0; t = String(t); for (var i = 0; i < t.length; i++) { h = (h * 31 + t.charCodeAt(i)) | 0; } return (h >>> 0).toString(36); }

  function registar(o) {
    try {
      var msg = String(o.mensagem || 'Erro').slice(0, 500);
      var ass = APP + ':' + (o.tipo || '') + ':' + (o.codigo || '') + ':' + hash(msg.replace(/\d{3,}/g, '#'));
      var agora = Date.now(); if (vistos[ass] && agora - vistos[ass] < 60000) return; vistos[ass] = agora;
      var q = quem();
      var e = { app: APP, pagina: P.split('/').pop() || 'index.html', tipo: o.tipo || 'pagina', codigo: o.codigo ? String(o.codigo) : '', mensagem: msg,
        detalhe: String(o.detalhe || '').slice(0, 1500), assinatura: ass, email: q.email, loja_id: q.loja, versao: versao(),
        agente: (navigator.userAgent || '').slice(0, 200), quando: new Date().toISOString() };
      var f = ler(); f.push(e); if (f.length > 40) f = f.slice(-40); gravar(f);
      setTimeout(enviar, 800);
    } catch (er) {}
  }
  function ler() { try { return JSON.parse(localStorage.getItem(FILA) || '[]') || []; } catch (e) { return []; } }
  function gravar(f) { try { localStorage.setItem(FILA, JSON.stringify(f)); } catch (e) {} }
  function token() {
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (!/^sb-.+-auth-token$/.test(k)) continue; var s = JSON.parse(localStorage.getItem(k) || '{}'); if (s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now())) return s.access_token; } } catch (e) {}
    return chave();
  }
  function enviar() {
    if (aEnviar || semSql || navigator.onLine === false || !url() || !chave()) return;
    var f = ler(); if (!f.length) return;
    aEnviar = true;
    var e = f[0];
    // fetch normal (não o da app), para um erro ao registar nunca gerar outro registo
    fetch(url() + '/rest/v1/rpc/spap_registar_erro', { method: 'POST', headers: { apikey: chave(), Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' }, body: JSON.stringify({ p: e }), keepalive: true })
      .then(function (r) {
        aEnviar = false;
        if (r.ok) { var g = ler(); g.shift(); gravar(g); if (g.length) setTimeout(enviar, 300); }
        else if (r.status === 404) { semSql = true; }        // SQL v2.9.266 ainda não corrido
        else if (r.status === 400 || r.status === 422) { var h = ler(); h.shift(); gravar(h); }   // registo estragado: descarta
      }, function () { aEnviar = false; });
  }

  // ---- erros das páginas ----
  window.addEventListener('error', function (ev) {
    if (!ev || !ev.message || /ResizeObserver loop|Script error\.?$/i.test(ev.message)) return;
    registar({ tipo: 'pagina', mensagem: ev.message, detalhe: (ev.filename || '').split('/').pop() + ':' + (ev.lineno || '') + ':' + (ev.colno || '') + (ev.error && ev.error.stack ? '\n' + String(ev.error.stack).slice(0, 900) : '') });
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason; var m = r && (r.message || r.error_description || r.msg) || String(r || '');
    if (!m || /AbortError|Failed to fetch|NetworkError|Load failed|Sem internet/i.test(m)) return;   // falhas de rede já ficam registadas abaixo
    registar({ tipo: 'pagina', mensagem: 'Falha não tratada: ' + m, detalhe: r && r.stack ? String(r.stack).slice(0, 900) : '' });
  });

  // ---- erros do banco de dados (chamado pelo spapFetch do supabase-config.js) ----
  function explicar(status, corpo) {
    if (status === 402) return 'O plano do banco de dados acabou ou atingiu o limite';
    if (status === 540) return 'O projecto do banco de dados está em pausa';
    if (status === 503 || status === 502 || status === 504) return 'O banco de dados está indisponível (' + status + ')';
    if (status === 429) return 'Pedidos a mais ao banco de dados (limite atingido)';
    if (status >= 500) return 'Erro interno do banco de dados (' + status + ')';
    var m = corpo && (corpo.message || corpo.msg || corpo.error_description || corpo.error);
    return m ? String(m) : 'Pedido recusado pelo banco de dados (' + status + ')';
  }
  window.spapErroBD = function (u, status, resp) {
    try {
      var caminho = String(u).replace(url(), '').split('?')[0];
      if (/rpc\/spap_registar_erro/.test(caminho)) return;
      // respostas normais da app que não são erros
      if (status === 401 && /auth\/v1\/(token|user|logout)/.test(caminho)) return;
      if ((status === 400 || status === 422) && /auth\/v1\/token/.test(caminho)) return;   // senha errada no login
      if (status === 406 || status === 409) return;
      var tipo = /auth\/v1/.test(caminho) ? 'auth' : 'bd';
      var go = function (corpo) {
        var codigo = String(status) + (corpo && corpo.code ? ' · ' + corpo.code : '');
        registar({ tipo: tipo, codigo: codigo, mensagem: explicar(status, corpo), detalhe: caminho + (corpo && (corpo.details || corpo.hint) ? '\n' + (corpo.details || '') + ' ' + (corpo.hint || '') : '') });
      };
      if (resp && resp.clone) resp.clone().json().then(go, function () { go(null); }); else go(null);
    } catch (e) {}
  };
  window.spapErroRede = function (u, e) {
    try {
      if (navigator.onLine === false) return;      // sem internet no telemóvel: não é falha do sistema
      var caminho = String(u).replace(url(), '').split('?')[0]; if (/rpc\/spap_registar_erro/.test(caminho)) return;
      var tempo = e && e.name === 'AbortError';
      registar({ tipo: 'rede', codigo: tempo ? 'tempo' : 'ligacao', mensagem: tempo ? 'O banco de dados não respondeu a tempo (15 s)' : 'Não foi possível ligar ao banco de dados', detalhe: caminho + (e && e.message ? '\n' + e.message : '') });
    } catch (er) {}
  };
  window.spapErro = function (mensagem, detalhe, tipo) { registar({ tipo: tipo || 'pagina', mensagem: mensagem, detalhe: detalhe }); };

  window.addEventListener('online', function () { setTimeout(enviar, 1500); });
  setInterval(enviar, 30000);
  setTimeout(enviar, 4000);
})();
