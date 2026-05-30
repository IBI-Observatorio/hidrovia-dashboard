# Runbook de Dados — Observatório IBI

**O que rodar na mão para cada número ficar atualizado.** Este projeto não chama
APIs em tempo de request: cada página lê um JSON estático em `public/data/` (ou
`data/`), e esses JSONs são gerados pelos scripts abaixo. **Se um número está
velho na tela, é porque o script correspondente não foi rodado.**

> Verificado em 29/05/2026 lendo o cabeçalho de cada script. Ao criar/renomear um
> gerador, atualize este arquivo.

Pré-requisitos:
- **Node ≥ 18** (fetch nativo) para os `.mjs`
- **Python** (venv da raiz) para os `.py`
- **API ANTAQ no ar** para tudo de portos — checar antes:
  `curl https://antaq-api-production.up.railway.app/api/v1/saude`
  (deve responder `status: ok` e o `ultimo_mes_dados`)

---

## 📦 PORTOS / ANTAQ — mensal

> ⚙️ **Os dois primeiros (`gera-portos-series` e `gera-series-tendencia`) já rodam
> sozinhos** todo dia 16 via GitHub Actions (`.github/workflows/atualiza-portos.yml`).
> Você só roda na mão se quiser antecipar, ou para os que ficam de fora do workflow
> (navegação Python e forecast).

Roda **depois que a ANTAQ publica o mês novo** (~dia 15 do mês seguinte). Todos
puxam da API ANTAQ no Railway. Pode rodar os quatro em sequência:

```bash
node   scripts/gera-portos-series.mjs        # → portos-series.json   (MOVIMENTAÇÃO porto×natureza×mês)
node   scripts/gera-series-tendencia.mjs     # → series-tendencia.json (médias móveis 4 cargas)
python scripts/update-navegacao-series.py    # → navegacao-series.json (cabotagem / longo curso)  ⚠️ Python
python scripts/forecast_conteiner.py --payload <antaq.json> --out lib/forecast-conteiner.json
```

| Página | Script | Saída |
|--------|--------|-------|
| `/portos/movimentacao` | `gera-portos-series.mjs` | `public/data/antaq/dashboard/portos-series.json` |
| `/portos/ineditas/tendencia-cargas` (séries) | `gera-series-tendencia.mjs` | `public/data/antaq/dashboard/series-tendencia.json` |
| `/portos/ineditas/tendencia-cargas` (forecast) | `forecast_conteiner.py` | `lib/forecast-conteiner.json` |
| cabotagem / longo curso | `update-navegacao-series.py` | `public/data/antaq/dashboard/navegacao-series.json` |

> Só estes **3** scripts escrevem em `public/data/antaq/dashboard/` (verificado).
> `public/data/antaq/home-cards.json` **não tem gerador** — é editado à mão.

### Detalhes importantes
- **`gera-portos-series.mjs`** demora ~3–5 min (faz ~450 chamadas). A API é
  **instância única (DuckDB, 1 conexão)** — concorrência alta dá **HTTP 500**.
  O script já usa concorrência 2 + retry/backoff + janela de datas. **Não suba a
  concorrência.** Vars opcionais: `TOP_N` (default 50), `ANTAQ_API_URL`, `DATA_INICIO`.
  A página se ajusta sozinha ao novo mês (habilita o mês, marca ano corrente como
  "parcial"). Nada a editar no front depois.
- **`forecast_conteiner.py`** NÃO regenera `horse-race-30.json` (prova de método,
  estático). Detalhes em `docs/TENDENCIA-CARGAS.md`.
- ⚠️ Não confundir com `series_mensais.json` (agregado nacional, sem porto) nem com
  o antigo `movimentacao.json` (snapshot 12m+CAGR, **descontinuado** — a página
  de movimentação não usa mais).

---

## 🌊 HIDROLOGIA / IDN — mensal

Um único orquestrador faz tudo (cotas → percentis → GMM/HMM → IDN → severity).
**Idempotente** (não rebaixa CSV existente sem `--force`).

```bash
npm run atualiza-dados            # = node scripts/atualiza-dados.mjs
npm run atualiza-dados:force      # apaga e rebaixa todos os CSVs
node scripts/atualiza-dados.mjs --skip-download   # só recalcula derivados
```

Faz, em sequência: baixa cotas + vazões (HidroWeb) → percentis DOY → fronteiras
GMM → HMM → bootstrap de incerteza → série IDN histórica → calendário de
severidade (fallback estático) → PCA de validação.

Depois de rodar: `git diff lib/` → `npm test` → `npm run build` → commit/push.

