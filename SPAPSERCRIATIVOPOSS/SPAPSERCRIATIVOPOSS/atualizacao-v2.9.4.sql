-- ============================================================
-- ATUALIZACAO v2.9.4 — Contar em Equipa: SOMAR (em vez de substituir)
-- ============================================================
-- Antes, cada produto so podia ter UMA contagem por sessao, por isso a
-- contagem de uma pessoa apagava a da outra. Agora cada aparelho tem a sua
-- linha (contador_id) e as contagens do mesmo produto SOMAM-SE.
--
-- Este script e SEGURO de correr mesmo que ja tenhas corrido o v2.9.0,
-- e tambem funciona se NUNCA correste o v2.9.0 (cria tudo do zero).
-- Podes corre-lo mais do que uma vez sem problemas (e idempotente).
-- ============================================================

-- 1) Garante a tabela de sessoes (caso o v2.9.0 nunca tenha corrido)
CREATE TABLE IF NOT EXISTS public.inventario_sessao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  estado text NOT NULL DEFAULT 'aberta',   -- aberta | fechada
  fechado_em timestamptz
);

-- 2) Garante a tabela de contagens (SEM a chave unica antiga; a chave certa
--    e tratada mais abaixo, para funcionar venha de onde vier).
CREATE TABLE IF NOT EXISTS public.inventario_contagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES public.inventario_sessao(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL,
  produto_nome text,
  quantidade_contada integer NOT NULL DEFAULT 0,
  contado_por text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- 3) Coluna nova: identifica o APARELHO que contou (para distinguir pessoas)
ALTER TABLE public.inventario_contagem
  ADD COLUMN IF NOT EXISTS contador_id text;

-- 4) Remove qualquer chave unica antiga em (sessao_id, produto_id),
--    que era a que fazia as contagens substituirem-se.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'inventario_contagem'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname::text ORDER BY att.attname::text)
        FROM unnest(con.conkey) AS k
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k
      ) = ARRAY['produto_id','sessao_id']::text[]
  LOOP
    EXECUTE format('ALTER TABLE public.inventario_contagem DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 5) Adiciona a chave unica certa: (sessao_id, produto_id, contador_id).
--    Assim, 1 linha por produto POR APARELHO — e o total soma-se na app.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'inventario_contagem'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname::text ORDER BY att.attname::text)
        FROM unnest(con.conkey) AS k
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k
      ) = ARRAY['contador_id','produto_id','sessao_id']::text[]
  ) THEN
    ALTER TABLE public.inventario_contagem
      ADD CONSTRAINT inventario_contagem_sessao_produto_contador_key
      UNIQUE (sessao_id, produto_id, contador_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inv_sessao_loja ON public.inventario_sessao(loja_id);
CREATE INDEX IF NOT EXISTS idx_inv_contagem_sessao ON public.inventario_contagem(sessao_id);

-- 6) RLS (garante que existe, mesmo que o v2.9.0 nao tenha corrido)
ALTER TABLE public.inventario_sessao   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_contagem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver sessoes da minha loja" ON public.inventario_sessao;
CREATE POLICY "Ver sessoes da minha loja" ON public.inventario_sessao FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Criar sessoes na minha loja" ON public.inventario_sessao;
CREATE POLICY "Criar sessoes na minha loja" ON public.inventario_sessao FOR INSERT WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Atualizar sessoes da minha loja" ON public.inventario_sessao;
CREATE POLICY "Atualizar sessoes da minha loja" ON public.inventario_sessao FOR UPDATE USING (loja_id IN (SELECT public.minhas_lojas()));

DROP POLICY IF EXISTS "Ver contagens da minha loja" ON public.inventario_contagem;
CREATE POLICY "Ver contagens da minha loja" ON public.inventario_contagem FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Criar contagens na minha loja" ON public.inventario_contagem;
CREATE POLICY "Criar contagens na minha loja" ON public.inventario_contagem FOR INSERT WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Atualizar contagens da minha loja" ON public.inventario_contagem;
CREATE POLICY "Atualizar contagens da minha loja" ON public.inventario_contagem FOR UPDATE USING (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Apagar contagens da minha loja" ON public.inventario_contagem;
CREATE POLICY "Apagar contagens da minha loja" ON public.inventario_contagem FOR DELETE USING (loja_id IN (SELECT public.minhas_lojas()));

-- ============================================================
-- FIM — depois disto, o "Contar em Equipa" SOMA as contagens.
-- ============================================================
