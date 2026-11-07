-- ============================================================
-- ATUALIZACAO v2.9.172 — VENDAS EM TEMPO REAL NO MONITOR
-- ============================================================
-- Liga o "Realtime" do Supabase às tabelas de vendas, para o Monitor
-- receber cada venda no mesmo segundo em que é feita na Loja.
-- (Sem isto o Monitor também atualiza sozinho, a cada 3 segundos.)
-- Seguro repetir. Correr no Supabase > SQL Editor > New query > Run.
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY ARRAY['vendas', 'venda_itens'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- VERIFICACAO — deve listar vendas e venda_itens
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' ORDER BY 1;
