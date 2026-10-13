# Migração do hidrovia-dashboard: Railway → VPS Hostinger

**Data:** 13/10/2026 · **Status:** desenho aprovado em conversa; aguardando revisão desta spec
**Responsável pela decisão:** Bruno · **Execução:** Claude Code (com confirmação do Bruno nos passos irreversíveis)

## 1. Objetivo

Tirar o hidrovia-dashboard (Next.js) do Railway e rodá-lo na VPS Hostinger que o IBI já usa,
sob o domínio `dados.ibi-observatorio.org`, **zerando a cobrança do Railway referente a este
projeto** ao final.

Requisitos do Bruno:
- A equipe trabalha **só pelo GitHub**; ninguém além do Bruno acessa a VPS.
- Só o Bruno decide o que vai para produção (merge na `main` + aprovação do deploy).

### Fora do escopo
- Os demais sistemas da VPS (`mcp`, `catalogo`, `evolution`, `buzz-slsn`) e seus usuários,
  sites e permissões: **não são alterados**.
- Os outros projetos do Railway (SPA `ibi-observatorio.org`, `pab`, `precious-sparkle`,
  `tunel-santos-guaruja`, `credencia-ibi`).
- Troca de versão do Node, refatorações do app, mudança de cabeçalhos de cache.

## 2. Estado atual (conferido em 13/10/2026)

**Railway (lido do repositório; o painel não foi aberto):**
- Build Nixpacks, Node 20, `npm run build` / `npm start` (`railway.toml`, `nixpacks.toml`).
- Volume `sema-cache` montado em `/data`, `DATA_DIR=/data` (caches ANA, SEMA, SGB, ENSO, insights).
- Deploy: `.github/workflows/deploy.yml` roda `railway up` a cada push na `main` e via `workflow_dispatch`.
- URL pública: `https://hidrovia-dashboard-production.up.railway.app`. Existe também um ambiente `hml`.
- 9 workflows chamam o dashboard via `vars.RAILWAY_PUBLIC_URL || 'https://hidrovia-dashboard-production.up.railway.app'`
  (`BASE_URL`, ou `DASH_API` no boletim): boletim-cabotagem-semanal, briefing-semanal, enso-mensal,
  insights-semanal, noticias-semanal, reguas-diario, sgb-semanal, supervisor-boletim-semanal, watchdog.
- `idn-semanal`, `itacoatiara-semanal` e `boletim-cabotagem-semanal` disparam `gh workflow run deploy.yml`
  (o nome do arquivo de deploy não pode mudar).
- URLs `antaq-api-production.up.railway.app` são de outro serviço (desligado) e ficam fora do escopo.
- Configurações do repositório exigem a conta dona `IBI-Observatorio`; revisor/CODEOWNER: `@brunopinheiro-creator`.
- O app lê em runtime arquivos de `data/`, `content/` e `public/` via `process.cwd()`.
- Variáveis usadas no código: `DATA_DIR`, `CRON_SECRET`, `ADMIN_PASSWORD`, `DEEPSEEK_API_KEY`
  (`lib/llm.ts`), `ANTHROPIC_API_KEY`, `HIDRO_IDENTIFICADOR`, `HIDRO_SENHA`, `SHEETS_WEBHOOK_URL`,
  `SHEETS_SECRET`, `IBI_RADAR_CLIENTES`, `IBI_ASSINANTES_TOKENS`.
- Repositório `IBI-Observatorio/hidrovia-dashboard` é **público**.

**VPS (conferida por SSH, só leitura):** `srv1696014`, IP `2.24.121.118`, Ubuntu 24.04.4,
8 vCPU, 31 GB RAM (23 GB livres), 193 GB de disco livres, swap 4 GB.
Nginx nas portas 80/443 com Certbot (renovação automática). Quatro stacks docker compose,
todas escutando só em `127.0.0.1`. Portas locais já ocupadas: 3000, 5432, 5433, 6333, 6334,
8080, 8085, 8091, 8101, 8102, 8103, 8110. `PasswordAuthentication no`.

**DNS:** `ibi-observatorio.org` no Google Cloud DNS, administrado pelo Bruno
(`mcp.ibi-observatorio.org` já aponta para a VPS).

## 3. Desenho

### 3.1 Runtime na VPS

