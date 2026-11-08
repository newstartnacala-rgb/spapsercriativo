-- =====================================================================
-- SPAP Banca 3.1.0 — Planos da Banca
--   • 15 dias GRÁTIS dados pelo próprio Supabase no registo (só uma vez:
--     o mesmo e-mail ou telefone não volta a ter dias grátis).
--   • O cliente da Banca não consegue alargar a validade nem activar-se
--     sozinho: só pode pedir um plano pago (Mensal ou Anual), que fica
--     «pendente_pagamento» até o super admin confirmar.
--   • Preços e dias grátis vêm do painel do super admin (config_global
--     → chave «planos_banca»).
-- Correr UMA vez no Supabase → SQL Editor → Run.
-- =====================================================================

create or replace function public.lojas_regras_banca()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dias int := 15;
  cfg jsonb;
  tel text;
begin
  if TG_OP = 'INSERT' then
    if NEW.tipo_loja = 'banca' then
      begin
        select valor::jsonb into cfg from public.config_global where chave = 'planos_banca';
        dias := greatest(0, coalesce((cfg->>'gratis_dias')::int, 15));
      exception when others then dias := 15;
      end;
      NEW.plano := 'banca_free';
      NEW.estado := 'activo';
      NEW.data_upgrade := now();
      NEW.data_expiracao := now() + make_interval(days => dias);
      -- dias grátis só uma vez por e-mail / telefone
      tel := regexp_replace(coalesce(NEW.telefone, ''), '\D', '', 'g');
      if exists (
        select 1 from public.lojas l
        where l.tipo_loja = 'banca'
          and ( (NEW.email_dono is not null and lower(l.email_dono) = lower(NEW.email_dono))
             or (length(tel) >= 9 and right(regexp_replace(coalesce(l.telefone, ''), '\D', '', 'g'), 9) = right(tel, 9)) )
      ) then
        NEW.data_expiracao := now();   -- já usou o grátis: entra logo no ecrã de pagamento
      end if;
    end if;
    return NEW;
  end if;

  -- UPDATE: numa Banca, só o super admin mexe na validade, no estado activo e no tipo
  -- (o SQL Editor e as funções do servidor não têm utilizador: ficam livres)
  if coalesce(OLD.tipo_loja, '') = 'banca' and auth.uid() is not null and not coalesce(public.eh_super_admin(), false) then
    NEW.tipo_loja := OLD.tipo_loja;
    NEW.data_expiracao := OLD.data_expiracao;
    NEW.data_upgrade := OLD.data_upgrade;
    if NEW.estado is distinct from OLD.estado and NEW.estado <> 'pendente_pagamento' then
      NEW.estado := OLD.estado;
    end if;
    if NEW.plano is distinct from OLD.plano and NEW.plano not in ('banca_mensal', 'banca_anual') then
      NEW.plano := OLD.plano;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_lojas_regras_banca on public.lojas;
create trigger trg_lojas_regras_banca
  before insert or update on public.lojas
  for each row execute function public.lojas_regras_banca();

-- Preços por defeito da Banca (o super admin pode mudar no painel)
insert into public.config_global (chave, valor)
values ('planos_banca', '{"gratis_dias":15,"mensal":500,"anual_desconto":5}')
on conflict (chave) do nothing;

-- Bancas já existentes que ainda estavam «pendentes» sem validade: recebem os 15 dias grátis agora
update public.lojas
   set plano = 'banca_free', estado = 'activo', data_upgrade = now(), data_expiracao = now() + interval '15 days'
 where tipo_loja = 'banca' and data_expiracao is null and coalesce(estado, 'pendente') in ('pendente', 'pendente_pagamento');
