/* SPAP — Alertas do sistema: deteta irregularidades e explica como resolver.
   Usado no Monitor da Loja e no Monitor da Banca.
   spapAlertasIniciar({
     loja: 'id',                 // para guardar o que já foi verificado
     onde: Element,              // onde pôr o sino (botão) — antes do primeiro filho
     dados: () => ({ vendas:[{id,numero,total,criado,ret,itens:[{nome,qtd,preco}]}], produtos:[{id,nome,stock,preco,preco_compra}] }),
     verVenda: id => {},         // opcional: abre a venda
     verProduto: id => {}        // opcional: abre o produto
   });
   spapAlertasAtualizar()  → volta a analisar (chamar quando os dados mudam). */
(function () {
  var cfg = null, lista = [], vistos = {}, ultDados = {};
  var css = ''
    + '.sal-sino{position:relative;width:40px;height:40px;border-radius:12px;border:1px solid rgba(15,23,42,.08);background:#fff;display:grid;place-items:center;cursor:pointer;padding:0;flex-shrink:0;color:#334155;}'
    + '.sal-sino svg{width:21px;height:21px;}'
    + '.sal-sino.tem{color:#b45309;} .sal-sino.grave{color:#dc2626;}'
    + '.sal-sino.tem svg{animation:salToca 2.6s ease-in-out infinite;transform-origin:50% 10%;}'
    + '@keyframes salToca{0%,80%,100%{transform:rotate(0);}84%{transform:rotate(14deg);}88%{transform:rotate(-12deg);}92%{transform:rotate(8deg);}96%{transform:rotate(-4deg);}}'
    + '.sal-num{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:#dc2626;color:#fff;font:800 11px/20px system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff;}'
    + '.sal-num.amarelo{background:#d97706;}'
    + 'html.escuro .sal-sino{background:#1e293b;border-color:#334155;color:#e2e8f0;}'
    + '#sal-fundo{position:fixed;inset:0;z-index:100045;background:rgba(8,15,35,.5);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}'
    + '#sal-fundo.on{opacity:1;}'
    + '.sal-p{width:100%;max-width:560px;max-height:88vh;max-height:88dvh;display:flex;flex-direction:column;background:#f8fafc;border-radius:24px 24px 0 0;box-shadow:0 -20px 60px rgba(8,15,35,.3);transform:translateY(40px);transition:transform .28s cubic-bezier(.2,.9,.3,1);color:#0f172a;}'
    + '#sal-fundo.on .sal-p{transform:none;}'
    + '@media(min-width:620px){#sal-fundo{align-items:center;padding:16px;} .sal-p{border-radius:24px;}}'
    + '.sal-cab{display:flex;align-items:center;gap:12px;padding:16px 16px 12px;background:#fff;border-radius:24px 24px 0 0;border-bottom:1px solid #e2e8f0;}'
    + '.sal-cab .ic{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:22px;background:#fef3c7;flex-shrink:0;}'
    + '.sal-cab .ic.ok{background:#dcfce7;} .sal-cab .ic.mau{background:#fee2e2;}'
    + '.sal-cab b{display:block;font-size:17px;} .sal-cab small{display:block;font-size:12.5px;color:#64748b;margin-top:1px;}'
    + '.sal-x{margin-left:auto;width:38px;height:38px;border-radius:12px;border:0;background:#f1f5f9;font-size:17px;font-weight:800;cursor:pointer;color:#334155;flex-shrink:0;}'
    + '.sal-corpo{overflow:auto;padding:12px 14px calc(18px + env(safe-area-inset-bottom));}'
    + '.sal-filtros{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}'
    + '.sal-filtros button{border:1.5px solid #e2e8f0;background:#fff;border-radius:99px;padding:6px 12px;font:700 12.5px/1 inherit;font-family:inherit;color:#475569;cursor:pointer;}'
    + '.sal-filtros button.on{border-color:#1d4ed8;color:#1d4ed8;background:#eff6ff;}'
    + '.sal-a{background:#fff;border:1px solid #e2e8f0;border-left:5px solid #d97706;border-radius:16px;padding:12px;margin-bottom:9px;box-shadow:0 4px 12px rgba(15,23,42,.05);}'
    + '.sal-a.grave{border-left-color:#dc2626;} .sal-a.info{border-left-color:#2563eb;} .sal-a.visto{opacity:.55;}'
    + '.sal-a .t{display:flex;align-items:flex-start;gap:8px;font-size:14.5px;font-weight:800;line-height:1.3;}'
    + '.sal-a .t span{font-size:18px;line-height:1;}'
    + '.sal-a .o{font-size:13px;color:#334155;margin-top:6px;line-height:1.5;}'
    + '.sal-a .r{font-size:12.5px;color:#14532d;background:#f0fdf4;border-radius:10px;padding:8px 10px;margin-top:8px;line-height:1.45;}'
    + '.sal-a .r b{color:#166534;}'
    + '.sal-a .bts{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;}'
    + '.sal-a .bts button{border:0;border-radius:10px;padding:8px 12px;font:700 12.5px/1 inherit;font-family:inherit;cursor:pointer;background:#eff6ff;color:#1d4ed8;}'
    + '.sal-a .bts button.cinza{background:#f1f5f9;color:#475569;}'
    + '.sal-ok{text-align:center;padding:30px 16px;}'
    + '.sal-ok i{display:grid;place-items:center;width:76px;height:76px;margin:0 auto 10px;border-radius:24px;background:linear-gradient(145deg,#dcfce7,#bbf7d0);font-size:38px;font-style:normal;}'
    + '.sal-ok b{display:block;font-size:17px;color:#14532d;} .sal-ok small{display:block;font-size:13px;color:#475569;margin-top:4px;line-height:1.5;}'
    + '.sal-det{margin-top:9px;padding:9px 11px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12.5px;color:#334155;} .sal-det ul{margin:6px 0 0;padding-left:18px;line-height:1.55;}'
    + '.sal-nota{font-size:11.5px;color:#94a3b8;text-align:center;margin-top:8px;line-height:1.45;}'
    + 'html.escuro #sal-fundo{filter:invert(1) hue-rotate(180deg);}';
  var SINO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mt(n) { return 'MT ' + (Math.round((+n || 0) * 100) / 100).toFixed(2); }
  function hora(d) { try { return new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function estilo() { if (document.getElementById('sal-css')) return; var s = document.createElement('style'); s.id = 'sal-css'; s.textContent = css; document.head.appendChild(s); }
  function chaveVistos() { var l = cfg && (typeof cfg.loja === 'function' ? cfg.loja() : cfg.loja); return 'spap_alertas_vistos_' + (l || ''); }
  function lerVistos() { try { vistos = JSON.parse(localStorage.getItem(chaveVistos()) || '{}') || {}; } catch (e) { vistos = {}; } }
  function gravarVistos() { try { localStorage.setItem(chaveVistos(), JSON.stringify(vistos)); } catch (e) {} }

  // ---------- ANÁLISE ----------
  function analisar(d) {
    var out = [], vendas = (d && d.vendas) || [], produtos = (d && d.produtos) || [];
    var porNome = {}; produtos.forEach(function (p) { porNome[String(p.nome || '').trim().toLowerCase()] = p; });
    var nVenda = function (v) { return v.numero ? 'Venda nº ' + v.numero : 'Venda das ' + hora(v.criado); };
    // 1) vendas sem produtos
    vendas.forEach(function (v) {
      if (v.ret || !(v.total > 0)) return;
      if (!(v.itens && v.itens.length)) out.push({ id: 'semit|' + v.id, nivel: 'grave', ic: '🧾', venda: v.id,
        t: nVenda(v) + ' sem produtos registados',
        o: 'Entrou ' + mt(v.total) + ' às ' + hora(v.criado) + ', mas a venda não tem os produtos (códigos) que saíram. Assim o stock <b>não foi descontado</b> e o Top 10 fica incompleto.',
        r: 'Pergunta ao balconista o que foi vendido e <b>acerta o stock</b> desses produtos em Produtos. Se a venda foi feita sem internet, espera que o telemóvel da banca volte a ter rede — os produtos chegam sozinhos.' });
    });
    // 2) total diferente da soma dos produtos
    vendas.forEach(function (v) {
      if (v.ret || !(v.itens && v.itens.length)) return;
      var soma = v.itens.reduce(function (s, i) { return s + (+i.preco || 0) * (+i.qtd || 0); }, 0);
      if (Math.abs(soma - (+v.total || 0)) > 0.5) out.push({ id: 'soma|' + v.id, nivel: 'aviso', ic: '🧮', venda: v.id,
        t: nVenda(v) + ': o total não bate com os produtos',
        o: 'O recibo diz <b>' + mt(v.total) + '</b>, mas a soma dos produtos dá <b>' + mt(soma) + '</b> (diferença de ' + mt(Math.abs(soma - v.total)) + ').',
        r: 'Abre a venda e confirma os preços. Pode ter sido um desconto dado à mão ou um produto que faltou registar.' });
    });
    // 3) produto vendido que não existe na lista de produtos (o stock não foi descontado)
    var desconhecidos = {};
    vendas.forEach(function (v) { (v.itens || []).forEach(function (i) {
      var k = String(i.nome || '').trim().toLowerCase(); if (!k || porNome[k]) return;
      desconhecidos[k] = desconhecidos[k] || { nome: i.nome, qtd: 0, vendas: 0, venda: v.id }; desconhecidos[k].qtd += Math.abs(+i.qtd || 0); desconhecidos[k].vendas++;
    }); });
    Object.keys(desconhecidos).forEach(function (k) { var x = desconhecidos[k];
      out.push({ id: 'desc|' + k, nivel: 'grave', ic: '❓', venda: x.venda,
        t: 'Vendido «' + x.nome + '», mas esse produto não está na lista',
        o: 'Saíram ' + x.qtd + ' unidade(s) em ' + x.vendas + ' venda(s), mas não existe nenhum produto com esse nome/código. O stock <b>não foi descontado</b>.',
        r: 'Se o produto mudou de nome ou foi apagado, <b>volta a registá-lo</b> com o mesmo nome/código e acerta o stock. Se o código foi escrito errado, corrige o produto certo à mão.' });
    });
    // 4) stock negativo
    produtos.forEach(function (p) { var s = parseInt(p.stock, 10);
      if (s < 0) out.push({ id: 'neg|' + p.id + '|' + s, nivel: 'grave', ic: '📉', produto: p.id,
        t: '«' + p.nome + '» com stock negativo (' + s + ')',
        o: 'Foram vendidas mais unidades do que havia registadas. Normalmente quer dizer que entrou mercadoria e <b>não foi adicionada ao stock</b>.',
        r: 'Conta as unidades que tens de verdade e <b>acerta o stock</b> desse produto.' });
    });
    // 5) preço de venda abaixo do custo
    produtos.forEach(function (p) { var pv = +p.preco || 0, pc = +p.preco_compra || 0;
      if (pc > 0 && pv > 0 && pv < pc) out.push({ id: 'custo|' + p.id + '|' + pv + '|' + pc, nivel: 'aviso', ic: '💸', produto: p.id,
        t: '«' + p.nome + '» vende abaixo do custo',
        o: 'Custa <b>' + mt(pc) + '</b> e está a ser vendido por <b>' + mt(pv) + '</b>: perdes ' + mt(pc - pv) + ' em cada unidade.',
        r: 'Confirma o preço de compra e o preço de venda deste produto.' });
      if (!(pv > 0)) out.push({ id: 'semp|' + p.id, nivel: 'aviso', ic: '🏷️', produto: p.id,
        t: '«' + p.nome + '» sem preço de venda',
        o: 'Este produto tem preço 0. Se for vendido, a venda fica a zero.',
        r: 'Põe o preço de venda certo no produto.' });
    });
    // 6) vendas com prejuízo (vendido abaixo do custo, ex.: desconto grande)
    vendas.forEach(function (v) { if (v.ret) return; (v.itens || []).forEach(function (i, n) {
      var p = porNome[String(i.nome || '').trim().toLowerCase()], pc = p ? (+p.preco_compra || 0) : 0;
      if (pc > 0 && (+i.preco || 0) > 0 && i.preco < pc && !(p && (+p.preco || 0) < pc)) out.push({ id: 'prej|' + v.id + '|' + n, nivel: 'aviso', ic: '📛', venda: v.id,
        t: nVenda(v) + ': «' + i.nome + '» vendido com prejuízo',
        o: 'Saiu por <b>' + mt(i.preco) + '</b>, mas custa <b>' + mt(pc) + '</b>. Pode ter sido um desconto demasiado grande.',
        r: 'Fala com o balconista sobre este desconto.' });
    }); });
    // 7) vendas repetidas (mesmo valor e mesmos produtos em menos de 1 minuto)
    var ord = vendas.filter(function (v) { return !v.ret && v.total > 0; }).slice().sort(function (a, b) { return new Date(a.criado) - new Date(b.criado); });
    for (var i = 1; i < ord.length; i++) {
      var a = ord[i - 1], b = ord[i], dt = Math.abs(new Date(b.criado) - new Date(a.criado));
      var assin = function (v) { return (v.itens || []).map(function (x) { return x.nome + 'x' + x.qtd; }).sort().join('|'); };
      if (dt < 60000 && Math.abs(a.total - b.total) < 0.01 && assin(a) === assin(b)) out.push({ id: 'dup|' + a.id + '|' + b.id, nivel: 'aviso', ic: '👯', venda: b.id,
        t: 'Duas vendas iguais seguidas (' + mt(b.total) + ')',
        o: nVenda(a) + ' e ' + nVenda(b) + ' têm os mesmos produtos e o mesmo valor, com ' + Math.round(dt / 1000) + ' segundos de diferença. Pode ter sido um toque duplo no botão.',
        r: 'Confirma com o balconista se foram mesmo dois clientes. Se não, faz o <b>retorno</b> de uma delas para o stock e o lucro ficarem certos.' });
    }
    // 8) problemas que a própria página conhece (ex.: vendas por enviar)
    if (d && d.extra) d.extra.forEach(function (x) { out.push(x); });
    var peso = { grave: 0, aviso: 1, info: 2 };
    return out.sort(function (x, y) { return peso[x.nivel] - peso[y.nivel]; });
  }

  // ---------- SINO ----------
  function pintarSino() {
    var b = document.getElementById('sal-sino'); if (!b) return;
    var ativos = lista.filter(function (a) { return !vistos[a.id]; }), graves = ativos.filter(function (a) { return a.nivel === 'grave'; }).length;
    b.classList.toggle('tem', ativos.length > 0); b.classList.toggle('grave', graves > 0);
    b.title = ativos.length ? ativos.length + ' alerta(s) para verificar' : 'Alertas do sistema: tudo certo';
    b.querySelector('.sal-num') && b.querySelector('.sal-num').remove();
    if (ativos.length) { var n = document.createElement('span'); n.className = 'sal-num' + (graves ? '' : ' amarelo'); n.textContent = ativos.length > 99 ? '99+' : ativos.length; b.appendChild(n); }
  }
  window.spapAlertasAtualizar = function () {
    if (!cfg) return;
    lerVistos();
    try { ultDados = cfg.dados() || {}; lista = analisar(ultDados); } catch (e) { console.warn('alertas:', e); lista = []; }
    pintarSino();
    if (document.getElementById('sal-fundo')) desenhar();
  };

  // ---------- PAINEL ----------
  var filtro = 'ativos';
  function desenhar() {
    var c = document.querySelector('#sal-fundo .sal-corpo'); if (!c) return;
    var ativos = lista.filter(function (a) { return !vistos[a.id]; }), graves = ativos.filter(function (a) { return a.nivel === 'grave'; }).length;
    var cab = document.querySelector('#sal-fundo .sal-cab');
    cab.querySelector('.ic').className = 'ic ' + (ativos.length ? (graves ? 'mau' : '') : 'ok');
    cab.querySelector('.ic').textContent = ativos.length ? (graves ? '🚨' : '⚠️') : '✅';
    cab.querySelector('small').textContent = ativos.length ? ativos.length + ' coisa(s) para verificar · ' + graves + ' grave(s)' : 'Nada fora do normal nas vendas de hoje';
    var mostrar = filtro === 'todos' ? lista : ativos;
    var h = '<div class="sal-filtros"><button type="button" data-f="ativos" class="' + (filtro === 'ativos' ? 'on' : '') + '">Por verificar (' + ativos.length + ')</button><button type="button" data-f="todos" class="' + (filtro === 'todos' ? 'on' : '') + '">Todos (' + lista.length + ')</button></div>';
    if (!mostrar.length) h += '<div class="sal-ok"><i>✅</i><b>Tudo certo</b><small>' + (lista.length ? 'Já verificaste todos os alertas de hoje.' : 'As vendas, os produtos e o stock de hoje não têm nada fora do normal.') + '</small></div>';
    else h += mostrar.map(function (a) {
      return '<div class="sal-a ' + a.nivel + (vistos[a.id] ? ' visto' : '') + '"><div class="t"><span>' + a.ic + '</span><div>' + esc(a.t) + '</div></div>'
        + '<div class="o">' + a.o + '</div>' + (a.r ? '<div class="r">✅ <b>Como resolver:</b> ' + a.r + '</div>' : '')
        + '<div class="bts">' + (a.venda ? '<button type="button" data-venda="' + esc(a.venda) + '">Ver a venda</button>' : '')
        + (a.produto && cfg.verProduto ? '<button type="button" data-produto="' + esc(a.produto) + '">Abrir o produto</button>' : '')
        + (vistos[a.id] ? '<button type="button" class="cinza" data-reabrir="' + esc(a.id) + '">Voltar a mostrar</button>' : '<button type="button" class="cinza" data-visto="' + esc(a.id) + '">✓ Já verifiquei</button>') + '</div></div>';
    }).join('');
    h += '<div class="sal-nota">O sistema verifica sozinho as vendas e os produtos de hoje sempre que chegam dados novos.</div>';
    c.innerHTML = h;
  }
  window.spapAlertasAbrir = function () {
    estilo(); spapAlertasAtualizar();
    if (document.getElementById('sal-fundo')) return;
    var d = document.createElement('div'); d.id = 'sal-fundo';
    d.innerHTML = '<div class="sal-p" role="dialog" aria-modal="true" aria-labelledby="sal-t"><div class="sal-cab"><div class="ic">⚠️</div><div><b id="sal-t">Alertas do sistema</b><small></small></div><button type="button" class="sal-x" aria-label="Fechar">✕</button></div><div class="sal-corpo"></div></div>';
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('on'); });
    function fechar() { d.classList.remove('on'); setTimeout(function () { d.remove(); }, 220); }
    d.querySelector('.sal-x').onclick = fechar;
    d.addEventListener('click', function (e) {
      if (e.target === d) return fechar();
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.f) { filtro = b.dataset.f; desenhar(); }
      else if (b.dataset.visto) { vistos[b.dataset.visto] = Date.now(); gravarVistos(); pintarSino(); desenhar(); }
      else if (b.dataset.reabrir) { delete vistos[b.dataset.reabrir]; gravarVistos(); pintarSino(); desenhar(); }
      else if (b.dataset.venda) {
        if (cfg.verVenda) { fechar(); setTimeout(function () { cfg.verVenda(b.dataset.venda); }, 230); return; }
        // sem ecrã próprio de venda: mostra aqui os produtos dessa venda
        var v = (ultDados.vendas || []).find(function (x) { return String(x.id) === b.dataset.venda; }); if (!v) return;
        var card = b.closest('.sal-a'), ant = card.querySelector('.sal-det'); if (ant) { ant.remove(); return; }
        var det = document.createElement('div'); det.className = 'sal-det';
        det.innerHTML = '<b>' + (v.numero ? 'Venda nº ' + v.numero : 'Venda') + ' · ' + hora(v.criado) + ' · ' + mt(v.total) + '</b>'
          + ((v.itens || []).length ? '<ul>' + v.itens.map(function (i) { return '<li>' + (+i.qtd || 0) + '× ' + esc(i.nome) + ' — ' + mt((+i.preco || 0) * (+i.qtd || 0)) + '</li>'; }).join('') + '</ul>' : '<div>Sem produtos registados.</div>');
        card.appendChild(det);
      }
      else if (b.dataset.produto) { fechar(); setTimeout(function () { cfg.verProduto(b.dataset.produto); }, 230); }
    });
    desenhar();
  };
  window.spapAlertasIniciar = function (c) {
    cfg = c; estilo(); lerVistos();
    if (c.onde && !document.getElementById('sal-sino')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'sal-sino'; b.className = 'sal-sino'; b.setAttribute('aria-label', 'Alertas do sistema'); b.innerHTML = SINO;
      b.onclick = spapAlertasAbrir;
      c.onde.insertBefore(b, c.onde.firstChild);
    }
    spapAlertasAtualizar();
  };
})();
