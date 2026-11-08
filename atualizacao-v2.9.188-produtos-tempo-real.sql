-- ============================================================
-- ATUALIZACAO v2.9.188 — PRODUTOS EM TEMPO REAL NA VENDA
-- ============================================================
-- Liga o "Realtime" do Supabase à tabela de produtos (e às vendas, se ainda
-- não estiverem), para que cada produto cadastrado ou alterado no Monitor
-- apareça na Venda no mesmo segundo.
-- (Sem isto a Venda também atualiza sozinha, a cada 10 segundos.)
-- Seguro repetir. Correr no Supabase > SQL Editor > New query > Run.
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY ARRAY['produtos', 'vendas', 'venda_itens'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- VERIFICACAO — deve listar produtos, vendas e venda_itens
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' ORDER BY 1;
