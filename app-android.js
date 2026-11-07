/* SPAP — convite para instalar a app Android (só aparece no Android, no navegador; nunca no computador nem dentro da app) */
(function () {
  try {
    var ua = navigator.userAgent || '';
    if (!/android/i.test(ua) || /SPAPApp/i.test(ua) || window.SPAP_APP_NATIVA) return;
    var tipo = /monitor/i.test(location.pathname) ? 'monitor' : 'loja';
    var nome = tipo === 'monitor' ? 'SPAP Monitor' : 'SPAP Loja';
    var apk = 'apps/' + (tipo === 'monitor' ? 'SPAP-Monitor.apk' : 'SPAP-Loja.apk');
    var chave = 'spap_apk_convite_' + tipo;
    try { var t = +localStorage.getItem(chave) || 0; if (Date.now() - t < 3 * 864e5) return; } catch (e) {}

    var css = '#apk-convite{position:fixed;inset:0;z-index:100001;background:rgba(2,6,23,.55);display:flex;align-items:flex-end;justify-content:center;animation:apkF .2s ease;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}'
      + '#apk-convite .ak{position:relative;background:#fff;width:100%;max-width:480px;border-radius:26px 26px 0 0;padding:26px 20px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px rgba(2,6,23,.3);animation:apkS .35s cubic-bezier(.2,.9,.3,1);overflow:hidden;text-align:center}'
      + '#apk-convite .ak::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#16a34a,#f5c542)}'
      + '#apk-convite .ak::after{content:"";position:absolute;top:10px;left:50%;width:44px;height:5px;margin-left:-22px;border-radius:5px;background:#cbd5e1}'
      + '#apk-convite .ak-ico{width:84px;height:84px;border-radius:22px;margin:6px auto 12px;box-shadow:0 10px 26px rgba(0,0,0,.18);overflow:hidden;background:#fff;animation:apkB 2.6s ease-in-out infinite}'
      + '#apk-convite .ak-ico img{width:100%;height:100%;object-fit:cover;display:block}'
      + '#apk-convite h3{margin:0 0 6px;font-size:20px;color:#0f172a;font-weight:800}'
      + '#apk-convite p{margin:0 0 14px;font-size:14px;color:#475569;line-height:1.45}'
      + '#apk-convite .ak-van{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:0 0 16px}'
      + '#apk-convite .ak-van span{font-size:12px;font-weight:700;color:#166534;background:#ecfdf5;border:1px solid #bbf7d0;padding:6px 10px;border-radius:999px}'
      + '#apk-convite .ak-sim{display:block;width:100%;box-sizing:border-box;text-decoration:none;border:none;border-radius:16px;padding:15px;font-size:16px;font-weight:800;color:#fff;background:linear-gradient(180deg,#22c55e,#15803d);box-shadow:0 10px 24px rgba(22,163,74,.32);cursor:pointer}'
      + '#apk-convite .ak-nao{display:block;width:100%;border:none;background:none;color:#64748b;font-size:14px;padding:13px 0 2px;cursor:pointer}'
      + '#apk-convite ol{text-align:left;margin:4px 0 16px;padding:0;list-style:none;counter-reset:p}'
      + '#apk-convite ol li{counter-increment:p;display:flex;gap:10px;align-items:flex-start;padding:9px 0;font-size:14px;color:#1e293b;border-bottom:1px solid #f1f5f9}'
      + '#apk-convite ol li::before{content:counter(p);flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#16a34a;color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}'
      + '@keyframes apkF{from{opacity:0}}@keyframes apkS{from{transform:translateY(100%)}}@keyframes apkB{50%{transform:translateY(-4px)}}';

    function mostrar(versao) {
      if (document.getElementById('apk-convite')) return;
      var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      var el = document.createElement('div'); el.id = 'apk-convite';
      el.innerHTML = '<div class="ak"><div class="ak-ico"><img src="apps/icon-' + tipo + '.png" alt=""></div>'
        + '<h3>Instale a app ' + nome + '</h3>'
        + '<p>Use o ' + (tipo === 'monitor' ? 'Monitor' : 'sistema da Loja') + ' como uma app no seu telemóvel' + (versao ? ' (versão ' + versao + ')' : '') + '.</p>'
        + '<div class="ak-van"><span>⚡ Mais rápida</span><span>📲 Ícone no ecrã</span><span>🔄 Atualiza sozinha</span></div>'
        + '<a class="ak-sim" href="' + apk + '" download>Baixar e instalar</a>'
        + '<button class="ak-nao" type="button">Agora não</button></div>';
      function fechar() { try { localStorage.setItem(chave, String(Date.now())); } catch (e) {} el.remove(); }
      el.querySelector('.ak-nao').onclick = fechar;
      el.addEventListener('click', function (e) { if (e.target === el) fechar(); });
      el.querySelector('.ak-sim').onclick = function () {
        try { localStorage.setItem(chave, String(Date.now())); } catch (e) {}
        var box = el.querySelector('.ak');
        setTimeout(function () {
          box.innerHTML = '<div class="ak-ico"><img src="apps/icon-' + tipo + '.png" alt=""></div><h3>A baixar a app…</h3>'
            + '<ol><li><span>Quando terminar, toque na notificação ou abra o ficheiro <b>' + apk.split('/')[1] + '</b>.</span></li>'
            + '<li><span>Toque em <b>Instalar</b>. Se o Android pedir, permita <b>«desta fonte»</b>.</span></li>'
            + '<li><span>Abra a app <b>' + nome + '</b> no ecrã inicial.</span></li></ol>'
            + '<button class="ak-sim" type="button">Entendi</button>';
          box.querySelector('.ak-sim').onclick = function () { el.remove(); };
        }, 400);
      };
      document.body.appendChild(el);
    }
    function iniciar() {
      setTimeout(function () {
        fetch('apps/app-version.json?t=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { if (d && d.versao) mostrar(d.versao); })
          .catch(function () {});
      }, 2500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  } catch (e) {}
})();