> ⚠️ A API ANA SOAP (fonte das cotas) **descontinua em 30/jun/2026** — migrar a
> coleta antes disso.
> Fonte da cota das réguas é **sempre ANA** (`cota_m`); boletins SGB/SEMA são
> contexto e nunca sobrescrevem a cota.

---

## 📅 SEVERITY CALENDAR

Em produção é servido **on-demand** pela rota `app/api/severity-calendar/route.ts`
(recalcula com o feed live). O script abaixo só regenera o **fallback estático** +
os tipos pré-computados:

```bash
npm run update-calendar          # = node scripts/gera-severity-calendar.mjs
```

Saídas: `public/data/severity-calendar.json` e `lib/severity-calendar-precomputed.ts`.
(Já roda como último passo do `atualiza-dados.mjs`.)

---

## 🌎 ENSO (El Niño / La Niña) — mensal

```bash
python scripts/scrape-enso-cpc.py    # → data/enso_cpc_cache.json
```

Fonte: CPC/NOAA. Atualiza na 2ª quinta de cada mês. Idempotente (não regrava se a
data de emissão não mudou). Consumido por `/monitor`.

---

## 🤖 INSIGHTS AI — semanal

**Em produção roda sozinho** via cron do Railway na rota `app/api/cron/insights/route.ts`
(terça, mesma infra do briefing). A rota busca níveis + IDN **ao vivo**, chama o
Claude (`claude-haiku-4-5`) e grava o cache no **volume `DATA_DIR`** — que é de onde
`lerInsightsAI()` lê. Protegida por `Authorization: Bearer $CRON_SECRET`.

Configuração no Railway: `ANTHROPIC_API_KEY` e `CRON_SECRET` no service web; um cron
service com schedule `0 11 * * 2` (terça 08:00 Manaus) chamando:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "https://$RAILWAY_PUBLIC_DOMAIN/api/cron/insights"
```

O script CLI continua existindo para rodar à mão / em dev:

```bash
node scripts/gera-insights-ai.mjs    # → data/insights_ai_cache.json (lê caches locais)
```

> ⚠️ O passo `gera-insights-ai.mjs` ainda está no `run-pipeline-sace.bat` (terça, na
> máquina do Bruno). Com a rota no ar isso vira **redundante para produção** (e gasta
> API 2×). Avaliar remover essa linha do `.bat` — os outros 3 passos (SACE/IDN/ENSO)
> seguem locais.

---

## ⏰ Automatizado (não precisa rodar na mão)

| Job | Quando | Como |
|-----|--------|------|
| **Dados de portos** | **dia 16, 11:00 UTC (mensal)** | **GitHub Actions `.github/workflows/atualiza-portos.yml`** — roda `gera-portos-series.mjs` + `gera-series-tendencia.mjs`, commita o JSON se mudou; o push dispara o deploy. Botão "Run workflow" na aba Actions para rodar sob demanda. |
| Briefing semanal | quarta 13:00 UTC | Cron Service no Railway → `POST /api/cron/briefing`. Config em `docs/RAILWAY-CRON.md`. |
| **Insights AI** | **terça 11:00 UTC (08:00 Manaus)** | **Cron Service no Railway → `POST /api/cron/insights`** — busca dados ao vivo, chama Claude Haiku 4.5, grava `insights_ai_cache.json` no volume `DATA_DIR`. Protegido por `CRON_SECRET`. |
| Severity calendar (prod) | a cada request | rota `/api/severity-calendar` recalcula com feed live |

> **Por que portos via GitHub Actions e não cron Railway?** Os JSONs de portos são
> versionados no git e o deploy roda no push da `main`. Então o caminho natural é
> regenerar + commitar (Actions), não escrever em runtime no container (que se
> perderia no próximo deploy, pois não há volume para esses arquivos).
> `update-navegacao-series.py` (Python) e `forecast_conteiner.py` (só muda ao
> revisar metodologia) ficam fora do workflow — rode-os à mão quando precisar.

---

## Resumo da cadência

| Frequência | Rodar |
|-----------|-------|
| **Mensal** (após ANTAQ publicar) | bloco PORTOS (5 scripts) |
| **Mensal** | `npm run atualiza-dados` (hidrologia/IDN) · `scrape-enso-cpc.py` |
| **Semanal** | `gera-insights-ai.mjs` (terça) · briefing (quarta, automático) |
| **Só ao mudar metodologia** | `forecast_conteiner.py`, `panel_horserace.py` |

> Documentação relacionada: `docs/TENDENCIA-CARGAS.md` (forecast contêiner),
> `docs/RAILWAY-CRON.md` (briefing), `docs/severity-calendar.md`.
