-- ============================================================
-- ATUALIZACAO v2.9.26 — Tipo de loja (categorias por tipo)
-- ============================================================
-- Guarda o tipo de loja escolhido no registo (comercial, farmacia,
-- boutique, mercearia, restaurante, bottlestore). O monitor usa isto
-- para oferecer as categorias certas de cada tipo de negocio.
-- Seguro de correr mais do que uma vez.
-- ============================================================

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS tipo_loja text DEFAULT 'comercial';
