# Migração Railway → VPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rodar o hidrovia-dashboard na VPS Hostinger em `https://dados.ibi-observatorio.org`, com deploy só via GitHub (aprovação do Bruno), e zerar a cobrança do Railway deste projeto.

**Architecture:** O GitHub Actions monta uma imagem Docker (Next `standalone`) e publica no GHCR; um job no ambiente `production` entra por SSH num usuário restrito que só pode rodar `/srv/hidrovia/deploy.sh <sha>`, que troca o container e volta sozinho se o `/api/health` não responder. O Nginx existente da VPS faz o HTTPS. Railway e VPS rodam em paralelo até a virada; depois o Railway vira redirecionador 301 e, após 30 dias, é apagado.

**Tech Stack:** Next.js 16.2.6, Node 20, Docker/Compose, GHCR, GitHub Actions, Nginx + Certbot, Bash, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-migracao-vps-design.md`

## Global Constraints

- VPS: `root@2.24.121.118` (`srv1696014`), Ubuntu 24.04. **Não alterar** stacks, sites Nginx, usuários ou permissões existentes (`mcp`, `catalogo`, `evolution`, `buzz-slsn`).
- Domínio: `dados.ibi-observatorio.org` (DNS no Google Cloud DNS, criado pelo Bruno).
- Imagem: `ghcr.io/ibi-observatorio/hidrovia-dashboard:<sha de 40 hex>` e `:latest`; pacote público.
- Node 20 na imagem (mesma versão do Railway).
- Porta: `127.0.0.1:8120` → container `3000`. Limite de memória `2g`.
- Pasta: `/srv/hidrovia/` (dono root, `0750`); `.env` `0600`; `data/` dono `1000:1000` (usuário `node` da imagem).
- Usuário de deploy: `hidrovia-deploy`, sem senha, fora do grupo `docker`, chave presa a `sudo /srv/hidrovia/deploy.sh`.
- `CRON_SECRET` continua **secret do repositório**; `VPS_SSH_KEY` e `VPS_KNOWN_HOSTS` são secrets do **ambiente `production`**.
- Variável do repositório para os crons: `SITE_URL`. Até a Fase B o fallback continua sendo a URL do Railway.
- Revisor/CODEOWNER: `@brunopinheiro-creator`. Configurações do repositório (ambiente, secrets, ruleset, colaboradores) exigem a conta dona `IBI-Observatorio` (o `gh` desta máquina está como `brunopinheiro-creator`, sem admin).
- Segredos nunca passam pelo git nem pelo chat.
- Ações irreversíveis (apagar projeto/volume no Railway) só com confirmação explícita do Bruno no momento.
- Railway: conferir `railway whoami` = `observatorio@ibinfraestrutura.org.br` antes de qualquer comando.

## Review Focus

1. **Build sem segredos no GitHub Actions** — páginas com `revalidate` são pré-renderizadas no build; no Railway o build tinha as variáveis, no Actions não. Esperado: build passa sem nenhuma variável e as páginas se atualizam em runtime. Coberto pelo Step 1.4 (build local com ambiente vazio).
2. **`/api/health` devolve 200 mesmo com `ok:false`** — o deploy.sh usa só "respondeu 200" (vivo), não frescor dos dados; senão o primeiro deploy, antes da cópia do volume, seria revertido. Coberto pelo teste "health 200 = sucesso" no Task 2.
3. **Argumento malicioso na chave de deploy** (`; rm -rf /`, sha curto, maiúsculas, vazio) — esperado: recusa sem chamar docker. Coberto pelos testes de recusa no Task 2.
4. **Primeiro deploy sem tag anterior que falha** — esperado: sai com erro, não tenta "voltar" para tag vazia. Coberto no Task 2.
5. **Arquivo lido em runtime ausente na imagem standalone** (`data/`, `content/notes`, `public/data`) — esperado: rotas `/api/historico`, `/radar`, `/aereo/cada-real`, `/api/severity-calendar` respondem 200. Coberto pelo smoke do Task 1 (standalone local) e Task 7 (VPS).

---

## Parte 1 — Repositório (branch `docs/migracao-vps`, um PR)

### Task 1: Imagem Docker com saída standalone condicional

**Files:**
- Modify: `next.config.ts` (adicionar `output` condicional)
- Create: `Dockerfile`
- Create: `.dockerignore`
- Test: `__tests__/next-config-output.test.ts`

**Interfaces:**
- Produces: imagem que escuta em `0.0.0.0:3000`, roda `node server.js` como usuário `node` (uid 1000), lê `DATA_DIR` do ambiente; `NEXT_OUTPUT=standalone` ativa o standalone só no build Docker (o Railway segue com `next start` intacto).

- [ ] **Step 1.1: Teste que falha**

`__tests__/next-config-output.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("next.config output", () => {
  it("usa standalone quando NEXT_OUTPUT=standalone (build Docker)", async () => {
    vi.stubEnv("NEXT_OUTPUT", "standalone");
    const cfg = (await import("../next.config")).default;
    expect(cfg.output).toBe("standalone");
  });

  it("não define output sem a variável (build do Railway continua igual)", async () => {
    vi.stubEnv("NEXT_OUTPUT", "");
    const cfg = (await import("../next.config")).default;
    expect(cfg.output).toBeUndefined();
  });
});
```

- [ ] **Step 1.2: Rodar e ver falhar**

Run: `npx vitest run __tests__/next-config-output.test.ts`
Expected: FAIL no primeiro teste (`expected undefined to be 'standalone'`).

- [ ] **Step 1.3: Implementar**

Em `next.config.ts`, logo após `const nextConfig: NextConfig = {`:
```ts
  // Build Docker (VPS) liga o standalone via NEXT_OUTPUT=standalone.
  // Sem a variável (build do Railway) nada muda: `next start` segue funcionando.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
```

`Dockerfile`:
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Lidos em runtime via process.cwd() — copiados explicitamente (o trace pode não pegar).
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/data ./data
COPY --from=build --chown=node:node /app/content ./content
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

`.dockerignore`:
```
.git
node_modules
.next
out
logs
*.log
coverage
```

- [ ] **Step 1.4: Testes passam + build standalone local sem segredos**

Run: `npx vitest run __tests__/next-config-output.test.ts` → Expected: 2 passed.

Build com ambiente limpo (PowerShell, na raiz do worktree):
```powershell
npm ci; $env:NEXT_OUTPUT="standalone"; Remove-Item Env:DATA_DIR -ErrorAction SilentlyContinue; npm run build
```
Expected: build conclui; existe `.next/standalone/server.js`.

- [ ] **Step 1.5: Smoke do standalone local (simula a imagem)**

```powershell
Copy-Item -Recurse public .next/standalone/; Copy-Item -Recurse .next/static .next/standalone/.next/; Copy-Item -Recurse data .next/standalone/; Copy-Item -Recurse content .next/standalone/
```
Inicie `node server.js` em `.next/standalone` com `PORT=3999` (via `run_in_background`) e rode:
```bash
for p in / /monitor /caso-2024 /agro /embed/pavimento /api/health /api/historico /api/severity-calendar /aereo/cada-real /radar; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3999$p)" "$p"; done
```
Expected: todas `200` (anotar e investigar qualquer 500 antes de seguir; `/radar` pode ser 200 ou redirecionar 307 — aceitar 3xx só se o destino responder 200). Parar o servidor depois.

- [ ] **Step 1.6: tsc + suíte completa**

Run: `npx tsc --noEmit; npm test` → Expected: sem erros; todos os testes passam.

- [ ] **Step 1.7: Commit**
```bash
git add next.config.ts Dockerfile .dockerignore __tests__/next-config-output.test.ts
git commit -m "feat(vps): imagem Docker standalone (ativada só com NEXT_OUTPUT)"
```

### Task 2: Arquivos da VPS (compose, deploy.sh, Nginx, backup) com testes do deploy.sh

**Files:**
- Create: `deploy/vps/docker-compose.yml`
- Create: `deploy/vps/deploy.sh`
- Create: `deploy/vps/nginx-dados.ibi-observatorio.org.conf`
- Create: `deploy/vps/backup-data.sh`
- Create: `deploy/vps/README.md`
- Test: `__tests__/deploy-sh.test.ts`

**Interfaces:**
- Consumes: imagem do Task 1.
- Produces: `deploy.sh <sha40>` — exit 0 sucesso; exit 2 argumento recusado (docker não é chamado); exit 1 falha de saúde (reverte para a tag anterior se houver). Variáveis de teste: `HIDROVIA_DIR`, `HEALTH_URL`, `HEALTH_TIMEOUT`, `HEALTH_INTERVAL`. Arquivos: `$HIDROVIA_DIR/tag`, `$HIDROVIA_DIR/deploys.log`.

- [ ] **Step 2.1: Teste que falha**

`__tests__/deploy-sh.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// No Windows roda pelo Git Bash; caminhos em formato /c/... e PATH controlado
// (evita a ambiguidade PATH/Path do Windows). No CI (ubuntu) é bash normal.
const WIN = process.platform === "win32";
const BASH = WIN ? "C:/Program Files/Git/bin/bash.exe" : "bash";
const posix = (p: string) => p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, l) => `/${l.toLowerCase()}`);
const SCRIPT = posix(resolve(__dirname, "../deploy/vps/deploy.sh"));
const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const BASE_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toUpperCase() !== "PATH"));

