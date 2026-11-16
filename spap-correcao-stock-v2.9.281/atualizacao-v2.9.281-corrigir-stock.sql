-- SPAP v2.9.281 — Corrige o desconto de stock nas vendas (Loja e Banca)
-- Correr UMA vez no Supabase (SQL Editor). Pode correr-se de novo sem problema.
--
-- PASSO 0 (opcional, só para ver): mostra se a função existe e com que tipos.
--   select proname, pg_get_function_arguments(oid) from pg_proc where proname = 'baixar_stock';
--   (se devolver 0 linhas = era esta a causa: a função não existia e o stock nunca descontava)

-- Remove versões antigas/duplicadas (evitam erro de "função ambígua")
DROP FUNCTION IF EXISTS public.baixar_stock(uuid, integer);
DROP FUNCTION IF EXISTS public.baixar_stock(uuid, numeric);
DROP FUNCTION IF EXISTS public.baixar_stock(uuid, bigint);

CREATE OR REPLACE FUNCTION public.baixar_stock(p_id uuid, p_qtd numeric)
RETURNS void LANGUAGE sql SECURITY INVOKER AS $$
  UPDATE public.produtos SET stock = COALESCE(stock, 0) - p_qtd WHERE id = p_id;
$$;
GRANT EXECUTE ON FUNCTION public.baixar_stock(uuid, numeric) TO authenticated;

-- Garante que quem vende (membro da loja) pode alterar o stock dos produtos da sua loja
DROP POLICY IF EXISTS "Editar produtos da minha loja" ON public.produtos;
CREATE POLICY "Editar produtos da minha loja" ON public.produtos
  FOR UPDATE USING (loja_id IN (SELECT public.minhas_lojas()))
  WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));

NOTIFY pgrst, 'reload schema';
