# Atualizações do T-Connect

## Regra permanente

Toda nova versão deve manter o mesmo `applicationId` (`com.tconnect.child`), o mesmo certificado de assinatura e o mesmo ícone T-Connect. Assim o Android trata a nova APK como atualização e preserva os dados; não é necessário desinstalar a versão anterior.

### Web/PWA
- O Service Worker troca o cache automaticamente.
- `updates/t-connect-update.json` informa a versão publicada.
- O botão **Atualizar aplicativo** verifica e aplica a atualização disponível.

### Android
- O aplicativo pode baixar a APK indicada por `apk_url`.
- O Android abre o instalador oficial para confirmar a atualização.
- A atualização substitui a versão instalada sem desinstalar e sem apagar os dados.
- Uma instalação silenciosa não é permitida para um aplicativo normal; a confirmação do Android pode continuar aparecendo.

### Publicação
1. Incrementar `versionCode` e `versionName`.
2. Assinar a nova APK com a **mesma chave** da versão anterior.
3. Publicar a APK em `downloads/T-Connect-Android.apk` (ou alterar `apk_url`).
4. Atualizar `updates/t-connect-update.json`.
5. Não remover nem renomear os ícones T-Connect.
