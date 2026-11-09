/* Banca — modo offline
   • Tudo o que o balconista faz (vendas, devoluções, perdas, entrega do dia) é guardado PRIMEIRO no telemóvel
     (fila), e só depois enviado à base de dados. Nada se perde sem internet.
   • Assim que há internet, a fila é enviada sozinha, na hora (evento «online», a cada poucos segundos e ao voltar à app).
   • Cada linha leva um id próprio: se um envio for repetido, a base de dados recusa o duplicado e conta como feito.
   • Também guarda a sessão e os produtos, para a app abrir e vender sem internet. */
(function () {
  var FILA = 'banca_fila_v1';
  function ler(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // id único em formato uuid (as tabelas usam uuid)
  window.bancaUUID = function () {
    if (window.crypto && crypto.randomUUID) { try { return crypto.randomUUID(); } catch (e) {} }
    var b = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b); else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  };
  function diaISO(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // ===== erros de rede (sem internet) vs. erros de dados =====
  function ehRede(err) {
    if (navigator.onLine === false) return true;
    var m = String((err && (err.message || err.details || err.hint)) || err || '');
    return /fetch|network|Load failed|timeout|timed out|aborted|ERR_|Sem liga|offline|Failed to/i.test(m) || (err && (err.status === 0 || err.code === '' && !err.message));
  }
  function ehDuplicado(err) { return err && (err.code === '23505' || /duplicate key|already exists/i.test(err.message || '')); }

  // ===== sessão e produtos guardados no telemóvel =====
  window.bancaGuardarSessao = function (s) { if (s && s.lojaId) gravar('banca_sessao_cache', s); };
  window.bancaSessaoGuardada = function () { return ler('banca_sessao_cache', null); };
  window.bancaGuardarProdutos = function (lojaId, lista) {
    if (!lojaId) return;
    if (!gravar('banca_produtos_' + lojaId, lista)) {     // sem espaço: guarda sem as fotos
      gravar('banca_produtos_' + lojaId, (lista || []).map(function (p) { var c = Object.assign({}, p); delete c.imagem; return c; }));
    }
  };
  window.bancaProdutosGuardados = function (lojaId) { return ler('banca_produtos_' + lojaId, []); };

  // ===== vendas do dia neste telemóvel (para o «Entregar o dia» funcionar offline) =====
  window.bancaRegistarNoDia = function (lojaId, venda) {
    var k = 'banca_dia_' + lojaId + '_' + diaISO(), l = ler(k, []);
    l.push(venda); gravar(k, l);
    // limpa dias antigos
    try { Object.keys(localStorage).forEach(function (kk) { if (kk.indexOf('banca_dia_' + lojaId + '_') === 0 && kk !== k) localStorage.removeItem(kk); }); } catch (e) {}
  };
  window.bancaVendasDoDia = function (lojaId) { return ler('banca_dia_' + lojaId + '_' + diaISO(), []); };
  window.bancaNumeroLocal = function (lojaId) { return bancaVendasDoDia(lojaId).reduce(function (m, v) { return Math.max(m, v.numero || 0); }, 0); };

  // ===== a fila =====
  window.bancaFila = function () { return ler(FILA, []); };
  function guardarFila(f) { gravar(FILA, f); pintar(); }
  // op = { tipo, rotulo, passos:[{t:'insert',tabela,linhas,opcional?} | {t:'rpc',fn,args,opcional?}] }
  window.bancaGuardarOp = function (op) {
    op.id = op.id || bancaUUID(); op.criado = op.criado || new Date().toISOString(); op.tentativas = 0;
    op.passos.forEach(function (p) { p.feito = false; });
    var f = bancaFila(); f.push(op);
    if (!gravar(FILA, f)) { // memória cheia: avisa, mas não perde a venda em curso
      if (window.toast) toast('⚠️ Memória do telemóvel cheia — liga a internet para enviar os dados', 'erro');
    }
    pintar();
    setTimeout(function () { bancaSincronizar(); }, 30);
    return op.id;
  };

  function comTempo(prom, ms) {
    return Promise.race([prom, new Promise(function (_, rej) { setTimeout(function () { rej({ message: 'timeout' }); }, ms); })]);
  }
  function executar(p) {
    if (p.t === 'insert') return comTempo(supabaseClient.from(p.tabela).insert(p.linhas), 15000);
    if (p.t === 'rpc') return comTempo(supabaseClient.rpc(p.fn, p.args), 15000);
    if (p.t === 'update') return comTempo(supabaseClient.from(p.tabela).update(p.dados).eq('id', p.idAlvo), 15000);
    return Promise.resolve({});
  }

  var aEnviar = false, enviadosNaVolta = 0;
  window.bancaSincronizar = async function () {
    if (aEnviar || typeof supabaseClient === 'undefined') return;
    var f = bancaFila(); if (!f.length) { pintar(); return; }
    aEnviar = true; pintar();
    var semRede = false, enviados = 0;
    try {
      for (var i = 0; i < f.length && !semRede; i++) {
        var op = f[i];
        for (var j = 0; j < op.passos.length; j++) {
          var p = op.passos[j]; if (p.feito) continue;
          var r;
          try { r = await executar(p); } catch (e) { r = { error: e }; }
          var err = r && r.error;
          if (!err || ehDuplicado(err)) { p.feito = true; gravar(FILA, f); continue; }
          if (ehRede(err)) { semRede = true; break; }
          // erro de dados: passos opcionais são saltados; os outros ficam para tentar mais tarde
          if (p.opcional) { p.feito = true; gravar(FILA, f); continue; }
          op.erro = String(err.message || err); op.tentativas = (op.tentativas || 0) + 1; gravar(FILA, f);
          break;
        }
        if (op.passos.every(function (p) { return p.feito; })) { op.ok = true; enviados++; }
      }
    } finally {
      var resto = bancaFila().filter(function (o) { return !f.some(function (x) { return x.id === o.id && x.ok; }); });
      // junta o progresso desta volta com ops novas criadas entretanto
      var mapa = {}; f.forEach(function (o) { mapa[o.id] = o; });
      resto = resto.map(function (o) { return mapa[o.id] && !mapa[o.id].ok ? mapa[o.id] : o; });
      guardarFila(resto);
      aEnviar = false; pintar();
    }
    if (enviados) {
      enviadosNaVolta += enviados;
      if (!bancaFila().length) {
        if (window.toast && (navigator.onLine !== false)) toast('☁️ ' + enviadosNaVolta + ' registo' + (enviadosNaVolta === 1 ? '' : 's') + ' enviado' + (enviadosNaVolta === 1 ? '' : 's') + ' para o Monitor', 'ok');
        enviadosNaVolta = 0;
        document.dispatchEvent(new CustomEvent('banca-fila-vazia'));
      } else if (!semRede) setTimeout(bancaSincronizar, 500);
    }
    return { enviados: enviados, faltam: bancaFila().length, semRede: semRede };
  };

  // ===== indicador (no botão Online/Offline) =====
  function pintar() {
    var n = bancaFila().length, on = navigator.onLine !== false;
    document.querySelectorAll('.tp-net').forEach(function (b) {
      var t = b.querySelector('span'); if (!t) return;
      t.textContent = aEnviar && n ? 'A enviar ' + n + '…' : (on ? (n ? n + ' por enviar' : 'Online') : (n ? 'Offline · ' + n : 'Offline'));
      b.classList.toggle('pend', n > 0);
      b.title = n ? n + ' registo(s) guardado(s) no telemóvel, por enviar' : '';
    });
  }
  window.bancaPintarFila = pintar;

  // ===== quando enviar: logo que há internet, e sempre que possível =====
  addEventListener('online', function () { pintar(); bancaSincronizar(); setTimeout(bancaSincronizar, 1500); });
  addEventListener('offline', pintar);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) bancaSincronizar(); });
  setInterval(function () { if (bancaFila().length) bancaSincronizar(); }, 4000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { pintar(); setTimeout(bancaSincronizar, 800); });
  else { pintar(); setTimeout(bancaSincronizar, 800); }

  // ===== a app abre sem internet (guarda as páginas e os ficheiros no telemóvel) =====
  if ('serviceWorker' in navigator) {
    addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
