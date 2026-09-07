-- ============================================================
-- ATUALIZAÇÃO v2.3.0 — Perdas (quebra) e Entregas por vendedor
-- Corre no Supabase → SQL Editor → nova query → Run
-- ============================================================

-- 1. PERDAS: quando o dono retira produtos do sistema (quebra, estrago)
CREATE TABLE IF NOT EXISTS public.perdas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  produto_id uuid,
  produto_nome text,
  quantidade integer NOT NULL DEFAULT 0,
  motivo text,
  feito_por text
);
CREATE INDEX IF NOT EXISTS idx_perdas_loja ON public.perdas(loja_id);

ALTER TABLE public.perdas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver perdas da minha loja" ON public.perdas;
CREATE POLICY "Ver perdas da minha loja" ON public.perdas
  FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Criar perdas na minha loja" ON public.perdas;
CREATE POLICY "Criar perdas na minha loja" ON public.perdas
  FOR INSERT WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Super admin ve todas as perdas" ON public.perdas;
CREATE POLICY "Super admin ve todas as perdas" ON public.perdas
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

-- 2. ENTREGAS: quando o vendedor fecha o dia e entrega o valor
CREATE TABLE IF NOT EXISTS public.entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  vendedor_codigo text,
  total_entregue numeric(14,2) NOT NULL DEFAULT 0,
  num_vendas integer DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_entregas_loja ON public.entregas(loja_id);

ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver entregas da minha loja" ON public.entregas;
CREATE POLICY "Ver entregas da minha loja" ON public.entregas
  FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Criar entregas na minha loja" ON public.entregas;
CREATE POLICY "Criar entregas na minha loja" ON public.entregas
  FOR INSERT WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Super admin ve todas as entregas" ON public.entregas;
CREATE POLICY "Super admin ve todas as entregas" ON public.entregas
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

-- ============================================================
-- FIM
-- ============================================================
