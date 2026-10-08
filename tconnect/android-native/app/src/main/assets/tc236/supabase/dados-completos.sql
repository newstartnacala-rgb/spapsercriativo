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
