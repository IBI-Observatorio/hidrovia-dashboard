# Runbook de Dados — Observatório IBI

**A maior parte dos dados agora se atualiza sozinha na nuvem** (GitHub Actions →
Railway). O pipeline local da máquina do Bruno foi **aposentado** (a tarefa do
Windows `SACEPipelineSemanal` foi removida). Os scripts continuam no repo, mas só
para **metodologia/backfill manual** — o dia a dia roda automático.

> **Se um número está velho na tela:** primeiro veja o painel de saúde
> `GET /api/health` (mostra a idade real de cada cache) e a aba **Actions** do
> GitHub. O sistema imunológico (watchdog) abre uma _issue_ + manda e-mail quando
> algum cron falha — então cheque as **Issues** com label `healthcheck`.

> Última revisão: 31/05/2026 (migração "tudo na nuvem").

---

## ⏰ O que roda sozinho (crons na nuvem)

Todos são **GitHub Actions** que disparam uma rota no Railway ou commitam dados.
O schedule só vale a partir da branch `main`. Todos têm botão **Run workflow**
(disparo manual) na aba Actions.

| Job | Quando (UTC) | Workflow | O que faz |
|-----|--------------|----------|-----------|
| **Réguas / níveis** | diário 13:00 | `reguas-diario.yml` | `POST /api/cron/refresh-reguas` → busca ANA ao vivo, grava `ana-diario-cache.json` no volume. Atualiza os cards de cota do `/monitor` |
| **Série IDN** | terça 10:00 | `idn-semanal.yml` | Roda `atualiza-idn-series.mjs` (API ANA), **commita** `data/ana-idn-series.json` e dispara o deploy. Gráfico IDN histórico |
| **SACE/SGB** | terça 12:00 | `sgb-semanal.yml` | `POST /api/cron/refresh-sgb` → Railway raspa `sgb.gov.br`, baixa o PDF do Amazonas, parseia (`parseBoletimSGB`), grava `boletins_sgb_cache.json`. Previsão de cheia |
| **Insights AI** | terça 11:00 | `insights-semanal.yml` | `POST /api/cron/insights` → dados ao vivo + Claude **Haiku 4.5**, grava `insights_ai_cache.json`. Painel de Insights do `/monitor` |
| **ENSO** | quinta 17:00 | `enso-mensal.yml` | `POST /api/cron/refresh-enso` → Railway raspa CPC/NOAA, grava `enso_cpc_cache.json`. (Roda toda quinta; idempotente — CPC publica na 2ª quinta) |
| **Briefing** | quarta 13:00 | `briefing-semanal.yml` | `POST /api/cron/briefing` → regenera o briefing editorial da semana, grava `briefings/YYYY-WW.json` no volume |
| **Portos / ANTAQ** | dia 16, 11:00 | `atualiza-portos.yml` | Roda `gera-portos-series.mjs` + `gera-series-tendencia.mjs`, **commita** os JSONs |
| **Deploy** | push na `main` + manual | `deploy.yml` | `railway up`. Tem `workflow_dispatch` (crons que commitam dados disparam ele) |
| **Sistema imunológico** | diário 14:00 | `watchdog.yml` | Ver seção abaixo |

> **Por que rotas server-side e não scripts no CI para ENSO/SGB?** O **fetch dos
> sites externos sai do Railway** (que já acessa ANA/NOAA/SGB sem bloqueio), em vez
> dos runners do GitHub. O Actions só dispara. IDN e Portos são exceção: rodam o
> script no runner e **entregam por commit** (a série/JSON é versionada e o
> `lerSerieIDN`/páginas leem do repo no build).

### Persistência (volume Railway)
As rotas que gravam cache escrevem em **`DATA_DIR=/data`**, um **volume
persistente** montado no service web (`hidrovia-dashboard-volume`). Sem ele, o
cache sumiria a cada deploy. Caches no volume: `ana-diario-cache.json`,
`boletins_sgb_cache.json`, `enso_cpc_cache.json`, `insights_ai_cache.json`,
`briefings/`. (A série IDN é exceção: vai versionada no git, lida de `cwd/data`.)

### Secrets / variáveis necessárias
- **GitHub (repo secrets):** `CRON_SECRET`, `RAILWAY_TOKEN` (escopo de deploy),
  `ANTHROPIC_API_KEY`, `HIDRO_IDENTIFICADOR`, `HIDRO_SENHA`.
- **Railway (service web):** `CRON_SECRET`, `ANTHROPIC_API_KEY`,
  `HIDRO_IDENTIFICADOR`, `HIDRO_SENHA`, `ADMIN_PASSWORD`, `DATA_DIR=/data` (+ volume).
