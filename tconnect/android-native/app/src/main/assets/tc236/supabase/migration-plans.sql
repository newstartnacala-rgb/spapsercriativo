-- =====================================================================
-- T-Connect — Migração: Planos, Subscrições e Perfil
-- Move a gestão de planos/contas/perfil do localStorage para o Supabase.
-- Execute DEPOIS de schema.sql, no SQL Editor do Supabase.
-- =====================================================================

-- Super Admin (dono): a conta isenta de pagamento e com gestão total.
-- Ajuste o email aqui se necessário.
create or replace function public.tc_is_super_admin()
returns boolean language sql stable as $$
  select lower(coalesce((auth.jwt() ->> 'email'), '')) = 'bonifacioadelino1@gmail.com';
$$;

-- --------------------------------------------------------------------
-- 1) Perfil: foto de avatar (nome já existe em profiles.full_name)
-- --------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;

-- Garante que cada utilizador pode ler/escrever o seu próprio perfil.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles self select') then
    create policy "profiles self select" on public.profiles for select using (id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles self upsert') then
    create policy "profiles self upsert" on public.profiles for insert with check (id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles self update') then
    create policy "profiles self update" on public.profiles for update using (id = auth.uid());
  end if;
end $$;

-- --------------------------------------------------------------------
-- 2) Planos (catálogo editável pelo Super Admin)
-- --------------------------------------------------------------------
create table if not exists public.plans (
  id text primary key,                       -- 'familiar','premium','anual'
  name text not null,
  price integer not null default 0,          -- em MT
  days integer not null default 30,
  features jsonb not null default '[]'::jsonb,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

-- Qualquer utilizador autenticado pode LER o catálogo de planos.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plans' and policyname='plans read') then
    create policy "plans read" on public.plans for select using (auth.role() = 'authenticated');
  end if;
  -- Só o Super Admin pode escrever/editar os planos.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plans' and policyname='plans admin write') then
    create policy "plans admin write" on public.plans for all
      using (public.tc_is_super_admin()) with check (public.tc_is_super_admin());
  end if;
end $$;

-- Planos iniciais (idempotente).
insert into public.plans (id,name,price,days,features,sort) values
  ('familiar','Familiar',350,30,'["Até 5 dispositivos Child","Histórico de 30 dias","Mensagens e chamadas","Captura de câmera e áudio"]'::jsonb,1),
  ('premium','Premium',750,30,'["Dispositivos ilimitados","Histórico completo","Todas as capturas","Geofencing e relatórios","Suporte 24/7"]'::jsonb,2),
  ('anual','Anual',6500,365,'["Tudo do Premium","12 meses de acesso","2 meses grátis","Prioridade máxima de suporte"]'::jsonb,3)
on conflict (id) do nothing;

-- --------------------------------------------------------------------
-- 3) Subscrições (plano de cada conta/email)
-- --------------------------------------------------------------------
create table if not exists public.subscriptions (
  email text primary key,
  user_id uuid references auth.users(id) on delete set null,
  plan text references public.plans(id) on delete set null,
  days integer not null default 0,
  paid_at timestamptz,
  status text not null default 'none',       -- none | active | expired
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

do $$ begin
  -- O utilizador vê e gere a sua própria subscrição (pelo email do token).
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subs self select') then
    create policy "subs self select" on public.subscriptions for select
      using (email = lower(coalesce((auth.jwt() ->> 'email'),'')) or public.tc_is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subs self upsert') then
    create policy "subs self upsert" on public.subscriptions for insert
      with check (email = lower(coalesce((auth.jwt() ->> 'email'),'')) or public.tc_is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subs self update') then
    create policy "subs self update" on public.subscriptions for update
      using (email = lower(coalesce((auth.jwt() ->> 'email'),'')) or public.tc_is_super_admin());
  end if;
  -- Só o Super Admin pode eliminar contas da gestão.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subs admin delete') then
    create policy "subs admin delete" on public.subscriptions for delete
      using (public.tc_is_super_admin());
  end if;
end $$;

-- Atalho: upsert da própria subscrição (usado quando o utilizador escolhe/paga um plano).
create or replace function public.tc_set_my_plan(p_plan text)
returns public.subscriptions language plpgsql security definer set search_path=public as $$
declare
  em text := lower(coalesce((auth.jwt() ->> 'email'),''));
  d  int;
  row public.subscriptions;
begin
  if em = '' then raise exception 'Sem email no token'; end if;
  select days into d from public.plans where id = p_plan;
  if p_plan = 'free' then d := 0; end if;
  insert into public.subscriptions(email,user_id,plan,days,paid_at,status,updated_at)
    values(em, auth.uid(), p_plan, coalesce(d,30),
           case when p_plan='free' then null else now() end,
           case when p_plan='free' then 'active' else 'active' end, now())
  on conflict (email) do update
    set plan=excluded.plan, days=excluded.days, paid_at=excluded.paid_at,
        user_id=excluded.user_id, status='active', updated_at=now()
  returning * into row;
  return row;
end; $$;
grant execute on function public.tc_set_my_plan(text) to authenticated;

alter publication supabase_realtime add table public.subscriptions;
alter publication supabase_realtime add table public.plans;
