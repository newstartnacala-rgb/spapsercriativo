-- T-Connect · correção: permitir pedidos AUDIO_ONLY e garantir realtime
-- Execute UMA VEZ no SQL Editor do Supabase se já tinha corrido o setup antes.
alter table public.capture_requests drop constraint if exists capture_requests_kind_check;
alter table public.capture_requests add constraint capture_requests_kind_check
  check (kind in ('SCREEN_VIDEO','CAMERA_VIDEO','AUDIO_ONLY'));

-- Garantir realtime nas tabelas usadas (idempotente)
do $$ begin alter publication supabase_realtime add table public.capture_requests; exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.capture_signals;  exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.messages;         exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.calls;            exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.devices;          exception when duplicate_object then null; when undefined_table then null; end $$;
do $$ begin alter publication supabase_realtime add table public.activity_events;  exception when duplicate_object then null; when undefined_table then null; end $$;
