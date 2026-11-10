// ============================================================
// CONFIGURAÇÃO DO SUPABASE — Spap-Sercriativo PDV (SaaS multi-loja)
// ============================================================
// Este ficheiro é importado por todas as páginas (registo, login, pdv).
// Contém só a URL e a chave pública (anon/publishable) — seguras de
// expor no frontend, já que o RLS na base de dados protege os dados.

const SUPABASE_URL = 'https://kggqshpqydhvtxklixyk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FLR81R0et5RIFR9WToVjsQ_RoP3RPew';

// Se a página é aberta em MODO GERENTE (link ?g=... ou ?modo=gerente), usamos um
// "espaço" de sessão SEPARADO. Assim o gerente e o dono não se expulsam um ao outro
// no mesmo navegador (cada um tem a sua sessão independente).
const _params = new URLSearchParams(location.search);
const _ehGerente = !!_params.get('g') || _params.get('modo') === 'gerente';

// LOJA e BANCA são SEPARADAS: as páginas da Banca guardam a sessão noutro «espaço».
// Entrar na Loja não abre a Banca (nem o contrário) — cada uma precisa da sua conta.
const SPAP_PAGINA_BANCA = /(^|\/)(mobile|mobile-monitor|login-banca|registo-banca|planos-banca)(\.html)?$/i.test((location.pathname || '').replace(/\/+$/, ''))
  || /\/banca(\/|$)/i.test(location.pathname || '');
const SPAP_CHAVE_BANCA = 'sb-spap-banca';
if (SPAP_PAGINA_BANCA && !_ehGerente) {
  // 1.ª vez depois da atualização: aproveita a sessão antiga (só fica se for mesmo de uma Banca — ver spapSessaoBancaOk)
  try {
    if (!localStorage.getItem(SPAP_CHAVE_BANCA)) {
      const k = Object.keys(localStorage).find(function (x) { return /^sb-.+-auth-token$/.test(x) && x !== SPAP_CHAVE_BANCA && x !== 'sb-spap-gerente'; });
      if (k) { localStorage.setItem(SPAP_CHAVE_BANCA, localStorage.getItem(k)); localStorage.setItem('spap_banca_copiada', k); }
    }
  } catch (e) {}
}
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY,
  _ehGerente ? { auth: { storageKey: 'sb-spap-gerente', persistSession: true, autoRefreshToken: true } }
  : SPAP_PAGINA_BANCA ? { auth: { storageKey: SPAP_CHAVE_BANCA, persistSession: true, autoRefreshToken: true } }
  : undefined
);
// tipo da conta: 'banca' ou 'loja'
function spapEhBanca(m) { return !!(m && m.lojas && m.lojas.tipo_loja === 'banca'); }
// só as contas do tipo pedido ('banca' nas páginas da Banca, 'loja' nas da Loja), as ativas primeiro
function spapMembrosDoTipo(l, tipo) {
  if (!Array.isArray(l)) return l;
  var b = tipo === 'banca';
  return spapMembrosAtivos(l.filter(function (m) { return spapEhBanca(m) === b; }));
}
// conta que já não é deste tipo: se veio de uma migração, mostra «passou a Loja/Banca»; devolve true se mostrou
async function spapContaMigrada(todos, pagina) {
  try {
    for (var i = 0; i < (todos || []).length; i++) {
      var id = todos[i].loja_id; if (!id || !window.spapVerConta) continue;
      await spapVerConta(id, pagina);
      if (document.getElementById('spap-encerrada')) return true;
    }
  } catch (e) {}
  return false;
}
// a sessão desta página é mesmo de uma Banca: deixa de partilhar a sessão antiga com a Loja
function spapSessaoBancaOk() {
  try { var k = localStorage.getItem('spap_banca_copiada'); if (k) { localStorage.removeItem(k); localStorage.removeItem('spap_banca_copiada'); } } catch (e) {}
}
// a sessão não é de uma Banca: sai SÓ da Banca (a Loja continua com a sua sessão)
async function spapSessaoBancaErrada() {
  var copiada = null; try { copiada = localStorage.getItem('spap_banca_copiada'); } catch (e) {}
  if (copiada) { try { localStorage.removeItem(SPAP_CHAVE_BANCA); localStorage.removeItem('spap_banca_copiada'); } catch (e) {} return; }
  try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch (e) { try { localStorage.removeItem(SPAP_CHAVE_BANCA); } catch (e2) {} }
}
// Contas canceladas (depois de uma migração Loja ↔ Banca) ficam para o fim: entra-se sempre na conta ativa.
function spapMembrosAtivos(l) {
  if (!Array.isArray(l)) return l;
  var c = function (m) { var e = m && m.lojas && m.lojas.estado; return /cancel|encerr/i.test(e || '') ? 1 : 0; };
  return l.slice().sort(function (a, b) { return c(a) - c(b); });
}
