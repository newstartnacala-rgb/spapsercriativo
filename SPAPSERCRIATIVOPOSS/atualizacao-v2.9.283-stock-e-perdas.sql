-- SPAP v2.9.283 — STOCK a descontar em todas as apps (Loja, Banca, Monitores) + perdas
-- Correr UMA vez no Supabase (SQL Editor). Pode correr-se de novo sem problema.
--
-- Causa do problema: existiam DUAS versões da função baixar_stock (uma com quantidade inteira, outra decimal).
-- Com as duas, o banco de dados não sabia qual usar e recusava — o stock deixava de descontar.
-- Aqui fica UMA só versão (aceita inteiros e kg), segura (só mexe em produtos das lojas de quem pede).
-- Nota: as apps já descontam o stock mesmo sem este SQL (têm uma reserva), mas com ele fica atómico e mais rápido.

-- 1) apagar TODAS as versões antigas (qualquer tipo de parâmetros)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('baixar_stock', 'repor_stock')
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- 2) versões únicas e definitivas
CREATE FUNCTION public.baixar_stock(p_id uuid, p_qtd numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_loja uuid;
BEGIN
  SELECT loja_id INTO v_loja FROM produtos WHERE id = p_id;
  IF v_loja IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM membros_loja WHERE user_id = auth.uid() AND loja_id = v_loja) THEN
    RAISE EXCEPTION 'Sem permissao para este produto';
  END IF;
  UPDATE produtos SET stock = COALESCE(stock, 0) - COALESCE(p_qtd, 0) WHERE id = p_id;
END; $$;

CREATE FUNCTION public.repor_stock(p_id uuid, p_qtd numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_loja uuid;
BEGIN
  SELECT loja_id INTO v_loja FROM produtos WHERE id = p_id;
  IF v_loja IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM membros_loja WHERE user_id = auth.uid() AND loja_id = v_loja) THEN
    RAISE EXCEPTION 'Sem permissao para este produto';
  END IF;
  UPDATE produtos SET stock = COALESCE(stock, 0) + COALESCE(p_qtd, 0) WHERE id = p_id;
END; $$;

REVOKE ALL ON FUNCTION public.baixar_stock(uuid, numeric) FROM public, anon;
REVOKE ALL ON FUNCTION public.repor_stock(uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.baixar_stock(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repor_stock(uuid, numeric) TO authenticated;

-- 3) Perdas: a Loja pode CONFIRMAR / CANCELAR as perdas enviadas pelo Monitor
DROP POLICY IF EXISTS "Alterar perdas da minha loja" ON public.perdas;
CREATE POLICY "Alterar perdas da minha loja" ON public.perdas
  FOR UPDATE USING (loja_id IN (SELECT public.minhas_lojas()))
  WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));

NOTIFY pgrst, 'reload schema';
