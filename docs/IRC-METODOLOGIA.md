# IRC — Índice de Risco de Calado · Metodologia

**Versão atual:** **IRC-Tabocal v3.2** (CMR oficial Capitania) + IRC-Manaus v2.1 (comparação regulatória)
**Mantido por:** Observatório IBI / Infraestrutura de Transportes
**Última calibração:** 21/maio/2026

---

## 🎯 v3.2 — Métrica oficial da Capitania dos Portos

O componente principal do IRC-Tabocal agora é construído sobre o **Calado Máximo
Recomendado (CMR)** publicado diariamente pela **Capitania dos Portos da Amazônia
Ocidental**. Calibração feita com 187 observações diárias (08/set/2024 a 15/dez/2025)
da curva oficial cota_Itacoatiara → CMR.

**O que isso muda comercialmente**:
- O IRC agora se baseia em uma **publicação oficial** que armadores já usam
- Métrica reportada em **metros de lâmina d'água** (não cota relativa abstrata)
- Conversível diretamente em **toneladas de carga deslocada** (cada 1m ≈ 1.500 ton/balsa × 24 balsas/comboio ≈ 36.000 ton)
- Quando o IRC do IBI **divergir** do CMR atual da Capitania, é defensável publicamente

Range observado:
- CMR mínimo: 5,63 m (na mega-seca 2024, com Itacoatiara em −0,18 m)
- CMR máximo: 12,50 m (cheia normal, Itacoatiara em ~7,9 m)
- Calado alvo padrão: 11 m (comboio carregado em cheia)

---

## Diferença IRC-Tabocal vs IRC-Manaus

| | IRC-Tabocal (v3.1, principal) | IRC-Manaus (v2.1, comparação) |
|---|---|---|
| Ancorado em | **Cota de Itacoatiara** (ponto de controle do Tabocal) | Cota de Manaus (parâmetro ANTAQ formal) |
| Gatilho operacional | **−0,10m em Itacoatiara** (mínima histórica −0,17m em 2024) | 17,7m em Manaus |
| Spearman vs eventos rotulados | **0,90 in-sample · 0,91 LOO · 0,81 temporal** | 0,62 |
| AUC discriminação severidades | **1,00 (perfeita)** | 0,75 |
| Calibração | Rigorosa: 4 estimadores, LOO CV, block bootstrap, drop-one | Regularizada simples |
| Função | Decisão operacional + sinal regulatório | Comparação com parâmetro vigente |

A divergência entre os dois é o sinal regulatório: quando IRC-Tabocal supera IRC-Manaus por >10 pontos, a ANTAQ está subestimando o risco real.

---

**Versão herdada:** v2.1

---

## 1. Definição

O IRC é um score 0–100 que sintetiza o risco operacional para a navegação na
bacia do Amazonas em um único número, calibrado por sinais hidrológicos,
regulatórios e climáticos.

**Faixas:**

| Valor | Faixa | Interpretação |
|---|---|---|
| 0–25 | Verde | Sistema saudável, navegação irrestrita |
| 25–50 | Amarelo | Atenção, monitoramento ativo |
| 50–75 | Laranja | Alto risco operacional |
| 75–100 | Vermelho | Risco extremo, gatilho LWS provável |

## 2. Componentes (4)

### 2.1 Componente LWS (peso 40%)

Distância ao gatilho regulatório de 17,7 m em Manaus (parâmetro ANTAQ).
Combina:

- **(a) Atual**: linear entre 22m (folga, 0 pts) e 17,7m (100 pts); extrapola
  +15 pts/m abaixo.
- **(b) Projetado**: a partir do ETA de cruzamento previsto pelo modelo de
  recessão. Decai linearmente de 90 (ETA<30d) a 0 (ETA>240d).
- **Modulação sazonal**: cota baixa na subida (jan-mai) recebe 60% do score;
  cota baixa na descida (jul-dez) recebe 120% (capado).

Final: `C_LWS = max(atual, projetado) × modulação`.

### 2.2 Componente HMM extremo (peso 15%)

Anomalia probabilística da persistência em regime extremo (Sul ou Norte) nos
próximos 7 dias.

```
P_cond = P(Sul ou Norte em 7d | estado HMM atual)
P_incond = 0,67   (probabilidade incondicional, derivada da matriz A^∞)
anomalia = P_cond − P_incond
C_HMM = 50 + (anomalia / 0,3) × 50      (clamp 0..100)
```

O IDN é clampeado para o domínio de calibração [-0,9; +0,9] antes da
classificação HMM, para evitar extrapolação fora do treino. HMM gaussiano K=3
calibrado por Baum-Welch em 2.916 dias (2016–2023). Matrizes T7 e T30 já
computadas em `lib/hmm-idn.ts`.

### 2.3 Componente Onda Branco (peso 15%)

Subida atípica em Caracaraí (Rio Branco, código ANA 14710000), antecipando o
pico de cheia em Manaus por ~20 dias.

**Severidade contínua** via sigmoide entre percentis P85/P95 **MENSAIS**
(calibrados em série 2016–2025 de Caracaraí):

| Mês | P85 (m/7d) | P95 (m/7d) |
|---|---|---|
| jan | 0,93 | 1,29 |
| mar | 1,24 | 1,85 |
| **mai** (cheia natural) | 2,18 | 3,16 |
| **out** (estiagem rara) | 1,14 | 1,37 |
| nov | 1,95 | 2,12 |

**Lag Caracaraí → Manaus** (calibrado por correlação cruzada das anomalias
z-score com sazonalidade DOY removida):

