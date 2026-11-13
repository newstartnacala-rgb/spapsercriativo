/* SPAP — Interface Dourada do Ponto de Venda da Loja (modo moderno).
   • Definições → «Personalizar interface»: escolhe entre a interface Clássica (verde, a de sempre)
     e a interface Dourada, em duas versões: Noite (escura) e Marfim (clara).
   • Fica guardado neste aparelho (localStorage «pdv_m2_interface»).
   • A interface dourada não mexe na lógica das vendas: só muda o aspeto e junta informação útil
     (relógio, resumo do catálogo, stock em cada produto, resumo do carrinho e barra de atalhos). */
(function () {
  'use strict';
  var CHAVE = 'pdv_m2_interface';
  var OPCOES = ['classica', 'noite', 'marfim'];
  function ler() { var v = ''; try { v = localStorage.getItem(CHAVE) || ''; } catch (e) {} return OPCOES.indexOf(v) >= 0 ? v : 'classica'; }
  function gravar(v) { try { localStorage.setItem(CHAVE, v); } catch (e) {} }
  var CHAVE_V = 'pdv_m2_vidro';
  function lerVidro() { if (window.spapVidro) return window.spapVidro.ligado(); try { return localStorage.getItem(CHAVE_V) === '1'; } catch (e) { return false; } }
  function gravarVidro(v) { try { localStorage.setItem(CHAVE_V, v ? '1' : '0'); } catch (e) {} }
  function aplicarVidro(v) { if (v === undefined) v = lerVidro(); estilos(); if (window.spapVidro) { window.spapVidro.definir(!!v); return; } gravarVidro(v); if (document.body) document.body.classList.toggle('gv', !!v); }
  window.spapVidroAplicar = aplicarVidro;
  function el(id) { return document.getElementById(id); }
  function money(v) { try { if (typeof _m2Money === 'function') return _m2Money(v); } catch (e) {} return 'MT ' + (Number(v) || 0).toFixed(2).replace('.', ','); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var SVG = function (p, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 18) + '" height="' + (w || 18) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };
  var IC = {
    paleta: '<circle cx="13.5" cy="6.5" r="1.3"/><circle cx="17.5" cy="10.5" r="1.3"/><circle cx="8.5" cy="7.5" r="1.3"/><circle cx="6.5" cy="12.5" r="1.3"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A5.7 5.7 0 0 0 22 9.7C22 5.4 17.5 2 12 2z"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    caixa: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    carro: '<circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M3 4h2l2.4 12.4a1.5 1.5 0 0 0 1.5 1.1h9.3a1.5 1.5 0 0 0 1.5-1.2L23 7H6"/>',
    tags: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
    ok: '<path d="M5 12.5 10 17l9-10"/>',
    escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
  };

  /* ---------------- Estilos ---------------- */
  var CSS = [
    /* variáveis por versão */
    'body.modo2.gd{--gd1:#f6dc8c;--gd2:#d4a73c;--gd3:#9c7424;--gd-grad:linear-gradient(135deg,#f9e29a 0%,#d9ad45 45%,#a77a26 100%);--gd-txt:linear-gradient(180deg,#fbe7a6,#d6a940 60%,#b4852c);',
    '  --gd-fundo:#0a0a0c;--gd-sup:#121215;--gd-sup2:#17171b;--gd-sup3:#1e1e23;--gd-borda:rgba(212,167,60,.16);--gd-borda2:rgba(255,255,255,.06);--gd-tx:#f3efe6;--gd-tx2:#a8a294;--gd-tx3:#6f6a60;--gd-escrita:#1a1306;--gd-sombra:0 18px 40px rgba(0,0,0,.45);}',
    'body.modo2.gd.gd-marfim{--gd-fundo:#f7f3ea;--gd-sup:#ffffff;--gd-sup2:#ffffff;--gd-sup3:#f8f4ea;--gd-borda:rgba(176,132,44,.22);--gd-borda2:#eee6d4;--gd-tx:#1f1a10;--gd-tx2:#6b6150;--gd-tx3:#a39985;--gd-sombra:0 14px 34px rgba(120,90,30,.12);',
    '  --gd-txt:linear-gradient(180deg,#c8962f,#8f6516);}',
    /* fundo e topo */
    'body.modo2.gd #modo2-app{background:radial-gradient(900px 420px at 85% -10%,rgba(212,167,60,.13),transparent 60%),radial-gradient(700px 380px at -10% 110%,rgba(212,167,60,.08),transparent 60%),var(--gd-fundo) !important;color:var(--gd-tx);}',
    'body.modo2.gd #m2-topbar{background:color-mix(in srgb,var(--gd-sup) 92%,transparent) !important;border-bottom:1px solid var(--gd-borda) !important;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 1px 0 rgba(212,167,60,.08);}',
    'body.modo2.gd #m2-topbar::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,rgba(232,195,106,.55),transparent);pointer-events:none;}',
    'body.modo2.gd #m2-topbar .m2-menu-btn{background:var(--gd-grad) !important;color:var(--gd-escrita) !important;box-shadow:0 6px 16px rgba(180,133,44,.35),inset 0 1px 0 rgba(255,255,255,.45) !important;}',
    'body.modo2.gd #m2-topbar .m2-busca input{background:var(--gd-sup3) !important;border:1px solid var(--gd-borda2) !important;color:var(--gd-tx) !important;border-radius:12px;}',
    'body.modo2.gd #m2-topbar .m2-busca input::placeholder,body.modo2.gd #m2-subrow input::placeholder{color:var(--gd-tx3);}',
    'body.modo2.gd #m2-topbar .m2-busca input:focus,body.modo2.gd #m2-subrow input:focus{outline:0;border-color:var(--gd2) !important;box-shadow:0 0 0 4px rgba(212,167,60,.14);}',
    'body.modo2.gd #m2-topbar .m2-busca .lupa,body.modo2.gd #m2-topbar .m2-busca .barra{color:var(--gd2) !important;}',
    'body.modo2.gd #m2-topbar .m2-loja{background:var(--gd-sup2) !important;border:1px solid var(--gd-borda) !important;color:var(--gd-tx) !important;}',
    'body.modo2.gd #m2-topbar .m2-loja svg{color:var(--gd2);}',
    'body.modo2.gd #m2-topbar .m2-user .m2-atualizar{background:var(--gd-sup3) !important;color:var(--gd1) !important;border:1px solid var(--gd-borda) !important;box-shadow:none !important;}',
    'body.modo2.gd.gd-marfim #m2-topbar .m2-user .m2-atualizar{color:var(--gd3) !important;}',
    'body.modo2.gd #m2-topbar .m2-user .m2-atualizar:hover{background:var(--gd-grad) !important;color:var(--gd-escrita) !important;}',
    'body.modo2.gd #m2-topbar .m2-user span.m2-edit-nome{color:var(--gd-tx) !important;}',
    'body.modo2.gd:not(.gd-marfim) #banner-offline:not(.np-fraco):not(.np-sem){background:rgba(34,197,94,.1) !important;border-color:rgba(34,197,94,.35) !important;color:#4ade80 !important;}',
    'body.modo2.gd #m2-topbar .m2-user span.m2-edit-nome:hover{background:var(--gd-sup3) !important;border-color:var(--gd-borda) !important;}',
    /* cabeçalho */
    'body.modo2.gd #m2-cabecalho{gap:16px;}',
    'body.modo2.gd #m2-cabecalho .m2-cab-ico{background:var(--gd-grad) !important;box-shadow:0 10px 24px rgba(180,133,44,.35),inset 0 1px 0 rgba(255,255,255,.5);border-radius:15px;}',
    'body.modo2.gd #m2-cabecalho .m2-cab-ico svg{color:var(--gd-escrita) !important;}',
    'body.modo2.gd #m2-cabecalho h1{background:var(--gd-txt);-webkit-background-clip:text;background-clip:text;color:transparent !important;letter-spacing:2.2px;font-size:22px;}',
    'body.modo2.gd #m2-cabecalho p{color:var(--gd-tx2) !important;}',
    '#gd-cab-extra{display:none;}',
    'body.modo2.gd #gd-cab-extra{display:flex;align-items:center;gap:10px;margin-left:auto;}',
    '.gd-kpi{display:flex;align-items:center;gap:10px;padding:8px 14px 8px 9px;border-radius:14px;background:var(--gd-sup);border:1px solid var(--gd-borda);box-shadow:var(--gd-sombra);min-width:0;}',
    '.gd-kpi .gk-ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(212,167,60,.12);color:var(--gd2);flex-shrink:0;}',
    '.gd-kpi.alerta .gk-ic{background:rgba(239,68,68,.12);color:#f87171;}',
    '.gd-kpi small{display:block;font-size:10.5px;color:var(--gd-tx2);font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;}',
    '.gd-kpi b{display:block;font-size:15px;font-weight:800;color:var(--gd-tx);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.gd-kpi.relogio b{font-size:17px;letter-spacing:.02em;}',
    /* painel e categorias */
    'body.modo2.gd #m2-painel,body.modo2.gd #m2-cart{background:var(--gd-sup) !important;border:1px solid var(--gd-borda) !important;box-shadow:var(--gd-sombra) !important;border-radius:20px !important;}',
    'body.modo2.gd #m2-subrow input{background:var(--gd-sup3) !important;border:1px solid var(--gd-borda2) !important;color:var(--gd-tx) !important;border-radius:12px !important;}',
    'body.modo2.gd .m2-cat-btn{background:var(--gd-sup3) !important;border:1px solid var(--gd-borda) !important;color:var(--gd-tx) !important;border-radius:12px !important;}',
    'body.modo2.gd .m2-cat-btn:hover{border-color:var(--gd2) !important;}',
    'body.modo2.gd .m2-cat-btn svg{color:var(--gd2);}',
    'body.modo2.gd .m2-cat-menu{background:var(--gd-sup2) !important;border:1px solid var(--gd-borda) !important;box-shadow:0 20px 50px rgba(0,0,0,.4) !important;}',
    'body.modo2.gd .m2-cat-menu .m2-cat-item{color:var(--gd-tx) !important;}',
    'body.modo2.gd .m2-cat-menu .m2-cat-item:hover{background:rgba(212,167,60,.1) !important;}',
    'body.modo2.gd .m2-cat-item.ativo{background:var(--gd-grad) !important;color:var(--gd-escrita) !important;}',
    '#gd-info-lista{display:none;}',
    'body.modo2.gd #gd-info-lista{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:-4px 2px 12px;font-size:12px;font-weight:700;color:var(--gd-tx2);flex-shrink:0;}',
    'body.modo2.gd #gd-info-lista em{font-style:normal;color:var(--gd2);}',
    /* cartões de produto */
    'body.modo2.gd #m2-grid{gap:14px;}',
    'body.modo2.gd .m2-card{background:var(--gd-sup2) !important;border:1px solid var(--gd-borda2) !important;border-radius:16px !important;text-align:left;padding:10px 10px 12px;}',
    'body.modo2.gd .m2-card:hover{border-color:rgba(212,167,60,.55) !important;box-shadow:0 14px 30px rgba(0,0,0,.35),0 0 0 1px rgba(212,167,60,.25) !important;}',
    'body.modo2.gd.gd-marfim .m2-card:hover{box-shadow:0 14px 28px rgba(120,90,30,.14),0 0 0 1px rgba(212,167,60,.3) !important;}',
    'body.modo2.gd .m2-card .m2-img{background:radial-gradient(circle at 50% 40%,var(--gd-sup3),color-mix(in srgb,var(--gd-sup3) 70%,#000 4%)) !important;border-radius:12px !important;}',
    'body.modo2.gd.gd-marfim .m2-card .m2-img{background:linear-gradient(180deg,#fbf8f1,#f2ecdf) !important;}',
    'body.modo2.gd .m2-card .m2-nome{color:var(--gd-tx) !important;font-weight:700;min-height:34px;}',
    'body.modo2.gd .m2-card .m2-preco{background:var(--gd-txt);-webkit-background-clip:text;background-clip:text;color:transparent !important;font-size:16px;font-weight:800;}',
    'body.modo2.gd .m2-card .m2-preco small{-webkit-text-fill-color:var(--gd-tx2);}',
    'body.modo2.gd .m2-card .m2-add{background:var(--gd-grad) !important;color:var(--gd-escrita) !important;border-radius:11px !important;box-shadow:0 6px 14px rgba(180,133,44,.35),inset 0 1px 0 rgba(255,255,255,.45);}',
    'body.modo2.gd .m2-card.toque::after{background:var(--gd-grad) !important;color:var(--gd-escrita) !important;}',
    '.gd-st{display:none;}',
    'body.modo2.gd .gd-st{display:inline-flex;position:absolute;left:18px;top:18px;z-index:1;align-items:center;gap:5px;padding:3px 8px;border-radius:7px;font-size:10.5px;font-weight:800;letter-spacing:.02em;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);}',
    'body.modo2.gd .gd-st.ok{background:rgba(34,197,94,.14);color:#4ade80;}',
    'body.modo2.gd .gd-st.bx{background:rgba(245,158,11,.16);color:#fbbf24;}',
    'body.modo2.gd .gd-st.zero{background:rgba(239,68,68,.16);color:#f87171;}',
    'body.modo2.gd.gd-marfim .gd-st.ok{color:#15803d;background:#dcfce7;} body.modo2.gd.gd-marfim .gd-st.bx{color:#b45309;background:#fef3c7;} body.modo2.gd.gd-marfim .gd-st.zero{color:#b91c1c;background:#fee2e2;}',
    '.gd-noc{display:none;}',
    'body.modo2.gd .gd-noc{display:grid;place-items:center;position:absolute;right:18px;top:18px;z-index:1;min-width:24px;height:24px;padding:0 7px;border-radius:99px;background:var(--gd-grad);color:var(--gd-escrita);font-size:12px;font-weight:800;box-shadow:0 4px 10px rgba(180,133,44,.4);}',
    'body.modo2.gd .gd-cod{display:block;font-size:10.5px;color:var(--gd-tx3);font-weight:600;margin:-2px 0 6px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.gd-cod{display:none;}',
    /* carrinho */
    'body.modo2.gd #m2-cart .m2-cart-top{border-bottom:1px solid var(--gd-borda2) !important;}',
    'body.modo2.gd #m2-cart .m2-cart-top b{color:var(--gd-tx) !important;}',
    'body.modo2.gd #m2-cart .m2-cart-top b svg{color:var(--gd2);}',
    '#gd-cart-resumo{display:none;}',
    'body.modo2.gd #gd-cart-resumo{display:block;font-size:11.5px;font-weight:700;color:var(--gd-tx2);margin-top:3px;}',
    'body.modo2.gd #m2-cart .m2-limpar{color:var(--gd-tx2) !important;border-radius:9px;padding:6px 10px;}',
    'body.modo2.gd #m2-cart .m2-limpar:hover{background:rgba(239,68,68,.12);color:#f87171 !important;}',
    'body.modo2.gd #m2-cart .m2-item{border-bottom:1px solid var(--gd-borda2) !important;}',
    'body.modo2.gd #m2-cart .m2-item .m2-it-img{background:var(--gd-sup3) !important;border-radius:10px;}',
    'body.modo2.gd #m2-cart .m2-item .m2-it-nome,body.modo2.gd #m2-cart .m2-item .m2-it-tot{color:var(--gd-tx) !important;}',
    'body.modo2.gd #m2-cart .m2-item .m2-it-preco{color:var(--gd-tx2) !important;}',
    'body.modo2.gd #m2-cart .m2-item .m2-step button{background:var(--gd-sup3) !important;border:1px solid var(--gd-borda) !important;color:var(--gd-tx) !important;}',
    'body.modo2.gd #m2-cart .m2-item .m2-step button:hover{border-color:var(--gd2) !important;color:var(--gd2) !important;}',
    'body.modo2.gd #m2-cart .m2-item .m2-step span{color:var(--gd-tx);}',
    'body.modo2.gd #m2-cart .m2-item .m2-x{color:var(--gd-tx3) !important;}',
    'body.modo2.gd #m2-cart .m2-item .m2-x:hover{color:#f87171 !important;}',
    'body.modo2.gd #m2-cart .m2-vazio{color:var(--gd-tx2) !important;}',
    'body.modo2.gd #m2-cart .m2-cart-fundo{border-top:1px solid var(--gd-borda2) !important;background:color-mix(in srgb,var(--gd-sup) 85%,var(--gd-fundo));}',
    'body.modo2.gd #m2-cart .m2-linha{color:var(--gd-tx2) !important;}',
    'body.modo2.gd #m2-cart .m2-linha span:last-child{color:var(--gd-tx);font-weight:700;font-variant-numeric:tabular-nums;}',
    'body.modo2.gd #m2-cart .m2-total-box{background:linear-gradient(135deg,rgba(249,226,154,.12),rgba(167,122,38,.08)) !important;border:1px solid rgba(212,167,60,.35);border-radius:14px !important;}',
    'body.modo2.gd #m2-cart .m2-total-box b{color:var(--gd-tx) !important;letter-spacing:.06em;text-transform:uppercase;font-size:13px !important;}',
    'body.modo2.gd #m2-cart .m2-total-box .v{background:var(--gd-txt);-webkit-background-clip:text;background-clip:text;color:transparent !important;font-size:27px !important;font-weight:800;letter-spacing:-.01em;font-variant-numeric:tabular-nums;}',
    'body.modo2.gd #m2-cart .m2-finalizar{background:var(--gd-grad) !important;color:var(--gd-escrita) !important;border-radius:14px !important;box-shadow:0 10px 24px rgba(180,133,44,.38),inset 0 1px 0 rgba(255,255,255,.5) !important;letter-spacing:.02em;}',
    'body.modo2.gd #m2-cart .m2-finalizar:hover{filter:brightness(1.06);box-shadow:0 14px 30px rgba(180,133,44,.48),inset 0 1px 0 rgba(255,255,255,.5) !important;}',
    'body.modo2.gd #m2-cart .m2-guardar{background:transparent !important;color:var(--gd-tx) !important;border:1px solid var(--gd-borda) !important;border-radius:14px !important;}',
    'body.modo2.gd #m2-cart .m2-guardar:hover{border-color:var(--gd2) !important;color:var(--gd2) !important;}',
    'body.modo2.gd .m2-pop{color:var(--gd2);}',
    'body.modo2.gd .m2-voar{background:var(--gd-sup3) !important;box-shadow:0 10px 24px rgba(0,0,0,.4),0 0 0 2px rgba(212,167,60,.5) !important;}',
    /* barra de atalhos (rodapé) */
    '#gd-rodape{display:none !important;}',
    'body.modo2.gd #gd-rodape{display:flex;align-items:center;gap:16px;flex-shrink:0;height:36px;padding:0 22px;background:var(--gd-sup);border-top:1px solid var(--gd-borda);font-size:11.5px;font-weight:700;color:var(--gd-tx2);overflow:hidden;white-space:nowrap;}',
    '#gd-rodape kbd{font-family:inherit;font-size:10.5px;font-weight:800;line-height:1;padding:4px 6px;border-radius:6px;background:var(--gd-sup3);border:1px solid var(--gd-borda);color:var(--gd2);margin-right:5px;}',
    '#gd-rodape .gr-dir{margin-left:auto;display:flex;align-items:center;gap:14px;}',
    '#gd-rodape .gr-on{display:flex;align-items:center;gap:6px;}',
    '#gd-rodape .gr-on i{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18);}',
    '#gd-rodape .gr-on.off i{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.18);}',
    '#gd-rodape .gr-selo{display:flex;align-items:center;gap:6px;color:var(--gd2);}',
    /* gaveta (menu) com toque dourado */
    'body.modo2.gd #m2-sidebar .m2-nav.ativo{border-color:rgba(232,195,106,.5) !important;}',
    'body.modo2.gd #m2-sidebar .m2-status b{color:#f6dc8c;}',
    'body.modo2.gd .btn-modal-salvar{background:var(--gd-grad) !important;color:var(--gd-escrita) !important;box-shadow:0 8px 20px rgba(180,133,44,.3) !important;}',
    /* quando dourado: a escolha de modo/cor não se aplica */
    'body.modo2 .m2-modo-switch,body.modo2 #m2-temas,body.modo2 .gd-esc-tit{display:none !important;}',
    '.gd-nota-def{display:none !important;}',
    'body.modo2.gd .gd-nota-def{display:block;margin:2px 12px 6px 18px;font-size:11.5px;line-height:1.45;color:rgba(246,220,140,.8);font-weight:600;}',
    /* entrada «Personalizar» nas Definições */
    '#m2-sidebar .m2-nav.gd-entrada{background:linear-gradient(135deg,rgba(249,226,154,.16),rgba(167,122,38,.1)) !important;border:1px solid rgba(232,195,106,.35) !important;color:#fbe7a6 !important;margin-left:8px;}',
    '#m2-sidebar .m2-nav.gd-entrada:hover{background:linear-gradient(135deg,rgba(249,226,154,.26),rgba(167,122,38,.16)) !important;}',
    '#m2-sidebar .m2-nav.gd-entrada .gd-atual{margin-left:auto;font-size:10.5px;font-weight:800;padding:3px 7px;border-radius:6px;background:rgba(255,255,255,.12);color:#fff;}',
    /* janela Personalizar */
    '#gd-pers{position:fixed;inset:0;z-index:100050;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,6,10,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .2s;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}',
    '#gd-pers.on{opacity:1;}',
    '#gd-pers .gp-caixa{width:100%;max-width:860px;max-height:92vh;max-height:92dvh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.4);transform:translateY(14px) scale(.98);transition:transform .28s cubic-bezier(.2,.9,.3,1);color:#0f172a;}',
    '#gd-pers.on .gp-caixa{transform:none;}',
    '#gd-pers .gp-cab{display:flex;align-items:center;gap:14px;padding:20px 22px 6px;}',
    '#gd-pers .gp-cab .gp-ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#f9e29a,#d9ad45 45%,#a77a26);color:#1a1306;box-shadow:0 8px 18px rgba(180,133,44,.35);}',
    '#gd-pers .gp-cab b{display:block;font-size:19px;font-weight:800;}',
    '#gd-pers .gp-cab small{display:block;font-size:13px;color:#64748b;font-weight:500;margin-top:2px;}',
    '#gd-pers .gp-ic-img{background:none !important;box-shadow:none !important;} #gd-pers .gp-ic-img img{width:46px;height:46px;filter:drop-shadow(0 6px 12px rgba(124,92,255,.35));}',
    '#gd-pers .gp-x{margin-left:auto;width:38px;height:38px;border-radius:12px;border:0;background:#f1f5f9;color:#334155;font-size:16px;font-weight:800;cursor:pointer;}',
    '#gd-pers .gp-ops{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:16px 22px 8px;}',
    '@media(max-width:760px){#gd-pers .gp-ops{grid-template-columns:1fr;}}',
    '#gd-pers .gp-op{position:relative;text-align:left;border:2px solid #e5e9f0;border-radius:18px;padding:10px;background:#fff;cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s,box-shadow .15s;}',
    '#gd-pers .gp-op:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(15,23,42,.1);}',
    '#gd-pers .gp-op.sel{border-color:#c99a35;box-shadow:0 0 0 4px rgba(212,167,60,.18);}',
    '#gd-pers .gp-op.sel[data-i="classica"]{border-color:#16a34a;box-shadow:0 0 0 4px rgba(22,163,74,.15);}',
    '#gd-pers .gp-ok{position:absolute;top:18px;right:18px;width:26px;height:26px;border-radius:50%;display:none;place-items:center;background:linear-gradient(135deg,#f9e29a,#c99a35);color:#1a1306;box-shadow:0 4px 10px rgba(0,0,0,.25);z-index:2;}',
    '#gd-pers .gp-op[data-i="classica"] .gp-ok{background:#16a34a;color:#fff;}',
    '#gd-pers .gp-op.sel .gp-ok{display:grid;}',
    '#gd-pers .gp-nome{display:flex;align-items:center;gap:8px;margin:12px 4px 2px;font-size:15px;font-weight:800;}',
    '#gd-pers .gp-nome em{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.06em;padding:3px 7px;border-radius:6px;background:linear-gradient(135deg,#f9e29a,#c99a35);color:#1a1306;}',
    '#gd-pers .gp-desc{margin:0 4px 4px;font-size:12.5px;line-height:1.45;color:#64748b;}',
    /* mini pré-visualização */
    '.gp-mini{height:150px;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;border:1px solid rgba(0,0,0,.06);}',
    '.gp-mini .mt{height:22px;display:flex;align-items:center;gap:5px;padding:0 7px;}',
    '.gp-mini .mt i{display:block;height:9px;border-radius:3px;}',
    '.gp-mini .mc{flex:1;display:flex;gap:6px;padding:7px;}',
    '.gp-mini .mg{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:5px;align-content:start;}',
    '.gp-mini .mg span{height:38px;border-radius:6px;position:relative;}',
    '.gp-mini .mg span::after{content:"";position:absolute;right:4px;bottom:4px;width:9px;height:9px;border-radius:3px;background:var(--mb);}',
    '.gp-mini .mk{width:38%;border-radius:7px;display:flex;flex-direction:column;justify-content:flex-end;gap:4px;padding:6px;}',
    '.gp-mini .mk i{display:block;height:6px;border-radius:3px;}',
    '.gp-mini .mk b{display:block;height:14px;border-radius:5px;}',
    '#gd-pers .gp-rod{display:flex;align-items:center;gap:10px;padding:12px 22px 20px;font-size:12px;color:#64748b;}',
    '#gd-pers .gp-rod button{margin-left:auto;height:44px;padding:0 22px;border-radius:12px;border:0;background:#0f172a;color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;}',
    /* ===== MODO VIDRO (liga/desliga em Personalizar) ===== */
    'body.modo2.gv{--gv-a:rgba(22,163,74,.55);--gv-b:rgba(59,130,246,.42);--gv-c:rgba(16,185,129,.45);--gv-p:rgba(255,255,255,.36);--gv-p2:rgba(255,255,255,.46);--gv-bd:rgba(255,255,255,.7);--gv-in:rgba(255,255,255,.55);--gv-base:#e9f2ef;}',
    'body.modo2.gv.m2-escuro{--gv-a:rgba(22,163,74,.45);--gv-b:rgba(59,130,246,.35);--gv-c:rgba(16,185,129,.3);--gv-p:rgba(20,20,24,.36);--gv-p2:rgba(30,30,36,.4);--gv-bd:rgba(255,255,255,.1);--gv-in:rgba(255,255,255,.06);--gv-base:#050607;}',
    'body.modo2.gv.gd{--gv-a:rgba(212,167,60,.55);--gv-b:rgba(249,226,154,.28);--gv-c:rgba(167,122,38,.45);--gv-p:rgba(18,18,22,.34);--gv-p2:rgba(30,30,36,.36);--gv-bd:rgba(232,195,106,.2);--gv-in:rgba(255,255,255,.05);--gv-base:#070708;}',
    'body.modo2.gv.gd.gd-marfim{--gv-a:rgba(212,167,60,.55);--gv-b:rgba(249,226,154,.6);--gv-c:rgba(184,134,43,.38);--gv-p:rgba(255,255,255,.36);--gv-p2:rgba(255,255,255,.48);--gv-bd:rgba(255,255,255,.75);--gv-in:rgba(255,255,255,.55);--gv-base:#f3ecdc;}',
    'body.modo2.gv #modo2-app{background:radial-gradient(45% 55% at 12% 18%,var(--gv-a),transparent 70%),radial-gradient(40% 50% at 88% 12%,var(--gv-b),transparent 70%),radial-gradient(55% 60% at 70% 95%,var(--gv-c),transparent 70%),radial-gradient(35% 40% at 30% 85%,var(--gv-b),transparent 70%),var(--gv-base) !important;background-attachment:fixed !important;}',
    'body.modo2.gv #m2-topbar,body.modo2.gv #m2-painel,body.modo2.gv #m2-cart,body.modo2.gv #gd-rodape,body.modo2.gv .gd-kpi{background:var(--gv-p) !important;-webkit-backdrop-filter:blur(22px) saturate(1.7);backdrop-filter:blur(22px) saturate(1.7);border:1px solid var(--gv-bd) !important;}',
    'body.modo2.gv #m2-topbar{border-width:0 0 1px !important;}',
    'body.modo2.gv #m2-painel,body.modo2.gv #m2-cart{box-shadow:0 20px 50px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.45),inset 0 0 0 1px rgba(255,255,255,.08) !important;}',
    'body.modo2.gv .m2-card{background:var(--gv-p2) !important;border:1px solid var(--gv-bd) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.2);}',
    'body.modo2.gv .m2-card .m2-img,body.modo2.gv #m2-cart .m2-item .m2-it-img{background:var(--gv-in) !important;}',
    'body.modo2.gv #m2-topbar .m2-busca input,body.modo2.gv #m2-subrow input,body.modo2.gv .m2-cat-btn,body.modo2.gv #m2-topbar .m2-loja,body.modo2.gv #m2-cart .m2-guardar,body.modo2.gv #m2-cart .m2-item .m2-step button{background:var(--gv-in) !important;border-color:var(--gv-bd) !important;}',
    'body.modo2.gv #m2-cart .m2-cart-fundo{background:transparent !important;}',
    'body.modo2.gv #m2-cart .m2-total-box{-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}',
    'body.modo2.gv:not(.gd) #m2-cart .m2-total-box{background:rgba(22,163,74,.12) !important;border:1px solid rgba(22,163,74,.25);}',
    'body.modo2.gv .m2-cat-menu{background:var(--gv-p2) !important;-webkit-backdrop-filter:blur(22px) saturate(1.6);backdrop-filter:blur(22px) saturate(1.6);border:1px solid var(--gv-bd) !important;}',
    'body.modo2.gv:not(.gd) #m2-cabecalho h1{text-shadow:0 1px 0 rgba(255,255,255,.4);}',
    /* janela Personalizar em vidro */
    '#gd-pers .gp-caixa{background:rgba(255,255,255,.62) !important;-webkit-backdrop-filter:blur(28px) saturate(1.8);backdrop-filter:blur(28px) saturate(1.8);border:1px solid rgba(255,255,255,.7);box-shadow:0 30px 80px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.8) !important;}',
    '#gd-pers{background:rgba(5,6,10,.32) !important;-webkit-backdrop-filter:blur(3px) !important;backdrop-filter:blur(3px) !important;}',
    '#gd-pers .gp-op{background:rgba(255,255,255,.55) !important;border-color:rgba(255,255,255,.75) !important;}',
    '#gd-pers .gp-x{background:rgba(255,255,255,.6) !important;}',
    '#gd-pers .gp-cab small,#gd-pers .gp-desc,#gd-pers .gp-rod{color:#475569 !important;}',
    '#gd-pers .gp-vidro{display:flex;align-items:center;gap:14px;margin:6px 22px 4px;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.8);cursor:pointer;user-select:none;}',
    '#gd-pers .gp-vidro .gv-eng{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(226,232,240,.7));color:#334155;box-shadow:0 4px 12px rgba(15,23,42,.1);flex-shrink:0;transition:transform .5s cubic-bezier(.3,1.3,.5,1),color .2s,background .2s;}',
    '#gd-pers .gp-vidro.on .gv-eng{transform:rotate(180deg);background:linear-gradient(135deg,#a5f3fc,#93c5fd 50%,#c4b5fd);color:#0f172a;}',
    '#gd-pers .gp-vidro b{display:block;font-size:15px;font-weight:800;}',
    '#gd-pers .gp-vidro small{display:block;font-size:12.5px;color:#475569;margin-top:2px;line-height:1.4;}',
    '#gd-pers .gv-sw{margin-left:auto;width:52px;height:30px;border-radius:99px;background:rgba(148,163,184,.55);position:relative;flex-shrink:0;transition:background .2s;}',
    '#gd-pers .gv-sw::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);transition:transform .22s cubic-bezier(.3,1.3,.5,1);}',
    '#gd-pers .gp-vidro.on .gv-sw{background:linear-gradient(90deg,#38bdf8,#818cf8);}',
    '#gd-pers .gp-vidro.on .gv-sw::after{transform:translateX(22px);}',
    '#gd-pers .gp-ops{grid-template-columns:repeat(2,1fr) !important;padding-top:8px !important;}',
    '#gd-pers .gp-cores{margin:8px 22px 0;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.8);display:grid;gap:10px;}',
    '#gd-pers .gp-cores.pisca{animation:gpPisca .5s ease;}',
    '@keyframes gpPisca{0%{box-shadow:0 0 0 0 rgba(212,167,60,.5)}100%{box-shadow:0 0 0 10px rgba(212,167,60,0)}}',
    '#gd-pers .gp-lin{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
    '#gd-pers .gp-lin>span{width:52px;font-size:13px;font-weight:800;color:#334155;}',
    '#gd-pers .gp-grp{display:flex;gap:8px;flex-wrap:wrap;flex:1;}',
    '#gd-pers .gp-o{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:12px;border:2px solid rgba(255,255,255,.85);background:rgba(255,255,255,.6);font-family:inherit;font-size:13.5px;font-weight:700;color:#0f172a;cursor:pointer;transition:border-color .15s,transform .12s;}',
    '#gd-pers .gp-o:hover{transform:translateY(-1px);}',
    '#gd-pers .gp-o i{width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(15,23,42,.18);}',
    '#gd-pers .gp-o.sel{border-color:#0f172a;background:#fff;}',
    '#gd-pers .gp-rod .gp-canc{margin-left:auto;height:44px;padding:0 18px;border-radius:12px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.6);color:#0f172a;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;}',
    '#gd-pers .gp-rod .gp-aplicar{margin-left:0 !important;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1fb456,#15803d) !important;box-shadow:0 8px 18px rgba(22,163,74,.3);}',
    '#gd-pers .gp-rod .gp-aplicar:disabled{background:#94a3b8 !important;box-shadow:none;cursor:default;opacity:.7;}',
    '#gd-pers .gp-op .gp-mini{height:130px;}',
    '#gd-pers .gp-sec{margin:14px 22px 0;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#64748b;}',
    '@media(max-width:1100px){body.modo2.gd #gd-cab-extra .gd-kpi:not(.relogio){display:none;}}',
    '@media(max-width:760px){body.modo2.gd #gd-cab-extra,body.modo2.gd #gd-rodape,body.modo2.gd #gd-info-lista span:last-child{display:none;}body.modo2.gd #m2-cart .m2-total-box .v{font-size:21px !important;white-space:nowrap;}body.modo2.gd #m2-cart .m2-total-box b{font-size:12px !important;margin-right:8px;}body.modo2.gd #m2-cabecalho h1{font-size:18px;letter-spacing:1.4px;}}'
  ].join('\n');

  function estilos() {
    if (el('gd-css')) return;
    var s = document.createElement('style'); s.id = 'gd-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---------------- Peças extra (só aparecem na dourada) ---------------- */
  function pecas() {
    var cab = el('m2-cabecalho');
    if (cab && !el('gd-cab-extra')) {
      var x = document.createElement('div'); x.id = 'gd-cab-extra';
      x.innerHTML =
        '<div class="gd-kpi relogio"><span class="gk-ic">' + SVG(IC.relogio) + '</span><div><small id="gd-data">—</small><b id="gd-hora">--:--</b></div></div>';
      cab.appendChild(x);
    }
    var grid = el('m2-grid');
    if (grid && !el('gd-info-lista')) {
      var i = document.createElement('div'); i.id = 'gd-info-lista';
      i.innerHTML = '<span id="gd-n-lista">—</span><span>Toca num produto para o pôr no carrinho · <em>Enter</em> finaliza</span>';
      grid.parentNode.insertBefore(i, grid);
    }
    var top = document.querySelector('#m2-cart .m2-cart-top b');
    if (top && !el('gd-cart-resumo')) {
      var wrap = document.createElement('div'); top.parentNode.insertBefore(wrap, top); wrap.appendChild(top);
      var r = document.createElement('div'); r.id = 'gd-cart-resumo'; r.textContent = 'Sem produtos'; wrap.appendChild(r);
    }
    var main = null; // barra de atalhos de baixo removida a pedido
    if (main && !el('gd-rodape')) {
      var f = document.createElement('div'); f.id = 'gd-rodape';
      f.innerHTML = '<span><kbd>F2</kbd>Pesquisar</span><span><kbd>F3</kbd>Menu</span><span><kbd>F4</kbd>Pagamento</span><span><kbd>Enter</kbd>Finalizar</span><span><kbd>F9</kbd>Emergência</span>' +
        '<span class="gr-dir"><span class="gr-on" id="gd-online"><i></i><b>Online</b></span><span class="gr-selo">' + SVG(IC.escudo, 14) + 'Interface Dourada</span></span>';
      main.appendChild(f);
    }
  }

  function prods() { try { return (typeof produtos !== 'undefined' && produtos) ? produtos : []; } catch (e) { return []; } }
  function carro() { try { return (typeof carrinho !== 'undefined' && carrinho) ? carrinho : []; } catch (e) { return []; } }
  function stockDe(p) { var s = parseFloat(p && p.stock); return isNaN(s) ? null : s; }

  function atualizarResumo() {
    if (!document.body.classList.contains('gd')) return;
    var ps = prods(), cs = carro(), e;
    var un = cs.reduce(function (a, i) { return a + (i.unidade === 'kg' ? 1 : (Number(i.qtd) || 0)); }, 0);
    if ((e = el('gd-cart-resumo'))) e.textContent = cs.length ? (cs.length + (cs.length === 1 ? ' produto' : ' produtos') + ' · ' + un + (un === 1 ? ' unidade' : ' unidades')) : 'Sem produtos — toca num produto para começar';
    if ((e = el('gd-n-lista'))) { var n = document.querySelectorAll('#m2-grid .m2-card').length; e.textContent = n + (n === 1 ? ' produto' : ' produtos') + ' nesta lista'; }
    if ((e = el('gd-online'))) { var on = navigator.onLine !== false; e.classList.toggle('off', !on); e.querySelector('b').textContent = on ? 'Online' : 'Sem internet'; }
  }

  // Põe no cartão: stock, código e quantos já estão no carrinho
  function decorarGrelha() {
    if (!document.body.classList.contains('gd')) return;
    var ps = prods(), cs = carro();
    document.querySelectorAll('#m2-grid .m2-card').forEach(function (c) {
      var nomeEl = c.querySelector('.m2-nome'); if (!nomeEl) return;
      var nome = nomeEl.textContent, p = null;
      for (var k = 0; k < ps.length; k++) { if ((ps[k].nome || '') === nome) { p = ps[k]; break; } }
      if (!p) return;
      var s = stockDe(p), st = c.querySelector('.gd-st');
      if (s !== null && p.unidade !== 'kg') {
        if (!st) { st = document.createElement('span'); c.insertBefore(st, c.firstChild); }
        st.className = 'gd-st ' + (s <= 0 ? 'zero' : s <= 5 ? 'bx' : 'ok');
        st.textContent = s <= 0 ? 'Esgotado' : s <= 5 ? 'Restam ' + s : s + ' em stock';
      } else if (st) st.remove();
      var cod = p.codbarras || p.codigo || '';
      if (cod && !c.querySelector('.gd-cod')) { var cd = document.createElement('span'); cd.className = 'gd-cod'; cd.textContent = cod; nomeEl.parentNode.insertBefore(cd, nomeEl.nextSibling); }
      var q = cs.filter(function (i) { return i.nome === nome; }).reduce(function (a, i) { return a + (i.unidade === 'kg' ? 1 : (Number(i.qtd) || 0)); }, 0);
      var nc = c.querySelector('.gd-noc');
      if (q > 0) { if (!nc) { nc = document.createElement('span'); nc.className = 'gd-noc'; c.insertBefore(nc, c.firstChild); } nc.textContent = q; }
      else if (nc) nc.remove();
    });
    atualizarResumo();
  }

  function relogio() {
    var d = new Date(), e;
    if ((e = el('gd-hora'))) e.textContent = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    if ((e = el('gd-data'))) { var s = d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' }); e.textContent = s.replace(/\./g, ''); }
  }

  // Liga-se às funções que desenham a grelha e o carrinho, sem mudar o que elas fazem
  var _ligado = false;
  function ligar() {
    if (_ligado) return true;
    if (typeof window.renderM2Grid !== 'function' || typeof window.renderM2Cart !== 'function') return false;
    var g = window.renderM2Grid, c = window.renderM2Cart;
    window.renderM2Grid = function () { var r = g.apply(this, arguments); try { decorarGrelha(); } catch (e) {} return r; };
    window.renderM2Cart = function () { var r = c.apply(this, arguments); try { decorarGrelha(); } catch (e) {} return r; };
    _ligado = true; return true;
  }

  /* ---------------- Entrada nas Definições ---------------- */
  var NOMES = { classica: 'Clássica', noite: 'Dourada', marfim: 'Marfim' };
  function entradaDefinicoes() {
    var pn = el('m2-def-painel'); if (!pn) return;
    if (!el('gd-entrada')) {
      var a = document.createElement('div'); a.id = 'gd-entrada'; a.className = 'm2-nav m2-sub gd-entrada';
      a.setAttribute('onclick', "document.body.classList.remove('m2-menu-aberto'); spapInterfaceAbrir();");
      a.innerHTML = '<span class="ico"><img src="icons3d/personalizar.svg" alt="" style="width:24px;height:24px;display:block"></span><span>Personalizar interface</span><span class="gd-atual" id="gd-atual"></span>';
      var tit = document.createElement('div'); tit.className = 'm2-def-titulo'; tit.textContent = 'Interface';
      pn.insertBefore(a, pn.firstChild); pn.insertBefore(tit, pn.firstChild);
      // marca os títulos «Modo» e «Cor» para se esconderem na dourada
      pn.querySelectorAll('.m2-def-titulo').forEach(function (t) { var tx = (t.textContent || '').trim(); if (tx === 'Modo' || tx === 'Cor') t.classList.add('gd-esc-tit'); });
    }
    var at = el('gd-atual'); if (at) at.textContent = (ler() === 'classica' ? 'Clássica' : 'Dourada') + (lerVidro() ? ' · Vidro' : '');
  }

  /* ---------------- Aplicar ---------------- */
  function aplicar(v) {
    v = OPCOES.indexOf(v) >= 0 ? v : ler();
    estilos();
    var b = document.body; if (!b) return;
    b.classList.toggle('gd', v !== 'classica');
    b.classList.toggle('gd-marfim', v === 'marfim');
    if (v !== 'classica') { pecas(); ligar(); relogio(); decorarGrelha(); }
    entradaDefinicoes();
    try { var meta = document.querySelector('meta[name=theme-color]'); if (meta) { if (!meta.dataset.gdOrig) meta.dataset.gdOrig = meta.content; meta.content = v === 'noite' ? '#121215' : v === 'marfim' ? '#ffffff' : meta.dataset.gdOrig; } } catch (e) {}
  }
  window.spapInterfaceAplicar = aplicar;

  /* ---------------- Janela «Personalizar interface» ---------------- */
  // Tudo do aspeto fica aqui: interface, cores e modo vidro. Nada muda até carregar em «Aplicar».
  function lerModo() { var m = ''; try { m = localStorage.getItem('pdv_m2_modo') || ''; } catch (e) {} return m === 'escuro' ? 'escuro' : 'claro'; }
  function lerCor() { var c = ''; try { c = localStorage.getItem('pdv_m2_cor') || ''; } catch (e) {} return c === 'azul' ? 'azul' : 'verde'; }
  function paleta(e) {
    if (e.iface === 'dourada') return e.tom === 'marfim'
      ? { f: '#f7f3ea', top: '#fff', l: '#eadfc6', card: '#fff', cb: '#f3ecdc', b: 'linear-gradient(135deg,#f3d27a,#b8862b)', k: '#fff' }
      : { f: '#0b0b0d', top: '#141417', l: '#2a2620', card: '#19191d', cb: '#232328', b: 'linear-gradient(135deg,#f9e29a,#c99a35)', k: '#141417' };
    var ac = e.cor === 'azul' ? '#2563eb' : '#16a34a';
    return e.modo === 'escuro'
      ? { f: '#000', top: '#0a0a0a', l: '#262626', card: '#171717', cb: '#262626', b: ac, k: '#0a0a0a' }
      : { f: '#eef2f6', top: '#fff', l: '#e2e8f0', card: '#fff', cb: '#e8edf3', b: ac, k: '#fff' };
  }
  function mini(e) {
    var t = paleta(e), vid = e.vidro;
    var bg = vid ? ('radial-gradient(60% 70% at 15% 20%,' + (e.iface === 'dourada' ? 'rgba(212,167,60,.6)' : 'rgba(34,197,94,.55)') + ',transparent 70%),radial-gradient(60% 70% at 90% 90%,' + (e.iface === 'dourada' ? 'rgba(249,226,154,.45)' : 'rgba(59,130,246,.5)') + ',transparent 70%),' + t.f) : t.f;
    var op = vid ? ';opacity:.72' : '';
    var cards = ''; for (var i = 0; i < 6; i++) cards += '<span style="background:' + t.card + ';border:1px solid ' + t.l + op + '"></span>';
    return '<div class="gp-mini" style="background:' + bg + ';--mb:' + t.b + '">' +
      '<div class="mt" style="background:' + t.top + ';border-bottom:1px solid ' + t.l + op + '"><i style="width:12px;background:' + t.b + '"></i><i style="flex:1;background:' + t.cb + '"></i><i style="width:22px;background:' + t.cb + '"></i></div>' +
      '<div class="mc"><div class="mg">' + cards + '</div><div class="mk" style="background:' + t.k + ';border:1px solid ' + t.l + op + '"><i style="background:' + t.cb + '"></i><i style="background:' + t.cb + ';width:70%"></i><b style="background:' + t.cb + '"></b><b style="background:' + t.b + '"></b></div></div></div>';
  }
  var ENG = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>';
  function opcoesHtml(e) {
    function bt(grupo, v, rot, sw) { return '<button type="button" class="gp-o' + (e[grupo] === v ? ' sel' : '') + '" data-g="' + grupo + '" data-v="' + v + '">' + (sw ? '<i style="background:' + sw + '"></i>' : '') + rot + '</button>'; }
    if (e.iface === 'dourada') return '<div class="gp-lin"><span>Tom</span><div class="gp-grp">' + bt('tom', 'noite', 'Noite (escuro)', '#141417') + bt('tom', 'marfim', 'Marfim (claro)', '#f3ecdc') + '</div></div>';
    return '<div class="gp-lin"><span>Modo</span><div class="gp-grp">' + bt('modo', 'claro', 'Claro', '#ffffff') + bt('modo', 'escuro', 'Escuro', '#111111') + '</div></div>' +
      '<div class="gp-lin"><span>Cor</span><div class="gp-grp">' + bt('cor', 'verde', 'Verde', '#16a34a') + bt('cor', 'azul', 'Azul', '#2563eb') + '</div></div>';
  }
  window.spapInterfaceAbrir = function () {
    estilos();
    var ant = el('gd-pers'); if (ant) ant.remove();
    var at = ler();
    var e = { iface: at === 'classica' ? 'classica' : 'dourada', tom: at === 'marfim' ? 'marfim' : 'noite', modo: lerModo(), cor: lerCor(), vidro: lerVidro() };
    var d = document.createElement('div'); d.id = 'gd-pers';
    d.innerHTML = '<div class="gp-caixa" role="dialog" aria-modal="true" aria-labelledby="gp-t">' +
      '<div class="gp-cab"><span class="gp-ic gp-ic-img"><img src="icons3d/personalizar.svg" alt=""></span><div><b id="gp-t">Personalizar interface</b><small>Escolhe a interface e as cores. Nada muda até carregares em «Aplicar».</small></div><button class="gp-x" aria-label="Fechar">✕</button></div>' +
      '<div class="gp-sec">1 · Interface</div><div class="gp-ops"></div>' +
      '<div class="gp-sec">2 · Cores</div><div class="gp-cores"></div>' +
      '<div class="gp-sec">3 · Efeito</div>' +
      '<div class="gp-vidro" role="switch" tabindex="0"><span class="gv-eng">' + SVG(ENG, 22) + '</span><div><b>Modo vidro</b><small id="gv-txt"></small></div><span class="gv-sw"></span></div>' +
      '<div class="gp-rod"><span>As vendas, o stock e os recibos funcionam igual em todas.</span><button type="button" class="gp-canc">Cancelar</button><button type="button" class="gp-aplicar">' + SVG(IC.ok, 16) + 'Aplicar</button></div></div>';
    document.body.appendChild(d);
    function pintar() {
      var ops = [
        { v: 'classica', n: 'Clássica', d: 'A interface de sempre. Escolhe Claro ou Escuro e a cor Verde ou Azul.' },
        { v: 'dourada', n: 'Dourada', tag: 'PREMIUM', d: 'Detalhes dourados, stock em cada produto, relógio, resumo do carrinho e atalhos.' }
      ];
      d.querySelector('.gp-ops').innerHTML = ops.map(function (o) {
        var vis = { iface: o.v, tom: e.tom, modo: e.modo, cor: e.cor, vidro: e.vidro };
        return '<button type="button" class="gp-op' + (o.v === e.iface ? ' sel' : '') + '" data-i="' + o.v + '"><span class="gp-ok">' + SVG(IC.ok, 15) + '</span>' + mini(vis) +
          '<div class="gp-nome">' + o.n + (o.tag ? '<em>' + o.tag + '</em>' : '') + '</div><div class="gp-desc">' + o.d + '</div></button>';
      }).join('');
      d.querySelector('.gp-cores').innerHTML = opcoesHtml(e);
      var sw = d.querySelector('.gp-vidro'); sw.classList.toggle('on', e.vidro); sw.setAttribute('aria-checked', e.vidro);
      d.querySelector('#gv-txt').textContent = e.vidro ? 'Ligado — a interface e todas as janelas que abrirem ficam em vidro.' : 'Desligado — a interface fica normal.';
      var mudou = (e.iface === 'classica' ? 'classica' : e.tom) !== ler() || e.vidro !== lerVidro() || (e.iface === 'classica' && (e.modo !== lerModo() || e.cor !== lerCor()));
      d.querySelector('.gp-aplicar').disabled = !mudou;
    }
    pintar();
    requestAnimationFrame(function () { d.classList.add('on'); });
    function fechar() { d.classList.remove('on'); setTimeout(function () { d.remove(); }, 200); document.removeEventListener('keydown', tecla, true); }
    function aplicarTudo() {
      var v = e.iface === 'classica' ? 'classica' : e.tom;
      if (e.iface === 'classica') {
        try { if (typeof setModoM2 === 'function') setModoM2(e.modo); else localStorage.setItem('pdv_m2_modo', e.modo); } catch (er) {}
        try { if (typeof setCorM2 === 'function') setCorM2(e.cor); else localStorage.setItem('pdv_m2_cor', e.cor); } catch (er) {}
      }
      gravar(v); aplicar(v); aplicarVidro(e.vidro); entradaDefinicoes();
      try { if (typeof mostrarNotif === 'function') mostrarNotif('🎨 Interface ' + (v === 'classica' ? 'Clássica' : 'Dourada') + ' aplicada' + (e.vidro ? ' · modo vidro' : '')); } catch (er) {}
      fechar();
    }
    function tecla(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); fechar(); } else if ((ev.key === 'Enter' || ev.key === ' ') && document.activeElement && document.activeElement.classList.contains('gp-vidro')) { ev.preventDefault(); ev.stopPropagation(); document.activeElement.click(); } }
    document.addEventListener('keydown', tecla, true);
    d.addEventListener('click', function (ev) {
      if (ev.target === d || ev.target.closest('.gp-x') || ev.target.closest('.gp-canc')) return fechar();
      if (ev.target.closest('.gp-aplicar')) return aplicarTudo();
      var o = ev.target.closest('.gp-op'); if (o) { e.iface = o.getAttribute('data-i'); pintar(); var c = d.querySelector('.gp-cores'); c.classList.remove('pisca'); void c.offsetWidth; c.classList.add('pisca'); return; }
      var b = ev.target.closest('.gp-o'); if (b) { e[b.getAttribute('data-g')] = b.getAttribute('data-v'); pintar(); return; }
      if (ev.target.closest('.gp-vidro')) { e.vidro = !e.vidro; pintar(); }
    });
  };

  /* ---------------- Arranque ---------------- */
  function iniciar() {
    aplicar(ler()); aplicarVidro();
    // a página pode desenhar o modo moderno depois: volta a aplicar quando aparecer
    var tent = 0, t = setInterval(function () { tent++; if (ligar() || tent > 60) { aplicar(ler()); if (tent > 60 || _ligado) clearInterval(t); } }, 250);
    setInterval(relogio, 15000);
    window.addEventListener('online', atualizarResumo); window.addEventListener('offline', atualizarResumo);
  }
  estilos();
  if (document.body && lerVidro()) document.body.classList.add('gv');
  if (document.body && ler() !== 'classica') { document.body.classList.add('gd'); if (ler() === 'marfim') document.body.classList.add('gd-marfim'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
