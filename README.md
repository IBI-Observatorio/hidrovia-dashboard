# Observatório IBI — Monitor Hidrológico da Bacia do Amazonas

Dashboard de monitoramento hidrológico mantido pelo Observatório de Infraestrutura de Transporte do IBI.

## Desenvolvimento

```bash
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

## Rotas

| Rota | Descrição |
|---|---|
| `/` | Home do Observatório |
| `/monitor` | Monitor hidrológico em tempo real |
| `/caso-2024` | Estudo de caso — estiagem de 2024 |
| `/admin/upload` | Upload de boletins SEMA-AM (senha via `ADMIN_PASSWORD`) |

## Deploy

Railway — redeploy automático a cada push para `main`.

## Variáveis de ambiente

```
ADMIN_PASSWORD=   # senha do painel /admin/upload
DATA_DIR=         # caminho do volume persistente (Railway)
```

## Atualizar dados de portos (movimentação mensal)

Carregou um mês novo de movimentação portuária (mar/abr/maio… do IBI, enquanto a
ANTAQ não publica)? **Um comando** atualiza TODOS os painéis (home, `/portos/movimentacao`,
`/portos/ineditas/tendencia-cargas`) a partir do canônico `portos-series.json`:

```bash
npm run atualiza-portos -- \
  --merge ../../scrapers/data/portos_mar2026.csv=2026-03 \
  --merge ../../scrapers/data/portos_abr2026.csv=2026-04 \
  --teu   ../../scrapers/data/portos_teus_2026.csv
```

Faz, em ordem: **merge** da tonelagem → **TEU** (nacional + por porto, do CSV) →
**forecast** do contêiner → **cards da home** → **séries das 4 cargas** → **rótulo de fonte**
(ANTAQ oficial + IBI nos meses ainda não publicados). A atribuição de fonte e as marcas
de IBI são automáticas — somem sozinhas quando a ANTAQ publicar o mês.

**Para o próximo mês (ex.: maio):** preencha as 3 planilhas em `scrapers/data/`
(`portos_<mês>2026.csv`, idem abril, e `portos_teus_2026.csv` com nacional + linhas por
porto) e rode o comando acima trocando os meses. Detalhes e formato dos CSVs em
[`docs/RUNBOOK-DADOS.md`](docs/RUNBOOK-DADOS.md) (seções Portos → "Carga manual" e
"Contêiner em TEU").

> `--teu` é o passo lento (~1–2 min: a antaq-api é DuckDB de 1 conexão, puxa por porto
> em série). Os demais passos são instantâneos.
