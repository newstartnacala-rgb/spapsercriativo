-- SPAP v2.9.280 — Perdas: a Loja passa a conseguir CONFIRMAR / CANCELAR as perdas enviadas pelo Monitor
-- Correr UMA vez no Supabase (SQL Editor). Pode correr-se de novo sem problema.
--
-- Causa do problema: a tabela «perdas» só tinha permissão para VER e CRIAR. Faltava a permissão
-- para ALTERAR (marcar como confirmada / cancelada). Por isso, ao confirmar na Loja, nada acontecia.

DROP POLICY IF EXISTS "Alterar perdas da minha loja" ON public.perdas;
CREATE POLICY "Alterar perdas da minha loja" ON public.perdas
  FOR UPDATE USING (loja_id IN (SELECT public.minhas_lojas()))
  WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));

-- Baixar o stock de forma segura ao confirmar (se ainda não existir)
CREATE OR REPLACE FUNCTION public.baixar_stock(p_id uuid, p_qtd numeric)
RETURNS void LANGUAGE sql SECURITY INVOKER AS $$
  UPDATE public.produtos SET stock = COALESCE(stock, 0) - p_qtd WHERE id = p_id;
$$;
GRANT EXECUTE ON FUNCTION public.baixar_stock(uuid, numeric) TO authenticated;

NOTIFY pgrst, 'reload schema';
