#!/usr/bin/env bash
# Único comando que a chave de deploy do GitHub pode rodar na VPS.
# Uso: deploy.sh <sha do commit, 40 hex>. Troca a imagem e volta sozinho se não subir.
set -euo pipefail

DIR="${HIDROVIA_DIR:-/srv/hidrovia}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8120/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"
SHA="${1:-}"

log() { echo "$(date -u +%FT%TZ) $*" >> "$DIR/deploys.log"; echo "$*"; }

if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "argumento recusado: esperado sha de 40 caracteres hexadecimais" >&2
  exit 2
fi

cd "$DIR"
ANTERIOR="$(cat tag 2>/dev/null || true)"

sobe() { TAG="$1" docker compose pull web && TAG="$1" docker compose up -d web; }

saudavel() {
  local t=0
  while (( t < HEALTH_TIMEOUT )); do
    # 200 = app no ar. Frescor dos dados é assunto do watchdog, não do deploy.
    if curl -fsS -o /dev/null "$HEALTH_URL"; then return 0; fi
    sleep "$HEALTH_INTERVAL"; t=$(( t + HEALTH_INTERVAL ))
  done
  return 1
}

echo "$SHA" > tag
if sobe "$SHA" && saudavel; then
  log "OK $SHA (anterior: ${ANTERIOR:-nenhum})"
  exit 0
fi

log "FALHA $SHA — revertendo para ${ANTERIOR:-nenhum}"
if [[ -n "$ANTERIOR" ]]; then
  echo "$ANTERIOR" > tag
  sobe "$ANTERIOR" || log "FALHA ao reverter para $ANTERIOR"
fi
exit 1
