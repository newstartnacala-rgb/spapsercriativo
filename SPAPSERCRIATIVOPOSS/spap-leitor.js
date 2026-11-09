/* SPAP — Leitor de códigos de barras em ecrã inteiro (o mesmo modelo da Banca).
   Uso: spapLeitor(function (codigo) { ... });  ·  spapLeitorFechar();
   1) leitor nativo do telemóvel (BarcodeDetector)  2) html5-qrcode  3) foto. */
(function () {
  var COR = '#a78bfa', COR2 = '#7c3aed';
  var css = ''
    + '#spap-leitor{position:fixed;inset:0;z-index:99999;background:#05070d;color:#fff;display:flex;flex-direction:column;font-family:"Segoe UI",-apple-system,system-ui,Roboto,Arial,sans-serif;animation:sl-ent .22s ease-out;}'
    + '@keyframes sl-ent{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:none}}'
    + '#spap-leitor .le-topo{display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top) + 14px) 16px 12px;}'
    + '#spap-leitor .le-topo b{font-size:18px;}'
    + '#spap-leitor .le-fechar{width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:18px;cursor:pointer;}'
    + '#spap-leitor .le-video{position:relative;flex:1;overflow:hidden;background:#000;}'
    + '#spap-leitor video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}'
    + '#spap-leitor #sl-html5{position:absolute !important;inset:0;width:100% !important;height:100% !important;border:0 !important;}'
    + '#spap-leitor #sl-html5 video{position:absolute;inset:0;width:100% !important;height:100% !important;object-fit:cover;}'
    + '#spap-leitor.le-js video:not(#sl-html5 video){display:none;}'
    + '#spap-leitor.le-js #sl-html5 #qr-shaded-region{border-color:rgba(0,0,0,.45) !important;}'
    + '#spap-leitor .le-mira{position:absolute;left:50%;top:50%;width:min(80vw,340px);height:min(44vw,190px);transform:translate(-50%,-50%);box-shadow:0 0 0 2000px rgba(0,0,0,.45);border-radius:16px;pointer-events:none;}'
    + '#spap-leitor.le-js .le-mira{box-shadow:none;}'
    + '#spap-leitor .le-mira i{position:absolute;width:34px;height:34px;border:4px solid ' + COR + ';}'
    + '#spap-leitor .le-mira .c1{left:-2px;top:-2px;border-right:0;border-bottom:0;border-top-left-radius:16px;}'
    + '#spap-leitor .le-mira .c2{right:-2px;top:-2px;border-left:0;border-bottom:0;border-top-right-radius:16px;}'
    + '#spap-leitor .le-mira .c3{left:-2px;bottom:-2px;border-right:0;border-top:0;border-bottom-left-radius:16px;}'
    + '#spap-leitor .le-mira .c4{right:-2px;bottom:-2px;border-left:0;border-top:0;border-bottom-right-radius:16px;}'
    + '#spap-leitor .le-laser{position:absolute;left:6%;right:6%;top:50%;height:2px;background:linear-gradient(90deg,transparent,#ff3b30,transparent);box-shadow:0 0 12px 2px rgba(255,59,48,.7);animation:sl-laser 1.8s ease-in-out infinite;}'
    + '@keyframes sl-laser{0%,100%{top:12%}50%{top:88%}}'
    + '#spap-leitor.le-ok .le-mira i{border-color:#22c55e;} #spap-leitor.le-ok .le-laser{background:#22c55e;box-shadow:0 0 16px 4px rgba(34,197,94,.8);animation:none;top:50%;}'
    + '#spap-leitor.le-erro .le-laser{display:none;}'
    + '#spap-leitor .le-dica{text-align:center;padding:14px 18px 6px;font-size:14.5px;color:#e2e8f0;line-height:1.45;}'
    + '#spap-leitor .le-botoes{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding:8px 16px calc(env(safe-area-inset-bottom) + 18px);}'
    + '#spap-leitor .le-botoes button{border:0;border-radius:999px;padding:12px 18px;font-weight:800;font-size:14.5px;font-family:inherit;color:#fff;background:rgba(255,255,255,.14);cursor:pointer;}'
    + '#spap-leitor .le-botoes .le-foto{background:linear-gradient(180deg,' + COR + ',' + COR2 + ');}'
    + '#spap-leitor .le-botoes .le-sec{background:rgba(255,255,255,.14) !important;}'
    + '#spap-leitor .le-luz.on{background:#fbbf24;color:#111;}'
    + 'html.escuro #spap-leitor{filter:invert(1) hue-rotate(180deg) !important;} html.escuro #spap-leitor video{filter:none !important;}';
  function estilo() { if (document.getElementById('spap-leitor-css')) return; var st = document.createElement('style'); st.id = 'spap-leitor-css'; st.textContent = css; document.head.appendChild(st); }
  function aviso(t, erro) { try { if (window.mostrarNotif) return mostrarNotif(t, !!erro); if (window.toast) return toast(t, erro ? 'erro' : 'ok'); } catch (e) {} }
  function formatosH5() {
    var F = window.Html5QrcodeSupportedFormats; if (!F) return null;
    return [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.CODE_93, F.ITF, F.CODABAR, F.QR_CODE];
  }
  var FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar', 'qr_code'];
  var _fim = null;

  window.spapLeitorFechar = function () { if (_fim) _fim(); };

  window.spapLeitor = function (aoLer, titulo) {
    estilo(); if (_fim) _fim();
    var ov = document.createElement('div'); ov.id = 'spap-leitor'; ov.className = 'notranslate';
    ov.innerHTML = '<div class="le-topo"><b>' + (titulo || 'Ler código de barras') + '</b><button type="button" class="le-fechar" aria-label="Fechar">✕</button></div>'
      + '<div class="le-video"><video playsinline muted autoplay></video><div id="sl-html5"></div>'
      + '<div class="le-mira"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><span class="le-laser"></span></div></div>'
      + '<div class="le-dica">Aponta para o código de barras, dentro da moldura</div>'
      + '<div class="le-botoes"><button type="button" class="le-luz" hidden>🔦 Lanterna</button><button type="button" class="le-foto">📷 Ler a partir de uma foto</button></div>';
    document.body.appendChild(ov);
    var video = ov.querySelector('video'), dica = ov.querySelector('.le-dica'), fluxo = null, parar = false, h5 = null, lido = false;
    function fim() {
      parar = true; _fim = null;
      try { if (fluxo) fluxo.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      try { if (h5) h5.stop().then(function () { try { h5.clear(); } catch (e) {} }).catch(function () {}); } catch (e) {}
      ov.remove();
    }
    _fim = fim;
    function sucesso(code) {
      if (lido) return; lido = true;
      try { navigator.vibrate && navigator.vibrate(80); } catch (e) {}
      try { var ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 1250; g.gain.value = .12; o.connect(g); g.connect(ac.destination); o.start(); setTimeout(function () { o.stop(); ac.close(); }, 120); } catch (e) {}
      ov.classList.add('le-ok'); setTimeout(function () { fim(); aoLer(String(code).trim()); }, 220);
    }
    ov.querySelector('.le-fechar').onclick = fim;
    ov.querySelector('.le-foto').onclick = function () { fim(); spapLerPorFoto(aoLer); };
    function semCamara(e) {
      if (parar) return;
      var negado = e && /NotAllowed|Permission|denied/i.test((e.name || '') + (e.message || ''));
      var naApp = /SPAPApp/i.test(navigator.userAgent || '') || !!window.SPAPNative;
      dica.innerHTML = naApp
        ? '⚠️ Esta versão da app ainda não deixa usar a câmara. Toca em «Atualizar a app», instala e volta a abrir — ou lê a partir de uma foto.'
        : (negado ? '⚠️ A câmara não foi autorizada. Toca no cadeado ao lado do endereço, permite a câmara e tenta de novo — ou lê a partir de uma foto.' : '⚠️ Não foi possível abrir a câmara deste aparelho. Lê a partir de uma foto.');
      ov.classList.add('le-erro');
      if (naApp && window.spapInstalarApp) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'le-sec'; bt.textContent = 'Atualizar a app';
        bt.onclick = function () { fim(); spapInstalarApp('android'); };
        ov.querySelector('.le-botoes').appendChild(bt);
      }
    }
    function comNativo() {
      var det;
      try { det = new BarcodeDetector({ formats: FORMATOS }); } catch (e) { return comHtml5(); }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then(function (s) {
          if (parar) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
          fluxo = s; video.srcObject = s; video.play().catch(function () {});
          try {
            var tr = s.getVideoTracks()[0], cap = tr.getCapabilities ? tr.getCapabilities() : {};
            if (cap.torch) { var bl = ov.querySelector('.le-luz'), on = false; bl.hidden = false; bl.onclick = function () { on = !on; tr.applyConstraints({ advanced: [{ torch: on }] }).catch(function () {}); bl.classList.toggle('on', on); }; }
            if (cap.focusMode && cap.focusMode.indexOf('continuous') >= 0) tr.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(function () {});
          } catch (e) {}
          (function ciclo() {
            if (parar || lido) return;
            if (video.readyState >= 2) det.detect(video).then(function (r) { if (r && r.length) sucesso(r[0].rawValue); else setTimeout(ciclo, 120); }).catch(function () { setTimeout(ciclo, 250); });
            else setTimeout(ciclo, 120);
          })();
        }).catch(semCamara);
    }
    function comHtml5() {
      if (typeof Html5Qrcode === 'undefined') return semCamara();
      ov.classList.add('le-js');
      var cfg = { fps: 15, qrbox: function (w, h) { var lw = Math.max(160, Math.min(w * .82, 360)); var lh = Math.max(90, Math.min(h * .5, lw * .55)); return { width: Math.round(Math.min(lw, Math.max(w, 160))), height: Math.round(Math.min(lh, Math.max(h, 90))) }; } };
      var f = formatosH5();
      try { h5 = f ? new Html5Qrcode('sl-html5', { formatsToSupport: f, experimentalFeatures: { useBarCodeDetectorIfSupported: true }, verbose: false }) : new Html5Qrcode('sl-html5'); }
      catch (e) { h5 = new Html5Qrcode('sl-html5'); }
      h5.start({ facingMode: 'environment' }, cfg, sucesso, function () {})
        .catch(function () {
          return Html5Qrcode.getCameras().then(function (cams) {
            if (!cams || !cams.length) throw new Error('sem câmara');
            var c = cams.filter(function (x) { return /back|rear|traseira|environment|trás/i.test(x.label || ''); })[0] || cams[cams.length - 1];
            return h5.start(c.id, cfg, sucesso, function () {});
          });
        }).catch(semCamara);
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return semCamara();
    if ('BarcodeDetector' in window && BarcodeDetector.getSupportedFormats) {
      BarcodeDetector.getSupportedFormats().then(function (f) { if (f && f.indexOf('ean_13') >= 0) comNativo(); else comHtml5(); }).catch(comHtml5);
    } else comHtml5();
  };

  // Leitura a partir de uma foto (resolução máxima da câmara)
  window.spapLerPorFoto = function (cb) {
    if (typeof Html5Qrcode === 'undefined') { aviso('❌ Leitor indisponível. Verifica a internet.', true); return; }
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment'); inp.style.display = 'none';
    var caixa = document.getElementById('spap-leitor-foto');
    if (!caixa) { caixa = document.createElement('div'); caixa.id = 'spap-leitor-foto'; caixa.style.cssText = 'position:fixed;left:-9999px;top:0;width:600px;'; document.body.appendChild(caixa); }
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      aviso('🔍 A ler o código…');
      var fm = formatosH5(), l = fm ? new Html5Qrcode('spap-leitor-foto', { formatsToSupport: fm, verbose: false }) : new Html5Qrcode('spap-leitor-foto');
      var p = l.scanFileV2 ? l.scanFileV2(f, false).then(function (r) { return r.decodedText; }) : l.scanFile(f, false);
      p.catch(function () { return l.scanFile(f, false); })
        .then(function (code) { try { l.clear(); } catch (e) {} cb(String(code).trim()); })
        .catch(function () { aviso('❌ Não deu para ler o código. Tira outra foto, de perto e com boa luz.', true); });
    };
    document.body.appendChild(inp);
    inp.click();
  };
})();
