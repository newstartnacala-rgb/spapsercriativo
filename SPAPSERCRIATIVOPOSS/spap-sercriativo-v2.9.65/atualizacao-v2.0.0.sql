-- ============================================================
-- ATUALIZAÇÃO v2.0.0 — Vendedores, Empresa, correção RLS
-- Corre no Supabase → SQL Editor → nova query → Run
-- ============================================================

-- 1. Nome da empresa (aparece nos recibos) e códigos de vendedores
ALTER TABLE public.lojas
ADD COLUMN IF NOT EXISTS nome_empresa text,
ADD COLUMN IF NOT EXISTS vendedores jsonb DEFAULT '[]'::jsonb;

-- 2. Vendas marcadas com o código do vendedor (1001, 1002...)
ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS vendedor_codigo text;

-- 3. CORREÇÃO RLS — o super admin pode gerir produtos/vendas de
--    qualquer loja (resolve o erro "violating row-level security"
--    ao cadastrar produto noutra loja pelo monitor)
DROP POLICY IF EXISTS "Super admin gere todos os produtos" ON public.produtos;
CREATE POLICY "Super admin gere todos os produtos" ON public.produtos
  FOR ALL USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

DROP POLICY IF EXISTS "Super admin ve todas as vendas" ON public.vendas;
CREATE POLICY "Super admin ve todas as vendas" ON public.vendas
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

DROP POLICY IF EXISTS "Super admin ve todos os itens de venda" ON public.venda_itens;
CREATE POLICY "Super admin ve todos os itens de venda" ON public.venda_itens
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

DROP POLICY IF EXISTS "Super admin ve todos os membros" ON public.membros_loja;
CREATE POLICY "Super admin ve todos os membros" ON public.membros_loja
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

-- 4. Migrar plano antigo bronze → pro (novos planos)
UPDATE public.lojas SET plano = 'pro' WHERE plano = 'bronze';

-- ============================================================
-- FIM — Deve aparecer "Success"
-- ============================================================
