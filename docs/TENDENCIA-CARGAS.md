# Indicador 31 — Tendência de Cargas (`/portos/ineditas/tendencia-cargas`)

Explica como funciona o fluxo de dados da página, o que atualizar todo mês e como o modelo de projeção foi construído.

---

## O que a página mostra

Três visualizações:

1. **Projeção contêiner — Longo Curso** (~70% do mercado): rota internacional. Modelo combina IBC-Br, câmbio BRL/USD, Brent e CNY/USD (proxy do ciclo China).
2. **Projeção contêiner — Cabotagem** (~30%): rota doméstica entre portos brasileiros. Modelo combina IBC-Br, PIM-PF, IPCA Diesel e termos autorregressivos (captura inércia de contratos longos).
3. **Contexto histórico** — médias móveis de 12 meses (MA12) dos 4 tipos de carga (granel sólido, granel líquido, carga geral, contêiner total) desde 2011.

A separação dos dois mercados de contêiner é fundamental: longo curso responde ao ciclo global, cabotagem ao doméstico — misturar os dois num único modelo (versão antiga) produzia bandas de incerteza 4× mais largas que o necessário.

---

## Arquitetura de dados

```
public/data/antaq/dashboard/
  series-tendencia.json    ← 6 séries MA12 (4 naturezas + cabotagem + longo curso)
  forecast.json            ← 2 modelos: cabotagem + longo_curso (cada um com serie, forecast,
                              métricas, banda, diagnóstico, estabilidade de coeficientes)

scripts/
  gera-series-tendencia.mjs        ← Node — baixa ANTAQ, salva series-tendencia.json
  forecast_tendencia_cargas.py     ← Python — baixa BCB/FRED, treina 2 modelos, salva forecast.json

components/antaq/graficos/
  GraficoMediasMoveis31.jsx        ← lê os 2 JSONs, renderiza 2 projeções + 1 histórico
```

---

## Atualização mensal

A ANTAQ publica os dados de movimentação portuária até o dia 15 do mês seguinte.
Quando os novos dados estiverem disponíveis, rodar os dois scripts em sequência.

### Passo 1 — Atualizar as séries da ANTAQ

```bash
node scripts/gera-series-tendencia.mjs
```

Baixa 6 séries da API ANTAQ (`antaq-api-production.up.railway.app`):

- 4 naturezas de carga (granel sólido, granel líquido, carga geral, contêiner total)
- Contêiner separado por `navegacao=Cabotagem` e `navegacao=Longo Curso`

Saída esperada:
```
Baixando Granel Sólido… 182 pontos (2011-01 → 2026-02)
Baixando Granel Líquido e Gasoso… 182 pontos (...)
Baixando Carga Geral… 182 pontos (...)
Baixando Carga Conteinerizada… 182 pontos (...)
Baixando Carga Conteinerizada (Cabotagem)… 182 pontos (...)
Baixando Carga Conteinerizada (Longo Curso)… 182 pontos (...)
```

### Passo 2 — Rodar o modelo de projeção

```bash
python scripts/forecast_tendencia_cargas.py
```

Baixa preditores externos (sem chave de API):

| Variável | Fonte | Série |
|---|---|---|
| IBC-Br | BCB-SGS | 24364 |
| Câmbio BRL/USD | BCB-SGS | 3697 |
| PIM-PF | BCB-SGS | 21859 |
| IPCA Diesel | BCB-SGS | 1393 |
| Brent | FRED | DCOILBRENTEU |
| CNY/USD | FRED | DEXCHUS |

Treina os 2 modelos, salva `forecast.json`. Saída inclui métricas de stress test:
```
━━━ LONGO_CURSO ━━━
  MODELO  : RMSE=4.97pp  R²=+0.388  ρ=+0.671
  NAÏVE   : RMSE=5.03pp  R²=+0.373
  → Modelo bate naïve em +1.2% RMSE
  Treino janela 60m       : RMSE=5.17pp  R²=+0.497
  Bias OOS últimos 12m     : +8.14pp (aplicado como correção)
```

---

## Pipeline de modelagem (Python)

### Por que dois modelos?

Cabotagem e longo curso são mercados com drivers **completamente diferentes**:

| Driver | Longo Curso | Cabotagem |
|---|---|---|
| China PMI / ciclo asiático | **forte** | nulo |
| Câmbio BRL/USD | **forte** | médio |
| Brent (freight + commodities) | **forte** | médio |
| PIM-PF (atividade industrial BR) | médio | **forte** |
| IPCA Diesel (substituto rodoviário) | nulo | **forte** |
| Inércia (contratos longos) | médio | **forte** |

Misturar tudo num único modelo OLS (versão original com IBC-Br + carga_geral) tinha RMSE OOS de 7,2pp. O modelo separado de longo curso baixou para 4,4pp.

### Especificação do modelo

```
target = yoy_ma12(contêiner_segmento)
features = [
  yoy_ma12(target).shift(ar_lags),       # termos AR (inércia)
  yoy_ma12(preditor_i).shift(lag_i),      # exógenos defasados
  ...
]
```

