-- ============================================================
-- Registo dos NOMES de quem entra pelo link do gerente.
-- O dono ve a lista em "Funcionarios" e sabe quantas pessoas acederam.
-- Correr no SQL Editor do Supabase.
-- ============================================================

create table if not exists gerente_acessos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);

alter table gerente_acessos enable row level security;

-- Qualquer membro da loja (dono/admin OU gerente) pode VER os acessos da sua loja
drop policy if exists "gacessos_select" on gerente_acessos;
create policy "gacessos_select" on gerente_acessos
  for select using (
    loja_id in (select loja_id from membros_loja where user_id = auth.uid())
  );

-- Um membro da loja pode REGISTAR o seu proprio acesso
drop policy if exists "gacessos_insert" on gerente_acessos;
create policy "gacessos_insert" on gerente_acessos
  for insert with check (
    loja_id in (select loja_id from membros_loja where user_id = auth.uid())
  );

create index if not exists idx_gacessos_loja on gerente_acessos(loja_id, criado_em desc);
