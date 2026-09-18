-- ============================================================
-- ATUALIZAÇÃO v1.6.0 — Painel de Administração
-- Corre isto no Supabase → SQL Editor → nova query → Run
-- ============================================================

-- 1. Coluna com o email do dono (para aparecer no painel de admin)
ALTER TABLE public.lojas
ADD COLUMN IF NOT EXISTS email_dono text;

-- Preenche o email nas lojas já existentes
UPDATE public.lojas l
SET email_dono = u.email
FROM auth.users u
WHERE u.id = l.dono_user_id AND l.email_dono IS NULL;

-- 2. Permissões do SUPER ADMIN (joaomassuvir@gmail.com):
--    ver e actualizar TODAS as lojas a partir do painel admin.html
DROP POLICY IF EXISTS "Super admin ve todas as lojas" ON public.lojas;
CREATE POLICY "Super admin ve todas as lojas" ON public.lojas
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

DROP POLICY IF EXISTS "Super admin atualiza todas as lojas" ON public.lojas;
CREATE POLICY "Super admin atualiza todas as lojas" ON public.lojas
  FOR UPDATE USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

-- ============================================================
-- FIM
-- ============================================================
