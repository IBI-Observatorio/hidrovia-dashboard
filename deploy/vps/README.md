# Deploy na VPS (dados.ibi-observatorio.org)

Produção roda na VPS Hostinger (`2.24.121.118`) em Docker, atrás do Nginx da máquina.
Desenho completo: `docs/superpowers/specs/2026-10-13-migracao-vps-design.md`.

| Arquivo do repo | Onde fica na VPS | O que é |
|---|---|---|
| `docker-compose.yml` | `/srv/hidrovia/docker-compose.yml` | serviço `web`, porta `127.0.0.1:8120`, `./data` → `/data` |
| `deploy.sh` | `/srv/hidrovia/deploy.sh` (root, 0755) | único comando da chave de deploy; troca a imagem e reverte se `/api/health` não responder em 90 s |
| `nginx-dados.ibi-observatorio.org.conf` | `/etc/nginx/sites-available/dados.ibi-observatorio.org` | proxy + HTTPS (Certbot) |
| `backup-data.sh` | `/srv/hidrovia/backup-data.sh`, cron em `/etc/cron.d/hidrovia-backup` (04:30 UTC) | `tar` diário de `data/` em `/srv/backups/hidrovia/`, 14 retidos |

Também na VPS (não versionados): `/srv/hidrovia/.env` (segredos, 0600), `tag` (sha em produção), `deploys.log`.

## Fluxo
Merge na `main` → workflow `Deploy` monta a imagem `ghcr.io/ibi-observatorio/hidrovia-dashboard:<sha>` →
job `deploy-vps` (ambiente `production`, exige aprovação) → `ssh hidrovia-deploy@2.24.121.118 <sha>` → `deploy.sh`.

## Rollback
- Re-run do workflow `Deploy` num commit antigo; ou
- como root na VPS: `/srv/hidrovia/deploy.sh <sha antigo>` (lista em `/srv/hidrovia/deploys.log`).
