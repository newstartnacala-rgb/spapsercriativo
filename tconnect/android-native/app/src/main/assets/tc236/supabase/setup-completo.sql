-- =====================================================================
-- T-Connect · SETUP COMPLETO do Supabase (idempotente, correr 1x)
-- Cole TODO este ficheiro no Supabase > SQL Editor e carregue em RUN.
-- Depois, no painel do Supabase, confirme:
--   1) Authentication > Sign In / Providers > Anonymous  = ATIVADO
--   2) Database > Replication/Realtime  = as tabelas abaixo ativas
-- =====================================================================

-- ===================== 1/4 · schema base + captura =====================
-- T-Connect v2.14 — Guardian ↔ Child pairing, devices and realtime events
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'guardian' check (role in ('guardian','child')),
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  child_id uuid references auth.users(id) on delete cascade,
  device_code text not null unique,
  device_name text,
  platform text not null default 'android',
  status text not null default 'offline',
  battery integer check (battery between 0 and 100),
  last_lat double precision,
  last_lng double precision,
  accuracy_m double precision,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.guardian_children (
  guardian_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guardian_id, child_id)
);

create table if not exists public.pairing_codes (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references auth.users(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  type text not null,
  detail text not null,
  contact text,
  status text not null default 'CONCLUÍDO',
  source text not null default 'Guardian',
  severity text not null default 'info',
  occurred_at timestamptz not null default now()
);

create index if not exists activity_events_guardian_time_idx on public.activity_events(guardian_id, occurred_at desc);
create index if not exists devices_child_idx on public.devices(child_id);
create index if not exists pairing_codes_guardian_idx on public.pairing_codes(guardian_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.guardian_children enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists "profiles own" on public.profiles;
create policy "profiles own" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "devices own" on public.devices;
create policy "devices guardian own" on public.devices for select using (auth.uid() = owner_id);
create policy "devices child own" on public.devices for select using (auth.uid() = child_id);
create policy "devices guardian write" on public.devices for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "guardian child own" on public.guardian_children;
create policy "guardian child own" on public.guardian_children for select using (auth.uid() = guardian_id or auth.uid() = child_id);
create policy "guardian child guardian write" on public.guardian_children for all using (auth.uid() = guardian_id) with check (auth.uid() = guardian_id);

drop policy if exists "pairing guardian read" on public.pairing_codes;
create policy "pairing guardian read" on public.pairing_codes for select using (auth.uid() = guardian_id);
create policy "pairing guardian insert" on public.pairing_codes for insert with check (auth.uid() = guardian_id);

drop policy if exists "events guardian read" on public.activity_events;
create policy "events guardian read" on public.activity_events for select using (auth.uid() = guardian_id);
create policy "events guardian insert" on public.activity_events for insert with check (auth.uid() = guardian_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'guardian')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.create_pairing_code()
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not exists (select 1 from public.profiles where id=auth.uid() and role='guardian') then
    raise exception 'Apenas Guardian pode criar código';
  end if;
  c := upper(substr(encode(gen_random_bytes(5),'hex'),1,8));
  insert into public.pairing_codes(guardian_id,code,expires_at)
  values(auth.uid(),c,now()+interval '15 minutes');
  return c;
end;
$$;

grant execute on function public.create_pairing_code() to authenticated;

create or replace function public.claim_pairing_code(p_code text, p_device_code text, p_device_name text default 'T-Connect Child')
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.pairing_codes%rowtype; d uuid; g uuid;
begin
  select * into p from public.pairing_codes where code=upper(trim(p_code)) and used_at is null and expires_at>now() order by created_at desc limit 1;
  if p.id is null then raise exception 'Código inválido ou expirado'; end if;
  if not exists (select 1 from public.profiles where id=auth.uid()) then
    raise exception 'Perfil não encontrado';
  end if;
  update public.profiles set role='child' where id=auth.uid();
  insert into public.guardian_children(guardian_id,child_id) values(p.guardian_id,auth.uid()) on conflict do nothing;
  insert into public.devices(owner_id,child_id,device_code,device_name,platform,status,last_seen_at)
  values(p.guardian_id,auth.uid(),p_device_code,p_device_name,'web','online',now())
  on conflict(device_code) do update set owner_id=excluded.owner_id,child_id=excluded.child_id,device_name=excluded.device_name,status='online',last_seen_at=now()
  returning id into d;
  update public.pairing_codes set used_at=now() where id=p.id;
  g:=p.guardian_id;
  return jsonb_build_object('guardian_id',g,'device_id',d,'child_id',auth.uid());
end;
$$;

grant execute on function public.claim_pairing_code(text,text,text) to authenticated;

create or replace function public.child_heartbeat(p_device_code text, p_battery integer default null, p_lat double precision default null, p_lng double precision default null, p_accuracy double precision default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.devices%rowtype; e uuid;
begin
  select * into d from public.devices where device_code=p_device_code and child_id=auth.uid() limit 1;
  if d.id is null then raise exception 'Dispositivo não vinculado'; end if;
  update public.devices set status='online',battery=coalesce(p_battery,battery),last_lat=coalesce(p_lat,last_lat),last_lng=coalesce(p_lng,last_lng),accuracy_m=coalesce(p_accuracy,accuracy_m),last_seen_at=now() where id=d.id;
  insert into public.activity_events(guardian_id,child_id,device_id,type,detail,status,source)
  values(d.owner_id,auth.uid(),d.id,'DEVICE','Heartbeat recebido · dispositivo online','CONCLUÍDO','Child Android') returning id into e;
  return jsonb_build_object('device_id',d.id,'guardian_id',d.owner_id,'event_id',e);
end;
$$;

grant execute on function public.child_heartbeat(text,integer,double precision,double precision,double precision) to authenticated;

create or replace function public.child_log_event(p_device_code text,p_type text,p_detail text,p_status text default 'CONCLUÍDO',p_contact text default null,p_severity text default 'info')
returns uuid language plpgsql security definer set search_path = public as $$
declare d public.devices%rowtype; e uuid;
begin
  select * into d from public.devices where device_code=p_device_code and child_id=auth.uid() limit 1;
  if d.id is null then raise exception 'Dispositivo não vinculado'; end if;
  insert into public.activity_events(guardian_id,child_id,device_id,type,detail,contact,status,source,severity)
  values(d.owner_id,auth.uid(),d.id,p_type,p_detail,p_contact,p_status,'Child Android',p_severity) returning id into e;
  update public.devices set status='online',last_seen_at=now() where id=d.id;
  return e;
end;
$$;

grant execute on function public.child_log_event(text,text,text,text,text,text) to authenticated;

alter publication supabase_realtime add table public.activity_events;
alter publication supabase_realtime add table public.devices;


-- T-Connect software releases / update manifest
create table if not exists public.app_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  description text,
  changelog jsonb not null default '[]'::jsonb,
  download_url text,
  channel text not null default 'stable' check (channel in ('stable','beta','dev')),
  is_published boolean not null default false,
  released_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.app_releases enable row level security;
drop policy if exists "Public can read published releases" on public.app_releases;
create policy "Public can read published releases" on public.app_releases for select using (is_published = true);

-- Example release metadata (publish only when you actually deploy a newer build).
-- insert into public.app_releases(version,title,description,changelog,download_url,is_published)
-- values ('2.22','T-Connect 2.22','Melhorias de monitoramento','["Novo terminal","Melhorias de mapa"]'::jsonb,'https://SEU-DOMINIO/atualizacao',true);

-- v2.38.33 — consentimento explícito para captura do Child + sinalização WebRTC
create table if not exists public.capture_requests (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  kind text not null default 'SCREEN_VIDEO' check (kind in ('SCREEN_VIDEO','CAMERA_VIDEO','AUDIO_ONLY')),
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','DECLINED','EXPIRED','ENDED')),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null default (now()+interval '5 minutes')
);
create index if not exists capture_requests_child_idx on public.capture_requests(child_id,status,requested_at desc);
create index if not exists capture_requests_guardian_idx on public.capture_requests(guardian_id,status,requested_at desc);
alter table public.capture_requests enable row level security;
drop policy if exists "capture guardian read" on public.capture_requests;
create policy "capture guardian read" on public.capture_requests for select using (auth.uid()=guardian_id);
drop policy if exists "capture guardian insert" on public.capture_requests;
create policy "capture guardian insert" on public.capture_requests for insert with check (auth.uid()=guardian_id);
drop policy if exists "capture child read" on public.capture_requests;
create policy "capture child read" on public.capture_requests for select using (auth.uid()=child_id);
drop policy if exists "capture child update" on public.capture_requests;
create policy "capture child update" on public.capture_requests for update using (auth.uid()=child_id) with check (auth.uid()=child_id);

create table if not exists public.capture_signals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.capture_requests(id) on delete cascade,
  sender_role text not null check (sender_role in ('guardian','child')),
  kind text not null check (kind in ('offer','answer','ice','bye')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists capture_signals_request_idx on public.capture_signals(request_id,created_at);
alter table public.capture_signals enable row level security;
drop policy if exists "capture signals guardian" on public.capture_signals;
create policy "capture signals guardian" on public.capture_signals for all using (exists(select 1 from public.capture_requests r where r.id=request_id and r.guardian_id=auth.uid())) with check (exists(select 1 from public.capture_requests r where r.id=request_id and r.guardian_id=auth.uid()));
drop policy if exists "capture signals child" on public.capture_signals;
create policy "capture signals child" on public.capture_signals for all using (exists(select 1 from public.capture_requests r where r.id=request_id and r.child_id=auth.uid())) with check (exists(select 1 from public.capture_requests r where r.id=request_id and r.child_id=auth.uid()));

create or replace function public.request_capture(p_child_id uuid,p_device_id uuid default null,p_kind text default 'SCREEN_VIDEO')
returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
  if not exists(select 1 from public.guardian_children where guardian_id=auth.uid() and child_id=p_child_id) then raise exception 'Criança não vinculada a este Guardian'; end if;
  insert into public.capture_requests(guardian_id,child_id,device_id,kind,status) values(auth.uid(),p_child_id,p_device_id,p_kind,'PENDING') returning id into rid;
  return rid;
end; $$;
grant execute on function public.request_capture(uuid,uuid,text) to authenticated;

create or replace function public.respond_capture(p_request_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if p_status not in ('ACCEPTED','DECLINED') then raise exception 'Estado inválido'; end if;
  update public.capture_requests set status=p_status,responded_at=now() where id=p_request_id and child_id=auth.uid() and status='PENDING' and expires_at>now();
  if not found then raise exception 'Pedido de captura inexistente, expirado ou já respondido'; end if;
  return true;
end; $$;
grant execute on function public.respond_capture(uuid,text) to authenticated;

create or replace function public.end_capture(p_request_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.capture_requests set status='ENDED',responded_at=coalesce(responded_at,now()) where id=p_request_id and guardian_id=auth.uid() and status in ('PENDING','ACCEPTED');
  return found;
end; $$;
grant execute on function public.end_capture(uuid) to authenticated;

alter publication supabase_realtime add table public.capture_requests;
alter publication supabase_realtime add table public.capture_signals;

-- ===================== 2/4 · mensagens + chamadas =====================
-- ============================================================
-- T-Connect — Mensagens e Chamadas (sincronização automática)
-- Cole este ficheiro no SQL Editor do Supabase e execute.
-- É seguro executar mais do que uma vez.
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null,
  child_id uuid not null,
  device_id uuid not null references public.devices(id) on delete cascade,
  source_id text not null,
  address text,
  body text,
  direction text,
  epoch_ms bigint,
  sent_at timestamptz,
  created_at timestamptz default now(),
  unique (device_id, source_id, direction)
);
create index if not exists messages_guardian_idx on public.messages(guardian_id, epoch_ms desc);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null,
  child_id uuid not null,
  device_id uuid not null references public.devices(id) on delete cascade,
  source_id text not null,
  number text,
  name text,
  direction text,
  duration_s bigint default 0,
  epoch_ms bigint,
  called_at timestamptz,
  created_at timestamptz default now(),
  unique (device_id, source_id, direction)
);
create index if not exists calls_guardian_idx on public.calls(guardian_id, epoch_ms desc);

alter table public.messages enable row level security;
alter table public.calls enable row level security;

drop policy if exists messages_guardian_select on public.messages;
create policy messages_guardian_select on public.messages
  for select to authenticated using (guardian_id = auth.uid());

drop policy if exists calls_guardian_select on public.calls;
create policy calls_guardian_select on public.calls
  for select to authenticated using (guardian_id = auth.uid());

-- RPC: o Child sincroniza as suas mensagens (array JSON vindo do Android)
create or replace function public.child_sync_messages(p_device_code text, p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare d public.devices%rowtype; it jsonb; n integer := 0;
begin
  select * into d from public.devices where device_code=p_device_code and child_id=auth.uid() limit 1;
  if d.id is null then raise exception 'Dispositivo não vinculado'; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.messages(guardian_id,child_id,device_id,source_id,address,body,direction,epoch_ms,sent_at)
    values(d.owner_id,auth.uid(),d.id,
           coalesce(it->>'id',''), it->>'address', it->>'body', coalesce(it->>'direction','OUTRA'),
           nullif(it->>'date','')::bigint,
           to_timestamp(coalesce(nullif(it->>'date','')::bigint,0)/1000.0))
    on conflict (device_id, source_id, direction) do nothing;
    if found then n := n + 1; end if;
  end loop;
  update public.devices set status='online', last_seen_at=now() where id=d.id;
  return n;
end; $$;
grant execute on function public.child_sync_messages(text,jsonb) to authenticated;

-- RPC: o Child sincroniza o seu registo de chamadas
create or replace function public.child_sync_calls(p_device_code text, p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare d public.devices%rowtype; it jsonb; n integer := 0;
begin
  select * into d from public.devices where device_code=p_device_code and child_id=auth.uid() limit 1;
  if d.id is null then raise exception 'Dispositivo não vinculado'; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.calls(guardian_id,child_id,device_id,source_id,number,name,direction,duration_s,epoch_ms,called_at)
    values(d.owner_id,auth.uid(),d.id,
           coalesce(it->>'id',''), it->>'number', it->>'name', coalesce(it->>'direction','OUTRA'),
           coalesce(nullif(it->>'duration','')::bigint,0),
           nullif(it->>'date','')::bigint,
           to_timestamp(coalesce(nullif(it->>'date','')::bigint,0)/1000.0))
    on conflict (device_id, source_id, direction) do nothing;
    if found then n := n + 1; end if;
  end loop;
  update public.devices set status='online', last_seen_at=now() where id=d.id;
  return n;
end; $$;
grant execute on function public.child_sync_calls(text,jsonb) to authenticated;

-- Realtime
do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.calls;    exception when duplicate_object then null; end $$;

-- ===================== 3/4 · contactos, apps, localizacao =====================
-- ============================================================
-- T-Connect — Dados completos do Child
-- Contactos, Apps instaladas/uso, Histórico de localização.
-- Cole no SQL Editor do Supabase e execute. Seguro repetir.
-- ============================================================

-- ---- Contactos ----
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null,
  child_id uuid not null,
  device_id uuid not null references public.devices(id) on delete cascade,
  source_id text,
  name text,
  number text,
  created_at timestamptz default now(),
  unique (device_id, source_id, number)
);
create index if not exists contacts_guardian_idx on public.contacts(guardian_id, name);

-- ---- Apps instaladas / uso ----
create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null,
  child_id uuid not null,
  device_id uuid not null references public.devices(id) on delete cascade,
  package text not null,
  label text,
  is_system boolean default false,
  usage_minutes bigint default 0,
  last_seen timestamptz default now(),
  unique (device_id, package)
);
create index if not exists apps_guardian_idx on public.apps(guardian_id, usage_minutes desc);

-- ---- Histórico de localização (trajeto) ----
create table if not exists public.location_history (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null,
  child_id uuid not null,
  device_id uuid not null references public.devices(id) on delete cascade,
  lat double precision,
  lng double precision,
  accuracy double precision,
  epoch_ms bigint,
  recorded_at timestamptz default now()
);
create index if not exists loc_hist_idx on public.location_history(guardian_id, device_id, epoch_ms desc);

alter table public.contacts enable row level security;
alter table public.apps enable row level security;
alter table public.location_history enable row level security;

drop policy if exists contacts_guardian_select on public.contacts;
create policy contacts_guardian_select on public.contacts for select to authenticated using (guardian_id = auth.uid());
drop policy if exists apps_guardian_select on public.apps;
create policy apps_guardian_select on public.apps for select to authenticated using (guardian_id = auth.uid());
drop policy if exists loc_hist_guardian_select on public.location_history;
create policy loc_hist_guardian_select on public.location_history for select to authenticated using (guardian_id = auth.uid());

-- ---- RPC: contactos ----
create or replace function public.child_sync_contacts(p_device_code text, p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare d public.devices%rowtype; it jsonb; n integer := 0;
begin
  select * into d from public.devices where device_code=p_device_code and child_id=auth.uid() limit 1;
  if d.id is null then raise exception 'Dispositivo não vinculado'; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.contacts(guardian_id,child_id,device_id,source_id,name,number)
    values(d.owner_id,auth.uid(),d.id, it->>'id', it->>'name', it->>'number')
    on conflict (device_id, source_id, number) do update set name=excluded.name;
    n := n + 1;
  end loop;
  update public.devices set status='online', last_seen_at=now() where id=d.id;
  return n;
end; $$;
grant execute on function public.child_sync_contacts(text,jsonb) to authenticated;

-- ---- RPC: apps ----
create or replace function public.child_sync_apps(p_device_code text, p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare d public.devices%rowtype; it jsonb; n integer := 0;
begin
  select * into d from public.devices where device_code=p_device_code and child_id=auth.uid() limit 1;
  if d.id is null then raise exception 'Dispositivo não vinculado'; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.apps(guardian_id,child_id,device_id,package,label,is_system,usage_minutes,last_seen)
    values(d.owner_id,auth.uid(),d.id, it->>'package', it->>'label',
           coalesce((it->>'system')::boolean,false),
           coalesce((it->>'usage')::bigint,0), now())
    on conflict (device_id, package) do update
      set label=excluded.label, usage_minutes=greatest(public.apps.usage_minutes, excluded.usage_minutes), last_seen=now();
    n := n + 1;
  end loop;
  update public.devices set status='online', last_seen_at=now() where id=d.id;
  return n;
end; $$;
grant execute on function public.child_sync_apps(text,jsonb) to authenticated;

-- ---- RPC: ponto de localização (trajeto) ----
create or replace function public.child_push_location(p_device_code text, p_lat double precision, p_lng double precision, p_accuracy double precision default null, p_epoch bigint default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare d public.devices%rowtype; r uuid;
begin
  select * into d from public.devices where device_code=p_device_code and child_id=auth.uid() limit 1;
  if d.id is null then raise exception 'Dispositivo não vinculado'; end if;
  insert into public.location_history(guardian_id,child_id,device_id,lat,lng,accuracy,epoch_ms,recorded_at)
  values(d.owner_id,auth.uid(),d.id,p_lat,p_lng,p_accuracy,coalesce(p_epoch, (extract(epoch from now())*1000)::bigint), now())
  returning id into r;
  return r;
end; $$;
grant execute on function public.child_push_location(text,double precision,double precision,double precision,bigint) to authenticated;

-- Realtime
do $$ begin alter publication supabase_realtime add table public.contacts;         exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.apps;             exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.location_history; exception when duplicate_object then null; end $$;

-- ===================== 4/4 · planos/subscricoes =====================
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

do $$ begin alter publication supabase_realtime add table public.subscriptions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.plans; exception when duplicate_object then null; end $$;

-- ============ Garantir Realtime em TODAS as tabelas-chave ============
do $$ begin alter publication supabase_realtime add table public.devices; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.activity_events; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.capture_requests; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.capture_signals; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.calls; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.contacts; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.apps; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.location_history; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.pairing_codes; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.subscriptions; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.plans; exception when duplicate_object then null; when undefined_table then null; end $$;

-- Fim. Veja NOTICE/So da execucao; erros a vermelho indicam o que falta.
