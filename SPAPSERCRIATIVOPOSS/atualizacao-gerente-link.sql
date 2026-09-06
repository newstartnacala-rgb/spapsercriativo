-- ============================================================
-- MONITOR EXTRA (GERENTE) POR LINK — sem criar conta
-- ------------------------------------------------------------
-- IMPORTANTE: no Supabase, ativa primeiro o login anonimo:
--   Authentication -> Providers -> "Anonymous sign-ins" -> ON
-- Depois corre este SQL:

create table if not exists gerente_convites (
  token text primary key,
  loja_id uuid not null references lojas(id) on delete cascade,
  criado_em timestamptz default now()
);
alter table gerente_convites enable row level security;

drop policy if exists gc_insert on gerente_convites;
create policy gc_insert on gerente_convites for insert to authenticated
  with check (loja_id in (select loja_id from membros_loja where user_id = auth.uid() and papel = 'admin'));

drop policy if exists gc_select on gerente_convites;
create policy gc_select on gerente_convites for select to authenticated
  using (loja_id in (select loja_id from membros_loja where user_id = auth.uid() and papel = 'admin'));

-- Resgata o convite: torna o utilizador atual GERENTE da loja do token
create or replace function resgatar_convite_gerente(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_loja uuid;
begin
  select loja_id into v_loja from gerente_convites where token = p_token;
  if v_loja is null then raise exception 'Convite invalido'; end if;
  if not exists (select 1 from membros_loja where user_id = auth.uid() and loja_id = v_loja) then
    insert into membros_loja (user_id, loja_id, papel, nome_exibicao)
    values (auth.uid(), v_loja, 'gerente', 'Gerente');
  end if;
  return v_loja;
end; $$;
grant execute on function resgatar_convite_gerente(text) to anon, authenticated;
