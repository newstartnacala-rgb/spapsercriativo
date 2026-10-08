# T-Connect — Pagamento automático M-Pesa + e-Mola (iMali Way)

O pagamento automático usa uma **Supabase Edge Function** (`pay`) onde as chaves ficam
seguras no servidor. A app nunca vê as chaves — só chama a função. O gateway escolhido
é o **iMali Way** (Paytek), que cobre **M-Pesa, e-Mola, mKesh e cartões** numa só API,
regulado pelo Banco de Moçambique.

## Como funciona (fluxo)
1. O utilizador escolhe o plano -> ecrã de pagamento.
2. Escolhe **M-Pesa** ou **e-Mola**, mete o número e toca **"Pagar agora"**.
3. A app chama a função `pay` -> esta cria o pagamento no iMali Way -> o cliente recebe
   o push no telemóvel e confirma com o PIN.
4. O iMali Way notifica a função (**webhook**) quando o pagamento conclui -> a função
   ativa a subscrição na tabela `subscriptions`. (Há também consulta por polling.)
5. Se o automático ainda não estiver configurado, a app avisa e mantém a opção
   **manual + comprovante por WhatsApp**.

## Passo 1 — Criar conta no iMali Way
- Regista-te em https://www.imaliway.co.mz e cria uma aplicação.
- Obtém as chaves (sandbox sk_test_... e produção sk_live_...).
- Documentação: https://docs.imaliway.co.mz

## Passo 2 — Publicar a função
```
supabase login
supabase functions deploy pay
```

## Passo 3 — Definir os Secrets
No painel Supabase -> Edge Functions -> pay -> Secrets (ou `supabase secrets set`):
```
PAY_PROVIDER=gateway
GATEWAY_BASE_URL=https://api.imaliway.co.mz/v1
GATEWAY_API_KEY=sk_test_...        # troca para sk_live_... em produção
WEBHOOK_SECRET=uma-frase-secreta-tua
```
Já existem no projeto (confirma que a função os vê):
```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

## Passo 4 — Registar o Webhook no iMali Way
No dashboard do iMali Way, define o **Webhook URL** para:
```
https://<REF-DO-TEU-PROJETO>.supabase.co/functions/v1/pay?webhook=1&secret=uma-frase-secreta-tua
```
(usa o mesmo valor de WEBHOOK_SECRET). É isto que confirma o pagamento sem o utilizador
ter de esperar com a app aberta.

## Testar
1. Mantém GATEWAY_API_KEY=sk_test_... (sandbox).
2. Na app: escolhe um plano -> Pagar agora -> usa um número de teste do iMali Way.
3. Confirma que a subscrição fica `active` na tabela `subscriptions`.
4. Só depois troca para sk_live_... (produção).

## Alternativa: API oficial M-Pesa (só M-Pesa, sem e-Mola)
```
PAY_PROVIDER=mpesa
MPESA_API_KEY=...
MPESA_PUBLIC_KEY=...            # base64 do portal
MPESA_SERVICE_PROVIDER_CODE=...
MPESA_HOST=api.sandbox.vm.co.mz # produção: api.vm.co.mz
```
Nesta rota, e-Mola NÃO é coberto. Para M-Pesa + e-Mola juntos, usa o iMali Way.

## Segurança
- As chaves vivem só nos Secrets do Supabase, nunca na app.
- A ativação do plano usa a service role apenas dentro da função.
- O webhook é protegido por WEBHOOK_SECRET.
- Testa sempre em sandbox antes de produção.
