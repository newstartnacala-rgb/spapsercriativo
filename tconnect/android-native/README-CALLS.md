# Chamadas reais — T-Connect v2.38.4

O Child Android usa `READ_CALL_LOG` para consultar o histórico de chamadas após consentimento do utilizador. A sincronização envia apenas registros autorizados para o backend através do evento `CHAMADA_RECEBIDA` ou `CHAMADA_EFETUADA`.

A versão Web/PWA não lê o histórico telefónico diretamente.
