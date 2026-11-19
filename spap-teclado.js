/* SPAP — Protecção do teclado (todas as apps).
   No telemóvel, o teclado fechava-se sozinho a meio da escrita porque a app redesenhava a lista
   (produtos, carrinho, categorias…) enquanto o campo estava activo — o campo era destruído e perdia o foco.
   Aqui: enquanto um campo de texto/número está activo, os redesenhos ficam em espera e correm quando a pessoa sai do campo. */
(function () {
  'use strict';
  if (window.__spapTeclado) return; window.__spapTeclado = true;
  function aEscrever() {
    var a = document.activeElement;
    if (!a) return false;
    var t = a.tagName;
    if (t === 'TEXTAREA' || a.isContentEditable) return true;
    if (t !== 'INPUT') return false;
    var tipo = (a.type || 'text').toLowerCase();
    if (/button|checkbox|radio|submit|range|file|color|hidden/.test(tipo)) return false;
    if (a.readOnly) return false;           // ex.: o campo «recebido» da confirmação (teclado do ecrã, não do sistema)
    return true;
  }
  window.spapAEscrever = aEscrever;
  var pendentes = [];
  function correrPendentes() {
    if (!pendentes.length || aEscrever()) return;
    var fs = pendentes; pendentes = [];
    fs.forEach(function (x) { try { x.fn.apply(x.ctx, x.args); } catch (e) {} });
  }
  document.addEventListener('focusout', function () { setTimeout(correrPendentes, 120); }, true);
  // Envolve uma função global: se a pessoa estiver a escrever, adia; senão corre já.
  // Só adia quando o campo activo está DENTRO da zona que a função redesenha (ou quando não se sabe a zona).
  function proteger(nome, zonas) {
    var f = window[nome];
    if (typeof f !== 'function' || f.__protegida) return;
    var g = function () {
      if (aEscrever()) {
        var a = document.activeElement, dentro = false;
        if (!dentro) { for (var i = 0; i < zonas.length; i++) { var z = document.getElementById(zonas[i]); if (z && z.contains(a)) { dentro = true; break; } } }
        if (dentro) {
          // guarda só a última chamada de cada função
          pendentes = pendentes.filter(function (x) { return x.nome !== nome; });
          pendentes.push({ nome: nome, fn: f, ctx: this, args: arguments });
          return;
        }
      }
      return f.apply(this, arguments);
    };
    g.__protegida = true;
    window[nome] = g;
  }
  window.spapProtegerRedesenho = proteger;
  function arrancar() {
    // Só adia quando o campo activo está DENTRO da zona que vai ser redesenhada (nunca a pesquisa do topo,
    // senão, com o leitor de código de barras sempre no campo, a lista nunca se actualizava).
    // Loja (PDV)
    proteger('renderProdutos', ['produtos-grelha']);
    proteger('renderCarrinho', ['carrinho-itens']);
    proteger('renderM2Grid', ['m2-grid']);
    proteger('renderM2Cart', ['m2-cart-itens']);
    // Banca (PDV)
    proteger('atualizarBarraCarrinho', ['cart-itens']);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(arrancar, 0); });
  else setTimeout(arrancar, 0);
  // as funções declaradas depois (dentro de <script> no fim da página) são apanhadas aqui
  window.addEventListener('load', function () { setTimeout(arrancar, 50); });
})();
