/* SPAP — números animados nos monitores (vendido, nº de vendas, lucro).
   spapNum(el, texto, opcoes)  → põe o texto novo no elemento com:
     • rolo de algarismos (como um conta-quilómetros), só durante a animação;
     • etiqueta a voar com a diferença (verde a subir, vermelho a descer);
     • o cartão pulsa e brilha; o lucro solta faíscas quando sobe.
   Não muda o design: usa a letra, o tamanho e a cor do próprio elemento e,
   no fim, o elemento volta a ter exatamente o texto normal.
   opcoes: { cartao: Element (onde mostrar a etiqueta), lucro: true (faíscas), mais: '+1' (texto da etiqueta) } */
(function () {
  var css = ''
    + '.sn-rolo{display:inline-flex;white-space:nowrap;}'
    + '.sn-dg{position:relative;display:inline-block;overflow:hidden;vertical-align:top;}'
    + '.sn-dg>.sn-w{visibility:hidden;}'
    + '.sn-dg>.sn-t{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;align-items:center;transition:transform .75s cubic-bezier(.2,.9,.2,1.15);}'
    + '.sn-dg>.sn-t>i{font-style:normal;display:block;}'
    + '.sn-pulsa{animation:snPulsa .7s ease;}'
    + '@keyframes snPulsa{0%{transform:scale(1);}30%{transform:scale(1.04);}100%{transform:scale(1);}}'
    + '.sn-brilho-ok{box-shadow:0 0 0 3px rgba(22,163,74,.25),0 10px 24px rgba(22,163,74,.18)!important;transition:box-shadow .3s;}'
    + '.sn-brilho-ret{box-shadow:0 0 0 3px rgba(220,38,38,.25),0 10px 24px rgba(220,38,38,.18)!important;transition:box-shadow .3s;}'
    + '.sn-voa{position:absolute;right:10px;top:8px;font:800 12.5px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:3px 9px;border-radius:99px;color:#fff;pointer-events:none;white-space:nowrap;z-index:5;animation:snVoa 1.6s ease-out forwards;box-shadow:0 4px 10px rgba(0,0,0,.15);}'
    + '.sn-voa.ok{background:#16a34a;} .sn-voa.ret{background:#dc2626;}'
    + '@keyframes snVoa{0%{opacity:0;transform:translateY(10px) scale(.8);}15%{opacity:1;transform:translateY(0) scale(1.05);}70%{opacity:1;transform:translateY(-16px);}100%{opacity:0;transform:translateY(-28px);}}'
    + '.sn-faisca{position:absolute;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:4;animation:snFaisca .8s ease-out forwards;}'
    + '@keyframes snFaisca{from{opacity:1;transform:translate(0,0) scale(1);}to{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.3);}}'
    + '@media (prefers-reduced-motion: reduce){.sn-dg>.sn-t{transition:none;}.sn-pulsa,.sn-voa,.sn-faisca{animation:none;display:none;}}';
  function estilo() { if (document.getElementById('sn-css')) return; var s = document.createElement('style'); s.id = 'sn-css'; s.textContent = css; (document.head || document.documentElement).appendChild(s); }
  function valor(t) {
    var s = String(t || '').replace(/[^\d,.\-]/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
    var n = parseFloat(s); return isNaN(n) ? null : n;
  }
  function calmo() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function fmtDif(d, txt) {
    var mt = /MT/i.test(txt), a = Math.abs(d), dec = (Math.round(a) !== a) ? 0 : 0;
    var s = a.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (d > 0 ? '+' : '−') + (mt ? 'MT ' : '') + s;
  }
  function rolar(el, de, para) {
    // monta o rolo com os algarismos ANTIGOS e roda até aos novos
    var a = String(de), b = String(para), n = Math.max(a.length, b.length), padB = n - b.length;
    a = a.padStart(n, '\u0000'); b = b.padStart(n, '\u0000');
    var h = '<span class="sn-rolo" aria-hidden="true">';
    for (var i = 0; i < n; i++) {
      var ca = a[i], cb = b[i];
      if (i < padB) continue;                                   // enchimento: não ocupa espaço
      if (/\d/.test(cb) && (/\d/.test(ca) || ca === '\u0000')) {
        var col = ''; for (var k = 0; k < 10; k++) col += '<i>' + k + '</i>';
        h += '<span class="sn-dg"><span class="sn-w">' + cb + '</span><span class="sn-t" data-d="' + cb + '" data-a="' + (/\d/.test(ca) ? ca : '0') + '">' + col + '</span></span>';
      } else h += '<span style="white-space:pre">' + cb.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
    }
    h += '</span><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">' + String(para) + '</span>';
    el.innerHTML = h;
    var cols = el.querySelectorAll('.sn-t');
    cols.forEach(function (c) { var hh = c.parentNode.getBoundingClientRect().height || c.firstChild.getBoundingClientRect().height; c.querySelectorAll('i').forEach(function (x) { x.style.height = hh + 'px'; x.style.lineHeight = hh + 'px'; }); c.style.transition = 'none'; c.style.transform = 'translateY(' + (-parseInt(c.dataset.a, 10) * hh) + 'px)'; c.dataset.h = hh; });
    void el.offsetWidth;
    cols.forEach(function (c) { c.style.transition = ''; c.style.transform = 'translateY(' + (-parseInt(c.dataset.d, 10) * parseFloat(c.dataset.h)) + 'px)'; });
    clearTimeout(el._snT);
    el._snT = setTimeout(function () { el.textContent = para; }, 900);   // no fim volta ao texto normal
  }
  window.spapNum = function (el, texto, op) {
    if (!el) return;
    op = op || {};
    texto = String(texto);
    var antes = el._snTxt != null ? el._snTxt : null;
    el._snTxt = texto;
    // primeira vez, mesmo valor, página escondida ou «reduzir movimento»: só escreve
    if (antes === null || antes === texto || document.hidden || calmo()) { clearTimeout(el._snT); el.textContent = texto; return; }
    var v0 = valor(antes), v1 = valor(texto);
    estilo();
    rolar(el, antes, texto);
    if (v0 === null || v1 === null || v0 === v1) return;
    var sobe = v1 > v0, tipo = sobe ? 'ok' : 'ret';
    var c = op.cartao || el.parentNode;
    if (!c) return;
    if (getComputedStyle(c).position === 'static') c.style.position = 'relative';
    c.classList.remove('sn-pulsa', 'sn-brilho-ok', 'sn-brilho-ret'); void c.offsetWidth;
    c.classList.add('sn-pulsa', 'sn-brilho-' + tipo);
    clearTimeout(c._snB); c._snB = setTimeout(function () { c.classList.remove('sn-pulsa', 'sn-brilho-' + tipo); }, 1200);
    var voa = document.createElement('span'); voa.className = 'sn-voa ' + tipo;
    voa.textContent = op.mais && sobe ? op.mais : fmtDif(v1 - v0, texto);
    c.appendChild(voa); setTimeout(function () { voa.remove(); }, 1700);
    if (op.lucro && sobe) {
      var cores = ['#16a34a', '#f59e0b', '#22c55e', '#fbbf24'];
      for (var i = 0; i < 10; i++) {
        var f = document.createElement('i'); f.className = 'sn-faisca'; f.style.background = cores[i % 4];
        f.style.left = (40 + Math.random() * 30) + '%'; f.style.top = '55%';
        var a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 30;
        f.style.setProperty('--dx', Math.cos(a) * r + 'px'); f.style.setProperty('--dy', Math.sin(a) * r - 20 + 'px');
        c.appendChild(f); (function (x) { setTimeout(function () { x.remove(); }, 850); })(f);
      }
    }
  };
})();
