#!/usr/bin/env bash
# Único comando que a chave de deploy do GitHub pode rodar na VPS.
# Uso: deploy.sh <sha do commit>@sha256:<digest da imagem>
# O digest fixa a imagem exata publicada pelo build (a tag :sha do GHCR é mutável).
# Troca o container e volta sozinho para o anterior se ele não subir.
set -euo pipefail

DIR="${HIDROVIA_DIR:-/srv/hidrovia}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8120/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"
REF="${1:-}"

log() { echo "$(date -u +%FT%TZ) $*" >> "$DIR/deploys.log"; echo "$*"; }

if [[ ! "$REF" =~ ^[0-9a-f]{40}@sha256:[0-9a-f]{64}$ ]]; then
  echo "argumento recusado: esperado <sha de 40 hex>@sha256:<64 hex>" >&2
  exit 2
fi

cd "$DIR"
ANTERIOR="$(cat tag 2>/dev/null || true)"

# REF = <sha>@sha256:<hex>; o compose usa só o digest (sha256:<hex>).
sobe() {
  local digest="${1#*@}"
  DIGEST="$digest" docker compose pull web && DIGEST="$digest" docker compose up -d web
}

saudavel() {
  local t=0
  while (( t < HEALTH_TIMEOUT )); do
    # 200 = app no ar. Frescor dos dados é assunto do watchdog, não do deploy.
    if curl -fsS --max-time 5 -o /dev/null "$HEALTH_URL"; then return 0; fi
    sleep "$HEALTH_INTERVAL"; t=$(( t + HEALTH_INTERVAL ))
  done
  return 1
}

echo "$REF" > tag
if sobe "$REF" && saudavel; then
  log "OK $REF (anterior: ${ANTERIOR:-nenhum})"
  exit 0
fi

log "FALHA $REF — revertendo para ${ANTERIOR:-nenhum}"
if [[ -n "$ANTERIOR" ]]; then
  echo "$ANTERIOR" > tag
  sobe "$ANTERIOR" || log "FALHA ao reverter para $ANTERIOR"
fi
exit 1
