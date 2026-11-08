#!/bin/bash
# Vercel: sair com 0 = NÃO publicar; sair com 1 = publicar.
# Poupa o limite diário: só publica uma vez por atualização.
MSG=$(git log -1 --format=%s 2>/dev/null)
FICH=$(git diff --name-only HEAD^ HEAD 2>/dev/null) || exit 1
[ -z "$FICH" ] && exit 1
# 1) Só mudou o site VendasSTEAM ou os workflows → não mexe nas apps
if ! echo "$FICH" | grep -qvE '^(vendassteam/|\.github/|apks-build/|vercel-ignore\.sh$)'; then echo "Só VendasSTEAM/workflows: não publicar"; exit 0; fi
# 2) Atualização com versão nova → o robô das apps faz logo outro commit ("Apps SPAP ...") e esse é que publica
if [[ "$MSG" != Apps\ SPAP* ]] && echo "$FICH" | grep -qE '(^|/)(version\.json|banca-version\.json)$|^spap-android/'; then echo "Espera pelo commit das apps"; exit 0; fi
exit 1
