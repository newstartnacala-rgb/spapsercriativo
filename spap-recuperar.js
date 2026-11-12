/* SPAP — "Esqueci a senha" com duas abas (Loja, Monitor, Banca e Banca Monitor).
   Aba 1: email → código do balconista → nova senha (fica à vista).
   Aba 2: recuperar por email (link para definir nova senha).
   Uso: spapRecuperarSenha({ tipo: 'loja' | 'banca', email: '...', aoEntrar: function(email, senha){...} }) */
(function () {
  var SQL = 'atualizacao-v2.9.247-gerente-cronometro-e-recuperar-senha.sql';
  var css = ''
    + '#srs{position:fixed;inset:0;z-index:100050;background:rgba(8,15,35,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .2s;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}'
    + '#srs.on{opacity:1;}'
    + '#srs .sr{width:100%;max-width:420px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:24px;padding:20px 20px 18px;box-shadow:0 30px 80px rgba(8,15,35,.35);transform:translateY(16px) scale(.98);transition:transform .25s cubic-bezier(.2,.9,.3,1);color:#0f172a;}'
    + '#srs.on .sr{transform:none;}'
    + '.sr-cab{display:flex;align-items:center;gap:12px;margin-bottom:14px;}'
    + '.sr-ico{width:46px;height:46px;border-radius:14px;background:linear-gradient(145deg,#2563eb,#1e40af);color:#fff;display:grid;place-items:center;flex-shrink:0;box-shadow:0 8px 18px rgba(37,99,235,.3);}'
    + '.sr-ico svg{width:24px;height:24px;}'
    + '.sr-tit{font-size:18px;font-weight:800;line-height:1.2;} .sr-sub{font-size:12.5px;color:#64748b;margin-top:2px;}'
    + '.sr-x{margin-left:auto;width:38px;height:38px;border-radius:12px;border:0;background:#f1f5f9;color:#334155;font-size:18px;font-weight:800;cursor:pointer;flex-shrink:0;}'
    + '.sr-abas{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:#f1f5f9;border-radius:14px;margin-bottom:16px;}'
    + '.sr-abas button{border:0;background:transparent;border-radius:11px;padding:10px 6px;font-weight:700;font-size:13px;line-height:1.25;font-family:inherit;color:#475569;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;}'
    + '.sr-abas button svg{width:16px;height:16px;flex-shrink:0;}'
    + '.sr-abas button.on{background:#fff;color:#1e40af;box-shadow:0 2px 8px rgba(15,23,42,.1);}'
    + '.sr-passos{display:flex;align-items:center;gap:6px;margin-bottom:14px;}'
    + '.sr-passo{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:#94a3b8;}'
    + '.sr-passo i{width:26px;height:26px;border-radius:50%;background:#e2e8f0;color:#64748b;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:800;transition:background .2s;}'
    + '.sr-passo.on{color:#1e40af;} .sr-passo.on i{background:#2563eb;color:#fff;}'
    + '.sr-passo.ok{color:#15803d;} .sr-passo.ok i{background:#16a34a;color:#fff;}'
    + '.sr-linha{flex:0 0 18px;height:2px;background:#e2e8f0;margin-top:-16px;}'
    + '.sr-lab{display:block;font-size:12.5px;font-weight:800;color:#334155;margin:0 0 6px;}'
    + '.sr-campo{display:flex;align-items:center;gap:8px;border:1.5px solid #dbe3ef;border-radius:14px;padding:0 6px 0 14px;height:52px;background:#fff;transition:border-color .2s;}'
    + '.sr-campo:focus-within{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12);}'
    + '.sr-campo input{flex:1;min-width:0;border:0;outline:none;font-size:16px;color:#0f172a;background:transparent;font-family:inherit;}'
    + '.sr-olho{width:40px;height:40px;border:0;background:transparent;color:#64748b;cursor:pointer;display:grid;place-items:center;}'
    + '.sr-olho svg{width:20px;height:20px;}'
    + '.sr-txt{font-size:13px;color:#475569;line-height:1.5;margin:0 0 12px;}'
    + '.sr-conta{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:#f0f9ff;border:1px solid #bae6fd;margin-bottom:12px;font-size:13px;color:#075985;}'
    + '.sr-conta b{color:#0c4a6e;}'
    + '.sr-btn{width:100%;height:52px;margin-top:14px;border:0;border-radius:15px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:800;font-size:15.5px;line-height:1;font-family:inherit;cursor:pointer;box-shadow:0 10px 22px rgba(37,99,235,.28);display:flex;align-items:center;justify-content:center;gap:8px;}'
    + '.sr-btn:disabled{opacity:.6;cursor:default;}'
    + '.sr-btn.verde{background:linear-gradient(135deg,#16a34a,#15803d);box-shadow:0 10px 22px rgba(22,163,74,.28);}'
    + '.sr-lnk{display:block;width:100%;margin-top:10px;border:0;background:none;color:#64748b;font-weight:700;font-size:13px;line-height:1.4;font-family:inherit;cursor:pointer;}'
    + '.sr-msg{margin-top:12px;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.45;font-weight:600;}'
    + '.sr-msg:empty{display:none;} .sr-msg.erro{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;} .sr-msg.ok{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;}'
    + '.sr-senha{margin:6px 0 4px;padding:16px;border-radius:16px;background:#0f172a;color:#fff;text-align:center;}'
    + '.sr-senha small{display:block;font-size:11.5px;color:#94a3b8;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}'
    + '.sr-senha b{display:block;font-size:24px;letter-spacing:.06em;margin-top:6px;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace;}'
    + '.sr-copiar{margin-top:10px;border:0;border-radius:10px;padding:8px 14px;background:rgba(255,255,255,.14);color:#fff;font-weight:700;font-size:12.5px;line-height:1;font-family:inherit;cursor:pointer;}'
    + '.sr-feito{text-align:center;margin-bottom:8px;} .sr-feito i{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 8px;border-radius:18px;background:linear-gradient(145deg,#22c55e,#15803d);color:#fff;font-style:normal;font-size:28px;box-shadow:0 10px 22px rgba(22,163,74,.3);}'
    + '.sr-feito b{font-size:17px;}'
    + 'html.escuro #srs{filter:invert(1) hue-rotate(180deg);}';

  var ICO = {
    chave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg>',
    codigo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    olho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
  };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function estilo() { if (document.getElementById('srs-css')) return; var s = document.createElement('style'); s.id = 'srs-css'; s.textContent = css; document.head.appendChild(s); }
  function semSql(e) { var m = String((e && (e.message || e.code)) || ''); return /recuperar_senha|function|PGRST202|does not exist|schema cache/i.test(m); }

  window.spapRecuperarSenha = function (op) {
    op = op || {};
    estilo();
    var tipo = op.tipo === 'banca' ? 'banca' : 'loja';
    var nomeTipo = tipo === 'banca' ? 'Banca' : 'Loja';
    var palavra = 'senha';
    var st = { aba: 'codigo', passo: 1, email: (op.email || '').trim(), loja: '', token: '', senha: '' };
    var ant = document.getElementById('srs'); if (ant) ant.remove();
    var d = document.createElement('div'); d.id = 'srs';
    d.innerHTML = '<div class="sr" role="dialog" aria-modal="true" aria-labelledby="sr-t">'
      + '<div class="sr-cab"><div class="sr-ico">' + ICO.chave + '</div><div><div class="sr-tit" id="sr-t">Recuperar ' + palavra + '</div><div class="sr-sub">Conta da ' + nomeTipo + '</div></div><button type="button" class="sr-x" aria-label="Fechar">✕</button></div>'
      + '<div class="sr-abas" role="tablist"><button type="button" role="tab" data-aba="codigo">' + ICO.codigo + 'Com código do balconista</button><button type="button" role="tab" data-aba="email">' + ICO.email + 'Por email</button></div>'
      + '<div id="sr-corpo"></div></div>';
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('on'); });
    function fechar() { d.classList.remove('on'); setTimeout(function () { d.remove(); }, 220); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') fechar(); }
    document.addEventListener('keydown', tecla);
    d.querySelector('.sr-x').onclick = fechar;
    d.addEventListener('click', function (e) { if (e.target === d) fechar(); });
    d.querySelectorAll('.sr-abas button').forEach(function (b) { b.onclick = function () { st.aba = b.dataset.aba; desenhar(); }; });
    var corpo = d.querySelector('#sr-corpo');
    function $(s) { return corpo.querySelector(s); }
    function msg(t, tipoMsg) { var m = $('.sr-msg'); if (m) { m.className = 'sr-msg ' + (tipoMsg || 'erro'); m.innerHTML = t || ''; } }
    function ocupado(b, sim, txt) { b.disabled = sim; if (txt) b.textContent = txt; }
    function campo(id, tipoInput, ph, valor, extra) {
      return '<div class="sr-campo"><input id="' + id + '" type="' + tipoInput + '" placeholder="' + ph + '" value="' + esc(valor || '') + '" ' + (extra || '') + '>'
        + (tipoInput === 'password' ? '<button type="button" class="sr-olho" data-alvo="' + id + '" aria-label="Mostrar">' + ICO.olho + '</button>' : '') + '</div>';
    }
    function ligarOlhos() { corpo.querySelectorAll('.sr-olho').forEach(function (o) { o.onclick = function () { var i = corpo.querySelector('#' + o.dataset.alvo); i.type = i.type === 'password' ? 'text' : 'password'; i.focus(); }; }); }
    function enter(id, fn) { var i = $('#' + id); if (i) i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fn(); } }); }
    function passos() {
      var n = ['Email', 'Código', 'Nova senha'], h = '<div class="sr-passos">';
      n.forEach(function (t, i) { var k = i + 1; h += (i ? '<div class="sr-linha"></div>' : '') + '<div class="sr-passo ' + (st.passo > k ? 'ok' : st.passo === k ? 'on' : '') + '"><i>' + (st.passo > k ? '✓' : k) + '</i>' + t + '</div>'; });
      return h + '</div>';
    }

    function desenhar() {
      d.querySelectorAll('.sr-abas button').forEach(function (b) { b.classList.toggle('on', b.dataset.aba === st.aba); b.setAttribute('aria-selected', b.dataset.aba === st.aba); });
      if (st.aba === 'email') return abaEmail();
      if (st.passo === 1) passo1(); else if (st.passo === 2) passo2(); else if (st.passo === 3) passo3(); else feito();
    }

    // ---------- ABA 1: código do balconista ----------
    function passo1() {
      corpo.innerHTML = passos()
        + '<p class="sr-txt">Escreve o email da conta. A seguir vamos pedir o <b>código de acesso do balconista</b> para confirmar que és o dono.</p>'
        + '<label class="sr-lab" for="sr-email">Email da conta</label>' + campo('sr-email', 'email', 'nome@exemplo.com', st.email, 'autocomplete="email"')
        + '<button type="button" class="sr-btn" id="sr-b1">Confirmar email</button><div class="sr-msg"></div>';
      var b = $('#sr-b1'), i = $('#sr-email');
      setTimeout(function () { i.focus(); }, 60);
      var ir = async function () {
        var em = i.value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return msg('Escreve um email válido.');
        ocupado(b, true, 'A confirmar…'); msg('');
        try {
          var r = await supabaseClient.rpc('recuperar_senha_verificar', { p_email: em, p_tipo: tipo });
          if (r.error) throw r.error;
          var x = r.data || {};
          if (!x.ok) {
            ocupado(b, false, 'Confirmar email');
            if (x.erro === 'sem_conta') return msg('Não encontrámos nenhuma conta de ' + nomeTipo + ' com este email.');
            if (x.erro === 'sem_codigo') return msg('A conta <b>' + esc(x.loja || '') + '</b> ainda não tem um código de balconista próprio (usa o código de origem). Por segurança, recupera pela aba <b>Por email</b>.');
            if (x.erro === 'protegido') return msg('Esta conta está protegida. Usa a recuperação por email.');
            return msg('Não foi possível confirmar o email.');
          }
          st.email = em; st.loja = x.loja || ''; st.passo = 2; desenhar();
        } catch (e) {
          ocupado(b, false, 'Confirmar email');
          msg(semSql(e) ? 'Esta opção ainda não está ativa no servidor. Usa a aba <b>Por email</b>.' : 'Sem ligação. Verifica a internet e tenta de novo.');
        }
      };
      b.onclick = ir; enter('sr-email', ir);
    }

    function passo2() {
      corpo.innerHTML = passos()
        + '<div class="sr-conta">' + ICO.codigo.replace('<svg', '<svg width="20" height="20"') + '<div>Conta: <b>' + esc(st.loja || st.email) + '</b><br>' + esc(st.email) + '</div></div>'
        + '<label class="sr-lab" for="sr-cod">Código de acesso do balconista</label>' + campo('sr-cod', 'password', 'Ex: 1234', '', 'inputmode="numeric" autocomplete="off"')
        + '<button type="button" class="sr-btn" id="sr-b2">Confirmar código</button>'
        + '<button type="button" class="sr-lnk" id="sr-voltar">← Mudar email</button><div class="sr-msg"></div>';
      ligarOlhos();
      var b = $('#sr-b2'), i = $('#sr-cod');
      setTimeout(function () { i.focus(); }, 60);
      $('#sr-voltar').onclick = function () { st.passo = 1; desenhar(); };
      var ir = async function () {
        var c = i.value.trim(); if (!c) return msg('Escreve o código do balconista.');
        ocupado(b, true, 'A confirmar…'); msg('');
        try {
          var r = await supabaseClient.rpc('recuperar_senha_codigo', { p_email: st.email, p_tipo: tipo, p_codigo: c });
          if (r.error) throw r.error;
          var x = r.data || {};
          if (!x.ok) {
            ocupado(b, false, 'Confirmar código'); i.select();
            if (x.erro === 'bloqueado') return msg('Demasiadas tentativas erradas. Por segurança, espera <b>' + (x.minutos || 15) + ' minuto(s)</b> ou usa a aba <b>Por email</b>.');
            if (x.erro === 'codigo_errado') return msg('Código errado.' + (x.restam != null ? ' Restam <b>' + x.restam + '</b> tentativa(s).' : ''));
            return msg('Não foi possível confirmar o código.');
          }
          st.token = x.token; st.passo = 3; desenhar();
        } catch (e) { ocupado(b, false, 'Confirmar código'); msg('Sem ligação. Verifica a internet e tenta de novo.'); }
      };
      b.onclick = ir; enter('sr-cod', ir);
    }

    function passo3() {
      corpo.innerHTML = passos()
        + '<div class="sr-msg ok" style="margin:0 0 12px;">✓ Código confirmado. És o dono da conta.</div>'
        + '<p class="sr-txt">Por segurança, a ' + palavra + ' antiga fica guardada encriptada e ninguém a consegue ler. Escreve a <b>nova ' + palavra + '</b> — fica à vista para a confirmares.</p>'
        + '<label class="sr-lab" for="sr-nova">Nova ' + palavra + ' (mínimo 6 caracteres)</label>' + campo('sr-nova', 'text', 'Nova ' + palavra, '', 'autocomplete="new-password" autocapitalize="off" spellcheck="false"')
        + '<button type="button" class="sr-btn verde" id="sr-b3">Guardar e mostrar ' + palavra + '</button><div class="sr-msg"></div>';
      var b = $('#sr-b3'), i = $('#sr-nova');
      setTimeout(function () { i.focus(); }, 60);
      var ir = async function () {
        var v = i.value; if (v.trim().length < 6) return msg('A ' + palavra + ' precisa de pelo menos 6 caracteres.');
        ocupado(b, true, 'A guardar…'); msg('');
        try {
          var r = await supabaseClient.rpc('recuperar_senha_definir', { p_email: st.email, p_tipo: tipo, p_token: st.token, p_nova: v });
          if (r.error) throw r.error;
          var x = r.data || {};
          if (!x.ok) {
            ocupado(b, false, 'Guardar e mostrar ' + palavra);
            if (x.erro === 'token_invalido') { st.passo = 2; desenhar(); return msg('O tempo para mudar a ' + palavra + ' terminou (10 minutos). Confirma o código outra vez.'); }
            if (x.erro === 'senha_curta') return msg('A ' + palavra + ' precisa de pelo menos 6 caracteres.');
            return msg('Não foi possível guardar.');
          }
          st.senha = v; st.passo = 4; desenhar();
        } catch (e) { ocupado(b, false, 'Guardar e mostrar ' + palavra); msg('Sem ligação. Verifica a internet e tenta de novo.'); }
      };
      b.onclick = ir; enter('sr-nova', ir);
    }

    function feito() {
      corpo.innerHTML = '<div class="sr-feito"><i>✓</i><b>Senha alterada com sucesso</b></div>'
        + '<div class="sr-senha"><small>A tua ' + palavra + ' agora é</small><b id="sr-mostra">' + esc(st.senha) + '</b><button type="button" class="sr-copiar" id="sr-cp">Copiar</button></div>'
        + '<p class="sr-txt" style="text-align:center;margin-top:10px;">Guarda-a num lugar seguro. Email: <b>' + esc(st.email) + '</b></p>'
        + '<button type="button" class="sr-btn verde" id="sr-entrar">Entrar agora</button>';
      $('#sr-cp').onclick = function () {
        var b = this, t = st.senha;
        var ok = function () { b.textContent = 'Copiado ✓'; setTimeout(function () { b.textContent = 'Copiar'; }, 1600); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, function () {}); else { try { var x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); document.execCommand('copy'); x.remove(); ok(); } catch (e) {} }
      };
      $('#sr-entrar').onclick = function () { var e = st.email, s = st.senha; fechar(); if (op.aoEntrar) op.aoEntrar(e, s); };
    }

    // ---------- ABA 2: por email ----------
    function abaEmail() {
      corpo.innerHTML = '<p class="sr-txt">Enviamos para o teu email um link seguro. Abre o email, toca no link e escolhe a nova ' + palavra + '.</p>'
        + '<label class="sr-lab" for="sr-em2">Email da conta</label>' + campo('sr-em2', 'email', 'nome@exemplo.com', st.email, 'autocomplete="email"')
        + '<button type="button" class="sr-btn" id="sr-b4">Enviar link de recuperação</button><div class="sr-msg"></div>'
        + '<p class="sr-txt" style="margin-top:12px;font-size:12px;color:#94a3b8;">Não recebeste? Vê a pasta de spam ou tenta de novo daqui a 1 minuto.</p>';
      var b = $('#sr-b4'), i = $('#sr-em2');
      setTimeout(function () { i.focus(); }, 60);
      var ir = async function () {
        var em = i.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return msg('Escreve um email válido.');
        ocupado(b, true, 'A enviar…'); msg('');
        try {
          var url = new URL('reset-senha.html', location.href).href;
          try { localStorage.setItem('spap_reset_tipo', tipo); } catch (e) {}
          var r = await supabaseClient.auth.resetPasswordForEmail(em, { redirectTo: url });
          ocupado(b, false, 'Enviar link de recuperação');
          if (r.error) return msg(/rate|limit|seconds/i.test(r.error.message) ? 'Já pediste há pouco. Espera 1 minuto e tenta de novo.' : r.error.message);
          st.email = em;
          msg('✓ Email enviado para <b>' + esc(em) + '</b>. Abre-o e toca no link para escolher a nova ' + palavra + '.', 'ok');
        } catch (e) { ocupado(b, false, 'Enviar link de recuperação'); msg('Sem ligação. Verifica a internet e tenta de novo.'); }
      };
      b.onclick = ir; enter('sr-em2', ir);
    }

    desenhar();
  };
})();
