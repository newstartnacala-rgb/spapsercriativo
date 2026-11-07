-- ============================================================
-- MOBILE POSS (bancas) — registo de DESCONTOS do balconista.
-- Quando o balconista baixa o preço de um produto, fica aqui registado
-- para o dono ver no monitor: que produto, de quanto para quanto, quando.
-- Correr no SQL Editor do Supabase.
-- ============================================================

create table if not exists descontos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  produto_id uuid,
  produto_nome text,
  preco_original numeric,
  preco_novo numeric,
  quantidade numeric default 1,
  feito_por text,                 -- nome/código de quem descontou
  criado_em timestamptz not null default now()
);

alter table descontos enable row level security;

-- Qualquer membro da loja (dono/admin OU gerente/balconista) vê os descontos da sua loja
drop policy if exists "descontos_select" on descontos;
create policy "descontos_select" on descontos
  for select using (
    loja_id in (select loja_id from membros_loja where user_id = auth.uid())
  );

-- Qualquer membro da loja pode registar um desconto na sua loja
drop policy if exists "descontos_insert" on descontos;
create policy "descontos_insert" on descontos
  for insert with check (
    loja_id in (select loja_id from membros_loja where user_id = auth.uid())
  );

create index if not exists idx_descontos_loja on descontos(loja_id, criado_em desc);

-- Marca uma loja como "banca" (usa a app Mobile POSS). Troca o email pelo da conta.
-- update lojas set tipo_loja = 'banca'
--   where id in (select loja_id from membros_loja m join auth.users u on u.id = m.user_id where u.email = 'EMAIL_DA_BANCA');