**Imagem Docker** (`Dockerfile` novo na raiz):
- Base Node 20 (mesma versão do Railway), build multi-stage.
- `next.config.ts` ganha `output: "standalone"`.
- Copia explicitamente `data/`, `content/` e `public/` para a imagem (leitura em runtime).
- Executa como usuário não-root. Nenhum segredo dentro da imagem.

**Estrutura em `/srv/hidrovia/`:**
```
/srv/hidrovia/
├── docker-compose.yml   # serviço "web": ghcr.io/ibi-observatorio/hidrovia-dashboard:${TAG}
├── .env                 # segredos; chmod 600, dono root
├── tag                  # sha em produção (lido pelo deploy.sh)
├── data/                # ex-volume /data do Railway, montado em /data no container
├── deploy.sh            # dono root, 0755, não editável por outros
└── deploys.log
```
- Porta `127.0.0.1:8120:3000`; `restart: unless-stopped`; healthcheck em `/api/health`;
  limite de memória 2 GB.

**Nginx:** novo site `dados.ibi-observatorio.org` no molde do `mcp.ibi-observatorio.org`
(`proxy_pass http://127.0.0.1:8120`, headers `Host`/`X-Forwarded-*`), certificado via
`certbot --nginx -d dados.ibi-observatorio.org`. Nenhum site existente é alterado.

### 3.2 Deploy e controle de acesso

**`deploy.yml` (substitui o `railway up`; mantém `push: main` e `workflow_dispatch`):**
1. Job `build`: monta a imagem e publica no GHCR com tags `:<sha>` e `:latest`, usando só
   `GITHUB_TOKEN` (`permissions: packages: write`). Pacote GHCR público.
2. Job `deploy`: `environment: production`; SSH para `hidrovia-deploy@2.24.121.118`
   enviando apenas o sha. Secrets **do ambiente**: `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`.

**Usuário `hidrovia-deploy` na VPS:**
- Sem senha, fora do grupo `docker`, sem shell interativo útil.
- `authorized_keys`: `command="sudo /srv/hidrovia/deploy.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding <chave>`.
- `/etc/sudoers.d/hidrovia-deploy`: `hidrovia-deploy ALL=(root) NOPASSWD: /srv/hidrovia/deploy.sh`.
- Par de chaves gerado só para isso; a privada vai apenas para o secret do ambiente.

**`deploy.sh`:**
1. Lê o sha de `SSH_ORIGINAL_COMMAND`; recusa o que não casar com `^[0-9a-f]{40}$`.
2. Guarda a tag atual como anterior; grava a nova em `tag`; `docker compose pull && up -d`.
3. Espera `/api/health` responder 200 por até 90 s; se não, restaura a tag anterior,
   sobe de novo e sai com erro (job vermelho no GitHub).
4. Registra data, sha e resultado em `deploys.log`.

**Rollback manual:** re-run do workflow num commit antigo, ou (root) `deploy.sh <sha>`.

**GitHub (equipe):**
- Colaboradores com permissão **Write**.
- Ruleset na `main`: PR obrigatório com 1 aprovação, sem push direto, sem force push;
  bypass só para o Bruno; "Require review from Code Owners".
- `.github/CODEOWNERS`: `/.github/` e `Dockerfile` → `@<usuário GitHub do Bruno>`.
- Environment `production`: deployment branches = só `main`; required reviewer = Bruno.
- Aplicação: arquivos via PR; configurações do repositório via `gh` pelo Claude **após
  confirmação do Bruno em cada uma** (ou pelo Bruno na interface).

### 3.3 Dados, variáveis e crons

**Volume:**
1. Inventário do `/data` do Railway via `railway ssh` (só leitura).
2. Cópia: `tar` via `railway ssh` → máquina local → `scp` para `/srv/hidrovia/data`.
3. Conferência: contagem de arquivos e sha256 por arquivo idênticos nos dois lados.
4. Segunda cópia no dia da virada (Fase B). Sem upload SEMA nessa janela.
5. Backup: cron do root, diário, `tar` de `/srv/hidrovia/data` em `/srv/backups/hidrovia/`,
   retenção de 14 arquivos.

**Variáveis:** `railway variables --kv` do serviço de produção (após conferir `railway whoami`
= conta observatorio@) → `scp` direto para `/srv/hidrovia/.env`. Nunca passam pelo git nem
pelo chat. Única alteração: `DATA_DIR=/data`.

