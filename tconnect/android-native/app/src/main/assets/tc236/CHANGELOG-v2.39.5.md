# T-Connect v2.39.5 — Ícones e dois APKs

## Ícones
- Novo ícone do aplicativo **Criança (Minha Emergência)**: botão **SOS** vermelho, visualmente distinto do Guardian. Substituído em todos os tamanhos web (48–512) e nos mipmaps nativos (`ic_launcher` + `ic_launcher_round`, agora realmente circular).
- Novo ícone de **instalação** (verde, telemóvel + seta) no menu e no modal "Instalar" da Criança, substituindo os emojis `📱`/`📱⚙️`.
- Três ícones agora distintos: **azul** (Guardian) · **SOS vermelho** (Criança) · **verde** (Instalar).

## Android — dois APKs separados
- O módulo passou a ter dois *product flavors*:
  - `child` → `com.tconnect.child`, nome **Minha Emergência**, abre `child/index.html`.
  - `guardian` → `com.tconnect.guardian`, nome **T-Connect Guardian**, abre `guardian/index.html`.
- Como têm `applicationId` diferentes, **podem ser instalados em simultâneo**.
- `MainActivity` passou a carregar o URL inicial por flavor via `BuildConfig.START_URL`.
- Ícone de launcher próprio por flavor (SOS para a Criança, escudo-T azul para o Guardian).
- **Correção de compilação**: o bloco `dependencies` estava dentro de `android { }` no `build.gradle.kts` — movido para o nível de topo.
- Adicionado o **Gradle wrapper** (`gradlew`, `gradlew.bat`, `gradle-wrapper.jar`, `.properties`) e o guia `BUILD-APKS.md`.

## Cache
- Service Worker da Criança subido para `tc-child-v2.39.5`, para garantir o carregamento dos novos ícones no PWA.

## Versão
- `versionName` 2.39.5 / `versionCode` 2398.
