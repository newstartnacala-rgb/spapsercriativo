# T-Connect — Ativação da vinculação QR/código

O Guardian não consegue criar um convite real apenas com JavaScript. O código precisa ser criado no Supabase.

1. Abra o Supabase do projeto.
2. Vá em SQL Editor.
3. Execute o arquivo `schema.sql` desta pasta inteiro.
4. Confirme que as funções `public.create_pairing_code` e `public.claim_pairing_code` existem.
5. Crie/entre numa conta Guardian.
6. Abra Dispositivos > Vínculo Guardian ↔ Child e clique em **Gerar QR de vinculação**.

O mesmo convite passa a funcionar por:
- QR Code;
- código manual;
- link de convite.

Para usar o link entre dois telefones, o T-Connect precisa estar publicado em HTTPS. Em produção, configure `childInviteBaseUrl` em `guardian/js/supabase-config.js` com a URL pública de `child/invite.html`.
