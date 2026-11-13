-- =====================================================================
-- SPAP v2.9.266 — Erros do sistema e estado real do banco de dados
-- Correr UMA vez no Supabase → SQL Editor → Run.
--
-- 1) Tabela spap_erros: todas as apps (Loja, Monitores, Banca, Login…)
--    registam aqui os erros que acontecem (falhas do banco de dados,
--    pedidos recusados, erros nas páginas). Só o super admin os lê.
-- 2) spap_registar_erro(): grava um erro (junta repetidos e limita abusos).
-- 3) spap_estado_bd(): informação real do servidor (tamanho, ligações,
--    há quanto tempo está ligado, consultas presas…) — só para o super admin.
-- =====================================================================

create table if not exists public.spap_erros (
  id          bigserial primary key,
  criado_em   timestamptz not null default now(),
  ultimo_em   timestamptz not null default now(),
  vezes       integer     not null default 1,
  app         text,          -- loja · monitor · banca · banca-monitor · login · admin …
  pagina      text,
  tipo        text,          -- bd (banco de dados) · rede · pagina · auth
  codigo      text,          -- código HTTP / código do Postgres
  mensagem    text,
  detalhe     text,
  assinatura  text,          -- para juntar erros iguais
  loja_id     text,
  user_id     uuid,
  email       text,
  versao      text,
  agente      text,
  resolvido   boolean     not null default false
);
create index if not exists spap_erros_ultimo_idx on public.spap_erros (ultimo_em desc);
create index if not exists spap_erros_assin_idx  on public.spap_erros (assinatura, resolvido);

alter table public.spap_erros enable row level security;

-- quem é super admin
create or replace function public.spap_sou_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select lower(coalesce((select email from auth.users where id = auth.uid()), ''))
         in ('joaomassuvir@gmail.com', 'bonifacioadelino1@gmail.com');
$$;
grant execute on function public.spap_sou_super_admin() to authenticated;

drop policy if exists spap_erros_ler on public.spap_erros;
create policy spap_erros_ler on public.spap_erros for select to authenticated using (public.spap_sou_super_admin());
drop policy if exists spap_erros_mudar on public.spap_erros;
create policy spap_erros_mudar on public.spap_erros for update to authenticated using (public.spap_sou_super_admin()) with check (public.spap_sou_super_admin());
drop policy if exists spap_erros_apagar on public.spap_erros;
create policy spap_erros_apagar on public.spap_erros for delete to authenticated using (public.spap_sou_super_admin());
-- ninguém escreve diretamente: só através da função abaixo

-- Grava um erro. Se o mesmo erro já existe (por resolver, últimas 24 h), soma +1.
create or replace function public.spap_registar_erro(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ass text := left(coalesce(p->>'assinatura', md5(coalesce(p->>'app','') || coalesce(p->>'mensagem',''))), 120);
  v_id  bigint;
  v_n   integer;
begin
  -- proteção contra abusos: no máximo 600 registos novos por hora no total
  select count(*) into v_n from public.spap_erros where criado_em > now() - interval '1 hour';
  update public.spap_erros
     set vezes = vezes + 1, ultimo_em = now(),
         detalhe = coalesce(left(p->>'detalhe', 1500), detalhe),
         email = coalesce(nullif(left(p->>'email', 120), ''), email),
         loja_id = coalesce(nullif(left(p->>'loja_id', 64), ''), loja_id)
   where id = (select id from public.spap_erros
                where assinatura = v_ass and not resolvido and ultimo_em > now() - interval '24 hours'
                order by ultimo_em desc limit 1)
   returning id into v_id;
  if v_id is null and v_n < 600 then
    insert into public.spap_erros (app, pagina, tipo, codigo, mensagem, detalhe, assinatura, loja_id, user_id, email, versao, agente)
    values (left(p->>'app', 40), left(p->>'pagina', 120), left(p->>'tipo', 20), left(p->>'codigo', 40),
            left(coalesce(p->>'mensagem', 'Erro'), 500), left(p->>'detalhe', 1500), v_ass,
            nullif(left(p->>'loja_id', 64), ''), auth.uid(), nullif(left(p->>'email', 120), ''),
            left(p->>'versao', 30), left(p->>'agente', 200));
  end if;
  -- guarda só os últimos 30 dias
  delete from public.spap_erros where ultimo_em < now() - interval '30 days';
end;
$$;
grant execute on function public.spap_registar_erro(jsonb) to anon, authenticated;

-- Informação real do servidor do banco de dados (só super admin)
create or replace function public.spap_estado_bd() returns json
language plpgsql security definer set search_path = public, pg_catalog as $$
declare r json;
begin
  if not public.spap_sou_super_admin() then return json_build_object('ok', false, 'erro', 'sem_permissao'); end if;
  select json_build_object(
    'ok', true,
    'agora', now(),
    'versao', current_setting('server_version'),
    'ligado_desde', pg_postmaster_start_time(),
    'tamanho_bytes', pg_database_size(current_database()),
    'ligacoes', (select count(*) from pg_stat_activity where datname = current_database()),
    'ligacoes_ativas', (select count(*) from pg_stat_activity where datname = current_database() and state = 'active'),
    'ligacoes_max', current_setting('max_connections')::int,
    'consultas_lentas', (select count(*) from pg_stat_activity where datname = current_database() and state = 'active' and now() - query_start > interval '30 seconds'),
    'consulta_mais_longa_s', (select coalesce(max(extract(epoch from now() - query_start)), 0)::int from pg_stat_activity where datname = current_database() and state = 'active' and backend_type = 'client backend'),
    'bloqueios_espera', (select count(*) from pg_locks where not granted),
    'so_leitura', current_setting('default_transaction_read_only'),
    'em_recuperacao', pg_is_in_recovery(),
    'tabelas', (select json_agg(t) from (
        select c.relname as nome, pg_total_relation_size(c.oid) as bytes, c.reltuples::bigint as linhas
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r'
         order by pg_total_relation_size(c.oid) desc limit 8) t),
    'erros_24h', (select count(*) from public.spap_erros where ultimo_em > now() - interval '24 hours' and not resolvido),
    'erros_1h',  (select count(*) from public.spap_erros where ultimo_em > now() - interval '1 hour' and not resolvido)
  ) into r;
  return r;
end;
$$;
grant execute on function public.spap_estado_bd() to authenticated;
