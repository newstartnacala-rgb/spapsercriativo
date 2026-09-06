-- ============================================================
-- ATUALIZACAO v2.6.7 — Entregar o dia com descontos e gastos
-- ============================================================
--
-- Adiciona colunas a tabela entregas para o vendedor registar,
-- ao fechar o dia:
--   - descontos: total de descontos que deu no dia
--   - gastos: gastos do dia (almoco, agua, imposto...)
--   - gastos_nota: descricao dos gastos
--
-- Estes valores vao para a Auditoria de Caixa no Monitor.
-- ============================================================

ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS descontos numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gastos numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gastos_nota text;

-- ============================================================
-- VERIFICACAO
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'entregas'
ORDER BY ordinal_position;

-- ============================================================
-- FIM
-- ============================================================
