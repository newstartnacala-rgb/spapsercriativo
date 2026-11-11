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
    var paraFila = function () { if (fila && window.bancaGuardarOp) bancaGuardarOp({ tipo: 'evento', rotulo: linha.detalhe, passos: [{ t: 'insert', tabela: 'atividade_log', linhas: [linha], opcional: true }] }); };
    if (navigator.onLine === false) { paraFila(); return; }
    try {
      var r = await supabaseClient.from('atividade_log').insert(linha);
      if (r && r.error && /fetch|network|Failed|timeout/i.test(r.error.message || '')) paraFila();
    } catch (e) { paraFila(); }
  }
  async function uid() { try { var r = await supabaseClient.auth.getUser(); return r && r.data && r.data.user ? r.data.user.id : null; } catch (e) { return null; } }

  // ===== Balcão: abertura (1.ª entrada do dia de cada balconista) =====
  var _abrindo = false;
  window.spapMarcarAbertura = async function (o) {
    // o = { lojaId, codigo, tipo:'loja'|'banca', nomeLoja, userId?, fila? }
    if (!o || !o.lojaId || _abrindo) return;
    if (window.spapEuSuper && spapEuSuper()) return;   // o Super Admin a ver uma conta não conta como abertura
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
    if (window.spapEuSuper && spapEuSuper()) return;   // Super Admin: sem restrições
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
    // dentro de uma app Android: a página da outra conta é de OUTRA app → manda baixar essa app
    var REL = 'https://github.com/newstartnacala-rgb/spapsercriativo/releases/download/';
    var outraApp = paraBanca ? (dono ? { nome: 'Monitor e Banca', f: 'banca-latest/Monitor-e-Banca.apk' } : { nome: 'Banca e Vendas', f: 'banca-latest/Banca-e-Vendas.apk' })
                             : (dono ? { nome: 'Monitor', f: 'loja-latest/Monitor.apk' } : { nome: 'Loja', f: 'loja-latest/Loja.apk' });
    var naApp = !!window.SPAP_APP_TIPO && window.spapPaginaDaApp && !spapPaginaDaApp(destino.replace('.html', ''));
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
      + (naApp ? '<a href="' + REL + outraApp.f + '">⬇️ Baixar a app ' + outraApp.nome + '</a>' : '<a href="' + destino + '">Abrir a ' + nomePara + '</a>') + '</div>';
    document.body.appendChild(d);
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
  };

  // ===== Monitores: pop-up de vidro (SSTEAM, letras douradas) =====
  var css = ''
    + '#spap-av{position:fixed;inset:0;z-index:100040;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,0);'
    + '-webkit-backdrop-filter:blur(0);backdrop-filter:blur(0);transition:background .7s ease,backdrop-filter .7s ease,-webkit-backdrop-filter .7s ease,opacity .7s ease;cursor:pointer;'
    + 'font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-tap-highlight-color:transparent;}'
    + '#spap-av.on{background:rgba(3,5,12,.72);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);}'
    + '#spap-av.sai{background:rgba(0,0,0,.94);opacity:0;transition:background .35s ease,opacity .75s ease .25s;}'
    + '#spap-av .av{position:relative;width:100%;max-width:380px;border-radius:30px;padding:30px 24px 22px;text-align:center;overflow:hidden;'
    + 'background:linear-gradient(150deg,rgba(255,255,255,.16),rgba(255,255,255,.04) 45%,rgba(233,185,84,.07));border:1px solid rgba(233,185,84,.45);'
    + '-webkit-backdrop-filter:blur(24px) saturate(150%);backdrop-filter:blur(24px) saturate(150%);'
    + 'box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.06) inset,0 0 60px rgba(233,185,84,.18);'
    + 'opacity:0;transform:translateY(26px) scale(.93);filter:blur(10px);transition:opacity .75s ease .15s,transform .85s cubic-bezier(.16,1,.3,1) .15s,filter .75s ease .15s;}'
    + '#spap-av.on .av{opacity:1;transform:none;filter:none;}'
    + '#spap-av.sai .av{opacity:0;transform:scale(.95);filter:blur(8px);transition:opacity .45s ease,transform .5s ease,filter .45s ease;}'
    + '#spap-av .av::before{content:"";position:absolute;inset:-60%;background:conic-gradient(from 0deg,transparent 0 70%,rgba(233,185,84,.22) 80%,transparent 90%);animation:av-gira 7s linear infinite;pointer-events:none;}'
    + '@keyframes av-gira{to{transform:rotate(360deg)}}'
    + '#spap-av .av>*{position:relative;}'
    + '#spap-av .av-logo{width:86px;height:86px;margin:0 auto 14px;border-radius:50%;padding:4px;background:conic-gradient(#f7e2a1,#b47a1f,#e9b954,#7a5313,#f7e2a1);box-shadow:0 0 34px rgba(233,185,84,.45);animation:av-pulso 2.6s ease-in-out infinite;}'
    + '#spap-av .av-logo img{width:100%;height:100%;border-radius:50%;object-fit:contain;background:#0b0f1c;display:block;}'
    + '@keyframes av-pulso{0%,100%{box-shadow:0 0 26px rgba(233,185,84,.35)}50%{box-shadow:0 0 48px rgba(233,185,84,.7)}}'
    + '#spap-av .ouro{background:linear-gradient(100deg,#b47a1f 0%,#f7e2a1 22%,#e9b954 40%,#fff3c9 52%,#c8902e 66%,#f2d27a 82%,#b47a1f 100%);background-size:220% 100%;'
    + '-webkit-background-clip:text;background-clip:text;color:transparent;animation:av-brilho 3.2s linear infinite;}'
    + '@keyframes av-brilho{to{background-position:-220% 0}}'
    + '#spap-av .av-selo{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;padding:6px 14px;border-radius:999px;border:1px solid rgba(233,185,84,.5);color:#f2d27a;background:rgba(233,185,84,.08);}'
    + '#spap-av .av-tit{font-family:Sora,"Plus Jakarta Sans",sans-serif;font-size:27px;font-weight:800;letter-spacing:-.01em;margin:14px 0 4px;line-height:1.15;}'
    + '#spap-av .av-quem{font-size:14px;font-weight:700;color:rgba(255,255,255,.88);}'
    + '#spap-av .av-loja{font-size:12.5px;color:rgba(247,226,161,.75);margin-top:2px;font-weight:600;}'
    + '#spap-av .av-hora{font-family:Sora,"Plus Jakarta Sans",sans-serif;font-size:58px;font-weight:800;letter-spacing:-.03em;line-height:1;margin:18px 0 4px;}'
    + '#spap-av .av-hora-l{font-size:11.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.55);}'
    + '#spap-av .av-data{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:8px 14px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);font-size:13.5px;font-weight:700;color:#f7e2a1;}'
    + '#spap-av .av-val{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;}'
    + '#spap-av .av-val div{padding:10px;border-radius:16px;background:rgba(255,255,255,.07);border:1px solid rgba(233,185,84,.25);}'
    + '#spap-av .av-val small{display:block;font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6);}'
    + '#spap-av .av-val b{display:block;font-size:17px;margin-top:3px;}'
    + '#spap-av .av-fim{margin-top:20px;font-size:12px;color:rgba(255,255,255,.5);letter-spacing:.04em;}'
    + '#spap-av .av-fim b{color:rgba(247,226,161,.85);font-weight:700;}'
    + '#spap-av .av .entra{opacity:0;transform:translateY(10px);transition:opacity .6s ease,transform .7s cubic-bezier(.16,1,.3,1);}'
    + '#spap-av.on .av .entra{opacity:1;transform:none;}'
    + '#spap-av.on .av .e1{transition-delay:.35s} #spap-av.on .av .e2{transition-delay:.45s} #spap-av.on .av .e3{transition-delay:.55s} #spap-av.on .av .e4{transition-delay:.65s} #spap-av.on .av .e5{transition-delay:.8s}'
    + '@media (prefers-reduced-motion:reduce){#spap-av .av::before,#spap-av .ouro,#spap-av .av-logo{animation:none}}';
  function estilo() { if (document.getElementById('spap-av-css')) return; var st = document.createElement('style'); st.id = 'spap-av-css'; st.textContent = css; document.head.appendChild(st); }

  // toque suave e elegante (sino em subida, ao estilo dos toques de notificação dos telemóveis)
  function som() {
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      var ctx = window._spapAudio || (window._spapAudio = new C());
      if (ctx.state === 'suspended') ctx.resume();
      var t0 = ctx.currentTime + 0.02, mestre = ctx.createGain(); mestre.gain.value = 0.9; mestre.connect(ctx.destination);
      var notas = [[1318.5, 0], [1661.2, 0.12], [1975.5, 0.24], [2637.0, 0.40]];   // E6 · G#6 · B6 · E7 (acorde de Mi maior, a subir)
      notas.forEach(function (n, i) {
        [[1, 'sine', 0.20], [2.01, 'sine', 0.05], [3.98, 'triangle', 0.018]].forEach(function (h) {
          var o = ctx.createOscillator(), g = ctx.createGain(), t = t0 + n[1], dur = i === notas.length - 1 ? 1.9 : 1.2;
          o.type = h[1]; o.frequency.value = n[0] * h[0];
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(h[2], t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g); g.connect(mestre); o.start(t); o.stop(t + dur + 0.05);
        });
      });
    } catch (e) {}
  }
  // os toques só podem tocar depois de a pessoa tocar no ecrã uma vez: prepara o som no 1.º toque
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { try { var C = window.AudioContext || window.webkitAudioContext; if (C && !window._spapAudio) window._spapAudio = new C(); if (window._spapAudio && window._spapAudio.state === 'suspended') window._spapAudio.resume(); } catch (e) {} }, { once: true, capture: true }); });

  var _filaAvisos = [], _aMostrar = false;
  function proximo() {
    if (_aMostrar || !_filaAvisos.length) return;
    _aMostrar = true;
    var x = _filaAvisos.shift(), ev = x.ev, ex = ev.extra || {}, abre = ev.acao === 'abertura', banca = ex.tipo === 'banca';
    var quando = ex.hora || ev.criado_em;
    estilo();
    var d = document.createElement('div'); d.id = 'spap-av'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = '<div class="av">'
      + '<div class="av-logo entra e1"><img src="ssteam-logo.png" alt="SSTEAM"></div>'
      + '<div class="av-selo entra e1">SSTEAM · Aviso</div>'
      + '<div class="av-tit ouro entra e2">' + (abre ? (banca ? 'A banca abriu' : 'A loja abriu') : 'Dia entregue') + '</div>'
      + '<div class="av-quem entra e2">' + esc(ev.quem || 'Balconista') + '</div>'
      + (x.nome ? '<div class="av-loja entra e2">' + esc(x.nome) + '</div>' : '')
      + '<div class="av-hora ouro entra e3">' + hora(quando) + '</div>'
      + '<div class="av-hora-l entra e3">' + (abre ? 'hora de abertura' : 'hora da entrega') + '</div>'
      + '<div class="av-data entra e4">📅 ' + dataLonga(quando) + '</div>'
      + (!abre ? '<div class="av-val entra e4"><div><small>Entregue</small><b class="ouro">' + fmt(ex.dinheiro) + '</b></div><div><small>Gastos</small><b class="ouro">' + fmt(ex.gastos) + '</b></div></div>' : '')
      + '<div class="av-fim entra e5">Toque em qualquer lado para <b>fechar</b></div></div>';
    var fechado = false;
    var fechar = function () {
      if (fechado) return; fechado = true;
      d.classList.remove('on'); d.classList.add('sai');
      setTimeout(function () { d.remove(); _aMostrar = false; setTimeout(proximo, 250); }, 1050);
    };
    d.addEventListener('click', fechar);
    document.addEventListener('keydown', function t(e) { if (e.key === 'Escape' || e.key === 'Enter') { document.removeEventListener('keydown', t); fechar(); } });
    document.body.appendChild(d);
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('on'); }); });
    setTimeout(som, 250);
    try { if (navigator.vibrate) navigator.vibrate([40, 60, 40]); } catch (e) {}
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(abre ? (banca ? 'A banca abriu' : 'A loja abriu') : 'Dia entregue', { body: (ev.quem || 'Balconista') + ' · ' + hora(quando) + ' · ' + new Date(quando).toLocaleDateString('pt-PT'), tag: 'spap-' + ev.id });
      }
    } catch (e) {}
  }

  // cada aviso aparece UMA vez neste aparelho (mesmo que o Monitor seja recarregado ou o registo venha repetido)
  function chaveAviso(ev) {
    var ex = ev.extra || {};
    if (ev.acao === 'abertura') return 'ab|' + (ev.quem || '') + '|' + dia(new Date(ex.hora || ev.criado_em));
    return 'en|' + (ev.quem || '') + '|' + Math.round(new Date(ex.hora || ev.criado_em).getTime() / 60000);
  }
  var _getLoja = null, _getNome = null, _aVer = false;
  async function verificar() {
    if (_aVer || !_getLoja) return;
    var loja = _getLoja(); if (!loja || typeof supabaseClient === 'undefined') return;
    if (_pagina) spapVerConta(loja, _pagina);
    _aVer = true;
    try {
      var k = 'spap_avisos_visto_' + loja, kM = 'spap_avisos_mostrados_' + loja, desde = null, mostrados = [];
      try { desde = localStorage.getItem(k); mostrados = JSON.parse(localStorage.getItem(kM) || '[]'); } catch (e) {}
      if (!desde) { var ini = new Date(); ini.setHours(0, 0, 0, 0); desde = ini.toISOString(); }   // 1.ª vez: mostra os de hoje
      var r = await supabaseClient.from('atividade_log').select('id,acao,quem,detalhe,extra,criado_em').eq('loja_id', loja).in('acao', ['abertura', 'entrega_dia'])
        .gt('criado_em', desde).order('criado_em', { ascending: true }).limit(20);
      var l = (r && r.data) || [];
      if (l.length) {
        var nome = _getNome ? _getNome() : '';
        l.forEach(function (ev) {
          var c = chaveAviso(ev);
          if (mostrados.indexOf(c) >= 0 || mostrados.indexOf('id|' + ev.id) >= 0) return;
          mostrados.push(c, 'id|' + ev.id);
          _filaAvisos.push({ ev: ev, nome: nome });
        });
        try { localStorage.setItem(kM, JSON.stringify(mostrados.slice(-300))); localStorage.setItem(k, l[l.length - 1].criado_em); } catch (e) {}
        proximo();
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
