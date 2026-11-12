-- ============================================================
-- ATUALIZACAO v2.9.247 — GERENTE COM 24 HORAS A CONTAR DESDE A ATIVAÇÃO
--                       + RECUPERAR SENHA COM O CÓDIGO DO BALCONISTA
-- ============================================================
-- (Inclui tudo do v2.9.246 — se já o correste, não faz mal: corre este também.)
-- GERENTES
-- • O link aceita pessoas durante 24 horas.
-- • Quando o dono ATIVA um gerente, começa o cronómetro de 24 horas desse gerente.
--   Chegando a zero, o gerente perde o acesso e sai da lista (pendentes também saem quando o link fecha).
-- • Eliminar um link: a lista some, o link deixa de funcionar e as pessoas perdem o acesso.
-- • Os PRODUTOS registados por essas pessoas NÃO são apagados: ficam na loja.
-- SENHA
-- • "Esqueci a senha" → email + código do balconista → definir nova senha (sem email).
-- Seguro repetir. Correr no Supabase > SQL Editor > New query > Run.
-- ============================================================

-- 1) Tabelas (cria se faltar, acrescenta as colunas novas)
create table if not exists public.gerente_convites (
  token text primary key,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  criado_em timestamptz default now()
);
alter table public.gerente_convites add column if not exists expira_em timestamptz;
alter table public.gerente_convites alter column expira_em set default (now() + interval '24 hours');
update public.gerente_convites set expira_em = coalesce(criado_em, now()) + interval '24 hours' where expira_em is null;

create table if not exists public.gerente_acessos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  nome text not null default 'Gerente',
  criado_em timestamptz not null default now()
);
alter table public.gerente_acessos add column if not exists user_id uuid;
alter table public.gerente_acessos add column if not exists estado text default 'pendente';
alter table public.gerente_acessos add column if not exists convite_token text;
alter table public.gerente_acessos add column if not exists ativado_em timestamptz;
alter table public.gerente_acessos add column if not exists acesso_expira_em timestamptz;
-- gerentes que já estavam ativos: o cronómetro de 24 horas começa agora
update public.gerente_acessos set ativado_em = now(), acesso_expira_em = now() + interval '24 hours'
 where estado = 'activo' and acesso_expira_em is null;
-- pedidos antigos sem link: ficam ligados ao link que existia quando entraram
update public.gerente_acessos a set convite_token = (
    select c.token from public.gerente_convites c
    where c.loja_id = a.loja_id and coalesce(c.criado_em, now()) <= a.criado_em + interval '5 minutes'
    order by c.criado_em desc limit 1)
  where a.convite_token is null;
create index if not exists idx_gacessos_token on public.gerente_acessos(convite_token);
alter table public.gerente_convites enable row level security;
alter table public.gerente_acessos enable row level security;

-- 2) Quem pode gerir os gerentes de uma loja (dono/admin da loja ou Super Admin)
create or replace function public.spap_pode_gerir_loja(p_loja uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros_loja where user_id = auth.uid() and loja_id = p_loja and papel in ('admin', 'dono'))
      or lower(coalesce((select email from auth.users where id = auth.uid()), '')) in ('joaomassuvir@gmail.com', 'bonifacioadelino1@gmail.com');
$$;

