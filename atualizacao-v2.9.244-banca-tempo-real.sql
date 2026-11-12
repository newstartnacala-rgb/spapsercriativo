-- ============================================================
-- ATUALIZACAO v2.9.244 — BANCA EM TEMPO REAL NO MONITOR E BANCA
-- ============================================================
-- Liga o "Realtime" do Supabase às tabelas que a Banca envia, para o Monitor e Banca
-- receber cada venda, devolução, perda, desconto, entrega e aviso no mesmo segundo.
-- (Sem isto o Monitor e Banca também atualiza sozinho, a cada 1 segundo.)
-- Seguro repetir. Correr no Supabase > SQL Editor > New query > Run.
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY ARRAY['vendas', 'venda_itens', 'produtos', 'perdas', 'entregas', 'descontos', 'despachos', 'devolucoes', 'atividade_log'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- VERIFICACAO — deve listar as tabelas acima (as que existem)
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' ORDER BY 1;
