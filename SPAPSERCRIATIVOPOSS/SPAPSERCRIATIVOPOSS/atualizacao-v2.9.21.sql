-- ============================================================
-- ATUALIZACAO v2.9.21 — PIN de seguranca do Monitor
-- ============================================================
-- Adiciona a coluna que guarda o PIN do dono (guardado como hash,
-- nao em texto simples). O monitor pede este PIN ao entrar, para o
-- balconista (que usa o mesmo login) nao conseguir abrir o monitor.
-- Seguro de correr mais do que uma vez.
-- ============================================================

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS pin_monitor text;

-- (Fim — o dono define/muda o PIN dentro do monitor, em "Meu Perfil".)
