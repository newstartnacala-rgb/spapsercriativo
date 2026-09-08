-- ============================================================
-- ATUALIZACAO v2.6.8 — Suporte (link de WhatsApp editavel)
-- ============================================================
--
-- Cria uma tabela de configuracao global onde o super-admin
-- guarda o link do WhatsApp de suporte. Esse link aparece na
-- loja (PDV) e no monitor do dono, na aba Suporte.
--
-- Qualquer utilizador autenticado pode LER (para mostrar o botao),
-- mas so o super-admin (joaomassuvir@gmail.com) pode ESCREVER.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.config_global (
  chave text PRIMARY KEY,
  valor text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_global ENABLE ROW LEVEL SECURITY;

-- Todos os utilizadores autenticados podem LER a configuracao
DROP POLICY IF EXISTS "Todos leem config" ON public.config_global;
CREATE POLICY "Todos leem config" ON public.config_global
  FOR SELECT USING (auth.role() = 'authenticated');

-- So o super-admin pode inserir
DROP POLICY IF EXISTS "Super admin insere config" ON public.config_global;
CREATE POLICY "Super admin insere config" ON public.config_global
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

-- So o super-admin pode atualizar
DROP POLICY IF EXISTS "Super admin atualiza config" ON public.config_global;
CREATE POLICY "Super admin atualiza config" ON public.config_global
  FOR UPDATE USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

-- Valor inicial (podes mudar depois na app)
INSERT INTO public.config_global (chave, valor)
VALUES ('link_suporte_whatsapp', 'https://wa.me/258866577722')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- FIM
-- ============================================================