let dir: string;
let calls: string;

function stub(name: string, body: string) {
  const p = join(dir, "bin", name);
  writeFileSync(p, `#!/usr/bin/env bash
${body}
`);
  chmodSync(p, 0o755);
}

function run(arg: string, curlExit = 0) {
  const d = posix(dir);
  return spawnSync(BASH, [SCRIPT, arg], {
    encoding: "utf8",
    env: {
      ...BASE_ENV,
      PATH: `${d}/bin:/usr/bin:/bin`,
      HIDROVIA_DIR: d,
      HEALTH_URL: "http://stub/api/health",
      HEALTH_TIMEOUT: "2",
      HEALTH_INTERVAL: "1",
      CURL_EXIT: String(curlExit),
      CALLS: `${d}/calls.txt`,
    },
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "deploy-sh-"));
  mkdirSync(join(dir, "bin"));
  calls = join(dir, "calls.txt");
  stub("docker", 'echo "docker TAG=$TAG $*" >> "$CALLS"');
  stub("curl", 'echo "curl $*" >> "$CALLS"; exit "$CURL_EXIT"');
  stub("sleep", "true");
});

describe("deploy.sh", () => {
  for (const ruim of ["", "abc", SHA_A.toUpperCase(), `${SHA_A}; rm -rf /`, `${SHA_A}0`]) {
    it(`recusa argumento inválido: ${JSON.stringify(ruim)}`, () => {
      const r = run(ruim);
      expect(r.status).toBe(2);
      expect(existsSync(calls)).toBe(false);
      expect(existsSync(join(dir, "tag"))).toBe(false);
    });
  }

  it("health 200 = sucesso: grava tag e log", () => {
    const r = run(SHA_A, 0);
    expect(r.status).toBe(0);
    expect(readFileSync(join(dir, "tag"), "utf8").trim()).toBe(SHA_A);
    expect(readFileSync(calls, "utf8")).toContain(`docker TAG=${SHA_A} compose pull web`);
    expect(readFileSync(join(dir, "deploys.log"), "utf8")).toMatch(new RegExp(`OK ${SHA_A}`));
  });

  it("health falha com tag anterior: reverte e sai 1", () => {
    writeFileSync(join(dir, "tag"), `${SHA_A}\n`);
    const r = run(SHA_B, 7);
    expect(r.status).toBe(1);
    expect(readFileSync(join(dir, "tag"), "utf8").trim()).toBe(SHA_A);
    const c = readFileSync(calls, "utf8");
    expect(c).toContain(`docker TAG=${SHA_B} compose up -d web`);
    expect(c).toContain(`docker TAG=${SHA_A} compose up -d web`);
    expect(readFileSync(join(dir, "deploys.log"), "utf8")).toMatch(/FALHA/);
  });

  it("health falha no primeiro deploy (sem anterior): sai 1 sem reverter", () => {
    const r = run(SHA_A, 7);
    expect(r.status).toBe(1);
    expect(readFileSync(calls, "utf8")).not.toMatch(/TAG= compose/);
  });
});
```

- [ ] **Step 2.2: Rodar e ver falhar**

Run: `npx vitest run __tests__/deploy-sh.test.ts`
Expected: FAIL (script não existe → status 127).

- [ ] **Step 2.3: Implementar `deploy/vps/deploy.sh`**
```bash
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
```

- [ ] **Step 2.4: Testes passam**

Run: `npx vitest run __tests__/deploy-sh.test.ts` → Expected: 8 passed.

- [ ] **Step 2.5: Demais arquivos da VPS**

`deploy/vps/docker-compose.yml`:
```yaml
services:
  web:
    image: ghcr.io/ibi-observatorio/hidrovia-dashboard:${TAG:?TAG ausente - use deploy.sh}
    env_file: .env
    environment:
      DATA_DIR: /data
    volumes:
      - ./data:/data
    ports:
      - "127.0.0.1:8120:3000"
    restart: unless-stopped
    mem_limit: 2g
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

