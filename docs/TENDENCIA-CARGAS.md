# Indicador 31 — Tendência de Cargas (`/portos/ineditas/tendencia-cargas`)

Como funciona o fluxo de dados, o que atualizar mensalmente e a metodologia do modelo de forecast.

---

## O que a página mostra

Duas partes:

1. **Forecast do contêiner** — projeção do momentum (variação a/a da MA12 da tonelagem) para os próximos 5 meses. Modelo campeão de um horse-race de 30 abordagens, ARIMA(1,1,1) em log(soma 12m). Inclui:
   - 3 nuggets de antecipação (próxima leitura, último observado, precisão)
   - Gráfico de 15 anos com observado + backtest + projeção + leques 80%/95%
   - "Antes × depois" — modelo publicado anteriormente vs campeão
   - Bloco "O que isso significa" (tom banco central)
   - Ficha técnica colapsável com o horse-race completo

2. **Contexto histórico** — médias móveis de 12 meses das 4 naturezas de carga (granel sólido, granel líquido, carga geral, contêiner) desde 2011.

---

## Arquitetura de dados

```
lib/                                          ← novos arquivos (import direto via @/lib)
  forecast-conteiner.json          ← regenerado mensalmente (meta + historico + backtest + forward)
  forecast-publicado-snapshot.json ← snapshot freeze do modelo antigo (NÃO regenerar)
  horse-race-30.json               ← prova de método (30 modelos rankeados, NÃO regenerar)

public/data/antaq/dashboard/
  series-tendencia.json   ← séries MA12 das 4 cargas (regerado mensalmente)

scripts/
  gera-series-tendencia.mjs        ← Node — atualiza series-tendencia.json
  forecast_conteiner.py            ← Python — regenera forecast-conteiner.json
  panel_horserace.py               ← Python — reproduz o ranking (só para revalidar)

components/antaq/graficos/
  GraficoMediasMoveis31.jsx        ← lê todos os JSONs, renderiza tudo
```

### Por que três arquivos em `lib/`

O script `forecast_conteiner.py` regenera o `forecast-conteiner.json` todo mês. Para que essa regeneração **não destrua** material editorial que não muda:

- **`horse-race-30.json`** é prova de método (validação científica). Roda uma vez por revisão metodológica, fica congelado.
- **`forecast-publicado-snapshot.json`** preserva o que o modelo antigo (OLS leadings) estava prevendo em mai/2026 — sustenta o bloco "antes × depois" do componente. Quando o modelo antigo for retirado do contexto editorial (ex.: 2027), esse arquivo pode ser apagado e o bloco "antes × depois" removido do componente.

---

## Atualização mensal

Após a ANTAQ publicar os dados do mês (até o dia 15 do mês seguinte):

### Passo 1 — Séries das 4 cargas

```bash
node scripts/gera-series-tendencia.mjs
```

Baixa as 4 séries de MA12 da API ANTAQ e salva em `public/data/antaq/dashboard/series-tendencia.json`.

### Passo 2 — Forecast do contêiner

```bash
python scripts/forecast_conteiner.py --payload <antaq.json> --out lib/forecast-conteiner.json
```

Onde `<antaq.json>` é o payload com a série mensal de tonelagem (formato do protótipo, contém `series` com chave `natureza:conteinerizada`).

Saída esperada:
```
OK -> lib/forecast-conteiner.json  | Theil U(h5)=0.50  | forward[0]=5.16%  | n_hist=171
```

⚠️ **Não regenera** `horse-race-30.json` nem `forecast-publicado-snapshot.json` — esses são estáticos.

---

## Metodologia do campeão

### O método

```
y(t) = YoY( MA12( tonelagem mensal ) )    ← alvo
sum12(t) = soma móvel de 12 meses da tonelagem
log_sum12 = log(sum12)

modelo: ARIMA(1, 1, 1) em log_sum12
projeção: prevê log_sum12(t+h) → exp → divide por sum12(t+h-12) - 1 → YoY
```

### Por que funciona

Em vez de prever o YoY-da-MA12 diretamente (objeto super-diferenciado, ruidoso, frágil a regressor externo que quebra no regime pós-2022), prevê-se o **agregado liso** — a soma de 12 meses muda devagar e é altamente previsível h passos à frente. O YoY é então derivado da razão. É *forecasting indireto por agregação temporal*.

### Desempenho

Validado em 38 meses fora da amostra (jan/2023 → fev/2026), recursivo, com `info <= t-h` (sem vazamento):

- **Theil U(h=5) = 0,50** — erro = metade do palpite ingênuo
- Vence em **todos** os horizontes (U: 0,39 / 0,41 / 0,44 / 0,48 / 0,51 para h=1..5)
- **DM vs publicado**: p=0,019 (significativamente melhor)
- DM vs no-change: p=0,088
- Robusto à ordem: U=0,50–0,55 em (1,1,0)/(1,1,1)/(2,1,1)/(2,1,2)/(1,2,1)
- Viés OOS: +0,9 p.p. (modelo levemente subestima a alta, aceitável)

