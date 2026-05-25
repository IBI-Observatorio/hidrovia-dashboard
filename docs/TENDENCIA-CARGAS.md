# Indicador 31 — Tendência de Cargas (`/portos/ineditas/tendencia-cargas`)

Explica como funciona o fluxo de dados da página, o que atualizar todo mês e o que fazer se algo quebrar.

---

## O que a página mostra

Dois gráficos:

1. **Projeção do contêiner** — modelo OLS que usa IBC-Br (defasagem 5 meses) e momentum da carga geral (defasagem 12 meses) para projetar o crescimento a/a do contêiner pelos próximos 5 meses.
2. **Contexto histórico** — médias móveis de 12 meses (MA12) dos 4 tipos de carga (granel sólido, granel líquido, carga geral, contêiner) desde 2010.

---

## Arquivos envolvidos

```
public/data/antaq/dashboard/
  series-tendencia.json   ← séries históricas MA12 por tipo de carga (atualizar mensalmente)
  forecast.json           ← projeção OLS + track record do contêiner (atualizar mensalmente)

components/antaq/graficos/
  GraficoMediasMoveis31.jsx  ← componente React que lê os dois JSONs acima

scripts/
  gera-series-tendencia.mjs  ← script que busca da API ANTAQ e salva series-tendencia.json
```

---

## Atualização mensal

A ANTAQ publica os dados de movimentação portuária até o dia 15 do mês seguinte.
Quando os novos dados estiverem disponíveis, rodar os dois passos abaixo.

### Passo 1 — Atualizar as séries históricas

```bash
node scripts/gera-series-tendencia.mjs
```

O script faz 4 chamadas à API ANTAQ (`antaq-api-production.up.railway.app`),
uma por tipo de carga, e salva o resultado em `series-tendencia.json`.
Saída esperada:

```
Baixando Granel Sólido… 182 pontos (2010-01 → 2026-03)
Baixando Granel Líquido e Gasoso… 182 pontos (2010-01 → 2026-03)
Baixando Carga Geral… 182 pontos (2010-01 → 2026-03)
Baixando Carga Conteinerizada… 182 pontos (2010-01 → 2026-03)

Salvo em .../public/data/antaq/dashboard/series-tendencia.json
```

### Passo 2 — Atualizar a projeção OLS

O `forecast.json` é gerado separadamente pelo modelo OLS em Python/Jupyter.
Substitua o arquivo em `public/data/antaq/dashboard/forecast.json` com a nova versão.

---

## Estrutura dos JSONs

### `series-tendencia.json`

```jsonc
{
  "gerado_em": "2026-05-25T00:00:00Z",   // data de geração (preenchida pelo script)
  "series": {
    "granel_solido":  [{ "data": "2010-01", "ma12_mt": 45.23 }, ...],
    "granel_liquido": [{ "data": "2010-01", "ma12_mt": 32.10 }, ...],
    "carga_geral":    [{ "data": "2010-01", "ma12_mt":  6.88 }, ...],
    "conteinerizada": [{ "data": "2010-01", "ma12_mt":  7.54 }, ...]
  }
}
```

- `data` — mês no formato `YYYY-MM`
- `ma12_mt` — média móvel de 12 meses em **milhões de toneladas** (Mt)

### `forecast.json`

```jsonc
{
  "modelo": {
    "spec":           "momentum_conteiner(t) = a + b·IBC-Br_yoy(t-5) + c·momentum_cargageral(t-12)",
    "r2_oos":         0.283,
    "corr_oos":       0.71
    // ...demais métricas do modelo
  },
  "serie": [
    // histórico observado + predito pelo modelo (para plotar o fit)
    { "data": "2012-12", "predito": 5.76, "observado": 3.78, "fase": "treino" },
    // ...
    { "data": "2026-02", "predito": 2.53, "observado": 5.23, "fase": "oos" }
  ],
  "forecast": [
    // projeção futura (5 pontos à frente do último observado)
    { "data": "2026-03", "central_pct": 2.16, "low_pct": -5.03, "high_pct": 9.36 }
    // ...
  ]
}
```

Todos os valores em `serie` e `forecast` são **crescimento a/a em pontos percentuais (pp)** do momentum da MA12 do contêiner.

---

## Como o componente lê os dados

`GraficoMediasMoveis31.jsx` usa `useDashboardData` (hook estático, sem API ao vivo):

```js
const { data, loading, erro } = useDashboardData(['series-tendencia.json', 'forecast.json']);
```

O hook carrega os dois arquivos de `/data/antaq/dashboard/` e os entrega como:

```js
data['series-tendencia']  // → conteúdo de series-tendencia.json
data['forecast']          // → conteúdo de forecast.json
```

O componente faz o pivot, calcula YoY da MA12 e índice base 100 no cliente — sem dependência de API externa.

---

## Troubleshooting

### Gráfico não carrega / aparece "Erro ao carregar dados"

1. Confirme que `series-tendencia.json` existe em `public/data/antaq/dashboard/`.
2. Confirme que o arquivo **não está vazio** (séries `[]`). Se estiver, rode o script.
3. Veja o console do browser para o erro HTTP exato.

### Script falha com erro de rede

A API ANTAQ fica em cold start no Railway — aguarde 30 segundos e tente novamente.
Se o erro persistir, verifique `ANTAQ_API_URL` ou se o serviço está UP:

```bash
curl https://antaq-api-production.up.railway.app/api/v1/series?natureza=Granel+S%C3%B3lido&metrica=toneladas&freq=mensal&suavizacao=ma12&apenas_movimentacao=true
```

### O gráfico de projeção não tem novos pontos

O `forecast.json` **não é atualizado pelo script** — é gerado pelo modelo OLS separado.
Atualize o arquivo manualmente com a nova rodada do modelo.
