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
| **Série Itacoatiara** | terça 10:20 | `itacoatiara-semanal.yml` | Roda `atualiza-itacoatiara-series.mjs` (API ANA, estação 16030000), faz merge em `data/itacoatiara_hidroweb.csv`, regenera `lib/itacoatiara-historico-diario.ts`, **commita** e dispara o deploy. Alimenta o **ETA por análogos** do topo do `/monitor` (IRC) |
| **SACE/SGB** | **de hora em hora** terça 17–23h UTC + quarta 0–21h UTC | `sgb-semanal.yml` | `POST /api/cron/refresh-sgb` → Railway raspa `sgb.gov.br`, baixa o PDF do Amazonas, parseia (`parseBoletimSGB`), grava `boletins_sgb_cache.json`. Previsão de cheia. SGB publica em horário irregular (já saiu só às 22h UTC) → tenta de hora em hora até quarta; passadas sem boletim novo saem verdes (dedup). **Quem avisa se a terça foi perdida é o watchdog** (via `/api/health`, não mais o próprio workflow) |
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
   sucesso (réguas ≤30h; insights/IDN/Itacoatiara/ENSO/SGB/briefing ≤8d; portos ≤40d — pega
   falha e parada silenciosa; deploy só falha-na-última, por ser gatilho de push).
2. **"Dado fresco?"** — bate em **`GET /api/health`**, que reporta a idade real dos
   caches no volume (pega a falha silenciosa: job verde, dado velho). **O check
   `sgb` é gated por idade** (`ok:false` se o último boletim tem > 8 dias): como o
   refresh roda de hora em hora e sai verde mesmo sem boletim novo, é por aqui (e
   não pelo job) que o watchdog detecta uma terça perdida.

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
- `public/data/antaq/home-cards.json` (cards da home): a seção **`porto`** tem gerador —
  `node scripts/gera-home-cards-porto.mjs [AAAA-MM] [--preliminar] [--insight "..."]`
  (recalcula os 5 cards do `portos-series.json`; sem mês usa `referencia`; preserva o
  `insight` se não passar `--insight`). A seção **`navegacao`** (cabotagem) e o texto
  editorial seguem **à mão**. Ex. mês manual: `node scripts/gera-home-cards-porto.mjs 2026-04 --preliminar`.

### ⭐ Carga manual de um mês — PIPELINE ÚNICO (recomendado)

Carregou dado novo? **Um comando** atualiza TODOS os painéis (tudo derivado do
mesmo canônico `portos-series.json`). Não atualize página por página.

```bash
node scripts/atualiza-portos.mjs \
  --merge ../../scrapers/data/portos_mar2026.csv=2026-03 \
  --merge ../../scrapers/data/portos_abr2026.csv=2026-04 \
  --teu   ../../scrapers/data/portos_teus_2026.csv
```

Ele faz, em ordem, derivando do canônico (detecta os meses preliminares sozinho):
1. **merge** dos CSVs → `portos-series.json` (canônico)
2. **TEU** (nacional + por porto) → mesmo JSON  *(só com `--teu`; ~1-2 min sequencial)*
3. **forecast** do contêiner → `lib/forecast-conteiner.json`
4. **cards de porto da home** → `home-cards.json`
5. **séries das 4 cargas** (rodapé do tendência) → `series-tendencia.json`

`/portos/movimentacao` lê o canônico **ao vivo** — atualiza sozinho, sem regerar nada.
Rodar `node scripts/atualiza-portos.mjs` **sem args** só re-deriva tudo do canônico atual.
**Fora do pipeline:** navegação/cabotagem (`navegacao-series.json`, fonte própria) e o
texto editorial `home.insight` (revise à mão). Os scripts abaixo são os passos avulsos
(o pipeline já os chama):

### Passo avulso — merge de um mês (`scripts/merge-portos-manual.mjs`)

```bash
node scripts/merge-portos-manual.mjs <caminho-csv> <AAAA-MM>
# ex.: node scripts/merge-portos-manual.mjs ../scrapers/data/portos_mar2026.csv 2026-03
```

