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
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY,
  _ehGerente ? { auth: { storageKey: 'sb-spap-gerente', persistSession: true, autoRefreshToken: true } } : undefined
);
