-- ============================================================
-- ATUALIZAÇÃO v1.7.0 — Inventário, Lucro e Histórico
-- Corre no Supabase → SQL Editor → nova query → Run
-- ============================================================

-- 1. PREÇO DE COMPRA nos produtos (essencial para calcular lucro)
--    É o custo que o dono pagou pelo produto. Só o dono vê no Monitor.
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS preco_compra numeric(12,2) DEFAULT 0;

-- 2. TABELA DE BALANÇOS DE INVENTÁRIO
--    Cada vez que o dono faz um inventário físico, guarda-se um registo
--    com o resultado (valor esperado vs contado, perdas, lucro potencial).
CREATE TABLE IF NOT EXISTS public.balancos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  feito_por text,
  valor_custo_esperado numeric(14,2) DEFAULT 0,   -- quanto custou o stock que o sistema diz existir
  valor_venda_esperado numeric(14,2) DEFAULT 0,   -- quanto valeria vender todo esse stock
  lucro_potencial numeric(14,2) DEFAULT 0,        -- venda esperada - custo esperado
  perda_quebra numeric(14,2) DEFAULT 0,           -- valor (a custo) das unidades em falta
  itens_contados integer DEFAULT 0,
  itens_com_diferenca integer DEFAULT 0,
  detalhe jsonb                                    -- lista de {produto, sistema, contado, diferenca}
);

CREATE INDEX IF NOT EXISTS idx_balancos_loja ON public.balancos(loja_id);

-- 3. RLS da tabela de balanços (isolamento por loja, como as outras)
ALTER TABLE public.balancos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver balancos da minha loja" ON public.balancos;
CREATE POLICY "Ver balancos da minha loja" ON public.balancos
  FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));

DROP POLICY IF EXISTS "Criar balancos na minha loja" ON public.balancos;
CREATE POLICY "Criar balancos na minha loja" ON public.balancos
  FOR INSERT WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));

-- ============================================================
-- FIM
-- ============================================================
