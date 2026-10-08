T-Connect v2.38.32 — Minha Segurança / Minha Emergência

Base funcional: v2.38.22. Nesta versão, a experiência Child não usa login; inicia diretamente no vínculo por QR/código/link e concentra permissões/configurações no menu de três pontos.

# T-Connect v2.25 — Convite Guardian ↔ Child

- Geração real de código de emparelhamento via Supabase RPC.
- QR Code do convite.
- Link para abrir o Child com o código pré-preenchido.
- Partilha do sistema, WhatsApp, e-mail, SMS e cópia do convite.
- A partilha do sistema pode oferecer Quick Share/Bluetooth dependendo do Android.
- APK Child configurável em `guardian/js/supabase-config.js` via `childApkUrl`.
- O APK não é baixado automaticamente pelo navegador; é aberto através do endereço público configurado.
- O Guardian continua separado do Child.


### v2.24 — fluxo QR/link
- O código de emparelhamento não é mais apresentado ao utilizador.
- O Guardian gera um QR de vinculação e um link de convite.
- O Child lê o QR dentro do próprio aplicativo usando a câmara.
- O Child também aceita o link colado dentro do aplicativo.
- O link pode ser partilhado por WhatsApp, SMS, e-mail ou partilha do sistema.
- O token continua a existir internamente no Supabase para validar o vínculo; ele não é mostrado na interface.


### v2.25 — fluxo reforçado QR/link
- Botão Guardian “Gerar QR de vinculação” com estado de processamento e mensagens de erro/sucesso.
- QR gerado a partir do link de convite e renderizado dentro do Guardian.
- “Enviar convite”, copiar link, WhatsApp, e-mail e SMS com fallback para partilha/cópia.
- Child guarda um convite recebido antes do login e tenta concluir a vinculação depois da autenticação.
- Leitura QR dentro do Child com validação de contexto seguro (HTTPS/localhost) e feedback sem alertas bloqueantes.
- Link colado dentro do Child é validado e enviado ao RPC de vinculação.
- O token/código de validação permanece interno ao fluxo; não é mostrado como código manual.
- A vinculação continua de uso único no Supabase e requer conta Child autenticada.

## Requisitos para funcionamento real
1. Executar `supabase/schema.sql` no SQL Editor do projeto Supabase.
2. Configurar `guardian/js/supabase-config.js` com URL e publishable key.
3. Publicar o projeto por HTTPS para que a câmara do Child possa funcionar.
4. Configurar `childApkUrl` quando o APK assinado do Child estiver hospedado.
5. O link de convite abre o Child web quando usado no navegador; para abrir diretamente um APK instalado será necessário configurar Android App Links/Deep Links no projeto Android.


## v2.26 — Google Maps

The Guardian map now uses the official Google Maps JavaScript API while preserving the approved T-Connect interface. Configure `guardian/js/google-maps-config.js` with a restricted Google Maps JavaScript API key.

Required: enable Maps JavaScript API in Google Cloud and restrict the key by the site's HTTP referrer/domain. The app will show a clear configuration message until a key is provided.

The Child QR scanner remains inside the Child interface and uses the camera through Html5Qrcode when served over HTTPS or localhost.


## v2.36.3
- Mensagens: labels Mensagem recebida / Mensagem enviada e terminal com auto-scroll.
- Chamadas: identificação Nome e terminal filtrado exclusivamente para eventos de chamadas com auto-scroll.
- Captura de tela: terminal exclusivo de captura e engrenagem cinematográfica para iniciar visualização com autorização explícita do navegador.


## v2.38.32 — Child / Minha Emergência
- Alerta de emergência direto, sem confirmação e sem modal.
- Animação de preparação antes do envio e animação de confirmação após o envio.
- Vibração opcional do dispositivo quando suportada.
- O Android Child permanece como aplicativo nativo separado (`com.tconnect.child`), com nome e ícone Minha Emergência.

- APK nativo da Criança: módulo separado `com.tconnect.child`, com nome e ícone **Minha Emergência**. A compilação final do APK depende do Android SDK/Gradle e de uma URL HTTPS para distribuição.

### v2.38.37 — QR e código unificados
- QR, código manual e link passam pelo mesmo `claimPairFromAnySource()` -> `claimInvite()` -> `claim_pairing_code` RPC.
- O Child usa a mesma sessão anônima para qualquer origem do convite.
- Se Anonymous Sign-ins estiver desativado, o erro agora informa exatamente a configuração necessária no Supabase.
