-- ============================================================
-- ATUALIZACAO v2.7.0 — Suporte WhatsApp, categorias ocultas,
--                       metodos de pagamento editaveis
-- ============================================================
-- Seguro repetir (usa IF NOT EXISTS).
-- ============================================================

-- 1. COLUNAS NA TABELA LOJAS
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS categorias_ocultas jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metodos_pagamento jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS numero_transferencia text,
  ADD COLUMN IF NOT EXISTS codigo_agente text;

-- 2. TABELA CONFIG_GLOBAL (guarda o link de suporte WhatsApp, editavel pelo super admin)
CREATE TABLE IF NOT EXISTS public.config_global (
  chave text PRIMARY KEY,
  valor text,
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.config_global ENABLE ROW LEVEL SECURITY;

-- Todos podem LER a config (para mostrar o link de suporte na loja e no monitor)
DROP POLICY IF EXISTS "Todos leem config" ON public.config_global;
CREATE POLICY "Todos leem config" ON public.config_global
  FOR SELECT USING (true);

-- Apenas o super admin pode ESCREVER/ATUALIZAR a config
DROP POLICY IF EXISTS "Super admin escreve config" ON public.config_global;
CREATE POLICY "Super admin escreve config" ON public.config_global
  FOR ALL
  USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

-- ============================================================
-- VERIFICACAO
-- ============================================================
SELECT 'Colunas da loja:' AS info, column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='lojas'
  AND column_name IN ('categorias_ocultas','metodos_pagamento','numero_transferencia','codigo_agente')
ORDER BY column_name;

-- ============================================================
-- FIM
-- ============================================================
