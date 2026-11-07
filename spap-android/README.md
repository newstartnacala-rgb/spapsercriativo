# SPAP Apps Android

Duas apps nativas Android que abrem o sistema SPAP online:

| App | Abre | Pacote |
|---|---|---|
| **SPAP Monitor** | `/monitor.html` (painel do dono) | `com.spapsercriativo.monitor` |
| **SPAP Loja** | `/login.html` → Loja/PDV | `com.spapsercriativo.loja` |

Cada atualização do site chega sozinha às apps (não é preciso instalar outra vez).

## Compilação automática
Qualquer alteração em `spap-android/` enviada para o GitHub compila as duas apps
(GitHub Actions → `.github/workflows/spap-apk.yml`). Os APKs ficam em:
- `apks-build/SPAP-Monitor.apk` e `apks-build/SPAP-Loja.apk`
- Releases: https://github.com/newstartnacala-rgb/spapsercriativo/releases/latest

## Endereço do sistema
Em `app/build.gradle.kts`, `baseUrls` (o primeiro que responder é usado).

## O que a app faz de nativo
Impressão (Android/PDF) e RawBT, câmara e galeria para fotos, guardar backups e PDFs
em Transferências/SPAP, partilhar (WhatsApp, Drive, email), notificações de vendas
e emergências, vibração, ecrã sem internet com nova tentativa automática, botão voltar.
