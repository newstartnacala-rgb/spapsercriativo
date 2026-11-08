-- ============================================================
-- ATUALIZACAO v2.9.189 — TROCAR E-MAIL E SENHA NA HORA (Monitor > Meu Perfil)
-- ============================================================
-- Cria 2 funções seguras. Cada pessoa só consegue mudar a SUA PRÓPRIA conta
-- (usa auth.uid() — o utilizador com sessão iniciada).
--   • trocar_email_conta(novo_email): muda o e-mail de acesso sem link de confirmação
--     e atualiza também o e-mail da loja (email_dono).
--   • trocar_senha_conta(nova_senha): muda a senha (usada se o Supabase pedir nova autenticação).
-- Seguro repetir. Correr no Supabase > SQL Editor > New query > Run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trocar_email_conta(novo_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  e text := lower(trim(coalesce(novo_email, '')));
  antigo text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sem_sessao'; END IF;
  IF e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'email_invalido'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = e AND id <> uid) THEN RAISE EXCEPTION 'email_em_uso'; END IF;

  SELECT email INTO antigo FROM auth.users WHERE id = uid;

  UPDATE auth.users
     SET email = e,
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         email_change = '',
         email_change_token_new = '',
         email_change_token_current = '',
         email_change_confirm_status = 0,
         updated_at = now()
   WHERE id = uid;

  UPDATE auth.identities
     SET identity_data = jsonb_set(coalesce(identity_data, '{}'::jsonb), '{email}', to_jsonb(e)),
         updated_at = now()
   WHERE user_id = uid AND provider = 'email';

  -- e-mail da loja (lojas onde esta conta é membro e que tinham o e-mail antigo)
  UPDATE public.lojas
     SET email_dono = e
   WHERE id IN (SELECT loja_id FROM public.membros_loja WHERE user_id = uid)
     AND (email_dono IS NULL OR lower(email_dono) = lower(coalesce(antigo, '')));
END $$;

CREATE OR REPLACE FUNCTION public.trocar_senha_conta(nova_senha text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sem_sessao'; END IF;
  IF length(coalesce(nova_senha, '')) < 6 THEN RAISE EXCEPTION 'senha_curta'; END IF;
  UPDATE auth.users
     SET encrypted_password = extensions.crypt(nova_senha, extensions.gen_salt('bf')),
         updated_at = now()
   WHERE id = uid;
END $$;

REVOKE ALL ON FUNCTION public.trocar_email_conta(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.trocar_senha_conta(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.trocar_email_conta(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trocar_senha_conta(text) TO authenticated;

-- VERIFICACAO — deve listar as 2 funções
SELECT proname AS funcao FROM pg_proc WHERE proname IN ('trocar_email_conta', 'trocar_senha_conta') ORDER BY 1;
