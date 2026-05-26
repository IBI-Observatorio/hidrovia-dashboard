# Monitor — cache diário da API ANA

## Status

Em mai/2026 o `/monitor` parou de bater na ANA a cada render e passou a ler de
um cache em disco que renova **1×/dia** (fuso da bacia, `America/Manaus`).
Também saiu a estação **SGC** das listas de fetch — a estação não tem
telemetria ANA viva e estava sendo chamada à toa.

## Como funciona o cache

- Arquivo: `data/ana-diario-cache.json` (gerado em runtime, **não** versionado).
- Chave de dia: calendário em `America/Manaus`. O cache vira à meia-noite de
  Manaus, não à meia-noite UTC — evita que Railway (UTC) considere o cache
  vencido cedo demais.
- Conteúdo: as 4 séries ANA que o monitor consome num único snapshot:
  - `dados` — painel (6 estações: Manaus, Itacoatiara, Humaita, Manacapuru,
    Porto Velho, Borba).
  - `cotasIDN` — 10 estações para o IDN-cota (MA-7d).
  - `vazoesIDN` — 8 estações para o IDN-vazão.
  - `serieCaracarai` — 14d de série diária para o detector Onda Branco.
- Lógica em `lib/cache-ana-diario.ts`, função `obterDadosDiariosANA()`.

### Fluxo de decisão

1. Cache de **hoje** existe → usa, não chama ANA.
2. Cache de **outro dia** → tenta ANA. Se sucesso e ao menos uma estação
   tiver dado de hoje, grava cache novo. Se falhar, devolve o cache antigo
   (melhor render velho do que página quebrada).
3. **Sem cache** → tenta ANA. Se falhar, devolve estruturas vazias; a página
   tem seus próprios fallbacks (`DADOS_ATUAIS` para o painel).

### Por que só grava se "alguma estação viva"

`fetchTodasEstacoes()` já tem um fallback interno: quando a chamada ANA
falha totalmente, ele devolve `DADOS_ATUAIS` (snapshot estático). Se a gente
gravasse isso como cache do dia, a página ficaria congelada nos dados
estáticos até amanhã. A regra "só grava se ≥1 estação tem leitura de hoje"
evita esse vazio mascarado.

## Sobre o SGC

O código tinha um aviso explícito: "SGC não tem telemetria ANA; a última
leitura estática tem semanas de defasagem". Mesmo assim a estação seguia em
`ESTACOES_PAINEL` e `ESTACOES_IDN_COTA` — chamadas inúteis, mais latência.
Removida das duas listas e da grade de gauges (`ESTACOES_ORDEM` no page.tsx).

O snapshot histórico da SGC ainda aparece no monitor — no card analítico do
**11° Boletim SAH** (panel 1), que é dado estático sobre dessincronização
Norte–Sul em 17/mar/2026. Esse card vem de `lib/dados-historicos.ts` e não
depende da ANA.

`posicaoSubBacia()` em `lib/sub-bacias.ts` já renormaliza os pesos quando
estações estão ausentes, então o IDN segue calibrado com 10 estações (era 11).

## Arquivos envolvidos

- `lib/cache-ana-diario.ts` — wrapper do cache.
- `lib/fetch-dados.ts` — `ESTACOES_PAINEL` e `ESTACOES_IDN_COTA` sem SGC.
- `app/(site)/monitor/page.tsx` — chama `obterDadosDiariosANA()` em vez dos
  4 fetchs paralelos; `ESTACOES_ORDEM` sem SGC; label do badge "x/6 ao vivo".
- `data/ana-diario-cache.json` — gerado em runtime. Não versionar.

## Como invalidar manualmente

Apagar o arquivo:

```bash
rm data/ana-diario-cache.json
```

O próximo hit do `/monitor` rebusca tudo na ANA e regrava.

## Trade-offs

- **Frescor**: passou de "no máximo 6h de defasagem" para "no máximo 24h". Em
  época de cheia ou estiagem extrema, isso pode ser relevante. Se for, ajustar
  a chave de cache em `cache-ana-diario.ts` para `YYYY-MM-DD-HH` truncado em
  12h (2× por dia).
- **Render time**: em hits cacheados, sumiu o roundtrip de rede para
  `www.ana.gov.br/hidrowebservice` (4 chamadas) — sobra só a leitura
  de JSON local.
- **Railway**: o filesystem é efêmero entre deploys. Cada redeploy zera o
  cache. Aceitável.