- `CRON_SECRET` precisa ser **o mesmo valor** no GitHub e no Railway (as rotas
  validam `Authorization: Bearer $CRON_SECRET`).
- Para empurrar mudanças em `.github/workflows/**` o token do `git`/`gh` precisa do
  escopo **`workflow`** (`gh auth refresh -s workflow`).

---

## 🛡️ Sistema imunológico (watchdog)

`watchdog.yml` roda **todo dia 14:00 UTC** e verifica dois níveis:
1. **"Rodou?"** — via API do GitHub, confere se cada workflow rodou no prazo e com
   sucesso (réguas ≤30h; insights/IDN/ENSO/SGB/briefing ≤8d; portos ≤40d — pega
   falha e parada silenciosa; deploy só falha-na-última, por ser gatilho de push).
2. **"Dado fresco?"** — bate em **`GET /api/health`**, que reporta a idade real dos
   caches no volume (pega a falha silenciosa: job verde, dado velho).

Se algo falha: **abre/atualiza uma issue** (label `healthcheck`) **e falha o run**
(o GitHub manda e-mail). Quando normaliza, **fecha a issue sozinho**.

`GET /api/health` (público) é o jeito mais rápido de auditar tudo de uma vez —
retorna `ok` geral + `reguas`, `insights`, `enso`, `sgb`, `portos`.

> **Fora do alcance:** o watchdog cobre os crons de nuvem e o dado em produção.

---

## 📦 PORTOS / ANTAQ — automático dia 16 (+ manual)

`atualiza-portos.yml` (dia 16) já roda `gera-portos-series.mjs` +
`gera-series-tendencia.mjs` e commita. **Pré-requisito:** API ANTAQ no ar —
`curl https://antaq-api-production.up.railway.app/api/v1/saude`.

Ficam **fora** do workflow (rode à mão quando precisar):
```bash
python scripts/update-navegacao-series.py    # → navegacao-series.json (cabotagem/longo curso)
python scripts/forecast_conteiner.py --payload <antaq.json> --out lib/forecast-conteiner.json
```

| Página | Script | Saída |
|--------|--------|-------|
| `/portos/movimentacao` | `gera-portos-series.mjs` (auto) | `public/data/antaq/dashboard/portos-series.json` |
| `/portos/ineditas/tendencia-cargas` (séries) | `gera-series-tendencia.mjs` (auto) | `public/data/antaq/dashboard/series-tendencia.json` |
| `/portos/ineditas/tendencia-cargas` (forecast) | `forecast_conteiner.py` (manual) | `lib/forecast-conteiner.json` |
| cabotagem / longo curso | `update-navegacao-series.py` (manual) | `public/data/antaq/dashboard/navegacao-series.json` |

- **`gera-portos-series.mjs`** demora ~3–5 min (~450 chamadas). API é instância
  única (DuckDB, 1 conexão) — concorrência alta dá HTTP 500. O script já usa
  concorrência 2 + retry/backoff. **Não suba a concorrência.** Vars: `TOP_N`
  (default 50), `ANTAQ_API_URL`, `DATA_INICIO`.
- **`forecast_conteiner.py`** NÃO regenera `horse-race-30.json` (estático). Ver
  `docs/TENDENCIA-CARGAS.md`.
- `public/data/antaq/home-cards.json` **não tem gerador** — editado à mão.

---

## 🌊 Réguas / níveis — automático diário

Os cards de cota do `/monitor` leem `data/ana-diario-cache.json` (volume), que
**vira à meia-noite de Manaus** e é repopulado pela ANA ao vivo. Antes dependia de
alguém abrir a página; agora o `reguas-diario.yml` (13:00 UTC) força o refresh
diário via `/api/cron/refresh-reguas` (`obterDadosDiariosANA` em `lib/cache-ana-diario.ts`).

> Fonte da cota das réguas é **sempre ANA** (`cota_m`); boletins SGB/SEMA são
> contexto e **nunca** sobrescrevem a cota.

---

## 🌊 HIDROLOGIA / IDN — duas coisas diferentes

1. **Série IDN do gauge (semanal, AUTOMÁTICA)** — `idn-semanal.yml` roda
   `atualiza-idn-series.mjs`, busca os últimos 30 dias na ANA, recalcula o IDN e
   commita `data/ana-idn-series.json`. Não precisa fazer nada.

