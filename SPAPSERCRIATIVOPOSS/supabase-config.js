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
// SUPER ADMIN: tem acesso à Loja, ao Monitor, à Banca e ao Monitor e Banca, sem restrições
// (a mesma lista está no monitor.html, no admin.html e na função eh_super_admin() do Supabase)
const SPAP_SUPER_ADMINS = ['joaomassuvir@gmail.com', 'bonifacioadelino1@gmail.com'];
const SPAP_CHAVE_PADRAO = 'sb-' + String(SUPABASE_URL).replace(/^https?:\/\//, '').split('.')[0] + '-auth-token';
function spapEhSuper(email) { return SPAP_SUPER_ADMINS.indexOf(String(email || '').trim().toLowerCase()) >= 0; }
function _spapEmailDaChave(k) {
  try { var v = JSON.parse(localStorage.getItem(k) || 'null'); if (!v) return '';
    if (v.user && v.user.email) return String(v.user.email).toLowerCase();
    var t = v.access_token || (v.currentSession && v.currentSession.access_token);
    if (t) return String(JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || '').toLowerCase();
  } catch (e) {}
  return '';
}
// O Super Admin usa UMA só sessão para a Loja e para a Banca (entra uma vez e abre as duas)
let SPAP_SUPER_UNIFICADO = false;
if (SPAP_PAGINA_BANCA && !_ehGerente) {
  try {
    if (spapEhSuper(_spapEmailDaChave(SPAP_CHAVE_PADRAO))) SPAP_SUPER_UNIFICADO = true;
    else if (spapEhSuper(_spapEmailDaChave(SPAP_CHAVE_BANCA))) {
      if (!localStorage.getItem(SPAP_CHAVE_PADRAO)) localStorage.setItem(SPAP_CHAVE_PADRAO, localStorage.getItem(SPAP_CHAVE_BANCA));
      localStorage.removeItem(SPAP_CHAVE_BANCA); SPAP_SUPER_UNIFICADO = true;
    }
  } catch (e) {}
}
if (SPAP_PAGINA_BANCA && !_ehGerente && !SPAP_SUPER_UNIFICADO) {
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
  : (SPAP_PAGINA_BANCA && !SPAP_SUPER_UNIFICADO) ? { auth: { storageKey: SPAP_CHAVE_BANCA, persistSession: true, autoRefreshToken: true } }
  : undefined
);
// tipo da conta: 'banca' ou 'loja'
function spapEhBanca(m) { return !!(m && m.lojas && m.lojas.tipo_loja === 'banca'); }
// só as contas do tipo pedido ('banca' nas páginas da Banca, 'loja' nas da Loja), as ativas primeiro
// email da sessão desta página (lido do telemóvel, sem esperar pela internet)
function spapEmailSessao() {
  var k = _ehGerente ? 'sb-spap-gerente' : (SPAP_PAGINA_BANCA && !SPAP_SUPER_UNIFICADO ? SPAP_CHAVE_BANCA : SPAP_CHAVE_PADRAO);
  return _spapEmailDaChave(k);
}
function spapEuSuper() { return spapEhSuper(spapEmailSessao()); }
function spapMembrosDoTipo(l, tipo) {
  if (!Array.isArray(l)) return l;
  var b = tipo === 'banca';
  // Super Admin: sem restrição (todas as contas, as do tipo pedido primeiro)
  if (spapEuSuper()) return spapMembrosAtivos(l).slice().sort(function (x, y) { return (spapEhBanca(x) === b ? 0 : 1) - (spapEhBanca(y) === b ? 0 : 1); });
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
// Super Admin nas páginas da Banca: abre SEMPRE a sua banca (como antes, com o código do balconista dela).
// Outra banca só quando a escolhe no menu «👑 Super Admin» (vale só enquanto a app está aberta).
async function spapSuperMembroBanca(proprios) {
  var esc = null;
  try { localStorage.removeItem('spap_super_banca'); esc = sessionStorage.getItem('spap_super_banca'); } catch (e) {}
  var r = await supabaseClient.from('lojas').select('id,nome,estado,tipo_loja,vendedores,telefone,plano,data_expiracao,email_dono').eq('tipo_loja', 'banca').order('nome').limit(1000);
  var l = (r && r.data) || []; window._spapBancas = l;
  var meu = (proprios || []).find(function (m) { return spapEhBanca(m); });
  window._spapMinhaBanca = meu ? meu.loja_id : null;
  var x = esc ? l.find(function (b) { return String(b.id) === String(esc); }) : null;
  if (!x || (meu && String(x.id) === String(meu.loja_id))) { if (meu) return meu; x = x || l[0]; }
  if (!x) return null;
  return { loja_id: x.id, papel: 'admin', nome_exibicao: 'Super Admin', lojas: x };
}
// a sessão desta página é mesmo de uma Banca: deixa de partilhar a sessão antiga com a Loja
function spapSessaoBancaOk() {
  if (SPAP_SUPER_UNIFICADO) return;
  try { var k = localStorage.getItem('spap_banca_copiada'); if (k) { localStorage.removeItem(k); localStorage.removeItem('spap_banca_copiada'); } } catch (e) {}
}
// a sessão não é de uma Banca: sai SÓ da Banca (a Loja continua com a sua sessão)
async function spapSessaoBancaErrada() {
  if (SPAP_SUPER_UNIFICADO || spapEuSuper()) return;
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