`deploy/vps/nginx-dados.ibi-observatorio.org.conf` (o Certbot acrescenta o bloco 443):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name dados.ibi-observatorio.org;

    location / {
        proxy_pass http://127.0.0.1:8120;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 20m;   # upload de PDF SEMA no /admin/upload
    }
}
```

`deploy/vps/backup-data.sh`:
```bash
#!/usr/bin/env bash
# Backup diário de /srv/hidrovia/data (cron do root). Mantém os 14 mais recentes.
set -euo pipefail
DEST=/srv/backups/hidrovia
mkdir -p "$DEST"
tar czf "$DEST/data-$(date -u +%Y%m%d).tar.gz" -C /srv/hidrovia data
ls -1t "$DEST"/data-*.tar.gz | tail -n +15 | xargs -r rm --
```

`deploy/vps/README.md`: o que cada arquivo é, onde fica na VPS (`/srv/hidrovia/`, `/etc/nginx/sites-available/`, `/etc/cron.d/hidrovia-backup`), e como fazer rollback (`Re-run` do workflow num commit antigo, ou como root `/srv/hidrovia/deploy.sh <sha>`).

- [ ] **Step 2.6: Commit**
```bash
git add deploy/vps __tests__/deploy-sh.test.ts
git commit -m "feat(vps): compose, deploy.sh com rollback automático, nginx e backup"
```

### Task 3: Workflow de deploy (Railway + VPS em paralelo) e CODEOWNERS

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Create: `.github/CODEOWNERS`
- Test: `__tests__/workflows-vps.test.ts`

**Interfaces:**
- Consumes: `Dockerfile` (Task 1), `deploy.sh <sha>` (Task 2).
- Produces: `deploy.yml` com jobs `railway` (o atual, removido no Task 10), `build` e `deploy-vps`. O nome do arquivo não muda — `idn-semanal`, `itacoatiara-semanal` e `boletim-cabotagem-semanal` disparam `gh workflow run deploy.yml`.

- [ ] **Step 3.1: Teste que falha**

`__tests__/workflows-vps.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");

describe("deploy.yml", () => {
  it("publica a imagem no GHCR com a tag do commit", () => {
    expect(deploy).toContain("ghcr.io/ibi-observatorio/hidrovia-dashboard:${{ github.sha }}");
  });
  it("job da VPS roda no ambiente production e depende do build", () => {
    expect(deploy).toMatch(/deploy-vps:[\s\S]*needs: build[\s\S]*environment: production/);
  });
  it("chave SSH vem de secret, nunca escrita no arquivo", () => {
    expect(deploy).toContain("secrets.VPS_SSH_KEY");
    expect(deploy).not.toMatch(/BEGIN OPENSSH PRIVATE KEY/);
  });
  it("só envia o sha para a VPS", () => {
    expect(deploy).toContain('hidrovia-deploy@2.24.121.118 "${{ github.sha }}"');
  });
});

