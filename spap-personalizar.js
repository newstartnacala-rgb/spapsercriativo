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
  var PADRAO = { cor: CORES[0].k, letra: 'normal', cantos: 'redondos', ondas: true, animacoes: true, sino: true, nome: '' };
  function ler() { var o = {}; try { o = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch (e) {} var r = {}; for (var k in PADRAO) r[k] = (k in o) ? o[k] : PADRAO[k]; return r; }
  function gravar(o) { try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch (e) {} }

  function aplicar(o) {
    o = o || ler();
    var st = document.getElementById('spr-estilo');
    if (!st) { st = document.createElement('style'); st.id = 'spr-estilo'; (document.head || document.documentElement).appendChild(st); }
    var c = CORES.filter(function (x) { return x.k === o.cor; })[0] || CORES[0], css = '';
    if (c.k !== CORES[0].k) {
      css += APP === 'banca'
        ? ':root{--lj:' + c.c + ' !important;--lj-esc:' + c.e + ' !important;--lj-claro:' + c.l + ' !important;--lj-grad:linear-gradient(180deg,' + c.a + ' 0%,' + c.c + ' 100%) !important;--sombra-lj:0 10px 22px ' + c.c + '52 !important;}'
        : ':root,body{--az:' + c.c + ' !important;--az-esc:' + c.e + ' !important;--az-grad:linear-gradient(180deg,' + c.a + ' 0%,' + c.e + ' 100%) !important;--cor-principal:' + c.e + ' !important;--cor-principal-2:' + c.c + ' !important;--cor-destaque:' + c.c + ' !important;--cor-texto-destaque:' + c.c + ' !important;--cor-gradiente:linear-gradient(135deg,' + c.e + ',' + c.a + ') !important;}';
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
    + '.spr-cor{display:flex;align-items:center;gap:8px;padding:10px;border-radius:14px;border:2px solid #e2e8f0;background:#fff;font:700 13px/1 inherit;font-family:inherit;cursor:pointer;color:#0f172a;}'
    + '.spr-cor i{width:24px;height:24px;border-radius:50%;flex-shrink:0;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);}'
    + '.spr-cor.on{border-color:#0f172a;box-shadow:0 4px 12px rgba(15,23,42,.12);}'
    + '.spr-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border-radius:14px;background:#e9eef6;}'
    + '.spr-seg button{border:0;background:transparent;border-radius:11px;padding:10px 4px;font:700 13px/1.1 inherit;font-family:inherit;color:#475569;cursor:pointer;}'
    + '.spr-seg button.on{background:#fff;color:#0f172a;box-shadow:0 2px 8px rgba(15,23,42,.1);}'
    + '.spr-opt{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:#fff;border:1px solid #e2e8f0;margin-bottom:8px;cursor:pointer;}'
    + '.spr-opt span{flex:1;font-size:14px;font-weight:700;} .spr-opt small{display:block;font-size:12px;color:#64748b;font-weight:500;margin-top:2px;}'
    + '.spr-opt input{position:absolute;opacity:0;pointer-events:none;}'
    + '.spr-sw{width:46px;height:27px;border-radius:99px;background:#cbd5e1;position:relative;flex-shrink:0;transition:background .2s;}'
    + '.spr-sw::after{content:"";position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:transform .2s;}'
    + '.spr-opt input:checked+.spr-sw{background:#16a34a;} .spr-opt input:checked+.spr-sw::after{transform:translateX(19px);}'
    + '.spr-bt{width:100%;padding:12px;border-radius:14px;border:1.5px solid #e2e8f0;background:#fff;font:700 14px/1 inherit;font-family:inherit;color:#334155;cursor:pointer;margin-bottom:8px;}'
    + '.spr-bt.perigo{color:#b91c1c;border-color:#fecaca;background:#fef2f2;}'
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
    d.querySelector('.spr-x').onclick = fechar;
    d.addEventListener('click', function (e) {
      if (e.target === d) return fechar();
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cor) { d.querySelectorAll('.spr-cor').forEach(function (x) { x.classList.toggle('on', x === b); }); mudar('cor', b.dataset.cor); }
      else if (b.dataset.v) { var sg = b.closest('[data-seg]'); sg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); mudar(sg.dataset.seg, b.dataset.v); }
      else if (b.dataset.acao === 'sino') { if (window.spapSinoRepor) spapSinoRepor(); try { (window.toast || window.mostrarNotif || function () {})('🔔 O sino voltou ao sítio de origem'); } catch (er) {} }
      else if (b.dataset.acao === 'repor') { o = JSON.parse(JSON.stringify(PADRAO)); gravar(o); aplicar(o); if (window.spapSinoRepor) spapSinoRepor(); fechar(); setTimeout(spapPersonalizarAbrir, 240); }
    });
    d.addEventListener('change', function (e) { var i = e.target; if (i.dataset.opt) mudar(i.dataset.opt, i.checked); });
  };
})();
