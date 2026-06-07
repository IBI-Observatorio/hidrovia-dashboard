#!/usr/bin/env bash
# scripts/dispara-insights.sh
#
# Dispara a rota /api/cron/insights no Railway para regenerar os Insights
# Automáticos via Claude. Projetado para ser chamado diariamente por um agente
# Claude Code rodando em VPS.
#
# Variáveis de ambiente obrigatórias:
#   CRON_SECRET       — mesmo valor do secret CRON_SECRET no Railway/GitHub Actions
#
# Variáveis de ambiente opcionais:
#   INSIGHTS_HOST     — URL base do deploy (padrão: Railway production)
#
# Uso:
#   CRON_SECRET=xxx bash scripts/dispara-insights.sh
#   CRON_SECRET=xxx INSIGHTS_HOST=http://localhost:3000 bash scripts/dispara-insights.sh

set -euo pipefail

HOST="${INSIGHTS_HOST:-https://hidrovia-dashboard-production.up.railway.app}"
ENDPOINT="${HOST}/api/cron/insights"
SECRET="${CRON_SECRET:?variável CRON_SECRET não definida}"
TS="[$(date -u +%Y-%m-%dT%H:%M:%SZ)]"

echo "$TS Iniciando pipeline de insights → $ENDPOINT"

RESP_FILE=$(mktemp)
trap 'rm -f "$RESP_FILE"' EXIT

HTTP=$(curl -sS \
  -o "$RESP_FILE" \
  -w "%{http_code}" \
  --retry 3 \
  --retry-all-errors \
  --retry-delay 15 \
  --max-time 200 \
  -X POST \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  "${ENDPOINT}")

echo "$TS HTTP $HTTP"

if command -v python3 &>/dev/null; then
  python3 -m json.tool "$RESP_FILE" 2>/dev/null || cat "$RESP_FILE"
else
  cat "$RESP_FILE"
fi
echo

if [ "$HTTP" != "200" ]; then
  echo "$TS ERRO: esperado HTTP 200, recebido $HTTP" >&2
  exit 1
fi

# Extrai campo "mensagem" do JSON para log limpo
MENSAGEM=$(python3 -c "
import sys, json
try:
    d = json.load(open('$RESP_FILE'))
    print(d.get('mensagem', d.get('erro', 'sem mensagem')))
except:
    print('resposta não-JSON')
" 2>/dev/null || echo "ok")

echo "$TS $MENSAGEM"
