-- SPAP v2.9.271 — Banner da loja (imagem comprida no topo da Loja)
-- Correr UMA vez no Supabase (SQL Editor). Pode correr-se várias vezes sem problema.
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS banner text;
NOTIFY pgrst, 'reload schema';
