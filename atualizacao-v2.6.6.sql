-- ============================================================
-- ATUALIZACAO v2.6.6 — CORRECAO CRITICA DOS RETORNOS
-- ============================================================
--
-- PROBLEMA:
-- A tabela venda_itens tinha a restricao "check (qtd > 0)", que
-- so permitia quantidades positivas. Como os retornos gravam
-- quantidades NEGATIVAS (ex: -1), a base de dados recusava a
-- gravacao. Esse erro travava a sincronizacao inteira, o stock
-- nunca subia no servidor e as vendas seguintes ficavam presas.
--
-- SOLUCAO:
-- Remover a restricao antiga e permitir negativos (retornos),
-- proibindo apenas o valor zero, que nao faz sentido.
-- ============================================================

-- 1. Remove a restricao antiga (o nome pode variar, tenta os dois)
ALTER TABLE public.venda_itens DROP CONSTRAINT IF EXISTS venda_itens_qtd_check;

-- 2. Remove qualquer outra restricao de qtd que exista nesta tabela
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.venda_itens'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%qtd%'
  LOOP
    EXECUTE format('ALTER TABLE public.venda_itens DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 3. Nova restricao: permite negativos (retornos), proibe apenas zero
ALTER TABLE public.venda_itens
  ADD CONSTRAINT venda_itens_qtd_nao_zero CHECK (qtd <> 0);

-- ============================================================
-- VERIFICACAO — deve devolver a nova restricao
-- ============================================================
SELECT conname AS restricao, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conrelid = 'public.venda_itens'::regclass AND contype = 'c';

-- ============================================================
-- FIM
-- ============================================================
