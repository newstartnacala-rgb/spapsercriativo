# Minha Emergência — aplicativo nativo independente

Este módulo usa o package `com.tconnect.child` e o nome Android `Minha Emergência`.
Ele é separado do aplicativo Guardian e carrega apenas a experiência Child a partir de `app/src/main/assets/tc236/child/`.

O botão web/PWA não substitui o APK nativo: para distribuir o APK é necessário compilar este módulo com Android SDK/Gradle e publicar o APK assinado em HTTPS. Depois, configure `childApkUrl` no `TC_SUPABASE` para que o botão de instalação possa baixar esse APK.
