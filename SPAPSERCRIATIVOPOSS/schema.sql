-- ============================================================
-- MEU PDV — Schema multi-loja (SaaS) para Supabase
-- ============================================================
-- Este script cria toda a estrutura de base de dados necessária
-- para o sistema funcionar com múltiplas lojas isoladas entre si.
--
-- Como correr: Supabase Dashboard → SQL Editor → cola este ficheiro
-- inteiro → Run.
-- ============================================================

-- ---------- 1. TABELA DE LOJAS ----------
-- Cada loja é uma conta independente no sistema.
create table public.lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dono_user_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- ---------- 2. TABELA DE MEMBROS DA LOJA (utilizadores ligados a uma loja) ----------
-- Permite ter mais do que 1 utilizador por loja no futuro (dono + vendedores),
-- já preparado mesmo que no MVP só uses 1 utilizador por loja.
create table public.membros_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'admin' check (papel in ('admin', 'vendedor')),
  nome_exibicao text,
  criado_em timestamptz not null default now(),
  unique (loja_id, user_id)
);

-- ---------- 3. TABELA DE PRODUTOS ----------
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  nome text not null,
  codigo text,
  codbarras text,
  categoria text not null default 'Sem Categoria',
  preco numeric(12,2) not null check (preco >= 0),
  stock integer not null default 0,
  imagem text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------- 4. TABELA DE VENDAS ----------
create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  numero_do_dia integer not null,
  metodo text not null,
  total numeric(12,2) not null,
  recebido numeric(12,2),
  troco numeric(12,2),
  vendedor_user_id uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

-- ---------- 5. TABELA DE ITENS DE VENDA ----------
create table public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  produto_nome text not null,
  qtd integer not null check (qtd > 0),
  preco_unitario numeric(12,2) not null
);

-- ---------- 6. ÍNDICES PARA PERFORMANCE ----------
create index idx_produtos_loja on public.produtos(loja_id);
create index idx_vendas_loja on public.vendas(loja_id);
create index idx_venda_itens_venda on public.venda_itens(venda_id);
create index idx_membros_loja_user on public.membros_loja(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — isolamento de dados por loja
-- ============================================================
-- Garante que cada utilizador só vê/edita dados da(s) loja(s)
-- a que pertence. Sem isto, qualquer loja veria os dados de todas.

alter table public.lojas enable row level security;
alter table public.membros_loja enable row level security;
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;

-- Função auxiliar: devolve os IDs das lojas a que o utilizador autenticado pertence
create or replace function public.minhas_lojas()
returns setof uuid
language sql
security definer
stable
as $$
  select loja_id from public.membros_loja where user_id = auth.uid();
$$;

-- LOJAS: só vê/edita a loja se for membro dela
create policy "Ver as minhas lojas" on public.lojas
  for select using (id in (select public.minhas_lojas()));

create policy "Dono pode atualizar a loja" on public.lojas
  for update using (dono_user_id = auth.uid());

create policy "Qualquer utilizador autenticado pode criar uma loja" on public.lojas
  for insert with check (dono_user_id = auth.uid());

-- MEMBROS_LOJA: só vê membros das lojas a que pertence
create policy "Ver membros das minhas lojas" on public.membros_loja
  for select using (loja_id in (select public.minhas_lojas()));

create policy "Inserir-se como membro ao criar loja" on public.membros_loja
  for insert with check (user_id = auth.uid());

-- PRODUTOS: CRUD completo, mas só dentro das lojas a que pertence
create policy "Ver produtos da minha loja" on public.produtos
  for select using (loja_id in (select public.minhas_lojas()));
create policy "Criar produtos na minha loja" on public.produtos
  for insert with check (loja_id in (select public.minhas_lojas()));
create policy "Editar produtos da minha loja" on public.produtos
  for update using (loja_id in (select public.minhas_lojas()));
create policy "Eliminar produtos da minha loja" on public.produtos
  for delete using (loja_id in (select public.minhas_lojas()));

-- VENDAS: idem
create policy "Ver vendas da minha loja" on public.vendas
  for select using (loja_id in (select public.minhas_lojas()));
create policy "Criar vendas na minha loja" on public.vendas
  for insert with check (loja_id in (select public.minhas_lojas()));

-- VENDA_ITENS: idem
create policy "Ver itens de venda da minha loja" on public.venda_itens
  for select using (loja_id in (select public.minhas_lojas()));
create policy "Criar itens de venda na minha loja" on public.venda_itens
  for insert with check (loja_id in (select public.minhas_lojas()));

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
