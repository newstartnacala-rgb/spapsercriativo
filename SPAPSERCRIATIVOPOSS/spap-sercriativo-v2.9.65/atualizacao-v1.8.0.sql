-- ============================================================
-- ATUALIZAÇÃO v1.8.0 — Categorias geridas pelo dono
-- Corre no Supabase → SQL Editor → nova query → Run
-- ============================================================

-- Categorias personalizadas da loja (criadas pelo dono no Monitor,
-- aparecem automaticamente no PDV). Guardadas como lista JSON:
-- [{ "nome": "Bebidas", "emoji": "🥤" }, ...]
ALTER TABLE public.lojas
ADD COLUMN IF NOT EXISTS categorias_personalizadas jsonb DEFAULT '[]'::jsonb;

-- ============================================================
-- FIM
-- ============================================================
