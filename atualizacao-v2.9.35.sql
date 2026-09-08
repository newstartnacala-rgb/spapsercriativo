-- ============================================================
-- ATUALIZACAO v2.9.35 — Corrige envio de despacho pelo super-admin
-- ============================================================
-- PROBLEMA: o super-admin conseguia VER os despachos de todas as lojas,
-- mas nao os conseguia CRIAR/ATUALIZAR numa loja de que nao e membro.
-- Ao enviar, dava: "new row violates row-level security policy for
-- table despachos" — e o despacho nao gravava (o balconista nao recebia).
--
-- SOLUCAO: adicionar politicas de INSERT e UPDATE para o super-admin,
-- iguais a que ja existia para VER. Seguro de correr mais que uma vez.
-- (Os donos/membros continuam a criar despachos normalmente.)
-- ============================================================

DROP POLICY IF EXISTS "Super admin cria despachos" ON public.despachos;
CREATE POLICY "Super admin cria despachos" ON public.despachos
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

DROP POLICY IF EXISTS "Super admin atualiza despachos" ON public.despachos;
CREATE POLICY "Super admin atualiza despachos" ON public.despachos
  FOR UPDATE USING ((auth.jwt() ->> 'email') = 'joaomassuvir@gmail.com');

-- (Fim)
