-- ============================================================
-- ATUALIZAÇÃO v2.4.3 — Alerta de expiração do pacote
-- ============================================================

-- Data em que o pacote da loja expira (o super admin define via botão "Alertar")
ALTER TABLE public.lojas
ADD COLUMN IF NOT EXISTS data_expiracao timestamptz;

-- ============================================================
-- FIM
-- ============================================================
