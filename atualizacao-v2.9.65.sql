-- ============================================================
-- v2.9.65 — Subcategorias + Transferir entre lojas
-- Corre TUDO no SQL Editor do Supabase e clica RUN. É seguro (aditivo).
-- ============================================================

-- 1) SUBCATEGORIA nos produtos
alter table produtos add column if not exists subcategoria text;

-- 2) TRANSFERÊNCIAS entre lojas do mesmo dono
create table if not exists transferencias (
  id uuid primary key default gen_random_uuid(),
  de_loja uuid not null references lojas(id) on delete cascade,
  para_loja uuid not null references lojas(id) on delete cascade,
  itens jsonb not null default '[]',
  estado text not null default 'pendente' check (estado in ('pendente','confirmado','cancelado')),
  criado_por text,
  nota text,
  criado_em timestamptz default now(),
  confirmado_em timestamptz
);

alter table transferencias enable row level security;

-- Quem é membro de QUALQUER uma das duas lojas pode ver a transferência
drop policy if exists tr_sel on transferencias;
create policy tr_sel on transferencias for select to authenticated
  using (
    de_loja in (select loja_id from membros_loja where user_id = auth.uid())
    or para_loja in (select loja_id from membros_loja where user_id = auth.uid())
  );

-- Só membro da loja de ORIGEM pode criar
drop policy if exists tr_ins on transferencias;
create policy tr_ins on transferencias for insert to authenticated
  with check (de_loja in (select loja_id from membros_loja where user_id = auth.uid()));

-- Membro de qualquer das duas lojas pode atualizar (confirmar/cancelar)
drop policy if exists tr_upd on transferencias;
create policy tr_upd on transferencias for update to authenticated
  using (
    de_loja in (select loja_id from membros_loja where user_id = auth.uid())
    or para_loja in (select loja_id from membros_loja where user_id = auth.uid())
  );

create index if not exists tr_para_estado on transferencias(para_loja, estado);
create index if not exists tr_de_estado on transferencias(de_loja, estado);

-- Pronto!
