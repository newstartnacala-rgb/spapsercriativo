/* SPAP — app Android nativa (APK) e app no iPhone (ecrã principal)
   1) Convite automático: só no Android (telemóvel/tablet) no navegador; nunca no computador nem dentro da app.
   2) window.spapInstalarApp(): botão «Instalar app (APK)» — funciona sempre:
      • dentro da app → verifica e instala a versão mais recente;
      • Android no navegador → baixa e instala;
      • computador → explica e permite baixar o APK. */
(function () {
  var ua = navigator.userAgent || '';
  var tipo = /monitor/i.test(location.pathname) ? 'monitor' : 'loja';
  var nome = tipo === 'monitor' ? 'SPAP Monitor' : 'SPAP Loja';
  var ficheiro = tipo === 'monitor' ? 'SPAP-Monitor.apk' : 'SPAP-Loja.apk';
  var apk = 'apps/' + ficheiro;
  var chave = 'spap_apk_convite_' + tipo;

  // iPhone / iPad (os iPad recentes dizem que são «Macintosh», mas têm ecrã tátil)
  function ehIOS() { return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1); }
  function jaNoEcraIOS() { return window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); }
  function naApp() { return /SPAPApp/i.test(ua) || !!(window.SPAP_APP_NATIVA && window.SPAPNative); }
  function ehComputadorOuIos() { return ehIOS() || (/Windows|Macintosh|Mac OS X|CrOS/i.test(ua) && !/android/i.test(ua)); }
  function ehAndroid() {
    if (ehComputadorOuIos()) return false;
    var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    // Os tablets Android costumam abrir o site em «modo computador» (Linux, sem a palavra Android)
    return /android/i.test(ua) || /android/i.test(plat)
      || (/Linux/i.test(ua) && ((navigator.maxTouchPoints || 0) > 0 || /arm|aarch64/i.test(navigator.platform || '')));
  }
  function cmp(a, b) {
    var x = String(a || '').split('.'), y = String(b || '').split('.');
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0); if (d) return d; }
    return 0;
  }
  function lerVersao() {
    return fetch('apps/app-version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  var css = '#apk-convite{position:fixed;inset:0;z-index:100001;background:rgba(2,6,23,.55);display:flex;align-items:flex-end;justify-content:center;animation:apkF .2s ease;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}'
    + '#apk-convite .ak{position:relative;background:#fff;width:100%;max-width:480px;border-radius:26px 26px 0 0;padding:26px 20px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px rgba(2,6,23,.3);animation:apkS .35s cubic-bezier(.2,.9,.3,1);overflow:hidden;text-align:center;box-sizing:border-box}'
    + '#apk-convite .ak::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#16a34a,#f5c542)}'
    + '#apk-convite .ak::after{content:"";position:absolute;top:10px;left:50%;width:44px;height:5px;margin-left:-22px;border-radius:5px;background:#cbd5e1}'
    + '#apk-convite .ak-ico{width:84px;height:84px;border-radius:22px;margin:6px auto 12px;box-shadow:0 10px 26px rgba(0,0,0,.18);overflow:hidden;background:#fff;animation:apkB 2.6s ease-in-out infinite}'
    + '#apk-convite .ak-ico img{width:100%;height:100%;object-fit:cover;display:block}'
    + '#apk-convite h3{margin:0 0 6px;font-size:20px;color:#0f172a;font-weight:800}'
    + '#apk-convite p{margin:0 0 14px;font-size:14px;color:#475569;line-height:1.45}'
    + '#apk-convite code{background:#f1f5f9;border-radius:8px;padding:2px 6px;font-size:13px;color:#0f172a;word-break:break-all}'
    + '#apk-convite .ak-van{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:0 0 16px}'
    + '#apk-convite .ak-van span{font-size:12px;font-weight:700;color:#166534;background:#ecfdf5;border:1px solid #bbf7d0;padding:6px 10px;border-radius:999px}'
    + '#apk-convite .ak-sim{display:block;width:100%;box-sizing:border-box;text-decoration:none;border:none;border-radius:16px;padding:15px;font-size:16px;font-weight:800;color:#fff;background:linear-gradient(180deg,#22c55e,#15803d);box-shadow:0 10px 24px rgba(22,163,74,.32);cursor:pointer;font-family:inherit}'
    + '#apk-convite .ak-sim[disabled]{opacity:.75}'
    + '#apk-convite .ak-nao{display:block;width:100%;border:none;background:none;color:#64748b;font-size:14px;padding:13px 0 2px;cursor:pointer;font-family:inherit}'
    + '#apk-convite .ak-barra{height:10px;border-radius:10px;background:#e2e8f0;overflow:hidden;margin:0 0 14px}'
    + '#apk-convite .ak-barra i{display:block;height:100%;width:0;background:linear-gradient(90deg,#34d399,#059669);transition:width .2s}'
    + '#apk-convite ol{text-align:left;margin:4px 0 16px;padding:0;list-style:none;counter-reset:p}'
    + '#apk-convite ol li{counter-increment:p;display:flex;gap:10px;align-items:flex-start;padding:9px 0;font-size:14px;color:#1e293b;border-bottom:1px solid #f1f5f9}'
    + '#apk-convite ol li::before{content:counter(p);flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#16a34a;color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}'
    + '@keyframes apkF{from{opacity:0}}@keyframes apkS{from{transform:translateY(100%)}}@keyframes apkB{50%{transform:translateY(-4px)}}';

  function abrirFolha(html) {
    fecharFolha();
    if (!document.getElementById('apk-estilo')) { var st = document.createElement('style'); st.id = 'apk-estilo'; st.textContent = css; document.head.appendChild(st); }
    var el = document.createElement('div'); el.id = 'apk-convite';
    el.innerHTML = '<div class="ak"><div class="ak-ico"><img src="apps/icon-' + tipo + '.png" alt=""></div>' + html + '</div>';
    el.addEventListener('click', function (e) { if (e.target === el) fecharFolha(); });
    document.body.appendChild(el);
    return el;
  }
  function fecharFolha() { var e = document.getElementById('apk-convite'); if (e) e.remove(); }
  function lembrar() { try { localStorage.setItem(chave, String(Date.now())); } catch (e) {} }

  function passos(box) {
    box.innerHTML = '<div class="ak-ico"><img src="apps/icon-' + tipo + '.png" alt=""></div><h3>A baixar a app…</h3>'
      + '<ol><li><span>Quando terminar, toque na notificação ou abra o ficheiro <b>' + ficheiro + '</b>.</span></li>'
      + '<li><span>Toque em <b>Instalar</b>. Se o Android pedir, permita <b>«desta fonte»</b>.</span></li>'
      + '<li><span>Abra a app <b>' + nome + '</b> no ecrã inicial.</span></li></ol>'
      + '<button class="ak-sim" type="button">Entendi</button>';
    box.querySelector('.ak-sim').onclick = fecharFolha;
  }

  // ---- Android no navegador: baixar e instalar
  function folhaAndroid(versao) {
    var el = abrirFolha('<h3>Instale a app ' + nome + '</h3>'
      + '<p>Use o ' + (tipo === 'monitor' ? 'Monitor' : 'sistema da Loja') + ' como uma app no seu telemóvel ou tablet' + (versao ? ' (versão ' + versao + ')' : '') + '.</p>'
      + '<div class="ak-van"><span>⚡ Mais rápida</span><span>📲 Ícone no ecrã</span><span>🔄 Atualiza sozinha</span></div>'
      + '<a class="ak-sim" href="' + apk + '" download>Baixar e instalar</a>'
      + '<button class="ak-nao" type="button">Agora não</button>');
    el.querySelector('.ak-nao').onclick = function () { lembrar(); fecharFolha(); };
    el.querySelector('.ak-sim').onclick = function () { lembrar(); var box = el.querySelector('.ak'); setTimeout(function () { passos(box); }, 400); };
  }

  // ---- Dentro da app: verificar e instalar a versão mais recente
  function folhaNaApp(d) {
    var inst = ''; try { inst = SPAPNative.versaoApp(); } catch (e) {}
    if (!d || !d.versao) {
      var e1 = abrirFolha('<h3>' + nome + '</h3><p>Não foi possível verificar agora. Confirme a internet e tente outra vez.</p><button class="ak-sim" type="button">Fechar</button>');
      e1.querySelector('.ak-sim').onclick = fecharFolha; return;
    }
    if (cmp(d.versao, inst) <= 0) {
      var e2 = abrirFolha('<h3>A app está instalada ✅</h3><p>Está a usar a app <b>' + nome + '</b>, versão <b>' + inst + '</b> — a mais recente.</p><button class="ak-sim" type="button">Fechar</button>');
      e2.querySelector('.ak-sim').onclick = fecharFolha; return;
    }
    var el = abrirFolha('<h3>Nova versão da app</h3><p>Instalada: <b>' + inst + '</b> · Disponível: <b>' + d.versao + '</b></p>'
      + '<div class="ak-barra" style="display:none"><i></i></div>'
      + '<button class="ak-sim" type="button">Baixar e instalar ' + d.versao + '</button><button class="ak-nao" type="button">Mais tarde</button>');
    el.querySelector('.ak-nao').onclick = fecharFolha;
    var btn = el.querySelector('.ak-sim'), barra = el.querySelector('.ak-barra');
    btn.onclick = function () {
      btn.disabled = true; btn.textContent = 'A baixar…'; barra.style.display = '';
      var antes = window.__spapAppProgresso;
      window.__spapAppProgresso = function (pct, estado) {
        try { if (antes) antes(pct, estado); } catch (e) {}
        barra.querySelector('i').style.width = Math.max(0, Math.min(100, pct)) + '%';
        if (estado === 'erro') { btn.disabled = false; btn.textContent = 'Falhou. Tentar outra vez'; }
        else if (estado === 'permissao') { btn.disabled = false; btn.textContent = 'Permita instalar e toque outra vez'; }
        else if (estado === 'instalar') { btn.disabled = false; btn.textContent = 'Toque em «Instalar» no Android'; }
        else btn.textContent = 'A baixar… ' + Math.round(pct) + '%';
      };
      var urlApk = new URL(d[tipo] || apk, location.href).href;
      // App antiga sem instalador interno → usa o descarregador do Android (abre o instalador no fim)
      if (typeof SPAPNative.instalarApp !== 'function') { window.location.href = urlApk; btn.textContent = 'A baixar… abre a notificação para instalar'; return; }
      try { SPAPNative.instalarApp(urlApk); }
      catch (e) { window.location.href = urlApk; }
    };
  }

  // ---- iPhone / iPad: instalar no ecrã principal (app do sistema, sem App Store)
  var SVG_PARTILHAR = '<svg viewBox="0 0 24 24" width="20" height="20" style="vertical-align:-4px"><path fill="none" stroke="#0a84ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var SVG_MAIS = '<svg viewBox="0 0 24 24" width="20" height="20" style="vertical-align:-4px"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="#0f172a" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/></svg>';
  function folhaIOS() {
    if (jaNoEcraIOS()) {
      var e0 = abrirFolha('<h3>A app ' + nome + ' já está instalada ✅</h3><p>Está a usar a app a partir do ecrã principal. Atualiza-se sozinha.</p><button class="ak-sim" type="button">Fechar</button>');
      e0.querySelector('.ak-sim').onclick = fecharFolha; return;
    }
    var noSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    var aparelho = /iPhone|iPod/i.test(ua) ? 'iPhone' : 'iPad';
    var el = abrirFolha('<h3>Instale a app ' + nome + ' no ' + aparelho + '</h3>'
      + '<p>Fica com um ícone no ecrã principal e abre em ecrã inteiro, como uma app.</p>'
      + '<ol>'
      + '<li><span>Toque no botão <b>Partilhar</b> ' + SVG_PARTILHAR + ' ' + (noSafari ? 'na barra do Safari (em baixo).' : 'do navegador (no Chrome fica ao lado do endereço).') + '</span></li>'
      + '<li><span>Deslize e escolha <b>«Adicionar ao Ecrã Principal»</b> ' + SVG_MAIS + '</span></li>'
      + '<li><span>Toque em <b>Adicionar</b>. A app <b>' + nome + '</b> aparece no ecrã principal.</span></li>'
      + '</ol>'
      + '<button class="ak-sim" type="button">Entendi</button><button class="ak-nao" type="button">Agora não</button>');
    el.querySelector('.ak-sim').onclick = function () { lembrar(); fecharFolha(); };
    el.querySelector('.ak-nao').onclick = function () { lembrar(); fecharFolha(); };
  }

  // ---- Computador: explicar e permitir baixar
  function folhaComputador(versao) {
    var endereco = location.origin + (tipo === 'monitor' ? '/monitor.html' : '/login.html');
    var el = abrirFolha('<h3>App ' + nome + ' para Android</h3>'
      + '<p>A app nativa funciona em <b>telemóveis e tablets Android</b>' + (versao ? ' (versão ' + versao + ')' : '') + '.<br>Abra no Android o endereço <code>' + endereco + '</code> e toque em «Instalar app».</p>'
      + '<a class="ak-sim" href="' + apk + '" download>Baixar o APK aqui</a>'
      + '<button class="ak-nao" type="button">Fechar</button>');
    el.querySelector('.ak-nao').onclick = fecharFolha;
  }

  // Botão «Instalar app (APK)» — funciona sempre
  window.spapInstalarApp = function () {
    lerVersao().then(function (d) {
      var v = d && d.versao;
      if (naApp()) folhaNaApp(d);
      else if (ehIOS()) folhaIOS();
      else if (ehAndroid()) folhaAndroid(v);
      else folhaComputador(v);
    });
  };

  // Convite automático (só Android no navegador)
  try {
    if (naApp()) return;
    var paraIOS = ehIOS() && !jaNoEcraIOS();
    if (!paraIOS && !ehAndroid()) return;
    try { var t = +localStorage.getItem(chave) || 0; if (Date.now() - t < 3 * 864e5) return; } catch (e) {}
    if (paraIOS) {
      var iniIOS = function () { setTimeout(function () { if (!document.getElementById('apk-convite')) folhaIOS(); }, 2500); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniIOS); else iniIOS();
      return;
    }
    var iniciar = function () {
      setTimeout(function () {
        lerVersao().then(function (d) { if (d && d.versao && !document.getElementById('apk-convite')) folhaAndroid(d.versao); });
      }, 2500);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  } catch (e) {}
})();