- **Estimador**: `RidgeCV` (5-fold) sobre features padronizadas — preserva todos os coeficientes (LASSO superregularizava com pequenas amostras).
- **Janela de treino final**: últimos 60 meses (privilegia regime atual pós-COVID).
- **Walk-forward validation**: rolling origin com horizonte h=5 (igual à projeção real), `min_train=60`.
- **Banda 80%**: conformal split sobre **resíduos centrados dos últimos 24 meses**. Centrar = remover bias estrutural (capturado separadamente como correção da central).

### Stress tests aplicados

1. **Walk-forward h=5** vs naïve (último valor) vs média 12m — confirma se o modelo bate baselines.
2. **Estabilidade de coeficientes** — re-estima a cada 6 meses na janela rolante 60m; conta quantos preditores mantêm sinal estável.
3. **Diagnóstico de resíduos**: Ljung-Box (autocorrelação), Jarque-Bera (normalidade).
4. **Bias correction**: bias OOS médio dos últimos 12m é subtraído da central para corrigir desvio estrutural recente.

---

## Estrutura dos JSONs

### `series-tendencia.json`

```jsonc
{
  "gerado_em": "2026-05-25T...",
  "series": {
    "granel_solido":            [{ "data": "2011-01", "ma12_mt": 42.97 }, ...],
    "granel_liquido":           [...],
    "carga_geral":              [...],
    "conteinerizada":           [...],
    "conteinerizada_cabotagem": [...],
    "conteinerizada_longo_curso": [...]
  }
}
```

### `forecast.json`

```jsonc
{
  "gerado_em": "...",
  "metadata":  { "horizonte_meses": 5, "banda_padrao": "conformal_split_80pct", "fontes_dados": {...} },
  "cabotagem": {
    "spec_humana": "Crescimento a/a ~ AR + atividade doméstica + ...",
    "modelo": {
      "tipo":                       "RidgeCV (5-fold) sobre features YoY com lags + AR",
      "features":                   ["ar_lag6", "ar_lag12", "ibc_br_lag3", ...],
      "coeficientes_padronizados":  { "ar_lag6": 0.32, ..., "intercept": 5.2, "alpha_ridge": 1.6 }
    },
    "metricas": {
      "walk_forward_modelo":       { "n": 94, "rmse_pp": 6.54, "r2": 0.278, ... },
      "walk_forward_naive":        { ... },
      "walk_forward_media12m":     { ... },
      "treino_full_sample":        { "rmse_pp": 3.80, "r2": 0.820 },
      "ganho_rmse_vs_naive_pct":   8.4
    },
    "diagnostico_residuos":  { "ljung_box_lag12_pvalor": 0.000, "jarque_bera_pvalor": 0.119, ... },
    "estabilidade_coef":     { "ar_lag6": { "media_padronizada": 0.32, "cv": 0.5, "sinal_estavel": true }, ... },
    "banda": { "metodo": "conformal_split_recent24m_centrado", "sigma_recente": 8.05, "bias_correction_pp": -5.29 },
    "serie":    [{ "data": "2013-01", "observado": 4.1, "predito": 3.8, "fase": "warmup" }, ...],
    "forecast": [{ "data": "2026-03", "central_pct": -7.84, "central_raw_pct": -2.55,
                   "low_pct": -24.09, "high_pct": 8.41, "low_boot_pct": ..., "high_boot_pct": ... }, ...]
  },
  "longo_curso": { /* mesmo schema */ }
}
```

---

## Troubleshooting

### Gráfico não carrega / "Erro ao carregar dados"

1. Confirme que `series-tendencia.json` e `forecast.json` existem em `public/data/antaq/dashboard/`.
2. Veja o console do browser para o erro HTTP exato.
3. Se um dos forecasts (cabotagem ou longo_curso) está vazio: rode `python scripts/forecast_tendencia_cargas.py` novamente.

### Script Node falha

API ANTAQ pode estar em cold start no Railway — aguarde 30s e tente de novo.

### Script Python falha

- Sem internet: BCB e FRED são acessados em runtime.
- Erro de timeout no FRED: aumentar `timeout=30` nos `requests.get`.
- Erro de pacote: precisa `numpy`, `pandas`, `scikit-learn`, `statsmodels`, `scipy`, `requests`.

### Bandas ficaram muito largas / pequenas

A banda é controlada por:
1. **σ dos resíduos OOS últimos 24m** — variabilidade real do mercado naquele regime
2. **Bias correction** — se o modelo errou sistematicamente, a central é ajustada (não a banda)

Banda larga = mercado volátil ou modelo perdendo regime. Banda apertada = modelo está calibrado no regime atual. Cabotagem naturalmente tem banda mais larga (~32pp) porque é mercado pequeno e volátil; longo curso fica em ~6pp.

### Modelo não bate naïve

Verifique a métrica `ganho_rmse_vs_naive_pct` no JSON. Se for negativa ou muito pequena (<5%), o modelo está apenas reproduzindo inércia. Isso pode acontecer quando:
- O alvo (YoY MA12) é muito persistente
- Os preditores não têm sinal antecedente forte
- Mudança de regime recente

Nesse caso, considere reduzir o horizonte (h<5) ou trocar de target (nível em vez de YoY).
