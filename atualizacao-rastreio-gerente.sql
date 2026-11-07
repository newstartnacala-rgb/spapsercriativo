-- ============================================================
-- RASTREIO DO GERENTE — regista TUDO o que cada pessoa faz na loja
-- (cadastrar/editar/apagar produto, perdas, despacho, inventario,
--  categorias, preços...). O dono vê no cartão "Rastreio do Gerente".
-- Correr no SQL Editor do Supabase.
-- ============================================================

create table if not exists atividade_log (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  user_id uuid,
  quem text,                       -- nome de quem fez (gerente ou dono)
  por_gerente boolean default false,
  acao text not null,              -- ex: "Cadastrou produto", "Editou preço"
  detalhe text,                    -- ex: "Arroz 25kg (stock 10, MT 2000)"
  extra jsonb,                     -- dados opcionais (antes/depois)
  criado_em timestamptz not null default now()
);

alter table atividade_log enable row level security;

-- Qualquer membro da loja (dono/admin OU gerente) pode VER o registo da sua loja
drop policy if exists "atlog_select" on atividade_log;
create policy "atlog_select" on atividade_log
  for select using (
    loja_id in (select loja_id from membros_loja where user_id = auth.uid())
  );

-- Qualquer membro da loja pode ESCREVER no registo da sua loja
drop policy if exists "atlog_insert" on atividade_log;
create policy "atlog_insert" on atividade_log
  for insert with check (
    loja_id in (select loja_id from membros_loja where user_id = auth.uid())
  );

create index if not exists idx_atlog_loja on atividade_log(loja_id, criado_em desc);