- **CSV de entrada:** `escopo,porto,uf,natureza_key,natureza_label,toneladas_<mes>,origem`
  — `escopo` ∈ {PORTO, NACIONAL}; `natureza_key` ∈ {granel_solido, granel_liquido,
  carga_geral, conteinerizada}; toneladas **cruas** (o script divide por 1e6);
  `origem` ∈ {primário, extrapolado}. Nomes de porto têm de bater **exatos** com os
  do JSON (o script avisa os não-mapeados). Gere o template com os nomes certos via
  o snippet em `data/manual/` ou peça ao Claude.
- O script **anexa/atualiza** o ponto `{data, mt}` em cada série porto×natureza e no
  `nacional_por_natureza`, marca os estimados com `est:true`, sobe `referencia` para
  o mês e adiciona o mês em **`meses_preliminares`**. É **idempotente** (rodar de
  novo substitui o ponto, não duplica).
- A página `/portos/movimentacao` lê `meses_preliminares` e mostra **banner +
  cabeçalho/rodapé "preliminar"** e KPIs marcados — não vende estimativa como dado
  oficial. O `est:true` fica disponível por ponto para tratamento visual futuro.
- ⚠️ **Não é permanente:** quando a `antaq-api` alcançar o mês, o cron do dia 16
  roda `gera-portos-series.mjs` e **regenera o JSON inteiro do zero**, sobrescrevendo
  o mês manual (incl. `meses_preliminares`) pelo oficial. É o comportamento desejado.
  Se precisar carregar de novo antes disso, é só rodar o merge outra vez.

### Contêiner em TEU (`gera-conteiner-teu.mjs`)

A página `/portos/movimentacao` mede contêiner em **TEU** por padrão (toggle p/
toneladas). As séries TEU ficam no mesmo `portos-series.json`:
`nacional_conteiner_teu` (KPIs + bloco acumulado) e `portos[].teu_conteiner` (ranking).

```bash
node scripts/gera-conteiner-teu.mjs ../../scrapers/data/portos_teus_2026.csv
```

- Puxa TEU da `antaq-api` (`metrica=teu`): nacional + por porto (só ~18 têm contêiner).
- **⚠️ Concorrência 1 obrigatória.** A API é DuckDB com 1 conexão; em paralelo as
  respostas se **cruzam** (porto A volta com dados do porto B) — foi o que poluiu
  portos de minério/petróleo com TEU de contêiner. O script já roda sequencial; **não
  paralelize.** Por isso demora ~1-2 min.
- Meses sem TEU oficial (carga manual): **nacional** vem da linha `NACIONAL` do CSV;
  **por porto** vem das linhas `PORTO` do CSV mapeadas ao nome canônico (tabela
  `ALIAS_TEU` no script — combos como "Rio + Itaguaí" vão ao porto principal;
  não-canônicos/residual são descartados). Onde o CSV não cobre um porto, cai no
  **fallback**: participação no TEU nacional dos últimos 3 meses oficiais × nacional
  do mês. ⚠️ Para maio: basta preencher a planilha de TEU (nacional + linhas por
  porto) — o pipeline puxa sozinho. Conferir nomes novos contra `ALIAS_TEU`.
- ⚠️ Também é **sobrescrito** pelo `gera-portos-series.mjs` do dia 16 — re-rode depois.

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

2. **Série Itacoatiara do ETA por análogos (semanal, AUTOMÁTICA)** —
   `itacoatiara-semanal.yml` roda `atualiza-itacoatiara-series.mjs`: busca os
   últimos 30 dias da estação 16030000 na ANA, faz merge em
   `data/itacoatiara_hidroweb.csv` e regenera `lib/itacoatiara-historico-diario.ts`.
   Essa série 2026 é a **janela de matching** do forecasting por análogos
   (`lib/recessao-analogos.ts`), que produz o ETA do topo da página IRC
   ("Itacoatiara projetada em X m em DD/mmm"). **Antes era gerada à mão** — se
   ficasse parada, o ETA ancorava num "hoje" defasado e a contagem de dias saía
   inflada (estava 25 dias congelada em mai/2026). Não precisa fazer nada; o cron
   mantém a cauda em dia. Para regenerar à mão: `node scripts/atualiza-itacoatiara-series.mjs`.

3. **Orquestrador de metodologia (MANUAL)** — recalibra percentis/GMM/HMM/limiares.
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

