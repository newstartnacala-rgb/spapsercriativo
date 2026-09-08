-- ============================================================
-- ATUALIZAÇÃO v1.5.0 — Spap-Sercriativo PDV
-- Corre isto no Supabase → SQL Editor → nova query → Run
-- ============================================================

-- 1. Nova coluna: código da plataforma (definido pelo dono no registo)
ALTER TABLE public.lojas
ADD COLUMN IF NOT EXISTS codigo_admin text;

-- 2. Apagar os produtos de TODAS as lojas, EXCEPTO a conta demonstrativa
--    (joaomassuvir@gmail.com mantém os produtos para apresentações)
DELETE FROM public.produtos
WHERE loja_id NOT IN (
  SELECT l.id
  FROM public.lojas l
  JOIN auth.users u ON u.id = l.dono_user_id
  WHERE u.email = 'joaomassuvir@gmail.com'
);

-- 3. (Opcional) Definir um código para as lojas antigas que não têm.
--    Sem isto, as contas antigas usam o código de recurso 1234.
--    Exemplo para definir manualmente numa loja específica:
-- UPDATE public.lojas SET codigo_admin = '4589' WHERE nome = 'NOME DA LOJA';

-- ============================================================
-- FIM
-- ============================================================