### Por que o modelo anterior foi aposentado

A regressão OLS sobre IBC-Br defasado + carga geral defasada (modelo publicado de mai/2026) ficou na **posição 20 de 30** no horse-race — **pior que o palpite ingênuo no-change** (posição 16). Fabricava uma falsa desaceleração para ~1,5% nos próximos 5 meses, quando a série vinha consistentemente em ~5%. O viés vinha do regime pós-2022, em que os leadings macroeconômicos perderam poder preditivo para o contêiner.

---

## Estrutura dos JSONs

### `lib/forecast-conteiner.json`

```jsonc
{
  "meta": {
    "indicador":     "Momentum do contêiner (YoY da média móvel de 12 meses)",
    "metodo":        "ARIMA(1, 1, 1) em log(soma 12m) -> YoY",
    "fonte":         "ANTAQ — Estatística Aquaviária",
    "theilU_h5":     0.50,
    "rmse_h":        { "1": 0.58, "2": 1.12, "3": 1.76, "4": 2.46, "5": 3.21 },
    "ult_obs":       { "data": "2026-02", "obs": 5.24 },
    "corte_treino":  "2022-12",
    "vies":          0.92
  },
  "historico":  [{ "data": "2011-12", "obs": 13.29 }, ...],      // 171 pts
  "backtest":   [{ "data": "2023-01", "obs": -3.8, "champ": -2.43 }, ...],  // 38 pts OOS
  "forward":    [{ "data": "2026-03", "central": 5.16,
                   "lo80": 4.42, "hi80": 5.91,
                   "lo95": 4.02, "hi95": 6.30 }, ...]            // 5 pts
}
```

### `lib/forecast-publicado-snapshot.json`

```jsonc
{
  "meta": {
    "descricao":           "Snapshot do modelo OLS antigo, freeze mai/2026.",
    "data_snapshot":       "2026-05",
    "spec_antigo":         "momentum_conteiner(t) = a + b·IBC-Br_yoy(t-5) + c·momentum_cargageral(t-12)",
    "motivo_aposentadoria": "Perdia para no-change e fabricava falsa desaceleração."
  },
  "backtest_pub": [{ "data": "2023-01", "pub": 4.58 }, ...],     // 38 pts
  "forward_pub":  [{ "data": "2026-03", "pub": 2.16 }, ...]      //  5 pts
}
```

### `lib/horse-race-30.json`

```jsonc
{
  "meta": {
    "descricao":       "Horse-race de 30 abordagens de forecast.",
    "janela_oos":      "2023-01 a 2026-02",
    "horizonte_meses": 5,
    "n_modelos":       30,
    "campeao_pos":     1,
    "benchmark_pos":   16,
    "publicado_pos":   20,
    "reproduz_com":    "python scripts/panel_horserace.py"
  },
  "ranking": [
    ["ARIMA log(soma-12m)→YoY", 3.28, 0.51, "autorregressiva", "campeao"],
    ["AR(p)-AIC direto",        4.41, 0.69, "autorregressiva", ""],
    // ... formato: [nome, RMSE_pp, Theil_U, escola, label]
  ]
}
```

Escolas: `naive`, `autorregressiva`, `estrutural`, `decomposicao`, `ml`, `robusta`, `combinacao`.
Labels especiais: `campeao`, `bench`, `publicado`.

---

## Revalidar o horse-race

Quando quiser confirmar que o campeão ainda é o melhor (ex.: depois de 6 meses):

```bash
python scripts/panel_horserace.py
```

Imprime tabela com RMSE, Theil U, DM-test, p-valor, % de acerto direcional para os 30 modelos.
Se algum modelo passar o ARIMA campeão por margem significativa (DM p<0,05), atualizar o `horse-race-30.json` e considerar trocar o método em `scripts/forecast_conteiner.py`.

---

## Troubleshooting

### Gráfico de forecast vazio

`lib/forecast-conteiner.json` foi sobrescrito sem dados. Rode `forecast_conteiner.py` de novo.

### Bloco "antes × depois" sem o vermelho

`forecast-publicado-snapshot.json` foi apagado ou está vazio. Restaure do git, ou aceite que o modelo antigo foi descomissionado e remova o `<ZoomAntesDepois>` do componente.

### Ficha técnica do horse-race vazia

`horse-race-30.json` foi apagado. Restaure do git ou rode `panel_horserace.py` para reconstruí-lo.

### Histórico das 4 cargas vazio

`series-tendencia.json` foi sobrescrito. Rode `gera-series-tendencia.mjs`.
