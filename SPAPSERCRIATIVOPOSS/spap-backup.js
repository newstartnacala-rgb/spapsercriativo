/* SPAP — Backup, recuperação e migração (Monitor da Loja e Monitor e Banca).
   spapBackupAbrir({ lojaId, nomeLoja, cor })
   • Mostra o que vai no backup (produtos, fotos, vendas…) e baixa um ficheiro .json com tudo.
   • Recuperar: escolhe o ficheiro de backup no telemóvel/computador, lê-o, mostra o que tem e traz os
     produtos de volta (só backups do MESMO email da conta).
   • Migrar: Banca → Loja ou Loja → Banca, com o mesmo email. Os produtos e o histórico vão juntos;
     a conta de origem deixa de existir (é cancelada e passa a ser do outro tipo). */
(function () {
  var TABELAS = [
    { t: 'produtos', rot: 'Produtos', ic: '📦' },
    { t: 'vendas', rot: 'Vendas', ic: '🧾' },
    { t: 'venda_itens', rot: 'Itens vendidos', ic: '🛒' },
    { t: 'entregas', rot: 'Entregas do dia', ic: '🤝' },
    { t: 'descontos', rot: 'Descontos', ic: '🏷️' },
    { t: 'perdas', rot: 'Perdas', ic: '📉' },
    { t: 'balancos', rot: 'Inventários', ic: '📋' }
  ];
  var TIRAR = ['id', 'loja_id', 'criado_em', 'created_at', 'atualizado_em', 'updated_at'];
  var cfg = {}, info = { loja: null, email: '', tipo: 'comercial', contagens: {} };

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v) { return 'MT ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function tam(b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function ehBanca(t) { return t === 'banca'; }
  function nomeTipo(t) { return ehBanca(t) ? 'Banca' : 'Loja'; }

  var css = ''
    + '#sbk{position:fixed;inset:0;z-index:100030;background:rgba(8,15,35,.5);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;opacity:0;transition:opacity .18s;}'
    + '#sbk.on{opacity:1;}'
    + '#sbk .sbk-f{width:100%;max-width:560px;max-height:94vh;max-height:94dvh;background:#f6f8fc;border-radius:26px 26px 0 0;display:flex;flex-direction:column;transform:translateY(30px);transition:transform .25s cubic-bezier(.2,.9,.3,1.1);box-shadow:0 -20px 60px rgba(8,15,35,.3);}'
    + '#sbk.on .sbk-f{transform:none;}'
    + '@media(min-width:700px){#sbk{align-items:center}#sbk .sbk-f{border-radius:26px;max-height:90vh;}}'
    + '#sbk .sbk-cab{display:flex;align-items:center;gap:12px;padding:16px 18px 14px;color:#fff;border-radius:26px 26px 0 0;background:var(--sbk);}'
    + '@media(min-width:700px){#sbk .sbk-cab{border-radius:26px 26px 0 0}}'
    + '#sbk .sbk-cab .ic{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:22px;}'
    + '#sbk .sbk-cab h3{margin:0;font-size:18px;font-weight:800;} #sbk .sbk-cab p{margin:2px 0 0;font-size:12.5px;opacity:.9;}'
    + '#sbk .sbk-cab button{margin-left:auto;width:36px;height:36px;border-radius:12px;border:0;background:rgba(255,255,255,.2);color:#fff;font-size:17px;font-weight:800;cursor:pointer;}'
    + '#sbk .sbk-tabs{display:flex;gap:6px;padding:12px 14px 0;}'
    + '#sbk .sbk-tabs button{flex:1;height:42px;border:0;border-radius:12px;background:#e9eef7;color:#334155;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit;}'
    + '#sbk .sbk-tabs button.on{background:#fff;color:var(--sbkc);box-shadow:0 4px 14px rgba(15,23,42,.1);}'
    + '#sbk .sbk-c{padding:14px 16px 22px;overflow:auto;-webkit-overflow-scrolling:touch;}'
    + '#sbk .sbk-card{background:#fff;border-radius:18px;padding:14px;margin-bottom:12px;box-shadow:0 4px 16px rgba(15,23,42,.05);border:1px solid #eef2f7;}'
    + '#sbk .sbk-card h4{margin:0 0 10px;font-size:15px;font-weight:800;color:#0f172a;display:block;text-align:left;text-transform:none;letter-spacing:0;line-height:1.35;}'
    + '#sbk .sbk-card h4 small{display:block;font-size:11.5px;color:#94a3b8;font-weight:700;text-transform:none;letter-spacing:0;margin-top:2px;word-break:break-all;}'
    + '#sbk .sbk-txt{font-size:13px;color:#475569;line-height:1.55;margin:0 0 10px;}'
    + '#sbk .sbk-lin{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;}'
    + '#sbk .sbk-lin:last-child{border-bottom:0;} #sbk .sbk-lin .e{width:30px;height:30px;border-radius:10px;background:#f1f5f9;display:grid;place-items:center;font-size:16px;} #sbk .sbk-lin b{margin-left:auto;color:#0f172a;}'
    + '#sbk .sbk-lin small{display:block;font-size:11.5px;color:#94a3b8;}'
    + '#sbk .sbk-bt{width:100%;height:54px;border:0;border-radius:16px;font-weight:800;font-size:15.5px;cursor:pointer;font-family:inherit;color:#fff;background:var(--sbk);box-shadow:0 10px 22px rgba(15,23,42,.16);margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;}'
    + '#sbk .sbk-bt.sec{background:#fff;color:var(--sbkc);border:1.5px solid #dbe3f0;box-shadow:none;}'
    + '#sbk .sbk-bt.verde{background:linear-gradient(135deg,#16a34a,#15803d);}'
    + '#sbk .sbk-bt.perigo{background:linear-gradient(135deg,#ef4444,#dc2626);}'
    + '#sbk .sbk-bt:disabled{opacity:.6;cursor:default;}'
    + '#sbk .sbk-nota{font-size:12px;color:#94a3b8;text-align:center;margin-top:10px;}'
    + '#sbk .sbk-aviso{border-radius:14px;padding:11px 12px;font-size:13px;line-height:1.5;margin-bottom:10px;}'
    + '#sbk .sbk-aviso.am{background:#fffbeb;border:1px solid #fde68a;color:#92400e;} #sbk .sbk-aviso.vm{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;} #sbk .sbk-aviso.vd{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;} #sbk .sbk-aviso.az{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;}'
    + '#sbk .sbk-prev{display:flex;gap:8px;overflow-x:auto;padding:4px 0 8px;} #sbk .sbk-prev div{flex:0 0 74px;text-align:center;font-size:10.5px;color:#475569;} #sbk .sbk-prev img,#sbk .sbk-prev span{width:62px;height:62px;border-radius:12px;object-fit:cover;background:#f1f5f9;display:grid;place-items:center;margin:0 auto 4px;font-size:24px;}'
    + '#sbk .sbk-chk{display:flex;gap:10px;align-items:flex-start;background:#f8fafc;border-radius:12px;padding:10px 12px;font-size:13px;color:#334155;margin:8px 0;line-height:1.45;} #sbk .sbk-chk input{width:20px;height:20px;margin-top:1px;flex-shrink:0;}'
    + '#sbk .sbk-tipo{display:flex;align-items:center;gap:10px;justify-content:center;margin:6px 0 12px;} #sbk .sbk-tipo div{flex:1;text-align:center;border-radius:16px;padding:12px 8px;font-weight:800;font-size:14px;} #sbk .sbk-tipo .de{background:#fef2f2;color:#b91c1c;text-decoration:line-through;} #sbk .sbk-tipo .para{background:#f0fdf4;color:#15803d;} #sbk .sbk-tipo i{font-style:normal;font-size:22px;color:#94a3b8;}'
    + '#sbk .sbk-in{width:100%;box-sizing:border-box;height:52px;border:1.5px solid #dfe6f3;border-radius:14px;padding:0 14px;font-size:17px;font-weight:800;letter-spacing:.08em;text-align:center;text-transform:uppercase;outline:none;font-family:inherit;}'
    + '#sbk .sbk-in:focus{border-color:var(--sbkc);}'
    + '#sbk .sbk-prog{height:8px;border-radius:9px;background:#e2e8f0;overflow:hidden;margin:10px 0 4px;} #sbk .sbk-prog i{display:block;height:100%;width:0;background:var(--sbk);transition:width .2s;}'
    + '#sbk .sbk-op{display:flex;align-items:center;gap:10px;border:1.5px solid #e2e8f0;border-radius:14px;padding:10px 12px;margin-bottom:8px;cursor:pointer;background:#fff;} #sbk .sbk-op:has(input:checked){border-color:var(--sbkc);background:#f8fafc;box-shadow:0 0 0 3px rgba(37,99,235,.08);} #sbk .sbk-op input{width:20px;height:20px;accent-color:var(--sbkc);flex-shrink:0;} #sbk .sbk-op-i{width:38px;height:38px;border-radius:12px;background:#f1f5f9;display:grid;place-items:center;font-size:20px;flex-shrink:0;} #sbk .sbk-op b{display:block;font-size:14px;color:#0f172a;} #sbk .sbk-op small{display:block;font-size:11.5px;color:#64748b;margin-top:1px;}'
    + '#sbk .sbk-passo{display:flex;align-items:center;gap:10px;padding:9px 0;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9;} #sbk .sbk-passo.ok{color:#15803d;font-weight:700;} #sbk .sbk-passo.erro{color:#dc2626;font-weight:700;}'
    + 'html.escuro #sbk{filter:invert(1) hue-rotate(180deg);} html.escuro #sbk img{filter:invert(1) hue-rotate(180deg);}';

  function el(id) { return document.getElementById(id); }
  function estilo() { if (el('sbk-css')) return; var s = document.createElement('style'); s.id = 'sbk-css'; s.textContent = css; document.head.appendChild(s); }

  async function todos(t, colunas) {
    var out = [], de = 0, passo = 1000;
    for (var i = 0; i < 100; i++) {
      var r = await supabaseClient.from(t).select(colunas || '*').eq('loja_id', cfg.lojaId).range(de, de + passo - 1);
      if (r.error) { if (i === 0) throw r.error; break; }
      var d = r.data || []; out = out.concat(d);
      if (d.length < passo) break; de += passo;
    }
    return out;
  }
  async function contar(t) {
    try { var r = await supabaseClient.from(t).select('id', { count: 'exact', head: true }).eq('loja_id', cfg.lojaId); return r.error ? null : (r.count || 0); } catch (e) { return null; }
  }

  // ===== Abrir =====
  window.spapBackupAbrir = async function (o) {
    cfg = Object.assign({ cor: 'linear-gradient(135deg,#1d4ed8,#4338ca)', corTexto: '#1d4ed8' }, o || {});
    if (!cfg.lojaId) return;
    estilo();
    var ant = el('sbk'); if (ant) ant.remove();
    var ov = document.createElement('div'); ov.id = 'sbk';
    ov.style.setProperty('--sbk', cfg.cor); ov.style.setProperty('--sbkc', cfg.corTexto);
    ov.innerHTML = '<div class="sbk-f" role="dialog" aria-modal="true"><div class="sbk-cab"><div class="ic">💾</div><div><h3>Backup e segurança</h3><p>' + esc(cfg.nomeLoja || '') + '</p></div><button type="button" aria-label="Fechar" onclick="spapBackupFechar()">✕</button></div>'
      + '<div class="sbk-tabs"><button type="button" data-t="baixar" class="on">⬇️ Backup</button><button type="button" data-t="recuperar">♻️ Recuperar</button><button type="button" data-t="migrar">🔁 Migrar</button></div>'
      + '<div class="sbk-c" id="sbk-c"></div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) spapBackupFechar(); });
    ov.querySelectorAll('.sbk-tabs button').forEach(function (b) { b.onclick = function () { aba(b.dataset.t); }; });
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('on'); });
    el('sbk-c').innerHTML = '<div class="sbk-card"><p class="sbk-txt">A ver os dados da conta…</p></div>';
    try {
      var r = await supabaseClient.from('lojas').select('*').eq('id', cfg.lojaId).maybeSingle();
      info.loja = r.data || null;
      // o tipo vem do Monitor onde estamos (Monitor e Banca = banca; Monitor = loja)
      info.tipo = cfg.tipo ? (cfg.tipo === 'banca' ? 'banca' : 'comercial') : (((info.loja && info.loja.tipo_loja) === 'banca') ? 'banca' : 'comercial');
      var u = null; try { u = (await supabaseClient.auth.getUser()).data.user; } catch (e) {}
      info.email = String((info.loja && info.loja.email_dono) || (u && u.email) || '').trim().toLowerCase();
      info.emailSessao = String((u && u.email) || '').trim().toLowerCase();
    } catch (e) {}
    aba(cfg.aba || 'baixar');
  };
  window.spapBackupFechar = function () { var ov = el('sbk'); if (!ov) return; ov.classList.remove('on'); setTimeout(function () { ov.remove(); }, 200); };
  function aba(t) {
    document.querySelectorAll('#sbk .sbk-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    if (t === 'baixar') abaBaixar(); else if (t === 'recuperar') abaRecuperar(); else abaMigrar();
    el('sbk-c').scrollTop = 0;
  }

  // ===== 1) BACKUP: mostra o que vai e baixa =====
  async function abaBaixar() {
    var c = el('sbk-c');
    c.innerHTML = '<div class="sbk-card"><h4>📋 O que vai no backup <small id="sbk-tam"></small></h4><div id="sbk-lista"><p class="sbk-txt">A contar os dados…</p></div></div>'
      + '<button type="button" class="sbk-bt" id="sbk-baixar">⬇️ Baixar o backup agora</button>'
      + '<button type="button" class="sbk-bt sec" id="sbk-partilhar">📤 Enviar para email / Drive / WhatsApp</button>'
      + '<div class="sbk-aviso az" style="margin-top:12px">💡 O ficheiro fica na pasta <b>Downloads / Transferências</b>. Para recuperar, abra o separador <b>♻️ Recuperar</b> e escolha esse ficheiro.</div>'
      + '<div class="sbk-nota" id="sbk-ultimo"></div>';
    el('sbk-baixar').onclick = function () { fazerBackup(false); };
    el('sbk-partilhar').onclick = function () { fazerBackup(true); };
    var ult = null; try { ult = localStorage.getItem('ultimo_backup_' + cfg.lojaId); } catch (e) {}
    if (ult) el('sbk-ultimo').textContent = 'Último backup neste aparelho: ' + ult;
    var res = await Promise.all(TABELAS.map(function (x) { return contar(x.t); }));
    var fotos = null, valor = 0;
    try {
      var pr = await todos('produtos', 'id,stock,preco_compra,preco,imagem');
      fotos = pr.filter(function (p) { return p.imagem; }).length;
      pr.forEach(function (p) { valor += Math.max(0, parseInt(p.stock) || 0) * (parseFloat(p.preco_compra) || 0); });
    } catch (e) {}
    info.contagens = {};
    el('sbk-lista').innerHTML = TABELAS.map(function (x, i) {
      info.contagens[x.t] = res[i];
      if (res[i] === null) return '';
      var sub = x.t === 'produtos' ? '<small>' + (fotos != null ? fotos + ' com foto · ' : '') + 'stock a custo ' + fmt(valor) + '</small>' : '';
      return '<div class="sbk-lin"><span class="e">' + x.ic + '</span><span>' + x.rot + sub + '</span><b>' + res[i] + '</b></div>';
    }).join('') + '<div class="sbk-lin"><span class="e">🏪</span><span>Dados da ' + nomeTipo(info.tipo).toLowerCase() + '<small>nome, telefone, email ' + esc(info.email || '') + '</small></span><b>✓</b></div>';
  }
  async function montar(progresso) {
    var dados = { loja: info.loja };
    for (var i = 0; i < TABELAS.length; i++) {
      if (progresso) progresso(i / TABELAS.length, TABELAS[i].rot);
      try { dados[TABELAS[i].t] = await todos(TABELAS[i].t); } catch (e) { dados[TABELAS[i].t] = []; }
    }
    if (progresso) progresso(1, 'Pronto');
    var resumo = {}; TABELAS.forEach(function (x) { resumo[x.t] = (dados[x.t] || []).length; });
    return { app: 'Spap-Sercriativo', versao_backup: '2.0', data: new Date().toISOString(), loja_id: cfg.lojaId,
      loja_nome: (info.loja && info.loja.nome) || cfg.nomeLoja || '', tipo_loja: info.tipo, email: info.email, resumo: resumo, dados: dados };
  }
  function nomeFicheiro() {
    var n = ((info.loja && info.loja.nome) || cfg.nomeLoja || 'loja').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    return 'backup-' + (ehBanca(info.tipo) ? 'banca' : 'loja') + '-' + (n || 'spap') + '-' + new Date().toISOString().slice(0, 10) + '.json';
  }
  function baixarFicheiro(texto, nome) {
    var blob = new Blob([texto], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function marcarFeito() {
    var agora = new Date().toLocaleString('pt-PT');
    try { localStorage.setItem('ultimo_backup_' + cfg.lojaId, agora); } catch (e) {}
    var u = el('sbk-ultimo'); if (u) u.textContent = 'Último backup neste aparelho: ' + agora;
  }
  async function fazerBackup(partilhar, silencioso) {
    var bt = el(partilhar ? 'sbk-partilhar' : 'sbk-baixar'), txt0 = bt ? bt.innerHTML : '';
    if (bt) { bt.disabled = true; bt.innerHTML = '⏳ A juntar os dados…'; }
    try {
      var b = await montar(function (f, rot) { if (bt) bt.innerHTML = '⏳ ' + rot + '… ' + Math.round(f * 100) + '%'; });
      var texto = JSON.stringify(b), nome = nomeFicheiro();
      var feito = false;
      if (partilhar) {
        var fich = new File([texto], nome, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [fich] })) {
          try { await navigator.share({ files: [fich], title: 'Backup ' + b.loja_nome, text: 'Backup da ' + nomeTipo(info.tipo).toLowerCase() + ' ' + b.loja_nome + ' (' + new Date().toLocaleDateString('pt-PT') + ')' }); feito = true; }
          catch (e) { if (e && e.name === 'AbortError') { if (bt) { bt.disabled = false; bt.innerHTML = txt0; } return null; } }
        }
      }
      if (!feito) baixarFicheiro(texto, nome);
      marcarFeito();
      if (!silencioso) aviso('✅ Backup feito', 'Ficheiro <b>' + esc(nome) + '</b> (' + tam(texto.length) + ')<br>' + b.resumo.produtos + ' produtos · ' + b.resumo.vendas + ' vendas.', 'vd');
      return b;
    } catch (e) {
      aviso('❌ Não foi possível fazer o backup', esc((e && e.message) || e) + '<br>Verifique a internet e tente outra vez.', 'vm');
      return null;
    } finally { if (bt) { bt.disabled = false; bt.innerHTML = txt0; } }
  }
  function aviso(tit, html, cls) {
    var c = el('sbk-c'); if (!c) return;
    var d = document.createElement('div'); d.className = 'sbk-aviso ' + (cls || 'az'); d.innerHTML = '<b>' + tit + '</b><br>' + html;
    c.insertBefore(d, c.firstChild); c.scrollTop = 0;
  }

  // ===== 2) RECUPERAR: escolher ficheiro → ler → mostrar → trazer os produtos de volta =====
  var lido = null;
  function abaRecuperar() {
    lido = null;
    el('sbk-c').innerHTML = '<div class="sbk-card"><h4>♻️ Recuperar de um ficheiro de backup</h4>'
      + '<p class="sbk-txt">Escolha o ficheiro de backup (<b>.json</b>) que baixou antes — normalmente está em <b>Downloads / Transferências</b>, no email ou no WhatsApp. O ficheiro é lido e os produtos voltam para esta conta.</p>'
      + '<input type="file" id="sbk-fich" accept=".json,application/json,text/plain" style="display:none">'
      + '<button type="button" class="sbk-bt" id="sbk-escolher">📂 Escolher o ficheiro de backup</button>'
      + '<div class="sbk-aviso am" style="margin-top:12px">🔒 Por segurança, só pode recuperar um backup feito com o <b>mesmo email</b> desta conta' + (info.email ? ' (<b>' + esc(info.email) + '</b>)' : '') + '.</div></div>'
      + '<div id="sbk-res"></div>';
    var inp = el('sbk-fich');
    el('sbk-escolher').onclick = function () { inp.value = ''; inp.click(); };
    inp.onchange = function () { if (inp.files && inp.files[0]) lerFicheiro(inp.files[0]); };
  }
  function lerFicheiro(f) {
    var box = el('sbk-res');
    box.innerHTML = '<div class="sbk-card"><p class="sbk-txt">📖 A ler «' + esc(f.name) + '»…</p></div>';
    var r = new FileReader();
    r.onerror = function () { box.innerHTML = '<div class="sbk-aviso vm">❌ Não foi possível ler o ficheiro.</div>'; };
    r.onload = async function () {
      var b = null;
      try { b = JSON.parse(String(r.result || '').replace(/^﻿/, '')); } catch (e) {}
      var prods = b && b.dados && Array.isArray(b.dados.produtos) ? b.dados.produtos : null;
      if (!prods) { box.innerHTML = '<div class="sbk-aviso vm">❌ Este ficheiro não é um backup da Spap-Sercriativo (ou está estragado).<br>Escolha o ficheiro <b>backup-….json</b>.</div>'; return; }
      var emailF = String(b.email || (b.dados.loja && b.dados.loja.email_dono) || '').trim().toLowerCase();
      var mesmaConta = b.loja_id && String(b.loja_id) === String(cfg.lojaId);
      var meus = [info.email, info.emailSessao].filter(Boolean);
      if (emailF ? meus.indexOf(emailF) < 0 : !mesmaConta) {
        box.innerHTML = '<div class="sbk-aviso vm">🚫 <b>Este backup é de outro email</b>' + (emailF ? ' (' + esc(emailF) + ')' : '') + '.<br>Só pode recuperar backups feitos com o email desta conta' + (info.email ? ' (<b>' + esc(info.email) + '</b>)' : '') + '.</div>';
        return;
      }
      // compara com os produtos que já existem
      var atuais = [];
      try { atuais = await todos('produtos', 'id,nome,codbarras,stock'); } catch (e) {}
      var porCod = {}, porNome = {};
      atuais.forEach(function (p) { if (p.codbarras) porCod[String(p.codbarras).trim()] = p; porNome[String(p.nome || '').trim().toLowerCase()] = p; });
      var novos = [], existentes = [];
      prods.forEach(function (p) {
        var ex = (p.codbarras && porCod[String(p.codbarras).trim()]) || porNome[String(p.nome || '').trim().toLowerCase()];
        if (ex) existentes.push({ de: p, para: ex }); else novos.push(p);
      });
      lido = { b: b, novos: novos, existentes: existentes };
      var fotos = prods.filter(function (p) { return p.imagem; }).length;
      var prev = prods.slice(0, 12).map(function (p) { return '<div>' + (p.imagem ? '<img src="' + esc(p.imagem) + '" alt="">' : '<span>📦</span>') + esc(String(p.nome || '').slice(0, 22)) + '</div>'; }).join('');
      box.innerHTML = '<div class="sbk-card"><h4>📄 O que tem este backup <small>' + esc(f.name) + '</small></h4>'
        + '<div class="sbk-lin"><span class="e">🏪</span><span>' + esc(b.loja_nome || 'Conta') + '<small>' + nomeTipo(b.tipo_loja || (b.dados.loja && b.dados.loja.tipo_loja)) + ' · ' + esc(emailF || 'mesma conta') + '</small></span><b>✓</b></div>'
        + '<div class="sbk-lin"><span class="e">📅</span><span>Feito em</span><b>' + (b.data ? new Date(b.data).toLocaleString('pt-PT') : '—') + '</b></div>'
        + '<div class="sbk-lin"><span class="e">📦</span><span>Produtos no ficheiro<small>' + fotos + ' com foto</small></span><b>' + prods.length + '</b></div>'
        + '<div class="sbk-lin"><span class="e">➕</span><span>Vão ser criados (não existem agora)</span><b style="color:#15803d">' + novos.length + '</b></div>'
        + '<div class="sbk-lin"><span class="e">🔁</span><span>Já existem nesta conta</span><b>' + existentes.length + '</b></div>'
        + (prev ? '<div class="sbk-prev" style="margin-top:8px">' + prev + '</div>' : '')
        + (existentes.length ? '<label class="sbk-chk"><input type="checkbox" id="sbk-sobrepor"><span><b>Repor também os ' + existentes.length + ' que já existem</b><br>O preço, o stock, a foto e a categoria voltam a ser os do backup.</span></label>' : '')
        + '<button type="button" class="sbk-bt verde" id="sbk-repor">♻️ Trazer os produtos de volta</button><div class="sbk-prog" id="sbk-prog" style="display:none"><i></i></div><div class="sbk-nota" id="sbk-prog-t"></div></div>';
      el('sbk-repor').onclick = repor;
      if (!novos.length && !existentes.length) el('sbk-repor').disabled = true;
    };
    r.readAsText(f);
  }
  function limpar(p) {
    var o = {}; Object.keys(p).forEach(function (k) { if (TIRAR.indexOf(k) < 0 && k.charAt(0) !== '_') o[k] = p[k]; });
    o.loja_id = cfg.lojaId; return o;
  }
  // insere/atualiza; se a base de dados não tiver alguma coluna do ficheiro, tira-a e tenta de novo
  var semColuna = {};
  function semCols(o) { var c = Object.assign({}, o); Object.keys(semColuna).forEach(function (k) { delete c[k]; }); return c; }
  async function tentar(fn) {
    for (var i = 0; i < 8; i++) {
      var r = await fn();
      var m = r && r.error && /column ['"]?([a-zA-Z0-9_]+)['"]? (of relation|does not exist)|find the '([a-zA-Z0-9_]+)' column/i.exec(r.error.message || '');
      if (m) { semColuna[m[1] || m[3]] = 1; continue; }
      return r;
    }
    return { error: { message: 'colunas' } };
  }
  async function repor() {
    if (!lido) return;
    var sobrepor = !!(el('sbk-sobrepor') && el('sbk-sobrepor').checked);
    var total = lido.novos.length + (sobrepor ? lido.existentes.length : 0);
    if (!total) { aviso('Nada para fazer', 'Todos os produtos do backup já existem. Marque «Repor também…» para os atualizar.', 'am'); return; }
    var bt = el('sbk-repor'); bt.disabled = true; bt.innerHTML = '⏳ A recuperar…';
    var pg = el('sbk-prog'), pt = el('sbk-prog-t'); pg.style.display = 'block';
    var feitos = 0, erros = 0, ultimoErro = '';
    function prog() { pg.firstChild.style.width = Math.round(feitos / total * 100) + '%'; pt.textContent = feitos + ' de ' + total + ' produtos'; }
    for (var i = 0; i < lido.novos.length; i += 40) {
      var lote = lido.novos.slice(i, i + 40).map(limpar);
      var r = await tentar(function () { return supabaseClient.from('produtos').insert(lote.map(semCols)); });
      if (r.error) {     // lote falhou: um a um, para salvar o máximo
        for (var j = 0; j < lote.length; j++) {
          var r1 = await tentar(function () { return supabaseClient.from('produtos').insert(semCols(lote[j])); });
          if (r1.error) { erros++; ultimoErro = r1.error.message; } feitos++; prog();
        }
      } else { feitos += lote.length; prog(); }
    }
    if (sobrepor) for (var k = 0; k < lido.existentes.length; k++) {
      var e = lido.existentes[k], dados = limpar(e.de); delete dados.loja_id;
      var r2 = await tentar(function () { return supabaseClient.from('produtos').update(semCols(dados)).eq('id', e.para.id); });
      if (r2.error) { erros++; ultimoErro = r2.error.message; } feitos++; prog();
    }
    bt.innerHTML = '✅ Concluído';
    try { await supabaseClient.from('atividade_log').insert({ loja_id: cfg.lojaId, quem: 'Dono', acao: 'backup_recuperado', detalhe: 'Recuperou ' + (feitos - erros) + ' produto(s) de um backup', extra: { ficheiro_data: lido.b.data, novos: lido.novos.length, repostos: sobrepor ? lido.existentes.length : 0 } }); } catch (e2) {}
    if (erros) aviso('⚠️ Recuperado com falhas', (feitos - erros) + ' produto(s) recuperados, ' + erros + ' falharam.<br><small>' + esc(ultimoErro) + '</small>', 'am');
    else aviso('✅ Produtos recuperados', feitos + ' produto(s) voltaram para esta conta.', 'vd');
    if (typeof cfg.depois === 'function') try { cfg.depois(); } catch (e3) {}
  }

  // ===== 3) MIGRAR: transferência direta dentro da plataforma (Banca ↔ Loja, mesmo email) =====
  var mig = { destinos: [], escolhido: null };
  async function abaMigrar() {
    var de = info.tipo, para = ehBanca(de) ? 'comercial' : 'banca';
    var c = el('sbk-c');
    c.innerHTML = '<div class="sbk-card"><p class="sbk-txt">A procurar as suas contas…</p></div>';
    // outras contas do MESMO login (mesmo email) que já são do outro tipo
    mig.destinos = [];
    try {
      var u = (await supabaseClient.auth.getUser()).data.user;
      var r = await supabaseClient.from('membros_loja').select('loja_id, papel, lojas(id,nome,tipo_loja,estado,email_dono)').eq('user_id', u.id);
      (r.data || []).forEach(function (m) {
        var l = m.lojas; if (!l || String(l.id) === String(cfg.lojaId)) return;
        if (/cancel/i.test(l.estado || '')) return;
        var t = l.tipo_loja === 'banca' ? 'banca' : 'comercial';
        if (t === para) mig.destinos.push(l);
      });
    } catch (e) {}
    mig.escolhido = mig.destinos.length ? String(mig.destinos[0].id) : 'nova';
    var ico = function (t) { return ehBanca(t) ? '🧺' : '🏪'; };
    var opcoes = mig.destinos.map(function (l) {
      return '<label class="sbk-op"><input type="radio" name="sbk-dest" value="' + esc(l.id) + '"' + (String(l.id) === mig.escolhido ? ' checked' : '') + '><span class="sbk-op-i">' + ico(para) + '</span><span><b>' + esc(l.nome || nomeTipo(para)) + '</b><small>' + nomeTipo(para) + ' que já tem · ' + esc(l.email_dono || info.email) + '</small></span></label>';
    }).join('') + '<label class="sbk-op"><input type="radio" name="sbk-dest" value="nova"' + (mig.escolhido === 'nova' ? ' checked' : '') + '><span class="sbk-op-i">✨</span><span><b>' + (mig.destinos.length ? 'Passar esta conta a ' : 'A minha ') + nomeTipo(para) + ' (mesmo email)</b><small>Transferência imediata — sem esperar aprovação</small></span></label>';
    c.innerHTML = '<div class="sbk-card"><h4>🔁 Transferir para ' + (ehBanca(para) ? 'uma Banca' : 'uma Loja') + '</h4>'
      + '<p class="sbk-txt">Os produtos passam <b>diretamente</b> desta ' + nomeTipo(de).toLowerCase() + ' para a ' + nomeTipo(para).toLowerCase() + ', dentro da plataforma, com o <b>mesmo email</b>' + (info.email ? ' (<b>' + esc(info.email) + '</b>)' : '') + '. Não precisa de baixar nem de enviar ficheiros.</p>'
      + '<div class="sbk-tipo"><div class="de">' + ico(de) + ' ' + nomeTipo(de) + '</div><i>➜</i><div class="para">' + ico(para) + ' ' + nomeTipo(para) + '</div></div>'
      + '<div style="font-size:12.5px;font-weight:800;color:#334155;margin:4px 0 6px">Para onde transferir?</div>' + opcoes
      + '<div class="sbk-lin" style="margin-top:6px"><span class="e">📦</span><span>Produtos, stock, preços e fotos</span><b>transferidos</b></div>'
      + '<div class="sbk-lin"><span class="e">📧</span><span>Email e senha</span><b>os mesmos</b></div>'
      + '<div class="sbk-aviso vm" style="margin-top:10px">⚠️ <b>A conta da ' + nomeTipo(de) + ' será cancelada</b> no fim da transferência. Depois usa as apps <b>' + (ehBanca(para) ? 'Banca e Vendas / Monitor e Banca' : 'Loja / Monitor') + '</b>.</div>'
      + '<button type="button" class="sbk-bt perigo" id="sbk-mig">🔁 Migrar para ' + nomeTipo(para) + '</button></div>';
    c.querySelectorAll('input[name="sbk-dest"]').forEach(function (r) { r.onchange = function () { mig.escolhido = r.value; }; });
    el('sbk-mig').onclick = function () { confirmarMigrar(de, para); };
  }
  function nomeDestino(para) {
    if (mig.escolhido === 'nova') return 'a sua ' + nomeTipo(para);
    var l = mig.destinos.find(function (x) { return String(x.id) === mig.escolhido; });
    return '«' + ((l && l.nome) || nomeTipo(para)) + '»';
  }
  function confirmarMigrar(de, para) {
    el('sbk-c').innerHTML = '<div class="sbk-card"><h4>Confirmar a transferência</h4>'
      + '<div class="sbk-tipo"><div class="de">' + nomeTipo(de) + '</div><i>➜</i><div class="para">' + nomeTipo(para) + '</div></div>'
      + '<p class="sbk-txt">Todos os produtos vão para ' + esc(nomeDestino(para)) + ' e a conta da ' + nomeTipo(de) + ' é cancelada. Escreva <b>MIGRAR</b> para confirmar.</p>'
      + '<input class="sbk-in" id="sbk-conf" autocomplete="off" placeholder="MIGRAR">'
      + '<button type="button" class="sbk-bt perigo" id="sbk-mig2" disabled>🔁 Transferir agora</button>'
      + '<button type="button" class="sbk-bt sec" id="sbk-volta">Cancelar</button></div>';
    var inp = el('sbk-conf'), bt = el('sbk-mig2');
    inp.oninput = function () { bt.disabled = inp.value.trim().toUpperCase() !== 'MIGRAR'; };
    el('sbk-volta').onclick = abaMigrar;
    bt.onclick = function () { migrar(de, para); };
    setTimeout(function () { try { inp.focus(); } catch (e) {} }, 100);
  }
  function passos(lista) {
    el('sbk-c').innerHTML = '<div class="sbk-card"><h4>🔁 A transferir…</h4>' + lista.map(function (t, i) { return '<div class="sbk-passo" id="sbk-p' + i + '"><span>⏳</span>' + t + '</div>'; }).join('') + '<div class="sbk-prog"><i id="sbk-pi"></i></div><div class="sbk-nota" id="sbk-pt"></div></div>';
  }
  function passo(i, est) { var d = el('sbk-p' + i); if (d) { d.className = 'sbk-passo ' + est; d.firstChild.textContent = est === 'ok' ? '✅' : est === 'erro' ? '❌' : '⏳'; } }
  function erroMig(msg) {
    var c = el('sbk-c'); var d = document.createElement('div'); d.className = 'sbk-aviso vm'; d.innerHTML = '<b>❌ A transferência parou</b><br>' + esc(msg) + '<br>Nada foi cancelado. Tente outra vez ou fale com o suporte: +258 86 657 7722';
    c.appendChild(d);
    var b = document.createElement('button'); b.className = 'sbk-bt sec'; b.textContent = 'Voltar'; b.onclick = abaMigrar; c.appendChild(b);
  }
  async function migrar(de, para) {
    var paraConta = mig.escolhido !== 'nova';
    var log = function (lojaId, txt, extra) { return supabaseClient.from('atividade_log').insert({ loja_id: lojaId, quem: 'Dono', acao: 'migracao', detalhe: txt, extra: extra }).then(function () {}, function () {}); };
    if (!paraConta) {
      // ===== mesma conta: passa a ser do outro tipo (tudo fica, na hora) =====
      passos(['A preparar a transferência', 'A transferir os produtos e o histórico para a ' + nomeTipo(para), 'A cancelar a conta da ' + nomeTipo(de)]);
      passo(0, 'ok');
      var r = await supabaseClient.from('lojas').update({ tipo_loja: para }).eq('id', cfg.lojaId).select('id,tipo_loja');
      if (r.error || !r.data || !r.data.length) { passo(1, 'erro'); return erroMig((r.error && r.error.message) || 'A conta não foi alterada.'); }
      passo(1, 'ok'); passo(2, 'ok'); el('sbk-pi').style.width = '100%';
      await log(cfg.lojaId, 'Transferiu tudo da ' + nomeTipo(de) + ' para a ' + nomeTipo(para) + ' (a conta da ' + nomeTipo(de) + ' foi cancelada)', { de: de, para: para, email: info.email });
      return fimMigrar(de, para, cfg.lojaId);
    }
    // ===== para outra conta do mesmo email que já existe =====
    var destId = mig.escolhido;
    passos(['A ler os produtos da ' + nomeTipo(de), 'A transferir os produtos para ' + nomeDestino(para), 'A cancelar a conta da ' + nomeTipo(de)]);
    var origem = [], destino = [];
    try { origem = await todos('produtos'); passo(0, 'ok'); } catch (e) { passo(0, 'erro'); return erroMig(e.message || e); }
    try {
      var de0 = 0;
      for (var k = 0; k < 100; k++) { var rr = await supabaseClient.from('produtos').select('id,nome,codbarras,stock,imagem,preco,preco_compra').eq('loja_id', destId).range(de0, de0 + 999); if (rr.error) throw rr.error; destino = destino.concat(rr.data || []); if ((rr.data || []).length < 1000) break; de0 += 1000; }
    } catch (e) { passo(1, 'erro'); return erroMig(e.message || e); }
    var porCod = {}, porNome = {};
    destino.forEach(function (p) { if (p.codbarras) porCod[String(p.codbarras).trim()] = p; porNome[String(p.nome || '').trim().toLowerCase()] = p; });
    var feitos = 0, erros = 0, ultimo = '', total = origem.length || 1;
    function prog() { el('sbk-pi').style.width = Math.round(feitos / total * 100) + '%'; el('sbk-pt').textContent = feitos + ' de ' + origem.length + ' produtos'; }
    for (var i = 0; i < origem.length; i++) {
      var p = origem[i], ex = (p.codbarras && porCod[String(p.codbarras).trim()]) || porNome[String(p.nome || '').trim().toLowerCase()];
      var res;
      if (ex) {   // já existe lá: junta o stock e completa o que falta
        var up = { stock: (parseInt(ex.stock) || 0) + Math.max(0, parseInt(p.stock) || 0) };
        if (!ex.imagem && p.imagem) up.imagem = p.imagem;
        if (!(parseFloat(ex.preco_compra) > 0) && p.preco_compra) up.preco_compra = p.preco_compra;
        res = await supabaseClient.from('produtos').update(up).eq('id', ex.id);
      } else {
        var novo = limpar(p); novo.loja_id = destId;
        res = await tentar(function () { return supabaseClient.from('produtos').insert(semCols(novo)); });
      }
      if (res && res.error) { erros++; ultimo = res.error.message; }
      feitos++; prog();
    }
    if (erros && erros === origem.length) { passo(1, 'erro'); return erroMig(ultimo); }
    passo(1, 'ok');
    try { await supabaseClient.from('transferencias').insert({ de_loja: cfg.lojaId, para_loja: destId, estado: 'confirmado', itens: origem.map(function (x) { return { nome: x.nome, qtd: Math.max(0, parseInt(x.stock) || 0), preco: x.preco }; }) }); } catch (e) {}
    // cancela a origem: estado cancelado e sai desta conta (o login passa a abrir a de destino)
    var c1 = await supabaseClient.from('lojas').update({ estado: 'cancelado' }).eq('id', cfg.lojaId);
    try { var u = (await supabaseClient.auth.getUser()).data.user; await supabaseClient.from('membros_loja').delete().eq('loja_id', cfg.lojaId).eq('user_id', u.id); } catch (e) {}
    passo(2, c1 && c1.error ? 'erro' : 'ok');
    await log(destId, 'Recebeu ' + (feitos - erros) + ' produto(s) transferidos da ' + nomeTipo(de) + ' ' + (info.loja && info.loja.nome || ''), { de_loja: cfg.lojaId });
    await log(cfg.lojaId, 'Transferiu ' + (feitos - erros) + ' produto(s) para a ' + nomeTipo(para) + ' e foi cancelada', { para_loja: destId });
    if (erros) { var d = document.createElement('div'); d.className = 'sbk-aviso am'; d.innerHTML = '⚠️ ' + erros + ' produto(s) não passaram: ' + esc(ultimo); el('sbk-c').appendChild(d); }
    fimMigrar(de, para, destId);
  }
  function fimMigrar(de, para, destId) {
    try { localStorage.removeItem('pdv_login_destino'); } catch (e) {}
    info.tipo = para;
    var destino = ehBanca(para) ? 'mobile-monitor.html' : 'monitor.html';
    var c = el('sbk-c'), d = document.createElement('div');
    d.className = 'sbk-card'; d.style.textAlign = 'center';
    d.innerHTML = '<div style="font-size:52px">🎉</div><h4 style="text-align:center">Transferência feita</h4>'
      + '<p class="sbk-txt">Os produtos estão na sua <b>' + nomeTipo(para) + '</b>, com o mesmo email' + (info.email ? ' (<b>' + esc(info.email) + '</b>)' : '') + '. A conta da ' + nomeTipo(de) + ' foi cancelada.</p>'
      + '<button type="button" class="sbk-bt verde" onclick="location.href=\'' + destino + '\'">Abrir o Monitor da ' + nomeTipo(para) + '</button>';
    c.appendChild(d); c.scrollTop = c.scrollHeight;
  }
})();
