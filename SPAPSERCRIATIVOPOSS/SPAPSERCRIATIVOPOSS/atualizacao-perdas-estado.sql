-- ============================================================
-- Perdas passam a precisar de CONFIRMACAO do balconista na loja.
-- O dono marca a perda (fica "pendente"); o stock so baixa quando
-- o balconista CONFIRMAR na loja. Se cancelar, o stock nao muda.
-- Correr no SQL Editor do Supabase.
-- ============================================================

alter table perdas add column if not exists estado text default 'pendente';
alter table perdas add column if not exists confirmado_por text;
alter table perdas add column if not exists confirmado_em timestamptz;

-- As perdas ANTIGAS ja tinham baixado o stock na altura:
-- marca-as como confirmadas para nao aparecerem como pendentes na loja.
update perdas set estado = 'confirmado' where estado is null or estado = 'pendente';

create index if not exists idx_perdas_estado on perdas(loja_id, estado);
