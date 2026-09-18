-- ============================================================
-- ATUALIZAÇÃO v1.9.0 — Aviso de Despacho (receção de mercadoria)
-- Corre no Supabase → SQL Editor → nova query → Run
-- ============================================================

-- Cada despacho é uma remessa que o DONO envia para a loja.
-- O vendedor confere fisicamente no PDV e confirma a entrada no stock.
CREATE TABLE IF NOT EXISTS public.despachos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  confirmado_em timestamptz,
  estado text NOT NULL DEFAULT 'recebido',  -- recebido (stock já somado pelo dono)
  criado_por text,                          -- nome do dono
  confirmado_por text,                      -- nome do vendedor
  nota text,
  -- Lista de itens: [{ produto_id, nome, enviado, preco }]
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  tem_diferenca boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_despachos_loja ON public.despachos(loja_id);
CREATE INDEX IF NOT EXISTS idx_despachos_estado ON public.despachos(loja_id, estado);

-- RLS — isolamento por loja (dono e vendedor da mesma loja veem/editam)
ALTER TABLE public.despachos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver despachos da minha loja" ON public.despachos;
CREATE POLICY "Ver despachos da minha loja" ON public.despachos
  FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));

DROP POLICY IF EXISTS "Criar despachos na minha loja" ON public.despachos;
CREATE POLICY "Criar despachos na minha loja" ON public.despachos
  FOR INSERT WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));

DROP POLICY IF EXISTS "Atualizar despachos da minha loja" ON public.despachos;
CREATE POLICY "Atualizar despachos da minha loja" ON public.despachos
  FOR UPDATE USING (loja_id IN (SELECT public.minhas_lojas()));

-- Super admin vê todos os despachos (para o modo geral do monitor)
DROP POLICY IF EXISTS "Super admin ve todos os despachos" ON public.despachos;
CREATE POLICY "Super admin ve todos os despachos" ON public.despachos
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

-- ============================================================
-- FIM
-- ============================================================