-- tira o acesso de gerente (só o papel 'gerente'; nunca toca no dono nem nos produtos)
create or replace function public.spap_gerente_tirar_acesso(p_user uuid, p_loja uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  delete from membros_loja where user_id = p_user and loja_id = p_loja and papel = 'gerente';
end; $$;
revoke execute on function public.spap_gerente_tirar_acesso(uuid, uuid) from public, anon, authenticated;

-- 3) Limpeza: gerente ativo com as 24 horas esgotadas sai; link fechado leva os pendentes
create or replace function public.gerente_limpar(p_loja uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  -- a) cronómetro do gerente chegou a zero
  for r in select id, user_id from gerente_acessos
            where loja_id = p_loja and estado = 'activo' and acesso_expira_em is not null and acesso_expira_em <= now() loop
    perform spap_gerente_tirar_acesso(r.user_id, p_loja);
    delete from gerente_acessos where id = r.id;
    n := n + 1;
  end loop;
  -- b) links com mais de 24 horas: já não aceitam ninguém; pendentes/desativados saem;
  --    o link some quando já não tem nenhum gerente com tempo a contar
  for r in select token from gerente_convites where loja_id = p_loja and coalesce(expira_em, criado_em + interval '24 hours') <= now() loop
    perform spap_gerente_tirar_acesso(a.user_id, p_loja) from gerente_acessos a where a.convite_token = r.token and a.estado <> 'activo';
    delete from gerente_acessos where convite_token = r.token and estado <> 'activo';
    if not exists (select 1 from gerente_acessos where convite_token = r.token) then
      delete from gerente_convites where token = r.token;
      n := n + 1;
    end if;
  end loop;
  return n;
end; $$;

-- 4) Criar um link novo (válido 24 horas)
create or replace function public.gerente_criar_convite(p_loja uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_token text; v_exp timestamptz;
begin
  if not spap_pode_gerir_loja(p_loja) then raise exception 'sem_permissao'; end if;
  perform gerente_limpar(p_loja);
  v_token := 'g' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
  v_exp := now() + interval '24 hours';
  insert into gerente_convites (token, loja_id, criado_em, expira_em) values (v_token, p_loja, now(), v_exp);
  return json_build_object('token', v_token, 'criado_em', now(), 'expira_em', v_exp);
end; $$;

-- 5) Quem abre o link: valida (existe e ainda não expirou) e devolve a loja
create or replace function public.resgatar_convite_gerente(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_loja uuid;
begin
  select loja_id into v_loja from gerente_convites where token = p_token;
  if v_loja is null then raise exception 'convite_invalido'; end if;
  perform gerente_limpar(v_loja);
  if not exists (select 1 from gerente_convites where token = p_token and expira_em > now()) then raise exception 'convite_expirado'; end if;
  return v_loja;
end; $$;

-- 6) Quem abre o link pede acesso com o seu nome (fica pendente até o dono ativar)
create or replace function public.gerente_pedir_acesso(p_token text, p_nome text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_loja uuid;
begin
  if auth.uid() is null then raise exception 'sem_sessao'; end if;
  v_loja := resgatar_convite_gerente(p_token);
  if exists (select 1 from membros_loja where user_id = auth.uid() and loja_id = v_loja) then return v_loja; end if;
  if exists (select 1 from gerente_acessos where user_id = auth.uid() and loja_id = v_loja) then
    update gerente_acessos set convite_token = p_token, estado = 'pendente',
           nome = coalesce(nullif(trim(p_nome), ''), nome)
     where user_id = auth.uid() and loja_id = v_loja and (convite_token is distinct from p_token or estado <> 'activo');
  else
    insert into gerente_acessos (user_id, loja_id, nome, estado, convite_token)
    values (auth.uid(), v_loja, coalesce(nullif(trim(p_nome), ''), 'Gerente'), 'pendente', p_token);
  end if;
  return v_loja;
end; $$;

-- 7) Painel do dono: links válidos com a sua lista
create or replace function public.gerente_painel(p_loja uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not spap_pode_gerir_loja(p_loja) then raise exception 'sem_permissao'; end if;
  perform gerente_limpar(p_loja);
  return json_build_object(
    'agora', now(),
    'convites', coalesce((
      select json_agg(json_build_object(
        'token', c.token, 'criado_em', c.criado_em, 'expira_em', c.expira_em, 'link_aberto', c.expira_em > now(),
        'acessos', coalesce((select json_agg(json_build_object('id', a.id, 'user_id', a.user_id, 'nome', a.nome,
                     'estado', coalesce(a.estado, 'pendente'), 'criado_em', a.criado_em,
                     'ativado_em', a.ativado_em, 'acesso_expira_em', a.acesso_expira_em) order by a.criado_em)
                   from gerente_acessos a where a.convite_token = c.token), '[]'::json)
      ) order by c.criado_em desc)
      from gerente_convites c where c.loja_id = p_loja), '[]'::json));
end; $$;

-- 8) Ativar / desativar uma pessoa da lista
create or replace function public.gerente_definir_estado(p_acesso uuid, p_ativo boolean)
returns text language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from gerente_acessos where id = p_acesso;
  if a.id is null then raise exception 'pedido_nao_encontrado'; end if;
  if not spap_pode_gerir_loja(a.loja_id) then raise exception 'sem_permissao'; end if;
  perform gerente_limpar(a.loja_id);
  if not exists (select 1 from gerente_acessos where id = p_acesso) then raise exception 'convite_expirado'; end if;
  if p_ativo then
    if a.user_id is null then raise exception 'pedido_antigo'; end if;
    -- só se ativa enquanto o link está aberto (24 horas desde que foi criado)
    if not exists (select 1 from gerente_convites where token = a.convite_token and expira_em > now()) then raise exception 'convite_expirado'; end if;
    if not exists (select 1 from membros_loja where user_id = a.user_id and loja_id = a.loja_id) then
      insert into membros_loja (user_id, loja_id, papel, nome_exibicao) values (a.user_id, a.loja_id, 'gerente', coalesce(a.nome, 'Gerente'));
    end if;
    update gerente_acessos set estado = 'activo', ativado_em = now(), acesso_expira_em = now() + interval '24 hours' where id = p_acesso;
    return 'activo';
  else
    perform spap_gerente_tirar_acesso(a.user_id, a.loja_id);
    update gerente_acessos set estado = 'cancelado', ativado_em = null, acesso_expira_em = null where id = p_acesso;
    return 'cancelado';
  end if;
