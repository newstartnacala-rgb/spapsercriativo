/* SPAP — avisos ao dono: abertura da loja/banca e entrega do dia.
   • No balcão (Loja e Banca): spapMarcarAbertura({...}) regista a 1.ª entrada do dia de cada balconista;
     spapRegistarEntrega({...}) regista a entrega do dia. Ficam na tabela atividade_log.
   • Nos monitores: spapAvisosIniciar(() => lojaId) verifica a cada poucos segundos e mostra um pop-up
     com a hora e a data (cada aviso aparece uma vez em cada aparelho). */
(function () {
  function dia(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function hora(d) { return new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }); }
  function dataLonga(d) { var t = new Date(d).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nomeBalc(c) { c = String(c || '').trim(); if (!c) return 'Balconista'; return /^balconista/i.test(c) ? c : 'Balconista ' + c; }
  function fmt(v) { return 'MT ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  async function inserir(linha, fila) {
    if (fila && window.bancaGuardarOp) { bancaGuardarOp({ tipo: 'evento', rotulo: linha.detalhe, passos: [{ t: 'insert', tabela: 'atividade_log', linhas: [linha], opcional: true }] }); return; }
    try { await supabaseClient.from('atividade_log').insert(linha); } catch (e) {}
  }
  async function uid() { try { var r = await supabaseClient.auth.getUser(); return r && r.data && r.data.user ? r.data.user.id : null; } catch (e) { return null; } }

  // ===== Balcão: abertura (1.ª entrada do dia de cada balconista) =====
  var _abrindo = false;
  window.spapMarcarAbertura = async function (o) {
    // o = { lojaId, codigo, tipo:'loja'|'banca', nomeLoja, userId?, fila? }
    if (!o || !o.lojaId || _abrindo) return;
    var quem = nomeBalc(o.codigo), k = 'spap_abertura_' + o.lojaId + '_' + (o.codigo || '-') + '_' + dia();
    try { if (localStorage.getItem(k)) return; } catch (e) {}
    _abrindo = true;
    try {
      var agora = new Date(), ini = new Date(); ini.setHours(0, 0, 0, 0);
      // outro aparelho já abriu hoje com o mesmo balconista? então não repete
      if (navigator.onLine !== false) {
        try {
          var r = await Promise.race([supabaseClient.from('atividade_log').select('id').eq('loja_id', o.lojaId).eq('acao', 'abertura').eq('quem', quem).gte('criado_em', ini.toISOString()).limit(1),
            new Promise(function (res) { setTimeout(function () { res({}); }, 5000); })]);
          if (r && r.data && r.data.length) { try { localStorage.setItem(k, '1'); } catch (e) {} return; }
        } catch (e) {}
      }
      var tipo = o.tipo === 'banca' ? 'banca' : 'loja';
      await inserir({ loja_id: o.lojaId, user_id: o.userId || await uid(), quem: quem, por_gerente: false, acao: 'abertura',
        detalhe: (tipo === 'banca' ? 'Abriu a banca' : 'Abriu a loja') + ' às ' + hora(agora),
        extra: { codigo: o.codigo || null, tipo: tipo, hora: agora.toISOString() }, criado_em: agora.toISOString() }, o.fila);
      try { localStorage.setItem(k, '1'); } catch (e) {}
    } finally { _abrindo = false; }
  };

  // ===== Balcão: entrega do dia =====
  window.spapRegistarEntrega = async function (o) {
    // o = { lojaId, codigo, tipo, dinheiro, gastos, numVendas, userId?, fila? }
    if (!o || !o.lojaId) return;
    var agora = new Date(), tipo = o.tipo === 'banca' ? 'banca' : 'loja';
    await inserir({ loja_id: o.lojaId, user_id: o.userId || await uid(), quem: nomeBalc(o.codigo), por_gerente: false, acao: 'entrega_dia',
      detalhe: 'Entregou o dia às ' + hora(agora) + ' · ' + fmt(o.dinheiro) + (o.gastos ? ' · gastos ' + fmt(o.gastos) : ''),
      extra: { codigo: o.codigo || null, tipo: tipo, hora: agora.toISOString(), dinheiro: o.dinheiro || 0, gastos: o.gastos || 0, num_vendas: o.numVendas || 0 },
      criado_em: agora.toISOString() }, o.fila);
  };


  // ===== Conta encerrada por migração: a conta antiga não volta a abrir =====
  // pagina: 'loja' | 'monitor' | 'banca' | 'bancamonitor'
  var _contaVista = {};
  window.spapVerConta = async function (lojaId, pagina) {
    if (!lojaId || document.getElementById('spap-encerrada') || navigator.onLine === false) return;
    if (_contaVista[lojaId] && Date.now() - _contaVista[lojaId] < 60000) return;
    _contaVista[lojaId] = Date.now();
    var r; try { r = await supabaseClient.from('lojas').select('estado,tipo_loja,migrado_de,migrada_para').eq('id', lojaId).maybeSingle(); } catch (e) { return; }
    var l = r && r.data; if (!l || r.error) return;
    var paginaBanca = pagina === 'banca' || pagina === 'bancamonitor';
    var encerrada = l.estado === 'encerrado';
    var trocada = !encerrada && l.migrado_de && ((l.tipo_loja === 'banca') !== paginaBanca);   // conta nova é do outro tipo
    if (!encerrada && !trocada) return;
    var paraBanca = encerrada ? l.migrada_para === 'banca' : l.tipo_loja === 'banca';
    var nomeDe = paginaBanca ? 'Banca' : 'Loja', nomePara = paraBanca ? 'Banca' : 'Loja';
    var dono = pagina === 'monitor' || pagina === 'bancamonitor';
    var destino = paraBanca ? (dono ? 'mobile-monitor.html' : 'mobile.html') : (dono ? 'monitor.html' : 'index.html');
    try { Object.keys(localStorage).forEach(function (k) { if (k === 'banca_sessao_cache' || (encerrada && k.indexOf(String(lojaId)) >= 0)) localStorage.removeItem(k); }); } catch (e) {}
    var st = document.createElement('style');
    st.textContent = '#spap-encerrada{position:fixed;inset:0;z-index:2147483600;background:#eef3fb;display:flex;align-items:center;justify-content:center;padding:18px;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}'
      + '#spap-encerrada .se{width:100%;max-width:400px;background:#fff;border-radius:28px;padding:26px 22px 22px;text-align:center;box-shadow:0 30px 60px rgba(15,27,61,.16);}'
      + '#spap-encerrada .se-ic{font-size:54px;line-height:1;} #spap-encerrada .se-selo{display:inline-block;margin-top:12px;background:#fef2f2;color:#b91c1c;font-weight:800;font-size:12px;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:6px 12px;}'
      + '#spap-encerrada h1{margin:12px 0 6px;font-size:21px;font-weight:800;color:#0f1b3d;line-height:1.25;} #spap-encerrada p{margin:0 0 16px;font-size:14.5px;color:#5b6785;line-height:1.55;}'
      + '#spap-encerrada .se-tipo{display:flex;align-items:center;gap:10px;margin:0 0 16px;} #spap-encerrada .se-tipo div{flex:1;border-radius:14px;padding:10px;font-weight:800;} #spap-encerrada .se-tipo .a{background:#fef2f2;color:#b91c1c;text-decoration:line-through;} #spap-encerrada .se-tipo .b{background:#f0fdf4;color:#15803d;}'
      + '#spap-encerrada a{display:flex;align-items:center;justify-content:center;height:56px;border-radius:16px;color:#fff;text-decoration:none;font-weight:800;font-size:16px;background:linear-gradient(135deg,#16a34a,#15803d);box-shadow:0 14px 28px rgba(0,0,0,.15);}'
      + 'html.escuro #spap-encerrada{filter:invert(1) hue-rotate(180deg);}';
    document.head.appendChild(st);
    var d = document.createElement('div'); d.id = 'spap-encerrada';
    d.innerHTML = '<div class="se"><div class="se-ic">' + (encerrada ? '🔒' : '🔁') + '</div><div class="se-selo">' + (encerrada ? nomeDe + ' encerrada' : 'Conta migrada') + '</div>'
      + '<h1>Esta ' + nomeDe.toLowerCase() + ' passou a ' + nomePara + '</h1>'
      + '<p>' + (encerrada ? 'Esta conta foi encerrada e já não abre. ' : '') + 'Os produtos estão agora na <b>' + nomePara + '</b>, com o mesmo email e palavra-passe.' + (!dono ? ' Se tiver dúvidas, fale com o dono.' : '') + '</p>'
      + '<div class="se-tipo"><div class="a">' + nomeDe + '</div><span>➜</span><div class="b">' + nomePara + '</div></div>'
      + '<a href="' + destino + '">Abrir a ' + nomePara + '</a></div>';
    document.body.appendChild(d);
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
  };

  // ===== Monitores: pop-up =====
  var css = ''
    + '#spap-avisos{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:100040;width:calc(100% - 24px);max-width:420px;display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}'
    + '.sav{pointer-events:auto;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.32),0 0 0 1px rgba(15,23,42,.05);animation:sav-entra .45s cubic-bezier(.2,1.2,.3,1);}'
    + '@keyframes sav-entra{from{opacity:0;transform:translateY(-24px) scale(.96)}to{opacity:1;transform:none}}'
    + '.sav.sai{animation:sav-sai .25s ease-in forwards;} @keyframes sav-sai{to{opacity:0;transform:translateY(-16px) scale(.97)}}'
    + '.sav-topo{display:flex;align-items:center;gap:12px;padding:14px 16px 12px;color:#fff;}'
    + '.sav.abre .sav-topo{background:linear-gradient(135deg,#16a34a,#15803d);} .sav.entrega .sav-topo{background:linear-gradient(135deg,#2563eb,#4338ca);}'
    + '.sav-ic{width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:24px;flex-shrink:0;}'
    + '.sav-tit{font-weight:800;font-size:16.5px;line-height:1.2;} .sav-sub{font-size:12.5px;opacity:.92;margin-top:2px;}'
    + '.sav-x{margin-left:auto;width:32px;height:32px;border-radius:10px;border:0;background:rgba(255,255,255,.2);color:#fff;font-size:16px;font-weight:800;cursor:pointer;flex-shrink:0;}'
    + '.sav-corpo{padding:14px 16px 14px;}'
    + '.sav-hora{display:flex;align-items:baseline;gap:10px;} .sav-hora b{font-size:34px;font-weight:800;color:#0f172a;letter-spacing:-.5px;line-height:1;} .sav-hora span{font-size:13px;color:#64748b;font-weight:700;}'
    + '.sav-data{font-size:13px;color:#475569;margin-top:6px;}'
    + '.sav-linhas{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;} .sav-linhas div{background:#f8fafc;border-radius:12px;padding:8px 10px;} .sav-linhas small{display:block;font-size:11px;color:#64748b;font-weight:700;} .sav-linhas b{font-size:14.5px;color:#0f172a;}'
    + '.sav-ok{width:100%;margin-top:12px;height:46px;border:0;border-radius:14px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;color:#fff;}'
    + '.sav.abre .sav-ok{background:linear-gradient(135deg,#16a34a,#15803d);} .sav.entrega .sav-ok{background:linear-gradient(135deg,#2563eb,#4338ca);}'
    + 'html.escuro #spap-avisos{filter:invert(1) hue-rotate(180deg);}';
  function caixa() {
    var c = document.getElementById('spap-avisos');
    if (!c) {
      if (!document.getElementById('spap-avisos-css')) { var st = document.createElement('style'); st.id = 'spap-avisos-css'; st.textContent = css; document.head.appendChild(st); }
      c = document.createElement('div'); c.id = 'spap-avisos'; document.body.appendChild(c);
    }
    return c;
  }
  function som() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880, 1100].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.14); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.14 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.3);
        o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.14); o.stop(ctx.currentTime + i * 0.14 + 0.32);
      });
      setTimeout(function () { try { ctx.close(); } catch (e) {} }, 1200);
    } catch (e) {}
  }
  function mostrar(ev, nomeLoja) {
    var ex = ev.extra || {}, abre = ev.acao === 'abertura', banca = ex.tipo === 'banca';
    var quando = ex.hora || ev.criado_em;
    var lugar = banca ? 'banca' : 'loja';
    var d = document.createElement('div'); d.className = 'sav ' + (abre ? 'abre' : 'entrega');
    d.innerHTML = '<div class="sav-topo"><div class="sav-ic">' + (abre ? '🔓' : '📦') + '</div><div><div class="sav-tit">' + (abre ? (banca ? 'A banca abriu' : 'A loja abriu') : 'Dia entregue')
      + '</div><div class="sav-sub">' + esc(ev.quem || 'Balconista') + (nomeLoja ? ' · ' + esc(nomeLoja) : '') + '</div></div><button class="sav-x" aria-label="Fechar">✕</button></div>'
      + '<div class="sav-corpo"><div class="sav-hora"><b>' + hora(quando) + '</b><span>' + (abre ? 'hora de abertura da ' + lugar : 'hora da entrega') + '</span></div>'
      + '<div class="sav-data">📅 ' + dataLonga(quando) + '</div>'
      + (!abre ? '<div class="sav-linhas"><div><small>💵 Dinheiro entregue</small><b>' + fmt(ex.dinheiro) + '</b></div><div><small>🧾 Gastos</small><b>' + fmt(ex.gastos) + '</b></div></div>' : '')
      + '<button class="sav-ok">Visto</button></div>';
    var fechar = function () { d.classList.add('sai'); setTimeout(function () { d.remove(); }, 260); };
    d.querySelector('.sav-x').onclick = fechar; d.querySelector('.sav-ok').onclick = fechar;
    caixa().appendChild(d);
    som(); try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) {}
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(abre ? (banca ? '🔓 A banca abriu' : '🔓 A loja abriu') : '📦 Dia entregue', { body: (ev.quem || 'Balconista') + ' · ' + hora(quando) + ' · ' + new Date(quando).toLocaleDateString('pt-PT'), tag: 'spap-' + ev.id });
      }
    } catch (e) {}
  }

  var _getLoja = null, _getNome = null, _aVer = false;
  async function verificar() {
    if (_aVer || !_getLoja) return;
    var loja = _getLoja(); if (!loja || typeof supabaseClient === 'undefined') return;
    if (_pagina) spapVerConta(loja, _pagina);
    _aVer = true;
    try {
      var k = 'spap_avisos_visto_' + loja, desde = null;
      try { desde = localStorage.getItem(k); } catch (e) {}
      if (!desde) { var ini = new Date(); ini.setHours(0, 0, 0, 0); desde = ini.toISOString(); }   // 1.ª vez: mostra os de hoje
      var r = await supabaseClient.from('atividade_log').select('id,acao,quem,detalhe,extra,criado_em').eq('loja_id', loja).in('acao', ['abertura', 'entrega_dia'])
        .gt('criado_em', desde).order('criado_em', { ascending: true }).limit(20);
      var l = (r && r.data) || [];
      if (l.length) {
        var visto = {}; try { visto = JSON.parse(sessionStorage.getItem('spap_avisos_ids') || '{}'); } catch (e) {}
        var nome = _getNome ? _getNome() : '';
        l.forEach(function (ev) { if (!visto[ev.id]) { visto[ev.id] = 1; mostrar(ev, nome); } });
        try { sessionStorage.setItem('spap_avisos_ids', JSON.stringify(visto)); localStorage.setItem(k, l[l.length - 1].criado_em); } catch (e) {}
      }
    } catch (e) {} finally { _aVer = false; }
  }
  var _pagina = null;
  window.spapAvisosIniciar = function (getLoja, getNome, pagina) {
    _getLoja = getLoja; _getNome = getNome || null; _pagina = pagina || null;
    setTimeout(verificar, 2500);
    setInterval(verificar, 15000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) verificar(); });
  };
  window.spapAvisosVerificar = verificar;
})();
