/* SPAP — Personalizar o Monitor (Monitor da Loja e Monitor da Banca).
   Guarda as escolhas neste aparelho e aplica-as logo ao abrir.
   spapPersonalizarAbrir()  → abre o painel «Personalizar». */
(function () {
  var APP = /mobile-monitor/.test(location.pathname) ? 'banca' : 'loja';
  var CHAVE = 'spap_personalizar_' + APP;
  var CORES = APP === 'banca'
    ? [ { k: 'laranja', n: 'Laranja', c: '#f2700f', e: '#d9570a', a: '#ffa24a', l: '#fff3e8' }, { k: 'azul', n: 'Azul', c: '#1d6ff2', e: '#0a4fd8', a: '#3d8dff', l: '#eaf2ff' },
        { k: 'verde', n: 'Verde', c: '#16a34a', e: '#15803d', a: '#34d07a', l: '#ecfdf3' }, { k: 'roxo', n: 'Roxo', c: '#7c3aed', e: '#6d28d9', a: '#a78bfa', l: '#f3efff' },
        { k: 'rosa', n: 'Rosa', c: '#db2777', e: '#be185d', a: '#f472b6', l: '#fdf0f6' }, { k: 'dourado', n: 'Dourado', c: '#b8860b', e: '#92680a', a: '#e0b84a', l: '#fbf5e6' } ]
    : [ { k: 'azul', n: 'Azul', c: '#1d6ff2', e: '#0a4fd8', a: '#3d8dff', l: '#eaf2ff' }, { k: 'verde', n: 'Verde', c: '#16a34a', e: '#15803d', a: '#34d07a', l: '#ecfdf3' },
        { k: 'roxo', n: 'Roxo', c: '#7c3aed', e: '#6d28d9', a: '#a78bfa', l: '#f3efff' }, { k: 'laranja', n: 'Laranja', c: '#f2700f', e: '#d9570a', a: '#ffa24a', l: '#fff3e8' },
        { k: 'rosa', n: 'Rosa', c: '#db2777', e: '#be185d', a: '#f472b6', l: '#fdf0f6' }, { k: 'dourado', n: 'Dourado', c: '#b8860b', e: '#92680a', a: '#e0b84a', l: '#fbf5e6' } ];
  var COMBOS = [ { k: 'pordosol', n: 'Pôr do sol', a: '#f97316', b: '#db2777' }, { k: 'oceano', n: 'Oceano', a: '#0ea5e9', b: '#10b981' }, { k: 'galaxia', n: 'Galáxia', a: '#4f46e5', b: '#c026d3' },
    { k: 'tropical', n: 'Tropical', a: '#facc15', b: '#16a34a' }, { k: 'aurora', n: 'Aurora', a: '#22d3ee', b: '#8b5cf6' }, { k: 'fogo', n: 'Fogo', a: '#ef4444', b: '#f59e0b' } ];
  var PADRAO = { cor: CORES[0].k, mixA: '#1d6ff2', mixB: '#db2777', mixModo: 'degrade', mixPeso: 50, fundo: 'normal', transp: 35, letra: 'normal', cantos: 'redondos', ondas: true, animacoes: true, sino: true, nome: '' };
  function ler() { var o = {}; try { o = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch (e) {} var r = {}; for (var k in PADRAO) r[k] = (k in o) ? o[k] : PADRAO[k]; return r; }
  function gravar(o) { try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch (e) {} }

  function hx(h) { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hs(r) { return '#' + r.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function junta(a, b, t) { var x = hx(a), y = hx(b); return hs([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  function rgba(h, al) { var r = hx(h); return 'rgba(' + r.join(',') + ',' + al + ')'; }
  // devolve {c,e,a,l,g1,g2} da cor escolhida (cor simples ou mistura de duas)
  function corAtual(o) {
    if (o.cor === 'mix') {
      var A = o.mixA, B = o.mixB, m;
      if (o.mixModo === 'uma') { m = junta(A, B, (o.mixPeso || 50) / 100); return { c: m, e: junta(m, '#000000', .18), a: junta(m, '#ffffff', .28), l: junta(m, '#ffffff', .9), g1: junta(m, '#ffffff', .28), g2: junta(m, '#000000', .12), mix: true }; }
      m = junta(A, B, .5); return { c: m, e: junta(A, '#000000', .1), a: A, l: junta(m, '#ffffff', .9), g1: A, g2: B, mix: true };
    }
    var c = CORES.filter(function (x) { return x.k === o.cor; })[0] || CORES[0]; return { k: c.k, c: c.c, e: c.e, a: c.a, l: c.l, g1: c.a, g2: c.e };
  }
  function vidroOn() { return !!(window.spapVidro && window.spapVidro.ligado()); }
  function aplicar(o) {
    o = o || ler();
    var st = document.getElementById('spr-estilo');
    if (!st) { st = document.createElement('style'); st.id = 'spr-estilo'; (document.head || document.documentElement).appendChild(st); }
    var c = corAtual(o), css = '';
    if (c.k !== CORES[0].k) {
      var gr = c.mix ? 'linear-gradient(135deg,' + c.g1 + ' 0%,' + c.g2 + ' 100%)' : 'linear-gradient(180deg,' + c.a + ' 0%,' + (APP === 'banca' ? c.c : c.e) + ' 100%)';
      css += APP === 'banca'
        ? ':root{--lj:' + c.c + ' !important;--lj-esc:' + c.e + ' !important;--lj-claro:' + c.l + ' !important;--lj-grad:' + gr + ' !important;--sombra-lj:0 10px 22px ' + c.c + '52 !important;}'
        : ':root,body{--az:' + c.c + ' !important;--az-esc:' + c.e + ' !important;--az-grad:' + gr + ' !important;--cor-principal:' + c.e + ' !important;--cor-principal-2:' + c.c + ' !important;--cor-destaque:' + c.c + ' !important;--cor-texto-destaque:' + c.c + ' !important;--cor-gradiente:' + (c.mix ? gr : 'linear-gradient(135deg,' + c.e + ',' + c.a + ')') + ' !important;}';
    }
    // Fundo: colorido (as cores escolhidas por trás) ou transparente (cartões de vidro por cima das cores)
    if (o.fundo === 'colorido' || o.fundo === 'vidro') {
      var f1 = o.fundo === 'vidro' ? .55 : .2, f2 = o.fundo === 'vidro' ? .45 : .14;
      css += 'html,body{background:radial-gradient(120% 70% at 0% 0%,' + rgba(c.g1, f1) + ' 0%,transparent 60%),radial-gradient(120% 70% at 100% 100%,' + rgba(c.g2, f2) + ' 0%,transparent 62%),linear-gradient(180deg,#f7f9ff,#eef3ff) fixed !important;background-attachment:fixed !important;}';
    }
    if (o.fundo === 'vidro') {
      var al = (100 - Math.max(10, Math.min(80, +o.transp || 35))) / 100;
      var sel = APP === 'banca'
        ? '.tela .cartao,.tela .stat,.tela .bv-venda,.tela .graf-card,.tela .item,.tela .rt-kpi,.tela .cat-item,.tela .row,.tela .seg-caixa,.tela .nav,.tela .bj,.tela .pl-card'
        : '#app .kpi,#app .card,#app .card-gestao,#app .venda-item,#app .ct-card,#app .sc-item,#app .sc-tile,#app .gc-card,#app .btn-filtro-data,#app .indicador-live,#app .bottom-nav,#app .nav-bottom';
      css += sel.split(',').map(function (x) { return 'body ' + x; }).join(',') + '{background-color:rgba(255,255,255,' + al + ') !important;background-image:none !important;-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);border-color:rgba(255,255,255,.55) !important;}';
      css += (APP === 'banca' ? '.tela > .topo' : '#app .topbar') + '{background:rgba(255,255,255,' + Math.max(.35, al - .1) + ') !important;-webkit-backdrop-filter:blur(16px) saturate(1.5) !important;backdrop-filter:blur(16px) saturate(1.5) !important;}';
      if (o.ondas) css += APP === 'banca' ? 'body .tela .stat{background-image:var(--agua1),var(--agua2) !important;}' : '';
    }
    if (o.letra === 'grande') css += 'body{zoom:1.08;}';
    if (o.letra === 'maior') css += 'body{zoom:1.16;}';
    if (o.letra === 'pequena') css += 'body{zoom:.93;}';
    if (o.cantos === 'retos') css += '.stat,.kpi,.card,.row,.cards>*,.sheet,.folha .conteudo>*,.venda-item,.bv-card,.ct-card,.sc-item,.gc-card,button.btn,.btn{border-radius:8px !important;}';
    if (!o.ondas) css += 'body .stat,body .kpi{background-image:none !important;animation:none !important;}';
    if (!o.animacoes) css += '*,*::before,*::after{animation-duration:.001s !important;animation-iteration-count:1 !important;transition-duration:.001s !important;}';
    if (!o.sino) css += '#sal-sino{display:none !important;}';
    st.textContent = css;
    if (o.nome) { var el = document.getElementById(APP === 'banca' ? 'nome-loja' : 'nome-loja-topo'); if (el && el.dataset.sprOrig === undefined) el.dataset.sprOrig = el.textContent; }
  }
  window.spapPersonalizarAplicar = aplicar;
  (function () { var o = ler(); if (o.fundo === 'vidro') { o.fundo = 'colorido'; gravar(o); if (window.spapVidro) window.spapVidro.definir(true); } })();
  aplicar();

  var css = ''
    + '#spr-fundo{position:fixed;inset:0;z-index:100046;background:rgba(8,15,35,.5);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}'
    + '#spr-fundo.on{opacity:1;}'
    + '.spr-p{width:100%;max-width:520px;max-height:90vh;max-height:90dvh;display:flex;flex-direction:column;background:#f8fafc;border-radius:24px 24px 0 0;transform:translateY(40px);transition:transform .28s cubic-bezier(.2,.9,.3,1);color:#0f172a;box-shadow:0 -20px 60px rgba(8,15,35,.3);}'
    + '#spr-fundo.on .spr-p{transform:none;}'
    + '@media(min-width:620px){#spr-fundo{align-items:center;padding:16px;} .spr-p{border-radius:24px;}}'
    + '.spr-cab{display:flex;align-items:center;gap:12px;padding:16px;background:#fff;border-radius:24px 24px 0 0;border-bottom:1px solid #e2e8f0;}'
    + '.spr-cab .ic{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:22px;background:linear-gradient(135deg,#fde68a,#f9a8d4,#a5b4fc);}'
    + '.spr-cab b{display:block;font-size:17px;} .spr-cab small{display:block;font-size:12.5px;color:#64748b;}'
    + '.spr-x{margin-left:auto;width:38px;height:38px;border-radius:12px;border:0;background:#f1f5f9;font-size:17px;font-weight:800;cursor:pointer;color:#334155;}'
    + '.spr-corpo{overflow:auto;padding:14px 16px calc(18px + env(safe-area-inset-bottom));}'
    + '.spr-sec{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#64748b;margin:14px 2px 8px;}'
    + '.spr-sec:first-child{margin-top:0;}'
    + '.spr-cores{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}'
    + '.spr-cor{display:flex;align-items:center;gap:8px;padding:10px;border-radius:14px;border:2px solid #e2e8f0;background:#fff;font-weight:700;font-size:13px;line-height:1;font-family:inherit;cursor:pointer;color:#0f172a;}'
    + '.spr-cor i{width:24px;height:24px;border-radius:50%;flex-shrink:0;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);}'
    + '.spr-cor.on{border-color:#0f172a;box-shadow:0 4px 12px rgba(15,23,42,.12);}'
    + '.spr-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border-radius:14px;background:#e9eef6;}'
    + '.spr-seg button{border:0;background:transparent;border-radius:11px;padding:10px 4px;font-weight:700;font-size:13px;line-height:1.1;font-family:inherit;color:#475569;cursor:pointer;}'
    + '.spr-seg button.on{background:#fff;color:#0f172a;box-shadow:0 2px 8px rgba(15,23,42,.1);}'
    + '.spr-opt{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:#fff;border:1px solid #e2e8f0;margin-bottom:8px;cursor:pointer;}'
    + '.spr-opt span{flex:1;font-size:14px;font-weight:700;} .spr-opt small{display:block;font-size:12px;color:#64748b;font-weight:500;margin-top:2px;}'
    + '.spr-opt input{position:absolute;opacity:0;pointer-events:none;}'
    + '.spr-sw{width:46px;height:27px;border-radius:99px;background:#cbd5e1;position:relative;flex-shrink:0;transition:background .2s;}'
    + '.spr-sw::after{content:"";position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:transform .2s;}'
    + '.spr-opt input:checked+.spr-sw{background:#16a34a;} .spr-opt input:checked+.spr-sw::after{transform:translateX(19px);}'
    + '.spr-bt{width:100%;padding:12px;border-radius:14px;border:1.5px solid #e2e8f0;background:#fff;font-weight:700;font-size:14px;line-height:1;font-family:inherit;color:#334155;cursor:pointer;margin-bottom:8px;}'
    + '.spr-bt.perigo{color:#b91c1c;border-color:#fecaca;background:#fef2f2;}'
    + '.spr-combos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;}'
    + '.spr-combo{border:2px solid transparent;border-radius:14px;padding:13px 6px;color:#fff;font-weight:800;font-size:12.5px;font-family:inherit;cursor:pointer;text-shadow:0 1px 3px rgba(0,0,0,.35);box-shadow:0 4px 12px rgba(15,23,42,.12);}'
    + '.spr-combo.on{border-color:#0f172a;transform:scale(1.03);}'
    + '.spr-mix{background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:12px;}'
    + '.spr-mix.on{border-color:#0f172a;}'
    + '.spr-mix-cab b{display:block;font-size:14px;} .spr-mix-cab small{display:block;font-size:12px;color:#64748b;margin-top:2px;}'
    + '.spr-mix-cores{display:flex;align-items:center;gap:8px;margin:12px 0;}'
    + '.spr-pick{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11.5px;font-weight:700;color:#475569;cursor:pointer;}'
    + '.spr-pick input{width:48px;height:48px;border:0;padding:0;border-radius:50%;background:none;cursor:pointer;}'
    + '.spr-pick input::-webkit-color-swatch-wrapper{padding:0;} .spr-pick input::-webkit-color-swatch{border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(15,23,42,.25);} .spr-pick input::-moz-color-swatch{border:3px solid #fff;border-radius:50%;}'
    + '.spr-mais{font-size:20px;font-weight:800;color:#94a3b8;margin-bottom:18px;}'
    + '.spr-res{flex:1;height:48px;border-radius:14px;margin-bottom:18px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.5),0 4px 12px rgba(15,23,42,.15);}'
    + '.spr-peso{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:11.5px;font-weight:700;color:#64748b;} .spr-peso input{flex:1;accent-color:#0f172a;}'
    + '.spr-peso[hidden]{display:none;}'
    + '.spr-bt.prim{margin:12px 0 0;background:#0f172a;color:#fff;border-color:#0f172a;}'
    + '.spr-vidro{display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:#fff;border:1.5px solid #e2e8f0;cursor:pointer;user-select:none;}'
    + '.spr-vidro.on{border-color:#818cf8;}'
    + '.spr-vidro .sv-eng{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,#f8fafc,#e2e8f0);color:#334155;flex-shrink:0;transition:transform .5s cubic-bezier(.3,1.3,.5,1),background .2s;}'
    + '.spr-vidro.on .sv-eng{transform:rotate(180deg);background:linear-gradient(135deg,#a5f3fc,#93c5fd 50%,#c4b5fd);color:#0f172a;}'
    + '.spr-vidro .sv-t{flex:1;min-width:0;} .spr-vidro b{display:block;font-size:14px;} .spr-vidro small{display:block;font-size:12px;color:#64748b;margin-top:2px;line-height:1.4;}'
    + '.spr-vidro .sv-sw{width:48px;height:28px;border-radius:99px;background:#cbd5e1;position:relative;flex-shrink:0;transition:background .2s;}'
    + '.spr-vidro .sv-sw::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.25);transition:transform .22s cubic-bezier(.3,1.3,.5,1);}'
    + '.spr-vidro.on .sv-sw{background:linear-gradient(90deg,#38bdf8,#818cf8);} .spr-vidro.on .sv-sw::after{transform:translateX(20px);}'
    + '.spr-nota{font-size:11.5px;color:#94a3b8;text-align:center;margin-top:6px;line-height:1.45;}'
    + 'html.escuro #spr-fundo{filter:invert(1) hue-rotate(180deg);}';
  function estilo() { if (document.getElementById('spr-css')) return; var s = document.createElement('style'); s.id = 'spr-css'; s.textContent = css; document.head.appendChild(s); }
  function seg(nome, opcoes, atual) {
    return '<div class="spr-seg" data-seg="' + nome + '">' + opcoes.map(function (x) { return '<button type="button" data-v="' + x[0] + '" class="' + (x[0] === atual ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function opt(nome, tit, sub, on) {
    return '<label class="spr-opt"><span>' + tit + '<small>' + sub + '</small></span><input type="checkbox" data-opt="' + nome + '"' + (on ? ' checked' : '') + '><i class="spr-sw"></i></label>';
  }
  window.spapPersonalizarAbrir = function () {
    estilo();
    var o = ler(), ant = document.getElementById('spr-fundo'); if (ant) ant.remove();
    var d = document.createElement('div'); d.id = 'spr-fundo';
    d.innerHTML = '<div class="spr-p" role="dialog" aria-modal="true" aria-labelledby="spr-t"><div class="spr-cab"><div class="ic">🎨</div><div><b id="spr-t">Personalizar</b><small>Muda o aspeto do Monitor ao teu gosto. Fica guardado neste aparelho.</small></div><button type="button" class="spr-x" aria-label="Fechar">✕</button></div><div class="spr-corpo">'
      + '<div class="spr-sec">Cor principal</div><div class="spr-cores">' + CORES.map(function (c) { return '<button type="button" class="spr-cor' + (c.k === o.cor ? ' on' : '') + '" data-cor="' + c.k + '"><i style="background:linear-gradient(135deg,' + c.a + ',' + c.e + ')"></i>' + c.n + (c.k === CORES[0].k ? ' ★' : '') + '</button>'; }).join('') + '</div>'
      + '<div class="spr-sec">Misturar cores</div><div class="spr-combos">' + COMBOS.map(function (m) { return '<button type="button" class="spr-combo" data-combo="' + m.k + '" style="background:linear-gradient(135deg,' + m.a + ',' + m.b + ')">' + m.n + '</button>'; }).join('') + '</div>'
      + '<div class="spr-mix' + (o.cor === 'mix' ? ' on' : '') + '"><div class="spr-mix-cab"><b>A tua mistura</b><small>Escolhe duas cores e vê o resultado</small></div>'
      + '<div class="spr-mix-cores"><label class="spr-pick"><input type="color" data-mix="mixA" value="' + o.mixA + '"><span>Cor 1</span></label><span class="spr-mais">+</span><label class="spr-pick"><input type="color" data-mix="mixB" value="' + o.mixB + '"><span>Cor 2</span></label><span class="spr-mais">=</span><div class="spr-res" id="spr-res"></div></div>'
      + seg('mixModo', [['degrade', '🌈 Degradê das duas'], ['uma', '🧪 Misturar numa só']], o.mixModo)
      + '<div class="spr-peso"' + (o.mixModo === 'uma' ? '' : ' hidden') + '><span>Mais cor 1</span><input type="range" min="0" max="100" step="5" data-num="mixPeso" value="' + o.mixPeso + '"><span>Mais cor 2</span></div>'
      + '<button type="button" class="spr-bt prim" data-acao="usarmix">✔ Usar a minha mistura</button></div>'
      + '<div class="spr-sec">Modo vidro</div>'
      + '<div class="spr-vidro' + (vidroOn() ? ' on' : '') + '" role="switch" tabindex="0" aria-checked="' + vidroOn() + '"><span class="sv-eng"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></span>'
      + '<span class="sv-t"><b>Modo vidro</b><small id="spr-vtxt">' + (vidroOn() ? 'Ligado — o Monitor e todas as janelas que abrirem ficam em vidro.' : 'Desligado — o Monitor está normal.') + '</small></span><i class="sv-sw"></i></div>'
      + '<div class="spr-sec">Fundo</div>' + seg('fundo', [['normal', 'Normal'], ['colorido', '🎨 Colorido']], o.fundo === 'vidro' ? 'normal' : o.fundo)
      + '<div class="spr-sec">Tamanho da letra</div>' + seg('letra', [['pequena', 'A−'], ['normal', 'Normal'], ['grande', 'A+'], ['maior', 'A++']], o.letra)
      + '<div class="spr-sec">Cantos dos cartões</div>' + seg('cantos', [['redondos', '◯ Redondos'], ['retos', '▢ Mais retos']], o.cantos)
      + '<div class="spr-sec">Efeitos</div>'
      + opt('ondas', '🌊 Ondas nos cartões', 'O efeito de água no fundo dos números', o.ondas)
      + opt('animacoes', '✨ Animações', 'Números a rodar, entradas e brilhos', o.animacoes)
      + '<div class="spr-sec">Sino de alertas</div>'
      + opt('sino', '🔔 Mostrar o sino', 'Arrasta o sino com o dedo para o pôr onde quiseres', o.sino)
      + '<button type="button" class="spr-bt" data-acao="sino">↩️ Pôr o sino no sítio de origem</button>'
      + '<div class="spr-sec">Repor</div><button type="button" class="spr-bt perigo" data-acao="repor">Voltar ao aspeto original</button>'
      + '<div class="spr-nota">As mudanças aplicam-se logo. Cada telemóvel ou computador guarda as suas.</div></div></div>';
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('on'); });
    function fechar() { d.classList.remove('on'); setTimeout(function () { d.remove(); }, 220); }
    function mudar(k, v) { o[k] = v; gravar(o); aplicar(o); }
    function res() { var t = { cor: 'mix', mixA: o.mixA, mixB: o.mixB, mixModo: o.mixModo, mixPeso: o.mixPeso }, c = corAtual(t); var r = d.querySelector('#spr-res'); if (r) r.style.background = o.mixModo === 'uma' ? c.c : 'linear-gradient(135deg,' + o.mixA + ',' + o.mixB + ')'; }
    function marcar() { d.querySelectorAll('.spr-cor').forEach(function (x) { x.classList.toggle('on', x.dataset.cor === o.cor); }); d.querySelector('.spr-mix').classList.toggle('on', o.cor === 'mix'); d.querySelectorAll('.spr-combo').forEach(function (x) { var m = COMBOS.filter(function (k) { return k.k === x.dataset.combo; })[0]; x.classList.toggle('on', o.cor === 'mix' && o.mixModo === 'degrade' && m.a === o.mixA && m.b === o.mixB); }); }
    function usarMix() { o.cor = 'mix'; gravar(o); aplicar(o); marcar(); res(); }
    setTimeout(function () { res(); marcar(); }, 0);
    d.querySelector('.spr-x').onclick = fechar;
    d.addEventListener('click', function (e) {
      if (e.target === d) return fechar();
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cor) { mudar('cor', b.dataset.cor); marcar(); }
      else if (b.dataset.combo) { var m = COMBOS.filter(function (k) { return k.k === b.dataset.combo; })[0]; o.mixA = m.a; o.mixB = m.b; o.mixModo = 'degrade'; d.querySelector('[data-mix=mixA]').value = m.a; d.querySelector('[data-mix=mixB]').value = m.b; d.querySelectorAll('[data-seg=mixModo] button').forEach(function (x) { x.classList.toggle('on', x.dataset.v === 'degrade'); }); d.querySelector('.spr-mix .spr-peso').hidden = true; usarMix(); }
      else if (b.dataset.acao === 'usarmix') { usarMix(); try { (window.toast || window.mostrarNotif || function () {})('🎨 A tua mistura foi aplicada'); } catch (er) {} }
      else if (b.dataset.v) { var sg = b.closest('[data-seg]'); sg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
        if (sg.dataset.seg === 'mixModo') { o.mixModo = b.dataset.v; d.querySelector('.spr-mix .spr-peso').hidden = b.dataset.v !== 'uma'; usarMix(); }
        else { mudar(sg.dataset.seg, b.dataset.v); } }
      else if (b.dataset.acao === 'sino') { if (window.spapSinoRepor) spapSinoRepor(); try { (window.toast || window.mostrarNotif || function () {})('🔔 O sino voltou ao sítio de origem'); } catch (er) {} }
      else if (b.dataset.acao === 'repor') { o = JSON.parse(JSON.stringify(PADRAO)); gravar(o); aplicar(o); if (window.spapSinoRepor) spapSinoRepor(); fechar(); setTimeout(spapPersonalizarAbrir, 240); }
    });
    function trocarVidro() { var on = !vidroOn(); if (window.spapVidro) window.spapVidro.definir(on); var v = d.querySelector('.spr-vidro'); v.classList.toggle('on', on); v.setAttribute('aria-checked', on);
      d.querySelector('#spr-vtxt').textContent = on ? 'Ligado — o Monitor e todas as janelas que abrirem ficam em vidro.' : 'Desligado — o Monitor está normal.'; try { (window.toast || window.mostrarNotif || function () {})(on ? '🪟 Modo vidro ligado' : 'Modo vidro desligado'); } catch (er) {} }
    d.querySelector('.spr-vidro').addEventListener('click', trocarVidro);
    d.querySelector('.spr-vidro').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trocarVidro(); } });
    d.addEventListener('change', function (e) { var i = e.target; if (i.dataset.opt) mudar(i.dataset.opt, i.checked); });
    d.addEventListener('input', function (e) { var i = e.target;
      if (i.dataset.mix) { o[i.dataset.mix] = i.value; usarMix(); }
      else if (i.dataset.num === 'mixPeso') { o.mixPeso = +i.value; usarMix(); }
      else if (i.dataset.num) mudar(i.dataset.num, +i.value); });
  };
})();
