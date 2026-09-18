-- ============================================================
-- ATUALIZACAO v2.9.0 — Inventario Colaborativo + Meu Perfil
-- ============================================================
-- Permite que varias pessoas contem partes diferentes da loja
-- ao mesmo tempo, cada uma no seu dispositivo, com a mesma conta.
-- As contagens juntam-se num so inventario partilhado.
-- ============================================================

-- Sessao de inventario (uma por vez, por loja)
CREATE TABLE IF NOT EXISTS public.inventario_sessao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  estado text NOT NULL DEFAULT 'aberta',   -- aberta | fechada
  fechado_em timestamptz
);

-- Contagens individuais (cada produto contado por alguem)
CREATE TABLE IF NOT EXISTS public.inventario_contagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES public.inventario_sessao(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL,
  produto_nome text,
  quantidade_contada integer NOT NULL DEFAULT 0,
  contado_por text,                         -- nome/codigo de quem contou
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sessao_id, produto_id)            -- 1 contagem por produto por sessao (a ultima vence)
);

CREATE INDEX IF NOT EXISTS idx_inv_sessao_loja ON public.inventario_sessao(loja_id);
CREATE INDEX IF NOT EXISTS idx_inv_contagem_sessao ON public.inventario_contagem(sessao_id);

-- RLS
ALTER TABLE public.inventario_sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_contagem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver sessoes da minha loja" ON public.inventario_sessao;
CREATE POLICY "Ver sessoes da minha loja" ON public.inventario_sessao FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Criar sessoes na minha loja" ON public.inventario_sessao;
CREATE POLICY "Criar sessoes na minha loja" ON public.inventario_sessao FOR INSERT WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Atualizar sessoes da minha loja" ON public.inventario_sessao;
CREATE POLICY "Atualizar sessoes da minha loja" ON public.inventario_sessao FOR UPDATE USING (loja_id IN (SELECT public.minhas_lojas()));

DROP POLICY IF EXISTS "Ver contagens da minha loja" ON public.inventario_contagem;
CREATE POLICY "Ver contagens da minha loja" ON public.inventario_contagem FOR SELECT USING (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Criar contagens na minha loja" ON public.inventario_contagem;
CREATE POLICY "Criar contagens na minha loja" ON public.inventario_contagem FOR INSERT WITH CHECK (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Atualizar contagens da minha loja" ON public.inventario_contagem;
CREATE POLICY "Atualizar contagens da minha loja" ON public.inventario_contagem FOR UPDATE USING (loja_id IN (SELECT public.minhas_lojas()));
DROP POLICY IF EXISTS "Apagar contagens da minha loja" ON public.inventario_contagem;
CREATE POLICY "Apagar contagens da minha loja" ON public.inventario_contagem FOR DELETE USING (loja_id IN (SELECT public.minhas_lojas()));

-- ============================================================
-- FIM
-- ============================================================