> **Cadência (revisto jun/2026):** o SGB publica na terça, mas em horário
> irregular — em 16/jun/2026 só saiu às ~22h UTC, **depois** das 2 tentativas do
> cron antigo (17h+18h UTC), que então falhou e abriu issue à toa. Agora o refresh
> roda **de hora em hora** (terça 17–23h UTC + quarta 0–21h UTC). Passadas sem
> boletim novo retornam `mudou:false` e **saem verdes** (dedup). O workflow **não
> abre mais issue** quando não acha; quem avisa de uma terça perdida é o **watchdog**
> (o `/api/health` marca `checks.sgb.ok:false` quando o último boletim passa de 8
> dias → o watchdog abre issue `healthcheck` + e-mail, tipicamente na quinta).

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
| **Semanal** | IDN (ter), Itacoatiara (ter), SGB (ter), Insights (ter), ENSO (qui), Briefing (qua) | — |
| **Mensal** | portos (dia 16) | `update-navegacao-series.py` |
| **Eventual** | — | `atualiza-dados.mjs` (metodologia), `forecast_conteiner.py`, `panel_horserace.py` |

> **Tudo roda na nuvem** — a máquina local não tem mais nenhuma tarefa agendada, e
> não há pendências de automação. Só sobra trabalho manual para metodologia/backfill.
>
> Docs relacionadas: `docs/TENDENCIA-CARGAS.md` (forecast), `docs/RAILWAY-CRON.md`
> (briefing — histórico; o cron real é o `briefing-semanal.yml`), `docs/severity-calendar.md`.

---

## Radar de Maturação Ferroviária (`/radar`) — seeds de curadoria manual

Diferente dos JSONs hidrológicos/portuários, os dados do Radar **não têm gerador
automático** (Fase 1). São **seeds versionados, editados à mão**, com `source`/`date`
em cada campo:

| Arquivo | O que é | Fonte |
|---------|---------|-------|
| `data/assets/ef-170.json` | Piloto Ferrogrão — params + maturação (CAPEX/demanda/tarifa/**WACC 11,04%**/aporte/risco/funding) | **ANTT** (params, WACC, demanda, capacidade 58 Mt), **Frischtak/Amazônia 2030 06/nov/2024** (TIR realista 1,6%), **TCU** (furo funding), **STF** (ADI 6553) |
| `data/assets/fico-fiol.json` · `ef-118.json` · `ef-151-norte.json` | 3 ativos PARCIAIS (só maturação sourçada; sem DCF) | PPI / ANTT / imprensa setorial |
| `data/referenceClass/rail.json` | Classe de referência de sobrecusto ferroviário | Flyvbjerg 2002 (+44,7%) + Frischtak/Ferrogrão (+46%) |
| `content/notes/*.md` | Boletins datados (frontmatter + markdown), lidos por `lib/radar/notes.ts` | Curadoria editorial sobre fatos públicos |
| `lib/radar/alerts.ts` · `backtest.ts` | Alertas (eventos STF/TCU/Vale datados) e track record (previsões oficiais resolvidas + calls do Observatório) | STF/TCU/MPF/imprensa, com `fonte` em cada item |

> ⚠️ Lição (jun/2026): NÃO inventar número. O brief original trazia WACC 13,74% e
> "realista 11,04%" — AMBOS errados vs. fonte primária (WACC real 11,04% = TIR oficial;
> realista real 1,6%). Todo campo do seed carrega `source` com URL ou `modeled:true`.
> Lógica de maturação/P(leilão): `lib/radar/maturation.ts`. Motor DCF: `lib/dcf/*`.

O motor (`lib/dcf/*`) calibra em runtime: tarifa → TIR ≈ WACC (oficial) e uplift de
CAPEX implícito → TIR ≈ 11,04% (realista). Para editar um número, mexa no seed e
mantenha a tag de fonte. Próximas fases podem adicionar adaptadores
`lib/sources/{antt,ppi,tcu,ibama}.ts` — aí este runbook ganha as linhas de cron.

---

## Boletim "Cabotagem conteinerizada na Amazônia" (PDF)

Boletim de antecipação que projeta o **calado disponível (CMR oficial da Capitania)**
em Itacoatiara e o traduz em **cabotagem conteinerizada (ANTAQ)**. Roda em um comando
(ponto de entrada do agente semanal):

```
node scripts/gera-boletim-cabotagem.mjs   ->  out/relatorio-cabotagem.pdf
```

Cadeia (cada etapa também roda sozinha):

