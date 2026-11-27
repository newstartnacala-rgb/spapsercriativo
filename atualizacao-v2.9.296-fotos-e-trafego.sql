-- SPAP v2.9.296 — FOTOS NO STORAGE + SINCRONIZAÇÃO LEVE (menos tráfego, dentro do plano grátis)
-- Correr UMA vez no Supabase (SQL Editor → New query → colar → Run). Pode correr-se de novo sem problema.
--
-- O que faz:
--  1) Cria o «armazém» de fotos (bucket público `produtos`): cada foto passa a ser um ficheiro pequeno (WebP)
--     e a base de dados guarda só o endereço curto (URL). Só quem é da loja pode enviar/alterar/apagar
--     fotos da SUA loja; qualquer pessoa pode VER (fotos de produtos, como num catálogo).
--  2) Colunas leves para as listas de produtos: `imagem_url` (só o URL — nunca o texto base64 pesado)
--     e `tem_b64` (diz se o produto ainda tem foto antiga em base64, à espera de ir para o armazém).
--     As apps passam a pedir estas colunas em vez de `imagem`.
--  3) Sincronização incremental: `atualizado_em` passa a mudar sozinho em cada alteração do produto
--     (as apps só descarregam o que mudou) e os produtos apagados ficam registados em `produtos_apagados`.
--  4) Logótipo e banner da loja: colunas leves `logo_url` / `banner_url`.
--  5) Controlo da migração das fotos antigas (para dois aparelhos não migrarem a mesma loja ao mesmo tempo).
--
-- As fotos antigas (base64) são passadas para o armazém AUTOMATICAMENTE pelas apps, aos poucos,
-- sem perder nenhuma (só se apaga o base64 depois de a foto estar guardada e confirmada no armazém).

-- ============ 1) ARMAZÉM DE FOTOS ============
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('produtos', 'produtos', true, 2097152, ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Pastas: <id da loja>/... — só os membros dessa loja podem escrever lá
DROP POLICY IF EXISTS "spap_fotos_ver_minhas" ON storage.objects;
CREATE POLICY "spap_fotos_ver_minhas" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.membros_loja WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "spap_fotos_enviar" ON storage.objects;
CREATE POLICY "spap_fotos_enviar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.membros_loja WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "spap_fotos_alterar" ON storage.objects;
CREATE POLICY "spap_fotos_alterar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.membros_loja WHERE user_id = auth.uid()))
  WITH CHECK (bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.membros_loja WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "spap_fotos_apagar" ON storage.objects;
CREATE POLICY "spap_fotos_apagar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.membros_loja WHERE user_id = auth.uid()));

-- ============ 2) COLUNAS LEVES DOS PRODUTOS ============
-- (calculadas pela própria base de dados; nunca contêm base64)
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS imagem_url text
  GENERATED ALWAYS AS (CASE WHEN imagem ~* '^https?://' THEN imagem ELSE NULL END) STORED;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tem_b64 boolean
  GENERATED ALWAYS AS (COALESCE(left(imagem, 5) = 'data:', false)) STORED;

-- ============ 3) SINCRONIZAÇÃO INCREMENTAL ============
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.spap_tocar_atualizado()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := clock_timestamp();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS produtos_tocar_atualizado ON public.produtos;
CREATE TRIGGER produtos_tocar_atualizado
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.spap_tocar_atualizado();

CREATE INDEX IF NOT EXISTS produtos_loja_atualizado_idx ON public.produtos (loja_id, atualizado_em);
CREATE INDEX IF NOT EXISTS produtos_loja_b64_idx ON public.produtos (loja_id) WHERE tem_b64;

-- Produtos apagados (para os aparelhos os tirarem da lista sem descarregar tudo de novo)
CREATE TABLE IF NOT EXISTS public.produtos_apagados (
  id uuid PRIMARY KEY,
  loja_id uuid NOT NULL,
  apagado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS produtos_apagados_loja_idx ON public.produtos_apagados (loja_id, apagado_em);
ALTER TABLE public.produtos_apagados ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.produtos_apagados TO authenticated;
REVOKE ALL ON public.produtos_apagados FROM anon;
DROP POLICY IF EXISTS "Ver apagados da minha loja" ON public.produtos_apagados;
CREATE POLICY "Ver apagados da minha loja" ON public.produtos_apagados
  FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));

CREATE OR REPLACE FUNCTION public.spap_registar_produto_apagado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.produtos_apagados (id, loja_id, apagado_em)
  VALUES (OLD.id, OLD.loja_id, clock_timestamp())
  ON CONFLICT (id) DO UPDATE SET apagado_em = EXCLUDED.apagado_em;
  -- limpeza: registos com mais de 90 dias já não são precisos
  DELETE FROM public.produtos_apagados WHERE apagado_em < now() - interval '90 days';
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS produtos_registar_apagado ON public.produtos;
CREATE TRIGGER produtos_registar_apagado
  AFTER DELETE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.spap_registar_produto_apagado();

-- ============ 4) LOGÓTIPO E BANNER DA LOJA (colunas leves) ============
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS logo text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS banner text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS logo_url text
  GENERATED ALWAYS AS (CASE WHEN logo ~* '^https?://' THEN logo ELSE NULL END) STORED;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS banner_url text
  GENERATED ALWAYS AS (CASE WHEN banner ~* '^https?://' THEN banner ELSE NULL END) STORED;

-- ============ 5) MIGRAÇÃO DAS FOTOS ANTIGAS: um aparelho de cada vez por loja ============
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS fotos_migrar_ate timestamptz;

-- O aparelho pede a vez; recebe true se ficou com ela (por 10 minutos)
CREATE OR REPLACE FUNCTION public.spap_vez_migrar_fotos(p_loja uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM membros_loja WHERE user_id = auth.uid() AND loja_id = p_loja) THEN RETURN false; END IF;
  UPDATE lojas SET fotos_migrar_ate = now() + interval '10 minutes'
   WHERE id = p_loja AND (fotos_migrar_ate IS NULL OR fotos_migrar_ate < now());
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END; $$;
REVOKE ALL ON FUNCTION public.spap_vez_migrar_fotos(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.spap_vez_migrar_fotos(uuid) TO authenticated;

-- Quanto falta migrar (para o Monitor mostrar o progresso)
CREATE OR REPLACE FUNCTION public.spap_fotos_por_migrar(p_loja uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM membros_loja WHERE user_id = auth.uid() AND loja_id = p_loja)
    THEN (SELECT count(*)::int FROM produtos WHERE loja_id = p_loja AND tem_b64)
       + (SELECT (CASE WHEN left(logo, 5) = 'data:' THEN 1 ELSE 0 END) + (CASE WHEN left(banner, 5) = 'data:' THEN 1 ELSE 0 END) FROM lojas WHERE id = p_loja)
    ELSE 0 END;
$$;
REVOKE ALL ON FUNCTION public.spap_fotos_por_migrar(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.spap_fotos_por_migrar(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
