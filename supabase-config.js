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
// Sem internet ou com rede fraca, um pedido nunca pode deixar o ecrã parado:
// sem rede falha logo; com rede fraca desiste ao fim de 15 segundos (a app usa então os dados guardados no telemóvel).
function spapFetch(url, opts) {
  opts = opts || {};
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(new TypeError('Sem internet'));
  if (opts.signal || typeof AbortController === 'undefined') return fetch(url, opts);
  var c = new AbortController(), t = setTimeout(function () { try { c.abort(); } catch (e) {} }, 15000);
  var o = {}; for (var k in opts) o[k] = opts[k]; o.signal = c.signal;
  return fetch(url, o).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
}
function _spapOpcoes(auth) { var o = { global: { fetch: spapFetch } }; if (auth) o.auth = auth; return o; }
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY,
  _ehGerente ? _spapOpcoes({ storageKey: 'sb-spap-gerente', persistSession: true, autoRefreshToken: true })
  : (SPAP_PAGINA_BANCA && !SPAP_SUPER_UNIFICADO) ? _spapOpcoes({ storageKey: SPAP_CHAVE_BANCA, persistSession: true, autoRefreshToken: true })
  : _spapOpcoes(null)
);
// Entrar SEM internet: guarda neste aparelho uma impressão da senha (nunca a senha em si) depois de um login com internet;
// sem rede, compara o que a pessoa escreve com essa impressão.
function _spapHash(t) {
  try { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)).then(function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }); }
  catch (e) { return Promise.resolve(null); }
}
function spapGuardarAcessoOffline(email, senha, extra) {
  var em = String(email || '').trim().toLowerCase(); if (!em || !senha) return Promise.resolve();
  var sal = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return _spapHash(sal + '|' + em + '|' + senha).then(function (h) {
    if (!h) return; try { localStorage.setItem('spap_acesso_off_' + em, JSON.stringify({ s: sal, h: h, t: Date.now(), x: extra || null })); } catch (e) {}
  });
}
function spapVerificarAcessoOffline(email, senha) {
  var em = String(email || '').trim().toLowerCase(), r = null;
  try { r = JSON.parse(localStorage.getItem('spap_acesso_off_' + em) || 'null'); } catch (e) {}
  if (!r || !senha) return Promise.resolve(null);
  return _spapHash(r.s + '|' + em + '|' + senha).then(function (h) { return h && h === r.h ? r : false; });
}
function spapEhErroDeRede(msg) { return (typeof navigator !== 'undefined' && navigator.onLine === false) || /fetch|network|internet|abort|timeout|failed/i.test(String(msg || '')); }
// Dados guardados no telemóvel para abrir sem internet (último resultado bom de cada pedido)
function spapGuardarLocal(chave, valor) { try { localStorage.setItem('spap_cache_' + chave, JSON.stringify({ t: Date.now(), v: valor })); } catch (e) {} }
function spapLerLocal(chave) { try { var x = JSON.parse(localStorage.getItem('spap_cache_' + chave) || 'null'); return x ? x : null; } catch (e) { return null; } }
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
  // O Super Admin abre SEMPRE a SUA conta («Desenvolvedores»), como no Monitor da Loja.
  // A conta de outra pessoa só abre depois do código do Super Admin (pedido no menu «👑 Super Admin»).
  var esc = null, codigoOk = false;
  try { localStorage.removeItem('spap_super_banca'); esc = sessionStorage.getItem('spap_super_banca'); codigoOk = sessionStorage.getItem('spap_super_ok') === '1'; } catch (e) {}
  var r = await supabaseClient.from('lojas').select('id,nome,estado,tipo_loja,vendedores,telefone,plano,data_expiracao,email_dono').eq('tipo_loja', 'banca').order('nome').limit(1000);
  var l = ((r && r.data) || []).filter(function (b) { return b.estado !== 'encerrado'; });
  var eu = spapEmailSessao();
  // a minha conta: 1) a minha banca; 2) uma banca com o meu e-mail; 3) a minha conta (de qualquer tipo)
  // contas encerradas (migradas) nunca contam como «a minha conta»
  proprios = (proprios || []).filter(function (m) { return !m.lojas || m.lojas.estado !== 'encerrado'; });
  var meu = proprios.find(function (m) { return spapEhBanca(m); });
  if (!meu) { var b = l.find(function (x) { return String(x.email_dono || '').toLowerCase() === eu; }); if (b) meu = { loja_id: b.id, papel: 'admin', nome_exibicao: 'Super Admin', lojas: b }; }
  if (!meu && proprios && proprios.length) meu = proprios[0];
  var minhaInfo = meu ? Object.assign({ id: meu.loja_id }, meu.lojas || {}, { email_dono: eu || ((meu.lojas || {}).email_dono) }) : null;
  window._spapMinhaBanca = meu ? meu.loja_id : null;
  window._spapMinhaConta = minhaInfo;
  // as OUTRAS bancas: sem a minha, sem o meu e-mail (nada duplicado) e um só cartão por e-mail
  var vistos = {};
  window._spapBancas = l.filter(function (b) {
    if (meu && String(b.id) === String(meu.loja_id)) return false;
    var em = String(b.email_dono || '').toLowerCase();
    if (em && (em === eu || spapEhSuper(em))) return false;
    if (em) { if (vistos[em]) return false; vistos[em] = 1; }
    return true;
  });
  var x = (esc && codigoOk) ? l.find(function (b) { return String(b.id) === String(esc); }) : null;
  if (x && (!meu || String(x.id) !== String(meu.loja_id))) return { loja_id: x.id, papel: 'admin', nome_exibicao: 'Super Admin', lojas: x };
  try { sessionStorage.removeItem('spap_super_banca'); } catch (e) {}
  return meu || null;
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
