# Compilar os APKs — Guardian e Child (separados)

Este projeto gera **dois aplicativos Android a partir do mesmo código**, usando *product flavors*:

| Flavor     | applicationId            | Nome no Android      | Abre               | Ícone           |
|------------|--------------------------|----------------------|--------------------|-----------------|
| `child`    | `com.tconnect.child`     | **Minha Emergência** | `child/index.html`    | SOS vermelho    |
| `guardian` | `com.tconnect.guardian`  | **T-Connect Guardian** | `guardian/index.html` | Escudo-T azul   |

Como os dois `applicationId` são diferentes, **podem ser instalados ao mesmo tempo** no mesmo telemóvel.

> ⚠️ Os APKs **não podem ser compilados no ambiente do Claude** (sem Android SDK e sem acesso aos servidores Google/Gradle). Compile na sua máquina ou num CI, como abaixo.

---

## Pré-requisitos

- **JDK 17**
- **Android SDK** com a Platform **API 35** e **Build-Tools 35**
  - Via Android Studio (recomendado) ou via `sdkmanager "platforms;android-35" "build-tools;35.0.0"`
- Ligação à Internet na primeira compilação (baixa Gradle 8.9 e as dependências AndroidX)

---

## Opção A — Android Studio (mais simples)

1. **File → Open** e escolha a pasta `android-native/`.
2. Deixe o Gradle sincronizar.
3. Em **Build → Select Build Variant**, pode escolher `childDebug` ou `guardianDebug`.
4. **Build → Build APK(s)**. No fim, clique em *locate* para abrir a pasta do APK.

Para gerar os dois de uma vez: **Build → Generate Signed Bundle / APK → APK**, selecione os flavors e uma chave de assinatura.

---

## Opção B — Linha de comando

A partir da pasta `android-native/`:

```bash
# APKs de TESTE (assinados com a chave debug, prontos a instalar)
./gradlew assembleChildDebug assembleGuardianDebug

# ou os dois flavors de uma vez (todos os debug)
./gradlew assembleDebug
```

APKs gerados:

```
app/build/outputs/apk/child/debug/app-child-debug.apk
app/build/outputs/apk/guardian/debug/app-guardian-debug.apk
```

Instalar num dispositivo ligado por USB (depuração ativada):

```bash
adb install -r app/build/outputs/apk/child/debug/app-child-debug.apk
adb install -r app/build/outputs/apk/guardian/debug/app-guardian-debug.apk
```

(No Windows use `gradlew.bat` em vez de `./gradlew`.)

---

## APK de produção (assinado)

APKs `release` saem **sem assinatura** e não instalam até serem assinados.

1. Crie uma keystore (uma vez):

```bash
keytool -genkey -v -keystore tconnect.keystore -alias tconnect \
  -keyalg RSA -keysize 2048 -validity 10000
```

2. Em `app/build.gradle.kts`, dentro de `android { ... }`, adicione a signingConfig e ligue-a ao `release`:

```kotlin
signingConfigs {
    create("release") {
        storeFile = file("../tconnect.keystore")
        storePassword = "SUA_SENHA"
        keyAlias = "tconnect"
        keyPassword = "SUA_SENHA"
    }
}
buildTypes {
    getByName("release") {
        isMinifyEnabled = false
        signingConfig = signingConfigs.getByName("release")
    }
}
```

3. Compile:

```bash
./gradlew assembleChildRelease assembleGuardianRelease
```

Saída:

```
app/build/outputs/apk/child/release/app-child-release.apk
app/build/outputs/apk/guardian/release/app-guardian-release.apk
```

---

## Distribuir o APK Child pelo botão "Instalar" do Guardian

O botão de instalação no app web baixa o APK Child a partir de um URL HTTPS.
Depois de publicar `app-child-release.apk` num servidor HTTPS, configure esse endereço
em `childApkUrl` dentro de `TC_SUPABASE` (ver `assets/tc236/SUPABASE-SETUP.md`).

---

## Notas

- O ícone do launcher só muda depois de **reinstalar/atualizar** o APK (o Android guarda o ícone antigo em cache).
- Ambos os flavors empacotam o bundle web completo (`assets/tc236/`, com Guardian **e** Child). Cada APK apenas abre a sua parte: o start URL é definido por flavor em `BuildConfig.START_URL`.
- Versão atual: `versionName = 2.39.4`, `versionCode = 2397`.
