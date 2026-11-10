/* SPAP — janelas próprias (Loja / Monitor): em vez das caixas do navegador, que mostram o endereço do site.
   spapConfirmar(titulo, texto, {ok, cancelar, perigo, icone}) → Promise<boolean>
   spapAviso(titulo, texto, {ok, icone})                         → Promise<true>
   spapPedir(titulo, texto, valor, {placeholder, numero, ok})    → Promise<string|null> */
(function () {
  var css = ''
    + '#sd-fundo{position:fixed;inset:0;z-index:100050;background:rgba(8,15,35,.5);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .16s;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}'
    + '#sd-fundo.ativo{opacity:1;}'
    + '#sd-fundo .sd{width:100%;max-width:400px;background:#fff;border-radius:24px;padding:24px 20px 18px;text-align:center;box-shadow:0 30px 70px rgba(8,15,35,.38);transform:translateY(14px) scale(.97);transition:transform .2s cubic-bezier(.2,.9,.3,1.2);max-height:calc(100vh - 32px);overflow:auto;}'
    + '#sd-fundo.ativo .sd{transform:none;}'
    + '#sd-fundo .sd-ico{width:62px;height:62px;margin:0 auto 12px;border-radius:18px;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:30px;}'
    + '#sd-fundo .sd-ico.perigo{background:#fef2f2;} #sd-fundo .sd-ico.aviso{background:#fffbeb;} #sd-fundo .sd-ico.ok{background:#ecfdf5;}'
    + '#sd-fundo h3{margin:0 0 6px;font-size:19px;font-weight:800;color:#0f172a;line-height:1.3;}'
    + '#sd-fundo .sd-txt{margin:0 0 14px;font-size:14.5px;color:#475569;line-height:1.55;white-space:pre-line;text-align:left;}'
    + '#sd-fundo .sd-txt.centro{text-align:center;}'
    + '#sd-fundo .sd-extra{margin:0 0 14px;}'
    + '#sd-fundo .sd-in{width:100%;box-sizing:border-box;height:54px;border:1.5px solid #dfe6f3;border-radius:14px;padding:0 16px;font-size:17px;font-weight:600;color:#0f172a;outline:none;background:#f8fafc;font-family:inherit;margin-bottom:6px;}'
    + '#sd-fundo .sd-in:focus{border-color:#1d4ed8;box-shadow:0 0 0 4px rgba(37,99,235,.14);background:#fff;}'
    + '#sd-fundo .sd-erro{min-height:16px;font-size:13px;font-weight:700;color:#dc2626;margin-bottom:6px;}'
    + '#sd-fundo .sd-bts{display:flex;gap:10px;}'
    + '#sd-fundo .sd-bts button{flex:1;height:52px;border:0;border-radius:15px;font-weight:800;font-size:15.5px;cursor:pointer;font-family:inherit;}'
    + '#sd-fundo .sd-bts button:focus{outline:none;} #sd-fundo .sd-bts button:focus-visible{outline:3px solid rgba(37,99,235,.35);outline-offset:2px;}'
    + '#sd-fundo .sd-can{background:#f1f5f9;color:#334155;}'
    + '#sd-fundo .sd-ok{background:linear-gradient(135deg,#1d4ed8,#4338ca);color:#fff;box-shadow:0 10px 22px rgba(37,99,235,.32);}'
    + '#sd-fundo .sd-ok.perigo{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 10px 22px rgba(220,38,38,.3);}'
    + 'html.escuro #sd-fundo{filter:invert(1) hue-rotate(180deg);}';
  function estilo() { if (document.getElementById('sd-css')) return; var s = document.createElement('style'); s.id = 'sd-css'; s.textContent = css; (document.head || document.documentElement).appendChild(s); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // tira emojis do início do texto (o ícone já vai em cima)
  function limpar(t) { return String(t || '').replace(/^[\s☀-➿\uD83C-􏰀-\uDFFF️]+/, ''); }

  function janela(o) {
    estilo();
    return new Promise(function (res) {
      var ant = document.getElementById('sd-fundo'); if (ant) ant.remove();
      var ov = document.createElement('div'); ov.id = 'sd-fundo';
      var campo = o.tipo === 'pedir';
      var txt = limpar(o.texto);
      ov.innerHTML = '<div class="sd" role="dialog" aria-modal="true">'
        + '<div class="sd-ico ' + (o.perigo ? 'perigo' : (o.classe || '')) + '">' + (o.icone || (o.perigo ? '⚠️' : campo ? '✏️' : 'ℹ️')) + '</div>'
        + '<h3>' + esc(o.titulo) + '</h3>'
        + (txt ? '<div class="sd-txt' + (txt.length < 90 ? ' centro' : '') + '">' + esc(txt) + '</div>' : '')
        + (o.extraHtml ? '<div class="sd-extra">' + o.extraHtml + '</div>' : '')
        + (campo ? '<input class="sd-in" type="text" ' + (o.numero ? 'inputmode="decimal"' : '') + ' placeholder="' + esc(o.placeholder || '') + '" value="' + esc(o.valor == null ? '' : o.valor) + '"><div class="sd-erro"></div>' : '')
        + '<div class="sd-bts">' + (o.tipo === 'aviso' ? '' : '<button type="button" class="sd-can">' + esc(o.cancelar || 'Cancelar') + '</button>')
        + '<button type="button" class="sd-ok' + (o.perigo ? ' perigo' : '') + '">' + esc(o.ok || 'OK') + '</button></div></div>';
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add('ativo'); });
      var inp = ov.querySelector('.sd-in'), feito = false;
      function fim(v) { if (feito) return; feito = true; ov.classList.remove('ativo'); setTimeout(function () { ov.remove(); }, 180); res(v); }
      function ok() {
        if (!campo) return fim(true);
        var v = inp.value.trim();
        if (o.numero && v !== '' && isNaN(parseFloat(v.replace(',', '.')))) { ov.querySelector('.sd-erro').textContent = 'Escreve um número válido.'; return; }
        fim(v);
      }
      ov.querySelector('.sd-ok').onclick = ok;
      var c = ov.querySelector('.sd-can'); if (c) c.onclick = function () { fim(campo ? null : false); };
      ov.addEventListener('click', function (e) { if (e.target === ov) fim(o.tipo === 'aviso' ? true : (campo ? null : false)); });
      document.addEventListener('keydown', function tecla(e) {
        if (feito) { document.removeEventListener('keydown', tecla); return; }
        if (e.key === 'Escape') { fim(o.tipo === 'aviso' ? true : (campo ? null : false)); }
        else if (e.key === 'Enter' && (campo || o.tipo !== 'pedir')) { e.preventDefault(); ok(); }
      });
      if (inp) setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) {} }, 60);
      else setTimeout(function () { try { ov.querySelector('.sd-ok').focus(); } catch (e) {} }, 60);
    });
  }

  /* ===== Janela de UPGRADE de plano =====
     spapUpgrade({ titulo, texto, icone, beneficios:[...], planos:['Bronze','Anual'], ok, cancelar }) → Promise<boolean>
     true = a pessoa escolheu «Ver planos» (abre o ecrã de planos). */
  var cssUp = ''
    + '#su-fundo{position:fixed;inset:0;z-index:100055;background:rgba(8,15,35,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .2s;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}'
    + '#su-fundo.ativo{opacity:1;}'
    + '#su-fundo .su{width:100%;max-width:400px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 34px 80px rgba(8,15,35,.42);transform:translateY(18px) scale(.96);transition:transform .28s cubic-bezier(.2,1.2,.3,1);max-height:calc(100vh - 32px);overflow-y:auto;}'
    + '#su-fundo.ativo .su{transform:none;}'
    + '#su-fundo .su-topo{position:relative;padding:26px 22px 22px;text-align:center;color:#fff;background:radial-gradient(120% 90% at 50% 0%,#6d5dfc 0%,#4338ca 45%,#1e1b4b 100%);overflow:hidden;}'
    + '#su-fundo .su-topo::before{content:"";position:absolute;inset:-40%;background:radial-gradient(35% 30% at 20% 30%,rgba(250,204,21,.35),transparent 70%),radial-gradient(30% 28% at 85% 20%,rgba(244,114,182,.3),transparent 70%);animation:su-gira 9s linear infinite;}'
    + '@keyframes su-gira{to{transform:rotate(360deg)}}'
    + '#su-fundo .su-brilhos i{position:absolute;width:6px;height:6px;border-radius:50%;background:#fde68a;opacity:.0;animation:su-brilho 2.4s ease-in-out infinite;}'
    + '#su-fundo .su-brilhos i:nth-child(1){left:18%;top:28%;} #su-fundo .su-brilhos i:nth-child(2){left:80%;top:40%;animation-delay:.8s;} #su-fundo .su-brilhos i:nth-child(3){left:66%;top:16%;animation-delay:1.5s;width:4px;height:4px;} #su-fundo .su-brilhos i:nth-child(4){left:30%;top:70%;animation-delay:1.1s;width:4px;height:4px;}'
    + '@keyframes su-brilho{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1.2)}}'
    + '#su-fundo .su-ic{position:relative;width:86px;height:86px;margin:0 auto 10px;border-radius:26px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);display:grid;place-items:center;box-shadow:0 14px 30px rgba(0,0,0,.25);animation:su-flutua 3s ease-in-out infinite;}'
    + '#su-fundo .su-ic img{width:56px;height:56px;filter:drop-shadow(0 8px 12px rgba(0,0,0,.3));}'
    + '@keyframes su-flutua{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}'
    + '#su-fundo .su-selo{position:relative;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#fde68a,#f59e0b);color:#78350f;font-weight:800;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:5px 12px;margin-bottom:10px;}'
    + '#su-fundo h3{position:relative;margin:0;font-size:21px;font-weight:800;line-height:1.25;}'
    + '#su-fundo .su-txt{position:relative;margin:8px 0 0;font-size:14px;line-height:1.55;color:rgba(255,255,255,.88);}'
    + '#su-fundo .su-corpo{padding:18px 20px 20px;}'
    + '#su-fundo .su-ben{list-style:none;margin:0 0 14px;padding:0;}'
    + '#su-fundo .su-ben li{display:flex;align-items:flex-start;gap:10px;padding:8px 0;font-size:14px;color:#334155;line-height:1.4;border-bottom:1px solid #f1f5f9;}'
    + '#su-fundo .su-ben li:last-child{border-bottom:0;}'
    + '#su-fundo .su-ben li b{color:#0f172a;}'
    + '#su-fundo .su-ben .v{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:#dcfce7;color:#15803d;display:grid;place-items:center;font-size:12px;font-weight:900;}'
    + '#su-fundo .su-planos{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:0 0 16px;}'
    + '#su-fundo .su-planos span{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:7px 13px;font-size:13px;font-weight:800;background:#eef2ff;color:#3730a3;border:1px solid #c7d2fe;}'
    + '#su-fundo .su-planos span.ouro{background:linear-gradient(135deg,#fffbeb,#fef3c7);color:#92400e;border-color:#fcd34d;}'
    + '#su-fundo .su-ok{width:100%;height:56px;border:0;border-radius:17px;font-weight:800;font-size:16px;cursor:pointer;font-family:inherit;color:#fff;background:linear-gradient(135deg,#f59e0b,#ea580c);box-shadow:0 14px 28px rgba(234,88,12,.32);display:flex;align-items:center;justify-content:center;gap:8px;}'
    + '#su-fundo .su-ok:active{transform:scale(.98);} #su-fundo .su-ok:focus{outline:none;} #su-fundo .su-ok:focus-visible{box-shadow:0 0 0 4px rgba(245,158,11,.35),0 14px 28px rgba(234,88,12,.32);}'
    + '#su-fundo .su-can{width:100%;height:46px;margin-top:8px;border:0;border-radius:14px;background:transparent;color:#64748b;font-weight:700;font-size:14.5px;cursor:pointer;font-family:inherit;}'
    + 'html.escuro #su-fundo{filter:invert(1) hue-rotate(180deg);} html.escuro #su-fundo img{filter:invert(1) hue-rotate(180deg);}';
  window.spapUpgrade = function (o) {
    o = o || {};
    if (!document.getElementById('su-css')) { var st = document.createElement('style'); st.id = 'su-css'; st.textContent = cssUp; (document.head || document.documentElement).appendChild(st); }
    return new Promise(function (res) {
      var ant = document.getElementById('su-fundo'); if (ant) ant.remove();
      var ov = document.createElement('div'); ov.id = 'su-fundo';
      var ben = (o.beneficios || []).map(function (b) { return '<li><span class="v">✓</span><span>' + b + '</span></li>'; }).join('');
      var pl = (o.planos || []).map(function (p, i) { return '<span class="' + (i === (o.planos.length - 1) ? 'ouro' : '') + '">' + (i === (o.planos.length - 1) ? '👑 ' : '⭐ ') + esc(p) + '</span>'; }).join('');
      ov.innerHTML = '<div class="su" role="dialog" aria-modal="true">'
        + '<div class="su-topo"><div class="su-brilhos"><i></i><i></i><i></i><i></i></div>'
        + '<div class="su-ic"><img src="icons3d/' + (o.icone || 'crown.png') + '" alt=""></div>'
        + '<div class="su-selo">⚡ Fazer upgrade</div>'
        + '<h3>' + esc(o.titulo || 'Desbloqueie esta função') + '</h3>'
        + (o.texto ? '<p class="su-txt">' + esc(o.texto) + '</p>' : '') + '</div>'
        + '<div class="su-corpo">' + (ben ? '<ul class="su-ben">' + ben + '</ul>' : '')
        + (pl ? '<div class="su-planos">' + pl + '</div>' : '')
        + '<button type="button" class="su-ok">' + esc(o.ok || 'Ver planos') + ' <span aria-hidden="true">→</span></button>'
        + '<button type="button" class="su-can">' + esc(o.cancelar || 'Agora não') + '</button></div></div>';
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add('ativo'); });
      var feito = false;
      function fim(v) { if (feito) return; feito = true; ov.classList.remove('ativo'); setTimeout(function () { ov.remove(); }, 200); res(v); }
      ov.querySelector('.su-ok').onclick = function () { fim(true); };
      ov.querySelector('.su-can').onclick = function () { fim(false); };
      ov.addEventListener('click', function (e) { if (e.target === ov) fim(false); });
      document.addEventListener('keydown', function t(e) { if (feito) { document.removeEventListener('keydown', t); return; } if (e.key === 'Escape') fim(false); else if (e.key === 'Enter') fim(true); });
      setTimeout(function () { try { ov.querySelector('.su-ok').focus(); } catch (e) {} }, 80);
    });
  };

  window.spapConfirmar = function (titulo, texto, o) { return janela(Object.assign({ tipo: 'confirmar', titulo: titulo, texto: texto, ok: 'Confirmar' }, o || {})); };
  window.spapAviso = function (titulo, texto, o) { return janela(Object.assign({ tipo: 'aviso', titulo: titulo, texto: texto, ok: 'Entendi' }, o || {})); };
  window.spapPedir = function (titulo, texto, valor, o) { return janela(Object.assign({ tipo: 'pedir', titulo: titulo, texto: texto, valor: valor, ok: 'Confirmar' }, o || {})); };
})();
