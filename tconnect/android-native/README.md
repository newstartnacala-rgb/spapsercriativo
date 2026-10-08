# T-Connect Child — bateria Android real — v2.38.2

Esta camada Android usa `BatteryManager` para obter a percentagem real da bateria e expõe o valor ao Child Web através de `TCNativeBattery.getPercent()`.

## Teste
1. Copie o diretório web `tc236` para `app/src/main/assets/tc236`.
2. Abra `android-native` no Android Studio.
3. Faça o build/instale o APK.
4. Vincule o Child ao Guardian.
5. O heartbeat enviará a percentagem obtida pelo Android.

A UI original do projeto não é redesenhada por esta camada.
