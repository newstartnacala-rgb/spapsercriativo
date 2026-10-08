# T-Connect v2.39.4 — Estabilização

## Corrigido
- **Android**: `MainActivity.kt` tinha `onDestroy()` duplicado (erro de compilação). WebView sem `allowFileAccess`. versionName 2.39.4 / versionCode 2397.
- **Atualizações**: o Service Worker usava cache fixo (`v2.38.11`) em cache-first; agora cache versionado + rede primeiro (timeout 4 s, depois cache). Instalação tolerante a ficheiros em falta e sem caminhos absolutos.
- **Versões**: `updates/t-connect-update.json`, manifest, VERSION e APK alinhados em 2.39.4; o Guardian compara com a versão real (antes: `'2.38.11'` fixo).
- **Mapa**: voltar de Satélite para Mapa já não força a camada Esri; observador ignora mutações do Leaflet; mapa órfão é libertado; geocodificação com 4 casas decimais, intervalo mínimo de 1,1 s, retentativa após falha e sem reabrir o popup; terminal do mapa limitado (zoom/movimento/clique).
- **Privacidade**: logout apaga localização guardada, eventos e notificações locais (`TC_MAP.reset()`).
- **Atualizar (Monitoramento)**: já não fica preso em “Atualizando…” (timeouts de 8–10 s; `reg.update()` não bloqueia).
- **Guardian**: `storage` event sem `JSON.parse` desprotegido; recarga automática só quando já existia um controlador (sem reload no primeiro acesso); “CRiANÇA” → “CRIANÇA”.
- **Child**: removidas definições duplicadas de `render/pairView/linkedView` (código morto).
- **index.html raiz**: removido Leaflet com hash SRI inválido (CSS era bloqueado) e rótulo de versão antigo.
- **Android**: cópia `assets/tc236` sincronizada com a web; removida pasta `android-native` aninhada.

## Correções adicionais (revisão)
- **Android (compilação)**: `MainActivity.kt` tinha `onRequestPermissionsResult()` **duplicado** (dois overrides iguais → erro "conflicting overloads / platform declaration clash"). Os dois foram fundidos num único método que trata o pedido do WebView (4300) e os pedidos diretos (4101/4102/4200–4202) e devolve o estado das permissões à interface. Removido o import não utilizado `WebViewClientCompat`.
- **Guardian (atualizações)**: `app.js` chamava `tcLatestRelease()`, mas essa função não existia em `supabase.js` — o fallback de verificação de atualização via Supabase falhava silenciosamente. Função adicionada, lendo a tabela `app_releases` (apenas versões publicadas, mais recente primeiro).
- **Mapa offline**: `vendor/leaflet/` preenchida com `leaflet.js`, `leaflet.css` e `images/` 1.9.4 oficiais. O `guardian/index.html` passou a carregar o Leaflet localmente (sem depender de `unpkg.com`); os ficheiros foram adicionados ao cache do Service Worker.
- **Sincronização**: as correções acima foram replicadas na cópia `android-native/app/src/main/assets/tc236`.

## Revisão do Guardian (mapa + conexão)
- **Botão Atualizar (Monitoramento)**: `updateMonitorRefreshUI()` procurava `.monitor-refresh-btn`, mas o botão renderizado tem a classe `.monitor-refresh-inline`. Nenhum dos seletores (`.refresh-copy b`, `.refresh-glyph`) correspondia, por isso o estado "Atualizando…" nunca era aplicado por essa função. Corrigido para encontrar o botão real e os seus elementos internos.
- **Conexão em tempo real (duplicada)**: `boot()` subscrevia o canal realtime do Supabase e marcava `state.realtime=true` sem nunca remover o canal anterior. Como o `login()` chama `boot()` depois de a sessão ser criada (e o `boot()` já tinha corrido no arranque), os eventos podiam chegar em duplicado (eventos, notificações e som de alerta repetidos). Agora o canal anterior é removido antes de subscrever um novo (`removeChannel`), e o handle fica guardado em `window.__tcGuardianRealtimeChannel`.
- **Versão desatualizada nas Definições**: o cartão de atualizações mostrava fixo `v2.38.10`. Passou a usar `window.TC_APP_VERSION` (2.39.4), por isso nunca mais fica desatualizado.
- Verificado por teste de integração (jsdom): todos os scripts do Guardian carregam juntos sem erros, as 10 páginas renderizam autenticadas sem exceções, a troca Mapa/Satélite/Híbrido funciona e os popups de métrica/comunicação abrem corretamente.

## O mapa não abria — corrigido
- **Causa**: o módulo `js/tc-map-alternative.js` começa com `if (!window.L) return;`. Se o Leaflet ainda não tivesse carregado no momento em que `init()` corria (ordem de scripts, rede lenta, ou — antes desta versão — o Leaflet vinha de um CDN externo que podia falhar), a função saía e **nunca mais tentava**: o mapa ficava preto/vazio sem erro visível.
- **Correção 1 — tentar de novo**: `init()` deixa de desistir em silêncio. Quando o Leaflet ainda não existe, reagenda-se (até ~6 s) e abre o mapa assim que o `L` fica disponível. Se mesmo assim não carregar, mostra uma mensagem clara de "Mapa indisponível" em vez de um retângulo vazio.
- **Correção 2 — referência explícita**: as 12 utilizações de `L.` (map, tileLayer, marker, circle, divIcon) passaram a `window.L.`, para não dependerem de resolução de escopo e funcionarem de forma consistente.
- **Correção 3 (já na revisão anterior)**: o Leaflet passou a ser servido localmente a partir de `vendor/leaflet/` em vez de `unpkg.com`, eliminando a principal causa de falha de carregamento.
- Testado nos dois cenários (jsdom): Leaflet presente no arranque → o mapa abre de imediato; Leaflet a carregar tarde → o mapa abre assim que a biblioteca chega (a repetição funciona). Em ambos, `L.map` é chamado e as camadas de tiles são adicionadas.
