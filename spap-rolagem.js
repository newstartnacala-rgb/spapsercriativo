/* SPAP — Efeito profissional no fim da rolagem (em todas as páginas e em todas as abas/listas com scroll).
   • No telemóvel: ao puxar para lá do fim, o conteúdo estica com resistência (efeito elástico) e volta com mola.
   • Com rato/teclado ou rolagem rápida: ao chegar ao fim, o conteúdo dá um pequeno salto suave.
   • No fim aparece também um brilho suave na borda de baixo.
   Usa a propriedade «translate» (não mexe nas animações «transform» que a página já tem). */
(function () {
  'use strict';
  if (window.__spapRolagem) return; window.__spapRolagem = true;
  var reduzir = false; try { reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduzir) return;

  var css = '.spr-brilho{position:fixed;height:46px;pointer-events:none;z-index:2147483000;opacity:0;'
    + 'background:radial-gradient(60% 100% at 50% 100%,rgba(59,130,246,.28),rgba(59,130,246,0) 70%);transition:opacity .35s ease;border-radius:0 0 24px 24px;}'
    + '.spr-brilho.on{opacity:1;}'
    + 'html.escuro .spr-brilho{filter:invert(1) hue-rotate(180deg);}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  function raiz() { return document.scrollingElement || document.documentElement; }
  function rolavel(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el === raiz()) return el.scrollHeight > el.clientHeight + 2;
    var cs = getComputedStyle(el), oy = cs.overflowY;
    return (oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight + 2;
  }
  function contentorDe(alvo) {
    for (var e = alvo; e && e !== document.body && e !== document.documentElement; e = e.parentElement) if (rolavel(e)) return e;
    return rolavel(raiz()) ? raiz() : null;
  }
  function noFim(el) { return Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 1; }
  // o que se mexe: os filhos do contentor (na página inteira, os blocos do body que não são fixos)
  // barras fixas (menu de baixo, topo) nunca se mexem: se um bloco tem barras fixas por dentro, desce um nível
  function temFixo(c) { var l = c.querySelectorAll('*'); for (var i = 0; i < l.length && i < 400; i++) { var p = getComputedStyle(l[i]).position; if (p === 'fixed' || p === 'sticky') return true; } return false; }
  function pecas(el) {
    var out = [];
    (function juntar(base, nivel) {
      for (var i = 0; i < base.children.length && out.length < 80; i++) {
        var c = base.children[i]; if (/^(SCRIPT|STYLE|LINK)$/.test(c.tagName)) continue;
        var cs = getComputedStyle(c); if (cs.position === 'fixed' || cs.position === 'sticky' || cs.display === 'none') continue;
        if (nivel < 3 && temFixo(c)) juntar(c, nivel + 1); else out.push(c);
      }
    })(el === raiz() ? document.body : el, 0);
    return out;
  }
  function brilho(el) {
    var r = el === raiz() ? { left: 0, width: innerWidth, bottom: innerHeight } : el.getBoundingClientRect();
    var b = document.createElement('div'); b.className = 'spr-brilho';
    b.style.left = r.left + 'px'; b.style.width = r.width + 'px'; b.style.top = (Math.min(r.bottom, innerHeight) - 46) + 'px';
    document.body.appendChild(b); requestAnimationFrame(function () { b.classList.add('on'); });
    setTimeout(function () { b.classList.remove('on'); setTimeout(function () { b.remove(); }, 400); }, 450);
  }
  function salto(el) {
    if (el._sprAnim) return; el._sprAnim = true;
    var ps = pecas(el);
    ps.forEach(function (c) { try { c.animate([{ translate: '0 0' }, { translate: '0 -12px', offset: .35 }, { translate: '0 3px', offset: .7 }, { translate: '0 0' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)' }); } catch (e) {} });
    brilho(el);
    setTimeout(function () { el._sprAnim = false; }, 700);
  }

  /* --- rolagem normal: quando chega ao fim, um salto suave (uma vez por chegada) --- */
  var ultimo = new WeakMap();
  document.addEventListener('scroll', function (e) {
    var el = e.target === document ? raiz() : e.target;
    if (!el || el.nodeType !== 1 || el._sprToque) return;
    var ant = ultimo.get(el) || 0, agora = el.scrollTop; ultimo.set(el, agora);
    if (agora > ant && noFim(el) && el.scrollHeight > el.clientHeight + 40) {
      if (!el._sprNoFim) { el._sprNoFim = true; salto(el); }
    } else if (!noFim(el)) el._sprNoFim = false;
  }, true);

  /* --- rato: continuar a rodar a roda já no fim também dá o salto --- */
  document.addEventListener('wheel', function (e) {
    if (e.deltaY <= 0) return;
    var el = contentorDe(e.target); if (!el || !noFim(el)) return;
    salto(el);
  }, { passive: true, capture: true });

  /* --- toque: efeito elástico ao puxar para lá do fim --- */
  var t = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { t = null; return; }
    var el = contentorDe(e.target); if (!el) { t = null; return; }
    t = { el: el, y: e.touches[0].clientY, ativo: false, d: 0, ps: null };
  }, { passive: true, capture: true });
  document.addEventListener('touchmove', function (e) {
    if (!t) return;
    var dy = t.y - e.touches[0].clientY;     // > 0 = a puxar para cima (ir mais para baixo)
    if (!t.ativo) {
      if (dy > 4 && noFim(t.el)) { t.ativo = true; t.base = dy; t.ps = pecas(t.el); t.el._sprToque = true; }
      else return;
    }
    var puxa = Math.max(0, dy - t.base);
    t.d = -Math.min(90, puxa * 0.38 / (1 + puxa / 600));   // resistência crescente
    t.ps.forEach(function (c) { c.style.translate = '0 ' + t.d.toFixed(1) + 'px'; });
  }, { passive: true, capture: true });
  function soltar() {
    if (!t) return;
    var x = t; t = null;
    if (!x.ativo) return;
    x.el._sprToque = false;
    var d = x.d;
    x.ps.forEach(function (c) {
      c.style.translate = '';
      try { c.animate([{ translate: '0 ' + d + 'px' }, { translate: '0 ' + (-d * 0.08).toFixed(1) + 'px', offset: .6 }, { translate: '0 0' }], { duration: 480, easing: 'cubic-bezier(.2,.9,.3,1.2)' }); } catch (e) {}
    });
    if (d < -10) brilho(x.el);
  }
  document.addEventListener('touchend', soltar, { passive: true, capture: true });
  document.addEventListener('touchcancel', soltar, { passive: true, capture: true });
})();
