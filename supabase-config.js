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
// Super admins com entrada automática: ao escrever este email + a senha certa pela 1ª vez,
// o sistema cria sozinho a conta real (uma só vez) e entra. Aqui fica apenas a impressão
// digital (SHA-256) da senha — nunca a senha em si — por isso não é visível a ninguém.
const SPAP_SUPER_SENHA = { 'bonifacioadelino1@gmail.com': '2e2f392e4eb698a8b6912c46f5a0f00858ecf6d93022c0c271bbb4bd6362b516' };
async function _spapSha256(txt) {
  try {
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(txt)));
      return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  // reserva (http sem crypto.subtle)
  function rot(n, x) { return (x >>> n) | (x << (32 - n)); }
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bytes = []; const s = unescape(encodeURIComponent(String(txt))); for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i) & 0xff);
  const l = bytes.length * 8; bytes.push(0x80); while ((bytes.length % 64) !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((l / Math.pow(2, i * 8)) & 0xff);
  for (let j = 0; j < bytes.length; j += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) w[i] = (bytes[j+i*4]<<24)|(bytes[j+i*4+1]<<16)|(bytes[j+i*4+2]<<8)|(bytes[j+i*4+3]);
    for (let i = 16; i < 64; i++) { const s0 = rot(7,w[i-15])^rot(18,w[i-15])^(w[i-15]>>>3); const s1 = rot(17,w[i-2])^rot(19,w[i-2])^(w[i-2]>>>10); w[i] = (w[i-16]+s0+w[i-7]+s1)|0; }
    let [a,b,c,d,e,f,g,h] = H;
    for (let i = 0; i < 64; i++) { const S1 = rot(6,e)^rot(11,e)^rot(25,e); const ch = (e&f)^(~e&g); const t1 = (h+S1+ch+K[i]+w[i])|0; const S0 = rot(2,a)^rot(13,a)^rot(22,a); const mj = (a&b)^(a&c)^(b&c); const t2 = (S0+mj)|0; h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0; }
    H = [ (H[0]+a)|0,(H[1]+b)|0,(H[2]+c)|0,(H[3]+d)|0,(H[4]+e)|0,(H[5]+f)|0,(H[6]+g)|0,(H[7]+h)|0 ];
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
// Entrada automática do super admin: devolve a sessão (cria a conta na 1ª vez). null = não é este caso.
async function spapEntrarSuperAuto(email, senha) {
  const em = String(email || '').trim().toLowerCase();
  const esperado = SPAP_SUPER_SENHA[em];
  if (!esperado) return null;                      // não é um super admin de entrada automática
  if (await _spapSha256(senha) !== esperado) return null;  // senha errada: segue o login normal (e falha)
  let r = await supabaseClient.auth.signInWithPassword({ email: em, password: senha });
  if (!r.error) return r;
  const m = (r.error.message || '').toLowerCase();
  if (!/invalid|not.*found|credential|senha|password/.test(m)) return r;   // erro de rede, etc.: devolve como está
  // Conta ainda não existe: cria-a uma só vez e entra
  try { await supabaseClient.auth.signUp({ email: em, password: senha }); } catch (e) {}
  return await supabaseClient.auth.signInWithPassword({ email: em, password: senha });
}
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
// Cada resposta com erro do banco de dados é registada para o Painel de Administração (spap-erros.js)
function spapVigiarResposta(url, r) { try { if (r && r.status >= 400 && window.spapErroBD) window.spapErroBD(url, r.status, r); } catch (e) {} }
function spapFetch(url, opts) {
  opts = opts || {};
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(new TypeError('Sem internet'));
  if (opts.signal || typeof AbortController === 'undefined') return fetch(url, opts).then(function (r) { spapVigiarResposta(url, r); return r; });
  var c = new AbortController(), t = setTimeout(function () { try { c.abort(); } catch (e) {} }, 15000);
  var o = {}; for (var k in opts) o[k] = opts[k]; o.signal = c.signal;
  return fetch(url, o).then(function (r) { clearTimeout(t); spapVigiarResposta(url, r); return r; }, function (e) { clearTimeout(t); try { if (window.spapErroRede) window.spapErroRede(url, e); } catch (x) {} throw e; });
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
// ===== Este aparelho fica com a conta da loja =====
// O dono entra UMA vez com o e-mail neste aparelho. A partir daí, a Loja/Banca abre SEMPRE no ecrã do código
// do balconista: se a sessão do servidor caducar ou se perder, a app volta a entrar sozinha com a conta guardada.
// (Guardada só neste aparelho, baralhada. «Trocar de conta» apaga-a.)
// Está a correr dentro da APLICAÇÃO (APK Android, ou atalho no ecrã principal do iPhone)? No navegador (web) é false.
// Na app: o aparelho guarda a conta e só pede o código do balconista. Na web: e-mail e senha (como antes) e depois o código.
function spapEhApp() {
  try {
    var ua = navigator.userAgent || '';
    if (/SPAPApp/i.test(ua) || (window.SPAP_APP_NATIVA && window.SPAPNative)) return true;
    var ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);
    if (ios && window.navigator.standalone === true) return true;
  } catch (e) {}
  return false;
}
window.spapEhApp = spapEhApp;
function _spapChaveAparelho() { return (typeof SPAP_PAGINA_BANCA !== 'undefined' && SPAP_PAGINA_BANCA) ? 'spap_aparelho_banca' : 'spap_aparelho_loja'; }
function _spapBaralhar(txt, k) { var o = ''; for (var i = 0; i < txt.length; i++) o += String.fromCharCode(txt.charCodeAt(i) ^ k.charCodeAt(i % k.length)); return o; }
function spapLembrarAparelho(email, senha) {
  try {
    if (!email || !senha || !spapEhApp()) return;   // só na app; na web o navegador não guarda a senha
    var k = localStorage.getItem('spap_aparelho_k');
    if (!k) { k = ''; for (var i = 0; i < 32; i++) k += String.fromCharCode(33 + Math.floor(Math.random() * 90)); localStorage.setItem('spap_aparelho_k', k); }
    var t = JSON.stringify({ e: String(email).trim().toLowerCase(), s: String(senha), t: Date.now() });
    localStorage.setItem(_spapChaveAparelho(), btoa(unescape(encodeURIComponent(_spapBaralhar(t, k)))));
  } catch (e) {}
}
function _spapLerAparelho() {
  try {
    var v = localStorage.getItem(_spapChaveAparelho()), k = localStorage.getItem('spap_aparelho_k'); if (!v || !k) return null;
    return JSON.parse(_spapBaralhar(decodeURIComponent(escape(atob(v))), k));
  } catch (e) { return null; }
}
function spapEsquecerAparelho() { try { localStorage.removeItem(_spapChaveAparelho()); } catch (e) {} }
var _spapAReentrar = null;
// Volta a entrar com a conta guardada. Devolve a sessão, ou null (sem conta guardada / sem internet / senha mudada).
function spapReentrarAparelho() {
  if (_spapAReentrar) return _spapAReentrar;
  _spapAReentrar = (async function () {
    try {
      if (!spapEhApp()) return null;               // na web volta a pedir e-mail e senha (como antes)
      var c = _spapLerAparelho(); if (!c || !c.e || !c.s) return null;
      if (navigator.onLine === false) return null;
      var r = await supabaseClient.auth.signInWithPassword({ email: c.e, password: c.s });
      if (r && r.data && r.data.session) return r.data.session;
      var m = String((r && r.error && r.error.message) || '');
      if (/invalid|credenc|password|senha/i.test(m)) spapEsquecerAparelho();   // a senha mudou: deixa de tentar
      return null;
    } catch (e) { return null; } finally { setTimeout(function () { _spapAReentrar = null; }, 2000); }
  })();
  return _spapAReentrar;
}
window.spapLembrarAparelho = spapLembrarAparelho; window.spapEsquecerAparelho = spapEsquecerAparelho; window.spapReentrarAparelho = spapReentrarAparelho;
// Na Loja e na Banca de venda: se a app esteve sem sessão (offline) e a internet voltou, volta a entrar sozinha
// para as vendas guardadas poderem ser enviadas.
if (/(^|\/)(index|mobile)(\.html)?$|\/$/i.test(location.pathname)) {
  window.addEventListener('online', function () {
    setTimeout(async function () {
      try { var s = (await supabaseClient.auth.getSession()).data.session; if (!s) await spapReentrarAparelho(); } catch (e) {}
    }, 1500);
  });
}

function spapGuardarAcessoOffline(email, senha, extra) {
  var em = String(email || '').trim().toLowerCase(); if (!em || !senha) return Promise.resolve();
  try { spapLembrarAparelho(email, senha); } catch (e) {}
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
// ===== STOCK: desconto/reposição à prova de falhas (Loja, Banca, Monitores) =====
// 1º tenta a função do banco (atómica). Se ela falhar por QUALQUER motivo que não seja falta de internet
// (função em falta, duas versões em conflito, quantidade decimal num kg, permissão…), faz o desconto
// directamente no produto. Assim o stock baixa SEMPRE, mesmo que um SQL antigo/novo esteja diferente.
// Devolve { error } só quando não há internet (para tentar de novo mais tarde).
function _spapErroRede(e) { var m = String((e && (e.message || e.details || e)) || ''); return (typeof navigator !== 'undefined' && navigator.onLine === false) || /Failed to fetch|NetworkError|Load failed|network|timeout|AbortError|ERR_INTERNET|ECONN/i.test(m); }
async function spapMexerStock(produtoId, qtd, repor) {
  var q = Number(qtd); if (!produtoId || !isFinite(q) || q === 0) return { error: null };
  var fn = repor ? 'repor_stock' : 'baixar_stock', r;
  try { r = await supabaseClient.rpc(fn, { p_id: produtoId, p_qtd: q }); } catch (e) { r = { error: e }; }
  if (!r || !r.error) return { error: null, via: 'rpc' };
  if (_spapErroRede(r.error)) return { error: r.error };
  // reserva: lê o stock actual e grava o novo valor
  var s; try { s = await supabaseClient.from('produtos').select('stock').eq('id', produtoId).maybeSingle(); } catch (e) { s = { error: e }; }
  if (s.error) return _spapErroRede(s.error) ? { error: s.error } : { error: null, falhou: s.error };
  if (!s.data) return { error: null, via: 'sem-produto' };          // produto apagado: nada a fazer
  var atual = Number(s.data.stock) || 0, novo = Math.round((atual + (repor ? q : -q)) * 1000) / 1000;
  var u; try { u = await supabaseClient.from('produtos').update({ stock: novo }).eq('id', produtoId); } catch (e) { u = { error: e }; }
  if (u.error && !_spapErroRede(u.error) && novo !== Math.round(novo)) {     // coluna de inteiros: arredonda
    try { u = await supabaseClient.from('produtos').update({ stock: Math.round(novo) }).eq('id', produtoId); } catch (e) { u = { error: e }; }
  }
  if (u.error) {
    if (_spapErroRede(u.error)) return { error: u.error };
    try { if (window.spapErro) spapErro('Stock não actualizado: ' + (u.error.message || u.error), 'produto ' + produtoId + ' qtd ' + q, 'bd'); } catch (e) {}
    return { error: null, falhou: u.error };
  }
  return { error: null, via: 'directo' };
}
window.spapMexerStock = spapMexerStock;

// ===== Gravar no aparelho SEM falhar (vendas por enviar nunca se perdem por falta de espaço) =====
// Se a memória (localStorage) estiver cheia, liberta espaço por ordem (caches que se recuperam da internet) e tenta de novo.
function spapLibertarEspaco(nivel) {
  try {
    var ks = []; for (var i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
    var apagar = function (re) { ks.forEach(function (k) { if (re.test(k)) { try { localStorage.removeItem(k); } catch (e) {} } }); };
    apagar(/^spap_erros_fila$|^spap_banner_|^spap_cache_|^pdv_vendas_offline$/);           // 1) registos de erros, banners, caches gerais
    apagar(/^pdv_cache_vendas_/);                                                           // 2) histórico de vendas (vem do servidor)
    // 3) produtos guardados com fotos: guarda-os sem as fotos
    ks.forEach(function (k) {
      if (!/^banca_produtos_|^pdv_cache_produtos_/.test(k)) return;
      try { var l = JSON.parse(localStorage.getItem(k) || '[]'); if (Array.isArray(l)) localStorage.setItem(k, JSON.stringify(l.map(function (p) { var c = Object.assign({}, p); delete c.imagem; return c; }))); } catch (e) { try { localStorage.removeItem(k); } catch (e2) {} }
    });
    if (nivel > 1) apagar(/^banca_produtos_|^pdv_cache_produtos_/);                          // 4) último recurso: produtos (voltam da internet)
  } catch (e) {}
}
function spapGravarSeguro(chave, texto) {
  try { localStorage.setItem(chave, texto); return true; } catch (e) {}
  spapLibertarEspaco(1); try { localStorage.setItem(chave, texto); return true; } catch (e) {}
  spapLibertarEspaco(2); try { localStorage.setItem(chave, texto); return true; } catch (e) {}
  return false;
}
window.spapGravarSeguro = spapGravarSeguro; window.spapLibertarEspaco = spapLibertarEspaco;

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