describe("CODEOWNERS", () => {
  it("protege workflows e Dockerfile", () => {
    const co = readFileSync(".github/CODEOWNERS", "utf8");
    expect(co).toMatch(/^\/\.github\/\s+@brunopinheiro-creator$/m);
    expect(co).toMatch(/^\/Dockerfile\s+@brunopinheiro-creator$/m);
    expect(co).toMatch(/^\/deploy\/\s+@brunopinheiro-creator$/m);
  });
});
```

- [ ] **Step 3.2: Rodar e ver falhar**

Run: `npx vitest run __tests__/workflows-vps.test.ts` → Expected: FAIL (`CODEOWNERS` inexistente, strings ausentes).

- [ ] **Step 3.3: Implementar**

`.github/workflows/deploy.yml` (completo):
```yaml
name: Deploy

on:
  push:
    branches: [main]
  # Permite que outros workflows (ex.: idn-semanal) disparem o deploy apos
  # commitar dados — pushes via GITHUB_TOKEN nao acionam o gatilho `push`,
  # mas workflow_dispatch e excecao a essa regra anti-recursao do GitHub.
  workflow_dispatch:

concurrency:
  group: deploy
  cancel-in-progress: false

jobs:
  # Railway segue em producao ate a virada (Fase C remove este job).
  railway:
    runs-on: ubuntu-latest
    container: ghcr.io/railwayapp/cli:latest
    env:
      RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      RAILWAY_PROJECT_ID: afec5058-fcde-4c0d-8b8b-67943fa80fc4
      RAILWAY_SERVICE_ID: 85b66087-3d29-4ff6-80ef-2ecd0f217b84
    steps:
      - uses: actions/checkout@v5
      - name: Deploy to Railway
        run: railway up --service hidrovia-dashboard --detach

  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v5
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/ibi-observatorio/hidrovia-dashboard:${{ github.sha }}
            ghcr.io/ibi-observatorio/hidrovia-dashboard:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-vps:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy na VPS (só envia o sha; a chave só roda deploy.sh)
        env:
          VPS_SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
          VPS_KNOWN_HOSTS: ${{ secrets.VPS_KNOWN_HOSTS }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$VPS_SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          printf '%s\n' "$VPS_KNOWN_HOSTS" > ~/.ssh/known_hosts
          ssh -o BatchMode=yes hidrovia-deploy@2.24.121.118 "${{ github.sha }}"
```

`.github/CODEOWNERS`:
```
# Mudanças em deploy/infra exigem revisão do Bruno.
/.github/     @brunopinheiro-creator
/Dockerfile   @brunopinheiro-creator
/deploy/      @brunopinheiro-creator
```

- [ ] **Step 3.4: Testes passam**

Run: `npx vitest run __tests__/workflows-vps.test.ts` → Expected: 5 passed.

- [ ] **Step 3.5: Commit**
```bash
git add .github/workflows/deploy.yml .github/CODEOWNERS __tests__/workflows-vps.test.ts
git commit -m "ci(vps): build no GHCR + deploy na VPS em paralelo ao Railway; CODEOWNERS"
```

### Task 4: Crons apontando para `SITE_URL` e URLs fixas do dashboard

**Files:**
- Modify (BASE_URL): `.github/workflows/briefing-semanal.yml:29`, `enso-mensal.yml:29`, `insights-semanal.yml:49`, `noticias-semanal.yml:37`, `reguas-diario.yml:31`, `sgb-semanal.yml:40`, `supervisor-boletim-semanal.yml:36`, `watchdog.yml:34`
- Modify (DASH_API): `.github/workflows/boletim-cabotagem-semanal.yml:51`
- Modify (User-Agent): `app/api/cron/refresh-enso/route.ts:24`, `app/api/cron/refresh-sgb/route.ts:25`, `scripts/scrape-enso-cpc.py:34`
- Modify (exemplo iframe): `app/(site)/vitrine-cnt/page.tsx:69`
- Modify (scripts que consultam o dashboard): `scripts/calibra-cmr-cabotagem.mts:75`, `scripts/gera-relatorio-cabotagem-docx.mjs:30`, `scripts/gera-relatorio-cabotagem.mjs:33`, `scripts/modelo-multidriver-itacoatiara.mts:11`
- Modify: `docs/RUNBOOK-DADOS.md` (seção "Onde roda"), `docs/RAILWAY-CRON.md` (aviso de obsoleto no topo)
- Test: estender `__tests__/workflows-vps.test.ts`

**Fora do escopo (não mexer):** URLs `antaq-api-production.up.railway.app` (outro serviço) em `atualiza-portos.yml`, `scripts/gera-*`, `calibra-transferencia-teu.mjs`, `update-navegacao-series.py`, `RUNBOOK-DADOS.md:90`.

**Interfaces:**
- Produces: todos os crons usam `${{ vars.SITE_URL || 'https://hidrovia-dashboard-production.up.railway.app' }}` (fallback Railway até o Task 11 trocá-lo).

- [ ] **Step 4.1: Teste que falha** — acrescentar a `__tests__/workflows-vps.test.ts`:
```ts
import { readdirSync } from "node:fs";

describe("crons", () => {
  const dir = ".github/workflows";
  const arquivos = readdirSync(dir).filter((f) => f.endsWith(".yml"));
  it("nenhum workflow usa mais vars.RAILWAY_PUBLIC_URL", () => {
    for (const f of arquivos) {
      expect(readFileSync(`${dir}/${f}`, "utf8"), f).not.toContain("RAILWAY_PUBLIC_URL");
    }
  });
  it("os 9 workflows que chamam o dashboard leem vars.SITE_URL", () => {
    const usam = arquivos.filter((f) => readFileSync(`${dir}/${f}`, "utf8").includes("vars.SITE_URL"));
    expect(usam.sort()).toEqual([
      "boletim-cabotagem-semanal.yml", "briefing-semanal.yml", "enso-mensal.yml",
      "insights-semanal.yml", "noticias-semanal.yml", "reguas-diario.yml",
      "sgb-semanal.yml", "supervisor-boletim-semanal.yml", "watchdog.yml",
    ]);
  });
});
```

- [ ] **Step 4.2: Rodar e ver falhar** — `npx vitest run __tests__/workflows-vps.test.ts` → FAIL.

- [ ] **Step 4.3: Implementar**
```bash
sed -i 's/vars\.RAILWAY_PUBLIC_URL/vars.SITE_URL/' .github/workflows/*.yml
sed -i 's#+https://hidrovias.up.railway.app#+https://dados.ibi-observatorio.org#' app/api/cron/refresh-enso/route.ts app/api/cron/refresh-sgb/route.ts scripts/scrape-enso-cpc.py
sed -i 's#https://hidrovia-dashboard-production.up.railway.app/embed/pavimento#https://dados.ibi-observatorio.org/embed/pavimento#' "app/(site)/vitrine-cnt/page.tsx"
sed -i 's#https://hidrovia-dashboard-production.up.railway.app#https://dados.ibi-observatorio.org#' scripts/calibra-cmr-cabotagem.mts scripts/gera-relatorio-cabotagem-docx.mjs scripts/gera-relatorio-cabotagem.mjs scripts/modelo-multidriver-itacoatiara.mts
```
Os scripts só rodam à mão, depois da virada; até lá quem rodar usa `DASH_API`/edita o valor.

`docs/RUNBOOK-DADOS.md` — nova seção no topo:
```markdown
## Onde roda (desde a migração de out/2026)
- Produção: `https://dados.ibi-observatorio.org` — VPS Hostinger, `/srv/hidrovia` (Docker).
- `DATA_DIR` = `/srv/hidrovia/data` na VPS (montado em `/data`); backup diário em `/srv/backups/hidrovia/`.
- Deploy: `.github/workflows/deploy.yml` (merge na `main` + aprovação no ambiente `production`).
- Crons do GitHub chamam `vars.SITE_URL`. Detalhes: `deploy/vps/README.md`.
```
`docs/RAILWAY-CRON.md` — primeira linha:
```markdown
> **Obsoleto (out/2026):** o dashboard saiu do Railway; ver `docs/RUNBOOK-DADOS.md` § Onde roda.
```

- [ ] **Step 4.4: Testes, tsc e build** — `npx vitest run; npx tsc --noEmit` → Expected: tudo verde.

- [ ] **Step 4.5: Commit**
```bash
git add -A .github/workflows app scripts docs/RUNBOOK-DADOS.md docs/RAILWAY-CRON.md __tests__/workflows-vps.test.ts
git commit -m "chore(vps): crons leem vars.SITE_URL; URLs fixas apontam p/ dados.ibi-observatorio.org"
```

- [ ] **Step 4.6: Corrigir a spec** — em `docs/superpowers/specs/2026-10-13-migracao-vps-design.md` §2 trocar a lista de workflows pelos 9 do Step 4.1, registrar que as URLs `antaq-api` ficam fora, que `docs/HANDOFF-TI.md` não existe na `main`, e o CODEOWNER `@brunopinheiro-creator`. Commit `docs(spec): corrige inventario de URLs e workflows`.

- [ ] **Step 4.7: Abrir o PR (não fazer merge)**
```bash
git push -u origin docs/migracao-vps
gh pr create --base main --title "Migração Railway → VPS (parte repositório)" --body-file -  # corpo: resumo + link da spec/plano + "não fazer merge antes do Task 6"
```
O merge só acontece no Task 7, quando a VPS estiver pronta para receber o deploy.

---

## Parte 2 — GitHub e VPS (execução assistida)

### Task 5: Configurações do repositório (conta dona `IBI-Observatorio`)

Feito pelo Bruno na interface **logado como `IBI-Observatorio`** (ou Claude via `gh` depois de `gh auth login` nessa conta, com confirmação item a item). Pré-requisito: Task 6 Step 6.3 (chave e known_hosts gerados).

- [ ] **Step 5.1: Ambiente `production`** — Settings → Environments → New `production`:
  - Deployment branches: *Selected branches* → `main`.
  - Required reviewers: `brunopinheiro-creator`.
  - Environment secrets: `VPS_SSH_KEY` (conteúdo de `hidrovia-deploy_ed25519`, privada) e `VPS_KNOWN_HOSTS` (saída do `ssh-keyscan` do Step 6.3).
- [ ] **Step 5.2: Variável `SITE_URL`** — Settings → Variables → **não criar ainda** (Fase B, Task 8). Conferir que `CRON_SECRET` existe em *Repository secrets*.
- [ ] **Step 5.3: Ruleset na `main`** — Settings → Rules → New branch ruleset: alvo `main`; *Require a pull request* (1 aprovação, *Require review from Code Owners*); *Block force pushes*; *Restrict deletions*; bypass: só `IBI-Observatorio`/`brunopinheiro-creator`.
- [ ] **Step 5.4: Pacote GHCR público** — após o primeiro build (Task 7): Packages → `hidrovia-dashboard` → Package settings → Change visibility → Public.
- [ ] **Step 5.5: Colaboradores** — Settings → Collaborators → convidar quem o Bruno indicar (hoje já estão `mara-avila-graf` e `brunopinheiro-creator`).
- [ ] **Step 5.6: Verificar** — `gh api repos/IBI-Observatorio/hidrovia-dashboard/environments/production -q '.protection_rules[].type'` → contém `required_reviewers` e `branch_policy`.

### Task 6: Preparar a VPS (Fase A, sem impacto)

Executado por Claude via `ssh root@2.24.121.118`. Só cria coisas novas.

- [ ] **Step 6.1: DNS (Bruno)** — Google Cloud DNS, zona `ibi-observatorio.org`: registro **A** `dados` → `2.24.121.118`, TTL 300. Verificar: `nslookup dados.ibi-observatorio.org` → `2.24.121.118`.

- [ ] **Step 6.2: Pasta e arquivos**
```bash
scp deploy/vps/docker-compose.yml deploy/vps/deploy.sh deploy/vps/backup-data.sh root@2.24.121.118:/tmp/
ssh root@2.24.121.118 '
set -e
install -d -m 0750 -o root -g root /srv/hidrovia
install -d -m 0755 -o 1000 -g 1000 /srv/hidrovia/data
install -m 0644 /tmp/docker-compose.yml /srv/hidrovia/docker-compose.yml
install -m 0755 -o root -g root /tmp/deploy.sh /srv/hidrovia/deploy.sh
install -m 0755 -o root -g root /tmp/backup-data.sh /srv/hidrovia/backup-data.sh
install -m 0600 /dev/null /srv/hidrovia/.env
ls -la /srv/hidrovia'
```
Expected: `deploy.sh` `-rwxr-xr-x root root`; `.env` `-rw------- root root`; `data` dono `1000`.

- [ ] **Step 6.3: Usuário de deploy e chave**
```bash
ssh-keygen -t ed25519 -N "" -C "github-actions -> hidrovia-deploy" -f "$SCRATCH/hidrovia-deploy_ed25519"
PUB=$(cat "$SCRATCH/hidrovia-deploy_ed25519.pub")
ssh root@2.24.121.118 "
set -e
id hidrovia-deploy 2>/dev/null || adduser --disabled-password --gecos '' hidrovia-deploy
install -d -m 700 -o hidrovia-deploy -g hidrovia-deploy /home/hidrovia-deploy/.ssh
echo 'command=\"sudo /srv/hidrovia/deploy.sh \\\"\$SSH_ORIGINAL_COMMAND\\\"\",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding $PUB' > /home/hidrovia-deploy/.ssh/authorized_keys
chown hidrovia-deploy: /home/hidrovia-deploy/.ssh/authorized_keys; chmod 600 /home/hidrovia-deploy/.ssh/authorized_keys
echo 'hidrovia-deploy ALL=(root) NOPASSWD: /srv/hidrovia/deploy.sh' > /etc/sudoers.d/hidrovia-deploy
chmod 440 /etc/sudoers.d/hidrovia-deploy; visudo -cf /etc/sudoers.d/hidrovia-deploy
id hidrovia-deploy; cat /home/hidrovia-deploy/.ssh/authorized_keys | cut -c1-120"
ssh-keyscan -t ed25519 2.24.121.118 > "$SCRATCH/vps_known_hosts"
```
(`$SCRATCH` = scratchpad da sessão.) Expected: `visudo` → `parsed OK`; `id` sem grupo `docker`.
Entregar ao Bruno os dois arquivos para o Task 5.1 **sem colar o conteúdo no chat** (abrir a pasta com `reveal_path`). Apagar a chave privada local depois que o secret estiver criado.

- [ ] **Step 6.4: Testar a trava da chave**
```bash
K="$SCRATCH/hidrovia-deploy_ed25519"
ssh -i $K -o BatchMode=yes hidrovia-deploy@2.24.121.118 'id; cat /srv/hidrovia/.env'; echo "exit=$?"
ssh -i $K -o BatchMode=yes hidrovia-deploy@2.24.121.118 'abc'; echo "exit=$?"
```
Expected: ambos `argumento recusado...` e `exit=2` (nenhum comando arbitrário roda).

- [ ] **Step 6.5: `.env` a partir do Railway (sem passar pelo chat)**
```bash
railway whoami   # deve ser observatorio@ibinfraestrutura.org.br
railway variables -p afec5058-fcde-4c0d-8b8b-67943fa80fc4 -s hidrovia-dashboard -e production --kv > "$SCRATCH/hidrovia.env"
grep -v -E '^(RAILWAY_|DATA_DIR=|PORT=|NIXPACKS_)' "$SCRATCH/hidrovia.env" > "$SCRATCH/hidrovia.env.vps"
cut -d= -f1 "$SCRATCH/hidrovia.env.vps"     # mostrar SÓ os nomes ao Bruno
scp "$SCRATCH/hidrovia.env.vps" root@2.24.121.118:/srv/hidrovia/.env && ssh root@2.24.121.118 'chmod 600 /srv/hidrovia/.env'
rm "$SCRATCH/hidrovia.env" "$SCRATCH/hidrovia.env.vps"
```
Expected: nomes incluem `CRON_SECRET`, `ADMIN_PASSWORD`; avisar se `DEEPSEEK_API_KEY` faltar (não inventar valor).

- [ ] **Step 6.6: Primeira cópia do volume + conferência**
```bash
P=afec5058-fcde-4c0d-8b8b-67943fa80fc4
railway ssh -p $P -s hidrovia-dashboard -e production -- sh -c 'cd /data && find . -type f | wc -l && find . -type f -exec sha256sum {} + | sort -k2' > "$SCRATCH/railway-data.sha"
railway ssh -p $P -s hidrovia-dashboard -e production -- sh -c 'cd /data && tar czf - . | base64 -w0' > "$SCRATCH/data.b64"
base64 -d "$SCRATCH/data.b64" > "$SCRATCH/data.tgz"
scp "$SCRATCH/data.tgz" root@2.24.121.118:/tmp/hidrovia-data.tgz
ssh root@2.24.121.118 'tar xzf /tmp/hidrovia-data.tgz -C /srv/hidrovia/data && chown -R 1000:1000 /srv/hidrovia/data && cd /srv/hidrovia/data && find . -type f | wc -l && find . -type f -exec sha256sum {} + | sort -k2 && rm /tmp/hidrovia-data.tgz' > "$SCRATCH/vps-data.sha"
diff <(tr -d '\r' < "$SCRATCH/railway-data.sha") "$SCRATCH/vps-data.sha" && echo IGUAIS
```
Expected: `IGUAIS`. Se `railway ssh` corromper a saída (CRLF/pty), o diff acusa — nesse caso repetir com `--native` ou dividir por arquivo; **não seguir sem `IGUAIS`**.

- [ ] **Step 6.7: Nginx + certificado**
```bash
scp deploy/vps/nginx-dados.ibi-observatorio.org.conf root@2.24.121.118:/etc/nginx/sites-available/dados.ibi-observatorio.org
ssh root@2.24.121.118 'ln -s /etc/nginx/sites-available/dados.ibi-observatorio.org /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx && certbot --nginx -d dados.ibi-observatorio.org --non-interactive --agree-tos --redirect -m observatorio@ibinfraestrutura.org.br && nginx -t'
```
Expected: `nginx -t` ok antes e depois; certbot `Successfully deployed certificate`. Conferir que os outros 4 sites seguem respondendo: `curl -sI https://mcp.ibi-observatorio.org | head -1`.

- [ ] **Step 6.8: Backup diário**
```bash
ssh root@2.24.121.118 'echo "30 4 * * * root /srv/hidrovia/backup-data.sh" > /etc/cron.d/hidrovia-backup && /srv/hidrovia/backup-data.sh && ls -la /srv/backups/hidrovia'
```
Expected: um `data-AAAAMMDD.tar.gz`.

### Task 7: Primeiro deploy e validação (Fase A)

- [ ] **Step 7.1:** Bruno aprova e faz merge do PR do Task 4.7. O workflow `Deploy` roda: `railway` (inalterado), `build`, e `deploy-vps` fica **aguardando aprovação** → Bruno aprova.
- [ ] **Step 7.2:** Tornar o pacote GHCR público (Task 5.4) se o pull da VPS falhar por autenticação; re-run do `deploy-vps`.
- [ ] **Step 7.3: Smoke comparativo**
```bash
for p in / /monitor /caso-2024 /agro /embed/pavimento /api/health /api/historico /api/severity-calendar /aereo/cada-real /admin/upload; do
  a=$(curl -s -o /dev/null -w '%{http_code}' https://hidrovia-dashboard-production.up.railway.app$p)
  b=$(curl -s -o /dev/null -w '%{http_code}' https://dados.ibi-observatorio.org$p)
  echo "$a $b $p"; done
for api in /api/sema /api/sgb /api/enso; do
  diff <(curl -s https://hidrovia-dashboard-production.up.railway.app$api | jq -S .) <(curl -s https://dados.ibi-observatorio.org$api | jq -S .) >/dev/null && echo "IGUAL $api" || echo "DIFERE $api"; done
curl -sI https://dados.ibi-observatorio.org/embed/pavimento | grep -i -E 'content-security|x-frame'
```
Expected: mesmos códigos nos dois; `IGUAL` nas 3 APIs (diferença só de timestamp de geração é aceitável — mostrar o diff); `/embed` com `frame-ancestors *` e sem `X-Frame-Options`.
- [ ] **Step 7.4:** Login no `/admin/upload` pelo navegador (Bruno digita a senha). Não enviar boletim.
- [ ] **Step 7.5: Teste do rollback automático** (horário combinado com o Bruno) — como root: `/srv/hidrovia/deploy.sh 0000000000000000000000000000000000000000` → Expected: pull falha, `FALHA` no log, volta para o sha anterior, `exit 1`, site segue 200. Mostrar `tail -3 /srv/hidrovia/deploys.log`.
- [ ] **Step 7.6:** Relatório ao Bruno com as saídas acima. Railway segue como produção.

---

## Parte 3 — Virada e desligamento

### Task 8: Virada dos dados e crons (Fase B)

Fora das 13:00 UTC. Bruno não faz upload SEMA durante a janela.

- [ ] **Step 8.1:** Repetir o Step 6.6 inteiro (segunda cópia; `IGUAIS` obrigatório).
- [ ] **Step 8.2:** Bruno (conta dona) cria a variável do repositório `SITE_URL` = `https://dados.ibi-observatorio.org`.
- [ ] **Step 8.3:** `gh workflow run reguas-diario.yml --ref main`; aguardar concluir verde.
- [ ] **Step 8.4:** `curl -s https://dados.ibi-observatorio.org/api/health | jq '{ok, checks: (.checks|map_values(.ok))}'` → `ok: true` (se `insights`/`sgb` estiverem vencidos por motivo pré-existente, mostrar o mesmo endpoint no Railway para provar que já estava assim).
- [ ] **Step 8.5:** `gh workflow run watchdog.yml --ref main` → verde.
**Rollback:** apagar a variável `SITE_URL`.

### Task 9: Monitorar 2 dias

- [ ] **Step 9.1:** Após 48 h: `gh run list --limit 20` sem falhas nos crons; `/api/health` `ok: true`; `ssh root@2.24.121.118 'docker stats --no-stream hidrovia-web-1; ls /srv/backups/hidrovia'`.

### Task 10: Railway vira redirecionador (Fase C)

**Files:**
- Create: `deploy/railway-redirect/server.mjs`, `deploy/railway-redirect/package.json`
- Modify: `.github/workflows/deploy.yml` (remover job `railway`)
- Test: `__tests__/railway-redirect.test.ts`

- [ ] **Step 10.1: Conferir o modelo do `credencia-ibi`** — `railway` (conta observatorio@) → ler como o serviço `credencia-ibi` faz o 301 (`TARGET_ORIGIN`). Se for reaproveitável, usar o mesmo código; senão seguir com o abaixo.
- [ ] **Step 10.2: Teste que falha** — `__tests__/railway-redirect.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { destino } from "../deploy/railway-redirect/destino.mjs";

describe("redirecionador Railway", () => {
  it("preserva caminho e query", () => {
    expect(destino("https://dados.ibi-observatorio.org", "/monitor?x=1")).toBe("https://dados.ibi-observatorio.org/monitor?x=1");
  });
  it("não aceita host injetado no caminho", () => {
    expect(destino("https://dados.ibi-observatorio.org", "//evil.com/a")).toBe("https://dados.ibi-observatorio.org/evil.com/a");
  });
});
```
- [ ] **Step 10.3:** Run `npx vitest run __tests__/railway-redirect.test.ts` → FAIL.
- [ ] **Step 10.4: Implementar** `deploy/railway-redirect/destino.mjs`:
```js
// Monta a URL de destino preservando caminho e query; colapsa barras iniciais
// para que "//evil.com" nunca vire um host.
export function destino(origem, url) {
  const caminho = "/" + String(url || "/").replace(/^\/+/, "");
  return origem.replace(/\/+$/, "") + caminho;
}
```
`deploy/railway-redirect/server.mjs`:
```js
import { createServer } from "node:http";
import { destino } from "./destino.mjs";

const ORIGEM = process.env.TARGET_ORIGIN || "https://dados.ibi-observatorio.org";
createServer((req, res) => {
  res.writeHead(301, { Location: destino(ORIGEM, req.url), "Cache-Control": "public, max-age=3600" });
  res.end();
}).listen(process.env.PORT || 3000);
```
`deploy/railway-redirect/package.json`:
```json
{ "name": "hidrovia-railway-redirect", "private": true, "type": "module", "scripts": { "start": "node server.mjs" }, "engines": { "node": ">=20" } }
```
- [ ] **Step 10.5:** Run → 2 passed. Commit `feat(vps): redirecionador 301 do Railway`.
- [ ] **Step 10.6: Publicar no Railway** (confirmar com o Bruno antes): `cd deploy/railway-redirect && railway up -p afec5058-fcde-4c0d-8b8b-67943fa80fc4 -s hidrovia-dashboard -e production --detach`. Verificar: `curl -sI https://hidrovia-dashboard-production.up.railway.app/monitor` → `301` + `location: https://dados.ibi-observatorio.org/monitor`.
- [ ] **Step 10.7:** Remover o job `railway` de `deploy.yml` (senão o próximo push sobrescreve o redirecionador) e o secret `RAILWAY_TOKEN` deixa de ser usado. Atualizar o teste do Task 3 com `expect(deploy).not.toContain("railway up")`. PR → merge.
- [ ] **Step 10.8:** Lembrar o Bruno de avisar a CNT/parceiros para trocar links e iframes.

### Task 11: Desligamento total (Fase D, a partir de 13/11/2026 — 30 dias após a Fase C)

- [ ] **Step 11.1: Pré-condições** — 14 backups retidos e nenhuma falha de backup nos últimos 30 dias; crons verdes; Bruno confirma que a CNT trocou o iframe.
- [ ] **Step 11.2: Repositório** — remover `railway.toml`, `nixpacks.toml`, `deploy/railway-redirect/`, o teste dele; trocar o fallback nos 9 workflows: `sed -i "s#vars.SITE_URL || 'https://hidrovia-dashboard-production.up.railway.app'#vars.SITE_URL || 'https://dados.ibi-observatorio.org'#" .github/workflows/*.yml`; `npx vitest run`; PR → merge.
- [ ] **Step 11.3: Railway (irreversível — pedir confirmação explícita do Bruno antes)** — `railway whoami`; apagar o projeto `afec5058-fcde-4c0d-8b8b-67943fa80fc4` inteiro (produção, `hml`, volume) pelo painel ou `railway delete -p afec5058-fcde-4c0d-8b8b-67943fa80fc4`.
- [ ] **Step 11.4: Conferência** — `railway list` sem o projeto; na próxima fatura, nenhum item do hidrovia-dashboard. Atualizar a memória `project_railway_custos_desligamentos.md` e `project_url_producao_dashboard.md` (nova URL de produção).
