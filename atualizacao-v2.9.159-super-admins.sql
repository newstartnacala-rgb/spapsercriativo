-- ============================================================
-- ATUALIZACAO v2.9.159 — DOIS SUPER ADMINS
-- ============================================================
-- Super admins:
--   joaomassuvir@gmail.com
--   bonifacioadelino1@gmail.com
--
-- O que faz:
--   1. Cria a funcao public.eh_super_admin() com a lista dos super admins.
--   2. Refaz TODAS as permissoes do super admin (lojas, produtos, vendas,
--      itens de venda, membros, despachos, perdas, entregas e config)
--      para usarem essa funcao.
-- Para acrescentar ou tirar um super admin no futuro, basta mudar a lista
-- dentro da funcao e correr so o passo 1 outra vez.
--
-- Seguro repetir. Correr no Supabase > SQL Editor > New query > Run.
-- ============================================================

-- 1. LISTA DOS SUPER ADMINS
CREATE OR REPLACE FUNCTION public.eh_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN (
    'joaomassuvir@gmail.com',
    'bonifacioadelino1@gmail.com'
  );
$$;

GRANT EXECUTE ON FUNCTION public.eh_super_admin() TO anon, authenticated;

-- 2. PERMISSOES DO SUPER ADMIN (so mexe nas tabelas que existem)
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT * FROM (VALUES
      ('lojas',         'Super admin ve todas as lojas',          'SELECT'),
      ('lojas',         'Super admin atualiza todas as lojas',    'UPDATE'),
      ('produtos',      'Super admin gere todos os produtos',     'ALL'),
      ('vendas',        'Super admin ve todas as vendas',         'SELECT'),
      ('venda_itens',   'Super admin ve todos os itens de venda', 'SELECT'),
      ('membros_loja',  'Super admin ve todos os membros',        'SELECT'),
      ('despachos',     'Super admin ve todos os despachos',      'SELECT'),
      ('despachos',     'Super admin cria despachos',             'INSERT'),
      ('despachos',     'Super admin atualiza despachos',         'UPDATE'),
      ('perdas',        'Super admin ve todas as perdas',         'SELECT'),
      ('entregas',      'Super admin ve todas as entregas',       'SELECT'),
      ('config_global', 'Super admin escreve config',             'ALL'),
      ('config_global', 'Super admin insere config',              'INSERT'),
      ('config_global', 'Super admin atualiza config',            'UPDATE')
    ) AS t(tabela, nome, comando)
  LOOP
    IF to_regclass('public.' || p.tabela) IS NULL THEN
      RAISE NOTICE 'Tabela % nao existe — ignorada', p.tabela;
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.nome, p.tabela);

    IF p.comando = 'INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.eh_super_admin())', p.nome, p.tabela);
    ELSIF p.comando IN ('ALL', 'UPDATE') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR %s USING (public.eh_super_admin()) WITH CHECK (public.eh_super_admin())', p.nome, p.tabela, p.comando);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR %s USING (public.eh_super_admin())', p.nome, p.tabela, p.comando);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- VERIFICACAO — deve listar as permissoes com eh_super_admin()
-- ============================================================
SELECT tablename AS tabela, policyname AS permissao, cmd AS comando
FROM pg_policies
WHERE schemaname = 'public' AND policyname ILIKE 'Super admin%'
ORDER BY tablename, policyname;
