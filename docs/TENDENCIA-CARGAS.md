# Indicador 31 — Tendência de Cargas (`/portos/ineditas/tendencia-cargas`)

Como funciona o fluxo de dados, o que atualizar mensalmente e a metodologia do modelo de forecast.

---

## O que a página mostra

Duas partes:

1. **Forecast do contêiner** — projeção do momentum (variação a/a da MA12 da tonelagem) para os próximos 5 meses. Modelo campeão de um horse-race de 30 abordagens: ARIMA(1,1,1) em log(soma 12m). Inclui:
   - 3 nuggets de antecipação (próxima leitura, último observado, precisão)
   - Gráfico de 15 anos com observado + backtest + projeção + leques 80%/95%
   - Bloco "O que isso significa" (tom banco central)
   - Ficha técnica colapsável com o horse-race completo

2. **Contexto histórico** — médias móveis de 12 meses das 4 naturezas de carga (granel sólido, granel líquido, carga geral, contêiner) desde 2011.

---

## Arquitetura de dados

```
lib/                                          ← import direto via @/lib (sem fetch)
  forecast-conteiner.json          ← regenerado mensalmente (meta + historico + backtest + forward)
  horse-race-30.json               ← prova de método (30 modelos rankeados), NÃO regenerar

public/data/antaq/dashboard/
  series-tendencia.json   ← séries MA12 das 4 cargas (regerado mensalmente)

scripts/
  gera-series-tendencia.mjs        ← Node — atualiza series-tendencia.json
  forecast_conteiner.py            ← Python — regenera forecast-conteiner.json
  panel_horserace.py               ← Python — reproduz o ranking (só para revalidar)

components/antaq/graficos/
  GraficoMediasMoveis31.jsx        ← lê os JSONs, renderiza tudo
```

### Por que dois arquivos em `lib/`

O script `forecast_conteiner.py` regenera o `forecast-conteiner.json` todo mês. O `horse-race-30.json` é prova de método (validação científica) — roda uma vez por revisão metodológica e fica congelado. Manter os dois separados evita que a atualização mensal destrua a evidência que justifica a escolha do método.

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

⚠️ **Não regenera** `horse-race-30.json` — esse é estático (prova de método).

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

Em vez de prever o YoY-da-MA12 diretamente (objeto super-diferenciado, ruidoso, frágil a quebras de regime), prevê-se o **agregado liso** — a soma de 12 meses muda devagar e é altamente previsível h passos à frente. O YoY é então derivado da razão. É *forecasting indireto por agregação temporal*.

### Desempenho

Validado em 38 meses fora da amostra (jan/2023 → fev/2026), recursivo, com `info <= t-h` (sem vazamento):

- **Theil U(h=5) = 0,50** — erro = metade do palpite ingênuo
- Vence em **todos** os horizontes (U: 0,39 / 0,41 / 0,44 / 0,48 / 0,51 para h=1..5)
- DM vs no-change: p=0,088 (margem importante mas no limiar de significância)
- Robusto à ordem: U=0,50–0,55 em (1,1,0)/(1,1,1)/(2,1,1)/(2,1,2)/(1,2,1)
- Viés OOS: +0,9 p.p. (modelo levemente subestima a alta, aceitável)

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
Labels especiais: `campeao`, `bench`.

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

### Ficha técnica do horse-race vazia

`lib/horse-race-30.json` foi apagado. Restaure do git ou rode `panel_horserace.py` para reconstruí-lo.

### Histórico das 4 cargas vazio

`series-tendencia.json` foi sobrescrito. Rode `gera-series-tendencia.mjs`.