end; $$;

-- 9) Eliminar uma pessoa da lista (perde o acesso; os produtos ficam)
create or replace function public.gerente_eliminar_acesso(p_acesso uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from gerente_acessos where id = p_acesso;
  if a.id is null then return true; end if;
  if not spap_pode_gerir_loja(a.loja_id) then raise exception 'sem_permissao'; end if;
  perform spap_gerente_tirar_acesso(a.user_id, a.loja_id);
  delete from gerente_acessos where id = p_acesso;
  return true;
end; $$;

-- 10) Eliminar o link inteiro: a lista some, o link deixa de funcionar, os produtos ficam
create or replace function public.gerente_eliminar_convite(p_token text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_loja uuid; n integer;
begin
  select loja_id into v_loja from gerente_convites where token = p_token;
  if v_loja is null then return 0; end if;
  if not spap_pode_gerir_loja(v_loja) then raise exception 'sem_permissao'; end if;
  perform spap_gerente_tirar_acesso(a.user_id, v_loja) from gerente_acessos a where a.convite_token = p_token;
  select count(*) into n from gerente_acessos where convite_token = p_token;
  delete from gerente_acessos where convite_token = p_token;
  delete from gerente_convites where token = p_token;
  return n;
end; $$;

-- 11) Situação do gerente (o Monitor do gerente pergunta de minuto a minuto)
create or replace function public.gerente_minha_situacao()
returns text language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if auth.uid() is null then return 'sem_sessao'; end if;
  for a in select distinct loja_id from gerente_acessos where user_id = auth.uid() loop perform gerente_limpar(a.loja_id); end loop;
  for a in select distinct loja_id from membros_loja where user_id = auth.uid() and papel = 'gerente' loop perform gerente_limpar(a.loja_id); end loop;
  if exists (select 1 from membros_loja where user_id = auth.uid() and papel = 'gerente') then return 'activo'; end if;
  select estado into a from gerente_acessos where user_id = auth.uid() order by criado_em desc limit 1;
  if a.estado is null then return 'sem_convite'; end if;
  return a.estado;