| Regime | Lag (dias) | Justificativa hidrológica |
|---|---|---|
| Negro alto (Driver Sul) | 13 | Coluna contígua, pulso de pressão rápido |
| Negro normal | 20 | Padrão |
| Negro baixo (Driver Norte) | 38 | Canal fragmentado precisa preencher antes |

### 2.4 Componente Anomalia PP (peso 30%)

Anomalia de precipitação 30d na bacia do Negro, extraída automaticamente do
parágrafo "Análise da Precipitação" do boletim SGB/CPRM. Categorias MERGE/GPM:

| Categoria | Rótulo |
|---|---|
| −3 | extremamente seco |
| −2 | muito seco |
| −1 | seco |
| 0 | normal |
| +1 | chuvoso |
| +2 | muito chuvoso |
| +3 | extremamente chuvoso |

`C_PP = |categoria| / 3 × 100`. Tanto déficit quanto excesso contribuem.

## 3. Fórmula agregada

```
IRC = 0,40·C_LWS + 0,15·C_HMM + 0,15·C_Onda + 0,30·C_PP
```

Quando um componente está ausente (ex.: cache SGB sem boletim recente, sem
`C_PP`), os pesos remanescentes são renormalizados proporcionalmente para
manter soma = 1,0. O JSON da API retorna `pesos_efetivos` para auditoria.

## 4. Calibração dos pesos

Pesos otimizados por busca em grade contra **20 eventos rotulados**
(`lib/eventos-rotulados.ts`) cobrindo severidades 1–5 entre 2010 e 2026.
Critério: maximizar correlação Spearman entre IRC e severidade observada.

| Versão | Pesos (LWS/HMM/Onda/PP) | Spearman |
|---|---|---|
| v2 (heurística) | 40/25/20/15 | 0,54 |
| v2.1 (calibrada) | **40/15/15/30** | **0,62** |

Os pesos finais são **regularizados** (mistura 70% bootstrap + 30% heurística)
para reduzir overfitting com amostra de 20 eventos. IC80 dos pesos via
bootstrap n=200:

| Peso | Mediana | IC80 |
|---|---|---|
| LWS | 0,40 | [0,20; 0,50] |
| HMM | 0,10 | [0,10; 0,30] |
| Onda | 0,15 | [0,05; 0,35] |
| PP | 0,35 | [0,25; 0,35] |

## 5. Variantes

### 5.1 IRC_AGORA

Risco operacional **imediato**, considerando apenas estado presente (cota,
HMM, PP). Ignora projeções (Onda em trânsito, ETA de cruzamento).

Útil para responder "quão crítico é o sistema HOJE?".

### 5.2 IRC_PROJETADO (padrão)

Inclui todos os sinais, inclusive antecipados. É o IRC "completo" — citado
sem qualificação, refere-se ao projetado.

## 6. Incerteza (Monte Carlo)

Propagação via N=500 amostras com ruído gaussiano nos inputs:

| Input | σ (perturbação) |
|---|---|
| Cota Manaus | ±0,02 m (telemetria) |
| IDN | ±0,10 (agregação sub-bacia) |
| Var. Onda 7d | ±0,30 m (janela exata) |
| ETA cruzamento | ±50 dias (IC80 da recessão) |

Saída: `irc_central`, `sigma`, `IC80_lo`, `IC80_hi`, `prob_faixa` (probabilidade
empírica de cada faixa nas amostras).

## 7. Limitações honestas

| Limitação | Impacto | Plano |
|---|---|---|
| Autocorrelação não tratada nos pesos | Bootstrap pode subestimar IC | Block bootstrap em v3 |
| Modelo de recessão Manaus-only | Tabocal projeção indireta | Modelo Itacoatiara em v3 |
| Lag Caracaraí pode não ter pico claro em regime normal | Fallback no lag_otimo | OK |
| 20 eventos é pouco para 3 pesos livres | Risco de overfitting | Regularização aplicada |
| HMM treinado em 8 anos (2016-2023) | Pode ser obsoleto pós-2024 | Recalibrar quando 2025-2026 fechar |

## 8. Reprodutibilidade

- **Função pura**: `calculaIRC(snapshot)` é determinística e idempotente
- **Pesos auditáveis**: hardcoded em `lib/irc.ts`, com Spearman e bootstrap documentados
- **Calibração reexecutável**: `node scripts/otimiza-pesos-irc.mjs` regenera os pesos
- **Lag reexecutável**: `node scripts/calibra-lag-anti-sazonal.mjs` regenera o lag
- **Onda Branco reexecutável**: `node scripts/calibra-onda-branco-doy.mjs` regenera percentis mensais

## 9. Validação contra eventos âncora (Spearman ρ = 0,62)

| Severidade | Evento (exemplo) | IRC esperado | IRC observado |
|---|---|---|---|
| 5 | Mega-seca out/2024 (Manaus 12,11m) | ≥80 | ~100 |
| 5 | Estiagem set/2010 | ≥75 | ~95 |
| 4 | Estiagem out/2023 | ≥70 | ~80 |
| 3 | Dessincronização mar/2026 | — | ~50 |
| 2 | Onda Branco mai/2026 | — | ~45 |
| 1 | Cheia normal abr/2025 | ≤30 | ~20 |

## 10. Citação

> IBI Observatório de Infraestrutura de Transportes. IRC — Índice de Risco de
> Calado v2.1. Calibrado em 20 eventos rotulados 2010–2026, ρ Spearman = 0,62.
> Disponível em <https://ibi-observatorio.org/docs/irc-metodologia>.

---

**Última atualização:** 21/mai/2026 · **Próxima recalibração:** após ciclo 2026 fechar.
