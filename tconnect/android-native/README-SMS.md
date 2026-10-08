# T-Connect v2.38.3 — SMS real/autorizado

Esta etapa adiciona leitura de SMS reais no Child Android usando `READ_SMS`, somente depois de o utilizador conceder a permissão do Android.

- `TCNativeSms.hasReadPermission()` verifica a autorização.
- `TCNativeSms.requestReadPermission()` solicita a autorização nativa.
- `TCNativeSms.readMessages(100)` lê SMS recebidos/enviados do dispositivo.
- O Child sincroniza os novos registros para os eventos do T-Connect, evitando duplicação localmente.
- O Guardian mostra os registros reais sincronizados nas abas de mensagens recebidas/enviadas.

A versão Web/PWA não lê SMS. A função real requer o APK Android e a permissão do sistema.
