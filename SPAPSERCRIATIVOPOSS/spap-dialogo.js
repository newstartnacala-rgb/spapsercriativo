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
  window.spapConfirmar = function (titulo, texto, o) { return janela(Object.assign({ tipo: 'confirmar', titulo: titulo, texto: texto, ok: 'Confirmar' }, o || {})); };
  window.spapAviso = function (titulo, texto, o) { return janela(Object.assign({ tipo: 'aviso', titulo: titulo, texto: texto, ok: 'Entendi' }, o || {})); };
  window.spapPedir = function (titulo, texto, valor, o) { return janela(Object.assign({ tipo: 'pedir', titulo: titulo, texto: texto, valor: valor, ok: 'Confirmar' }, o || {})); };
})();
