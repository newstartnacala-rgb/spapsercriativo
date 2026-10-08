# T-Connect — Ligação ao Supabase (planos, contas e perfil)

A gestão de planos, subscrições (contas) e perfil deixou de viver só no dispositivo
(localStorage) e passa a ser guardada no **Supabase**, partilhada entre dispositivos.

## 1. Executar o SQL
No painel do Supabase → **SQL Editor**, execute por esta ordem:
1. `supabase/schema.sql` (se ainda não o tiver feito)
2. `supabase/migration-plans.sql`  ← novo

Isto cria:
- `plans` — catálogo de planos (Familiar, Premium, Anual), editável pelo Super Admin.
- `subscriptions` — o plano de cada conta/email (dias, data de pagamento, estado).
- `profiles.avatar_url` — foto de perfil (o nome usa `profiles.full_name`).
- Função `tc_set_my_plan()` e políticas RLS (cada conta gere a sua; o Super Admin gere tudo).

O Super Admin é definido pelo email em `tc_is_super_admin()` dentro do SQL
(`bonifacioadelino1@gmail.com`). Altere aí se precisar.

## 2. Configurar a app
Confirme que `guardian/js/supabase-config.js` tem o URL e a anon key do seu projeto.

## 3. Como funciona (modelo híbrido)
- Com o Supabase ligado: a app lê os planos/subscrição/perfil ao entrar e grava lá
  cada alteração (ativar plano, editar dias/preço, escolher/pagar plano, foto/nome).
- Sem internet: usa a cópia local (cache) e volta a sincronizar quando reconectar.

## O que ainda depende de integração externa
- **Pagamento automático** M-Pesa/e-Mola: continua confirmado manualmente
  ("Confirmar pagamento" + comprovante por WhatsApp). A verificação automática
  exige integrar a API do provedor de pagamento.