**Crons:**
- Nos 9 workflows: `BASE_URL: ${{ vars.SITE_URL || 'https://dados.ibi-observatorio.org' }}`.
  Virada e rollback = trocar a variável `SITE_URL`.
- `CRON_SECRET` continua **secret do repositório** (no ambiente `production` cada cron
  esperaria aprovação). Mesmo valor no `.env` da VPS.

**URLs fixas no código:**
- `app/(site)/vitrine-cnt/page.tsx` ainda não está na `main` (branch local); o iframe dele passa a valer pelo 301 da Fase C
  e deve ser trocado para `https://dados.ibi-observatorio.org/embed/pavimento` quando essa página for mesclada.
- `app/api/cron/refresh-enso/route.ts` e `refresh-sgb/route.ts`: User-Agent → domínio novo.
- Scripts em `scripts/` que consultam o dashboard e docs (`RUNBOOK-DADOS.md`, `RAILWAY-CRON.md`)
  com a URL do Railway → domínio novo (`HANDOFF-TI.md` não existe na `main`); `RUNBOOK-DADOS.md` ganha a seção "onde roda".

### 3.4 Virada e desligamento

**Fase A — paralelo, sem impacto (Railway segue em produção):**
1. Bruno cria o registro A `dados` → `2.24.121.118` no Google Cloud DNS.
2. Claude prepara a VPS (usuário, pasta, Nginx, Certbot) e faz o primeiro deploy.
3. Validação com evidência: `next build` e `tsc` verdes; 200 em `/`, `/monitor`,
   `/caso-2024`, `/agro`, `/embed/pavimento`, `/api/health` nos dois endereços;
   `/api/sema`, `/api/sgb`, `/api/enso` com o mesmo conteúdo nos dois; login do `/admin/upload`.

**Fase B — virada (fora das 13:00 UTC):**
1. Segunda cópia do volume, conferida por sha256.
2. `SITE_URL` = `https://dados.ibi-observatorio.org`.
3. Disparo manual de `reguas-diario`; `/api/health` da VPS com `ok: true`.

**Fase C — Railway como redirecionador (após 2 dias estáveis):**
- O serviço de produção passa a responder 301 para `https://dados.ibi-observatorio.org` + mesmo
  caminho (modelo do `credencia-ibi`; código conferido antes de reaproveitar).
- Bruno avisa a CNT e demais parceiros para trocarem os links/iframes pelo domínio novo.

**Fase D — desligamento total do Railway deste projeto (após 30 dias sem problema):**
- Objetivo: **cobrança zero** do projeto hidrovia-dashboard no Railway.
- Remove tudo do projeto: serviço de produção (redirecionador), ambiente `hml` e o volume.
  No repositório, remover `railway.toml` e `nixpacks.toml`.
- **Consequência aceita:** links `*.up.railway.app` passam a falhar. Antes de apagar,
  conferir que a CNT já trocou o iframe.
- Pré-condição: dados conferidos na VPS e backup diário funcionando há 30 dias.
- Apagar projeto/volume é irreversível: **confirmação explícita do Bruno no momento**.
- Conferência final: consumo do projeto zerado na fatura/métrica do Railway.

**Rollback:**
- Até a Fase B: voltar `SITE_URL` para a URL do Railway.
- Fase C: reimplantar o app no Railway com `railway up` (volume preservado).
- Após a Fase D: não há volta para o Railway; a recuperação é pela VPS e seus backups.

## 4. Critérios de pronto

- `https://dados.ibi-observatorio.org` servindo o dashboard com HTTPS.
- Crons e watchdog verdes por 7 dias seguidos contra a VPS.
- Deploy só por PR na `main` com aprovação do Bruno; rollback automático testado uma vez
  (deploy proposital de imagem quebrada em horário combinado, ou teste equivalente).
- Backup diário gerado em `/srv/backups/hidrovia/`.
- Após a Fase D: nenhum recurso do hidrovia-dashboard cobrando no Railway.

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Arquivo lido em runtime ausente na imagem standalone | Cópia explícita de `data/`, `content/`, `public/`; smoke test das rotas na Fase A |
| Cache gravado no Railway entre cópia e virada | Segunda cópia na Fase B, sem upload SEMA na janela |
| Dashboard disputar RAM com os vizinhos | Limite de 2 GB no compose |
| Chave de deploy vazar | Chave presa ao `deploy.sh`, que só aceita um sha |
| Parceiro com link antigo após a Fase D | 30 dias de 301 + aviso antes de apagar |
