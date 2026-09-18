-- ============================================================
-- v2.6.4 — Tabela caixa_sobras (para justificar produtos a mais no inventário)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.caixa_sobras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  dia date NOT NULL,
  vendedor_codigo text,
  valor numeric(14,2) NOT NULL DEFAULT 0,
  usado_no_inventario boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_caixa_sobras_loja ON public.caixa_sobras(loja_id);
ALTER TABLE public.caixa_sobras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver sobras da minha loja" ON public.caixa_sobras;
CREATE POLICY "Ver sobras da minha loja" ON public.caixa_sobras FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Criar sobras na minha loja" ON public.caixa_sobras;
CREATE POLICY "Criar sobras na minha loja" ON public.caixa_sobras FOR INSERT WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Atualizar sobras da minha loja" ON public.caixa_sobras;
CREATE POLICY "Atualizar sobras da minha loja" ON public.caixa_sobras FOR UPDATE USING (loja_id IN (SELECT public.minhas_lojas()));