end; $$;

-- 11b) Cronómetro do gerente: quanto tempo de acesso lhe resta
create or replace function public.gerente_meu_acesso()
returns json language plpgsql security definer set search_path = public as $$
declare v_sit text; a record;
begin
  v_sit := gerente_minha_situacao();
  select acesso_expira_em, ativado_em into a from gerente_acessos
   where user_id = auth.uid() and estado = 'activo' order by acesso_expira_em desc nulls last limit 1;
  return json_build_object('estado', v_sit, 'agora', now(), 'ativado_em', a.ativado_em, 'expira_em', a.acesso_expira_em);
end; $$;

-- ============================================================
-- RECUPERAR SENHA COM O CÓDIGO DO BALCONISTA (sem email)
-- ============================================================
-- Nota: a senha é guardada encriptada (ninguém a consegue ler, nem o Supabase).
-- Por isso, depois de confirmar o email e o código, a pessoa define uma senha nova e o ecrã mostra-a.
create table if not exists public.spap_recuperacao (
  email text primary key,
  tentativas integer not null default 0,
  janela timestamptz not null default now(),
  token text,
  token_expira timestamptz
);
alter table public.spap_recuperacao enable row level security;   -- sem políticas: só as funções mexem

-- conta (dono) desse email para o tipo pedido ('loja' ou 'banca')
create or replace function public.spap_rec_conta(p_email text, p_tipo text)
returns table (user_id uuid, loja_id uuid, loja_nome text, vendedores jsonb)
language sql stable security definer set search_path = public as $$
  select u.id, l.id, l.nome, coalesce(to_jsonb(l) -> 'vendedores', '[]'::jsonb)
    from auth.users u
    join membros_loja m on m.user_id = u.id and m.papel in ('admin', 'dono')
    join lojas l on l.id = m.loja_id
   where lower(u.email) = lower(trim(p_email))
     and coalesce(l.estado, '') <> 'encerrado'
     and (case when p_tipo = 'banca' then coalesce(l.tipo_loja, '') = 'banca' else coalesce(l.tipo_loja, '') <> 'banca' end)
   order by l.criado_em desc nulls last;
$$;
revoke execute on function public.spap_rec_conta(text, text) from public, anon, authenticated;

-- passo 1: confirmar o email
create or replace function public.recuperar_senha_verificar(p_email text, p_tipo text)
returns json language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if lower(trim(p_email)) in ('joaomassuvir@gmail.com', 'bonifacioadelino1@gmail.com') then
    return json_build_object('ok', false, 'erro', 'protegido');
  end if;
  select * into c from spap_rec_conta(p_email, p_tipo) limit 1;
  if c.user_id is null then return json_build_object('ok', false, 'erro', 'sem_conta'); end if;
  if jsonb_typeof(c.vendedores) <> 'array' or not exists (
       select 1 from jsonb_array_elements_text(c.vendedores) v where trim(v) <> '' and trim(v) <> '0000') then
    return json_build_object('ok', false, 'erro', 'sem_codigo', 'loja', c.loja_nome);
  end if;
  return json_build_object('ok', true, 'loja', c.loja_nome);
end; $$;