2. **Orquestrador de metodologia (MANUAL)** — recalibra percentis/GMM/HMM/limiares.
   Só rode ao **revisar metodologia** ou fazer backfill:
   ```bash
   npm run atualiza-dados            # baixa cotas/vazões → percentis → GMM → HMM → IDN histórico → severity
   npm run atualiza-dados:force      # apaga e rebaixa todos os CSVs
   node scripts/atualiza-dados.mjs --skip-download   # só recalcula derivados
   ```
   Depois: `git diff lib/` → `npm test` → `npm run build` → commit/push.

> ⚠️ A API ANA SOAP (vazão consolidada) **descontinua em 30/jun/2026**. A coleta de
> cota/vazão dos crons já usa a **REST v2** (ver `lib/ana-client.ts`); o
> `atualiza-dados.mjs` ainda pode depender da SOAP — migrar antes da data.

---

## 🌎 ENSO — automático (quinta)

`enso-mensal.yml` dispara `/api/cron/refresh-enso`: o Railway raspa a ENSO
Diagnostic Discussion da CPC/NOAA, parseia status/síntese e grava
`enso_cpc_cache.json` no volume. Idempotente (não regrava se `data_emissao` igual).
Consumido por `lerENSOAdvisory()` → `fetchPrevisao2026()`.

Script CLI equivalente (uso manual): `python scripts/scrape-enso-cpc.py`.

---

## 🌧️ SACE / SGB — automático (terça)

`sgb-semanal.yml` dispara `/api/cron/refresh-sgb`: o Railway raspa a listagem de
boletins do Amazonas em `sgb.gov.br`, baixa o PDF mais recente do mês, parseia com
`parseBoletimSGB` (`lib/sgb-parser.ts`) e grava `boletins_sgb_cache.json` no volume
(dedup por número+data, mantém 30). Consumido por `fetchPrevisao2026()` (previsão
de cheia da home/`/monitor`/briefing); fallback: `PREVISAO_2026` hardcoded.

Upload manual de um PDF avulso ainda funciona: `POST /api/sgb` (header
`x-admin-password`). Script CLI (raspa as 5 bacias + gera `public/data/sace/...`):
`python scripts/pipeline-sace.py`.

---

## 🤖 INSIGHTS AI — automático (terça)

`insights-semanal.yml` dispara `/api/cron/insights`: busca níveis + IDN ao vivo,
chama Claude **`claude-haiku-4-5`** e grava `insights_ai_cache.json` no volume (de
onde `lerInsightsAI()` lê no `/monitor`). Protegido por `CRON_SECRET`.

Script CLI (uso manual/dev, lê caches locais): `node scripts/gera-insights-ai.mjs`.

---

## 📰 BRIEFING SEMANAL — automático (quarta)

`briefing-semanal.yml` (quarta 13:00 UTC) dispara `/api/cron/briefing`, que
regenera o briefing editorial da semana com dados ao vivo e grava o snapshot
`data/briefings/YYYY-WW.json` no volume (mantém 52 = 1 ano). Protegido por
`CRON_SECRET`. A página `/briefing-semanal` também tem `revalidate=86400` como
rede de segurança.

> Substituiu o "Cron Service no Railway" do `docs/RAILWAY-CRON.md`, que nunca
> chegou a ser criado — agora segue o mesmo padrão GitHub Actions dos demais.

---

## 📅 SEVERITY CALENDAR

Em produção é servido **on-demand** por `app/api/severity-calendar/route.ts`
(recalcula com o feed live). O script abaixo só regenera o **fallback estático** +
tipos pré-computados (já roda como último passo do `atualiza-dados.mjs`):
```bash
npm run update-calendar          # → public/data/severity-calendar.json + lib/severity-calendar-precomputed.ts
```

---

## Resumo

| Frequência | Automático (nuvem) | Manual (metodologia/backfill) |
|-----------|---------------------|-------------------------------|
| **Diário** | réguas (13h), watchdog (14h) | — |
| **Semanal** | IDN (ter), SGB (ter), Insights (ter), ENSO (qui), Briefing (qua) | — |
| **Mensal** | portos (dia 16) | `update-navegacao-series.py` |
| **Eventual** | — | `atualiza-dados.mjs` (metodologia), `forecast_conteiner.py`, `panel_horserace.py` |

> **Tudo roda na nuvem** — a máquina local não tem mais nenhuma tarefa agendada, e
> não há pendências de automação. Só sobra trabalho manual para metodologia/backfill.
>
> Docs relacionadas: `docs/TENDENCIA-CARGAS.md` (forecast), `docs/RAILWAY-CRON.md`
> (briefing — histórico; o cron real é o `briefing-semanal.yml`), `docs/severity-calendar.md`.
