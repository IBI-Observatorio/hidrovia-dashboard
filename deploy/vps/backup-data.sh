#!/usr/bin/env bash
# Backup diário de /srv/hidrovia/data (cron do root). Mantém os 14 mais recentes.
set -euo pipefail
DEST=/srv/backups/hidrovia
mkdir -p "$DEST"
tar czf "$DEST/data-$(date -u +%Y%m%d).tar.gz" -C /srv/hidrovia data
ls -1t "$DEST"/data-*.tar.gz | tail -n +15 | xargs -r rm --