-- passo 2: confirmar o código do balconista (máx. 5 tentativas em 15 minutos)
create or replace function public.recuperar_senha_codigo(p_email text, p_tipo text, p_codigo text)
returns json language plpgsql security definer set search_path = public as $$
declare c record; r record; v_email text := lower(trim(p_email)); v_tok text;
begin
  if v_email in ('joaomassuvir@gmail.com', 'bonifacioadelino1@gmail.com') then return json_build_object('ok', false, 'erro', 'protegido'); end if;
  insert into spap_recuperacao (email) values (v_email) on conflict (email) do nothing;
  select * into r from spap_recuperacao where email = v_email;
  if r.janela < now() - interval '15 minutes' then
    update spap_recuperacao set tentativas = 0, janela = now() where email = v_email;
    r.tentativas := 0;
  end if;
  if r.tentativas >= 5 then
    return json_build_object('ok', false, 'erro', 'bloqueado',
      'minutos', greatest(1, ceil(extract(epoch from (r.janela + interval '15 minutes' - now())) / 60)));
  end if;
  for c in select * from spap_rec_conta(v_email, p_tipo) loop
    if jsonb_typeof(c.vendedores) = 'array' and exists (
         select 1 from jsonb_array_elements_text(c.vendedores) v
          where trim(v) = trim(p_codigo) and trim(v) <> '' and trim(v) <> '0000') then
      v_tok := replace(gen_random_uuid()::text, '-', '');
      update spap_recuperacao set tentativas = 0, janela = now(), token = v_tok, token_expira = now() + interval '10 minutes' where email = v_email;
      return json_build_object('ok', true, 'token', v_tok);
    end if;
  end loop;
  update spap_recuperacao set tentativas = tentativas + 1 where email = v_email;
  return json_build_object('ok', false, 'erro', 'codigo_errado', 'restam', greatest(0, 4 - r.tentativas));
end; $$;

-- passo 3: definir a nova senha (o token vale 10 minutos e só serve uma vez)
create or replace function public.recuperar_senha_definir(p_email text, p_tipo text, p_token text, p_nova text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare c record; v_email text := lower(trim(p_email));
begin
  if length(coalesce(p_nova, '')) < 6 then return json_build_object('ok', false, 'erro', 'senha_curta'); end if;
  if not exists (select 1 from spap_recuperacao where email = v_email and token = p_token and token_expira > now()) then
    return json_build_object('ok', false, 'erro', 'token_invalido');
  end if;
  select * into c from spap_rec_conta(v_email, p_tipo) limit 1;
  if c.user_id is null then return json_build_object('ok', false, 'erro', 'sem_conta'); end if;
  update auth.users set encrypted_password = crypt(p_nova, gen_salt('bf')), updated_at = now() where id = c.user_id;
  update spap_recuperacao set token = null, token_expira = null where email = v_email;
  return json_build_object('ok', true);
end; $$;

grant execute on function public.recuperar_senha_verificar(text, text) to anon, authenticated;
grant execute on function public.recuperar_senha_codigo(text, text, text) to anon, authenticated;
grant execute on function public.recuperar_senha_definir(text, text, text, text) to anon, authenticated;
grant execute on function public.gerente_meu_acesso() to authenticated;
grant execute on function public.spap_pode_gerir_loja(uuid) to authenticated;
grant execute on function public.gerente_limpar(uuid) to authenticated;
grant execute on function public.gerente_criar_convite(uuid) to authenticated;
grant execute on function public.resgatar_convite_gerente(text) to anon, authenticated;
grant execute on function public.gerente_pedir_acesso(text, text) to authenticated;
grant execute on function public.gerente_painel(uuid) to authenticated;
grant execute on function public.gerente_definir_estado(uuid, boolean) to authenticated;
grant execute on function public.gerente_eliminar_acesso(uuid) to authenticated;
grant execute on function public.gerente_eliminar_convite(text) to authenticated;
grant execute on function public.gerente_minha_situacao() to authenticated;

-- 12) Limpa já os links com mais de 24 horas
do $$ declare l uuid; begin
  for l in select distinct loja_id from public.gerente_convites loop perform public.gerente_limpar(l); end loop;
end $$;

-- VERIFICACAO — deve listar as 11 funções
select proname from pg_proc where proname in ('gerente_criar_convite','gerente_painel','gerente_definir_estado',
  'gerente_eliminar_acesso','gerente_eliminar_convite','gerente_pedir_acesso','gerente_minha_situacao','gerente_meu_acesso',
  'recuperar_senha_verificar','recuperar_senha_codigo','recuperar_senha_definir') order by 1;