| Etapa | Script | Saída | Fonte / método |
|---|---|---|---|
| 1. Projeção do calado | `scripts/modelo-multidriver-itacoatiara.mts` | `data/projecao-multidriver-itacoatiara.json` | **AO VIVO**: cota dos formadores (Manaus/Negro, Manacapuru/Solimões, Humaitá+PV/Madeira, Itacoatiara) via `GET /api/ana` de produção → ensemble de análogos (10 anos, `4estacoes_2016_2025.csv`) ponderado por z-score → curva oficial cota→CMR (`lib/cmr-itacoatiara.ts`). Fallback: snapshot 8/jun/2026. |
| 2. Calado → carga | `scripts/calibra-cmr-cabotagem.mts` | `data/calibracao-cmr-cabotagem.json` | Função de transferência CMR mínimo × cabotagem conteinerizada do AM (antaq-api), 2018–2025; base = recorde real 2025 (544.871 TEU). Lê o passo 1. |
| (aux) Transferência base | `scripts/calibra-transferencia-teu.mjs` | `data/calibracao-transferencia-teu.json` | Série ANTAQ + mínimas reais de Manaus; consumida pelo passo 2 para os resíduos/regime. |
| 3. HTML | `scripts/gera-relatorio-cabotagem.mjs` | `out/relatorio-cabotagem.html` | Identidade IBI; cota de Manaus ao vivo (`/api/ana`); lê o passo 2. |
| 4. Snapshot semanal | `scripts/atualiza-boletim-series.mjs` | `data/boletim-cabotagem-series.json` | **Memória do supervisor**: 1 entrada compacta/semana (z, análogos, CMR projetado, restrição, ENSO/SGB). Merge idempotente por `data_referencia` (não reescreve se a série não mudou → `git diff --quiet`). Lê passos 1 e 2. |
| 5. PDF | (Chrome headless, no orquestrador) | `out/relatorio-cabotagem.pdf` | `--print-to-pdf`. `CHROME_BIN` se o autodetect falhar. |
| 6. E-mail | `scripts/envia-boletim-email.mjs` | (envio) | Resend. SKIP se `RESEND_API_KEY`/`BOLETIM_RECIPIENTS` ausentes. |

### Automático (agente semanal) — QUARTA, depois do SGB

| Cron (UTC) | Workflow | O que faz |
|---|---|---|
| **qua 12:00** | `boletim-cabotagem-semanal.yml` | Roda o orquestrador (passos 1→5) com Chrome via `browser-actions/setup-chrome` (`CHROME_BIN`); confere o PDF; commita o snapshot (passo 4) + dispara deploy; envia o e-mail (passo 6); sobe o PDF como artefato. **Roda depois do refresh SGB de quarta 11:00** → boletim com a notícia do SGB da terça fresca. |
| **qua 12:30** | `supervisor-boletim-semanal.yml` | Lê as 2 últimas semanas da série, manda no corpo para `POST /api/cron/supervisor-boletim` (diff determinístico + veredito; **só chama a IA se algum threshold disparar** → custo ~zero). Se `guinada`/`diverges`, abre/atualiza uma **Issue** (label `supervisor-boletim`) PROPONDO a revisão. A rota **nunca** altera o modelo — o Bruno aprova. |

**Supervisor** (`app/api/cron/supervisor-boletim/route.ts`): mesma proteção do insights
(`Bearer CRON_SECRET`), reusa `ANTHROPIC_API_KEY` do Railway. Thresholds de guinada
(rascunho): |Δcalado central| ≥ 0,75 m · |Δdata de restrição| ≥ 10 dias · ≥ 2 trocas
de ano-análogo (top-3) · |Δprob| ≥ 0,25 · troca de fase ENSO. Cache de auditoria:
`data/supervisor-boletim-cache.json`.

**Secrets/vars (GitHub):** `RESEND_API_KEY` (secret), `RESEND_FROM`+`BOLETIM_RECIPIENTS`
(vars), `CRON_SECRET` (já existe). Railway: `ANTHROPIC_API_KEY`+`CRON_SECRET` (já existem).

> Madeira: se Borba/Manicoré estiverem offline na telemetria, o z usa Humaitá+PV.
> `DASH_API` aponta a API; `BOLETIM_OUT` redireciona o PDF.
