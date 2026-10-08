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
  kind text not null default 'SCREEN_VIDEO' check (kind in ('SCREEN_VIDEO','CAMERA_VIDEO')),
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
