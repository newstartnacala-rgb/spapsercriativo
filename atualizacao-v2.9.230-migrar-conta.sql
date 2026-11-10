-- ============================================================
-- ATUALIZACAO v2.9.230 — MIGRAR CONTA (Banca ↔ Loja) NA BASE DE DADOS
-- ============================================================
-- Cria a função segura migrar_conta(origem, para, email, senha).
-- Tudo acontece numa só operação dentro da base de dados (ou faz tudo, ou não faz nada):
--   1. Confirma o e-mail e a palavra-passe da pessoa com sessão iniciada.
--   2. Cria AUTOMATICAMENTE a conta nova (Loja ou Banca), com o mesmo e-mail,
--      o mesmo plano, a mesma validade e os mesmos dados da conta antiga.
--   3. Passa TODOS os produtos (stock, preços, fotos) para a conta nova.
--      A conta antiga fica a zero.
--   4. Encerra a conta antiga (estado = 'encerrado') e tira o acesso a ela:
--      já não abre — só abre a conta nova.
-- Seguro repetir. Correr no Supabase > SQL Editor > New query > Run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- marca de onde veio / para onde foi (para as apps saberem que a conta foi migrada)
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS migrado_de text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS migrada_para text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS migrada_em timestamptz;

CREATE OR REPLACE FUNCTION public.migrar_conta(p_origem text, p_para text, p_email text, p_senha text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  destino text := CASE WHEN lower(coalesce(p_para, '')) = 'banca' THEN 'banca' ELSE 'comercial' END;
  tipo_origem text;
  estado_origem text;
  email_conta text;
  senha_hash text;
  cols text;
  col record;
  novo text;
  n_prod int := 0;
  papel_dono text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sem_sessao'; END IF;

  -- 1) e-mail e palavra-passe da pessoa com sessão iniciada
  SELECT lower(email), encrypted_password INTO email_conta, senha_hash FROM auth.users WHERE id = uid;
  IF email_conta IS NULL OR email_conta <> lower(trim(coalesce(p_email, ''))) THEN RAISE EXCEPTION 'email_errado'; END IF;
  IF senha_hash IS NULL OR senha_hash <> extensions.crypt(coalesce(p_senha, ''), senha_hash) THEN RAISE EXCEPTION 'senha_errada'; END IF;

  -- só o dono/admin da conta pode migrar
  SELECT papel INTO papel_dono FROM public.membros_loja WHERE loja_id::text = p_origem AND user_id = uid LIMIT 1;
  IF papel_dono IS NULL OR papel_dono NOT IN ('admin', 'dono') THEN RAISE EXCEPTION 'sem_permissao'; END IF;

  EXECUTE 'SELECT tipo_loja, estado FROM public.lojas WHERE id::text = $1 FOR UPDATE' INTO tipo_origem, estado_origem USING p_origem;
  IF estado_origem = 'encerrado' THEN RAISE EXCEPTION 'ja_encerrada'; END IF;

  -- 2) cria a conta nova a partir da antiga (copia todas as colunas, menos o id e a data de criação)
  CREATE TEMP TABLE IF NOT EXISTS _spap_mig ON COMMIT DROP AS SELECT * FROM public.lojas WITH NO DATA;
  DELETE FROM _spap_mig;
  EXECUTE 'INSERT INTO _spap_mig SELECT * FROM public.lojas WHERE id::text = $1' USING p_origem;

  -- colunas com valor único (ex.: códigos): liberta-as na conta antiga para a nova as poder usar
  FOR col IN
    SELECT a.attname AS nome, a.attnotnull AS obrig, format_type(a.atttypid, a.atttypmod) AS tipo
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
     WHERE i.indrelid = 'public.lojas'::regclass AND i.indisunique AND NOT i.indisprimary AND i.indnatts = 1
  LOOP
    IF NOT col.obrig THEN
      EXECUTE format('UPDATE public.lojas SET %I = NULL WHERE id::text = $1', col.nome) USING p_origem;
    ELSIF col.tipo IN ('text', 'character varying') OR col.tipo LIKE 'character varying%' THEN
      EXECUTE format('UPDATE public.lojas SET %I = %I || %L WHERE id::text = $1', col.nome, col.nome, '-encerrada-' || substr(md5(random()::text), 1, 6)) USING p_origem;
    END IF;
  END LOOP;

  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'lojas'
     AND column_name NOT IN ('id', 'criado_em', 'created_at', 'migrado_de', 'migrada_para', 'migrada_em')
     AND is_generated = 'NEVER' AND (column_default IS NULL OR column_default NOT LIKE 'nextval%');
  EXECUTE format('INSERT INTO public.lojas (%s) SELECT %s FROM _spap_mig RETURNING id::text', cols, cols) INTO novo;

  EXECUTE 'UPDATE public.lojas SET tipo_loja = $1, migrado_de = $2, migrada_em = now() WHERE id::text = $3'
    USING destino, CASE WHEN tipo_origem = 'banca' THEN 'banca' ELSE 'comercial' END, novo;

  -- as mesmas pessoas (dono, gerentes) passam a ter acesso à conta nova
  EXECUTE 'INSERT INTO public.membros_loja (loja_id, user_id, papel, nome_exibicao)
           SELECT (SELECT id FROM public.lojas WHERE id::text = $2), user_id, papel, nome_exibicao
             FROM public.membros_loja WHERE loja_id::text = $1' USING p_origem, novo;

  -- 3) todos os produtos passam para a conta nova (a antiga fica a zero)
  EXECUTE 'UPDATE public.produtos SET loja_id = (SELECT id FROM public.lojas WHERE id::text = $2) WHERE loja_id::text = $1' USING p_origem, novo;
  GET DIAGNOSTICS n_prod = ROW_COUNT;

  -- 4) encerra a conta antiga e tira o acesso a ela
  EXECUTE 'UPDATE public.lojas SET estado = ''encerrado'', migrada_para = $2, migrada_em = now() WHERE id::text = $1' USING p_origem, destino;
  EXECUTE 'DELETE FROM public.membros_loja WHERE loja_id::text = $1' USING p_origem;

  -- registo (histórico de atividade), se a tabela existir
  BEGIN
    EXECUTE 'INSERT INTO public.atividade_log (loja_id, user_id, quem, acao, detalhe, extra)
             VALUES ((SELECT id FROM public.lojas WHERE id::text = $1), $2, ''Dono'', ''migracao'', $3, $4)'
      USING novo, uid,
            'Conta criada por migração: ' || n_prod || ' produto(s) vieram da ' || CASE WHEN tipo_origem = 'banca' THEN 'Banca' ELSE 'Loja' END,
            jsonb_build_object('de_loja', p_origem, 'produtos', n_prod, 'para', destino);
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN jsonb_build_object('nova_loja', novo, 'produtos', n_prod, 'tipo', destino);
END;
$$;

REVOKE ALL ON FUNCTION public.migrar_conta(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.migrar_conta(text, text, text, text) TO authenticated;
