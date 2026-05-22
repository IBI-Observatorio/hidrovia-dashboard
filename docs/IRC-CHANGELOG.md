# IRC Changelog — Índice de Risco de Calado

## v3.5 (22/mai/2026) — Endurecimento estatístico em resposta à auditoria

**Mudanças críticas que invalidam comparações com versões anteriores.**

### Calibração
- **Rótulos externos**: severidade dos eventos âncora agora deriva de percentil
  DOY de cota Manaus + Humaita + Curicuriari (variáveis INDEPENDENTES de cota
  Itacoatiara). Elimina label leakage da v3.3 (rotulagem por cota_ITA → input
  do componente dominante).
- **Dataset expandido**: 112 eventos rotulados (vs 21 da v3.3) via amostragem
  mensal sistemática 2016-2025. Razão eventos/parâmetro = 21 (vs 5 antes).
- **Hold-out temporal real**: treino ≤2022 (n=84), teste 2023-2025 (n=28).
  Elimina lookahead bias.
- **Lag ortogonalizado**: `componenteLagOperacional` agora usa resíduo da
  regressão OLS `ITA = a + b·MAO` (a=−10,75; b=0,87; R²=0,99). Resíduo é
  ortogonal a cota_ITA por construção → elimina multicolinearidade.
- **Não-compensação**: fórmula final = `max(soma_linear, c_calado × 0,75)` se
  c_calado ≥ 80. Garante que calado severo não é mascarável por demais
  componentes zerados.
- **Pesos calibrados**: {calado: 0,58, hmm: 0,13, onda: 0,10, pp: 0,10, lag: 0,09}
  (vs v3.3: {0,41, 0,11, 0,11, 0,26, 0,11}). Pesos onda e pp FIXADOS em 0,10
  cada porque esses sinais não existem retrospectivamente no dataset.

### Performance honesta (não-tautológica)
- **ρ_train** (n=84, ≤2022): **0,08** (p=0,25, NÃO-significativo a 5%)
- **ρ_test** (n=28, ≥2023): **0,58**
- **p-valor permutation** (n=2000): 0,25 (treino), confirma cautela necessária

### Comparação v3.3 (fake) vs v3.5 (honesta)
| Métrica | v3.3 alegado | v3.5 real |
|---|---|---|
| Spearman in-sample | 0,85 | 0,08 |
| AUC discriminação | 1,00 | n/a (multi-classe) |
| Significância estatística | não testada | p=0,25 (não-sig) |
| Capacidade preditiva real | ARTEFATO LABEL LEAKAGE | Modesta (cauda extrema) |

### Outras correções
- **Faixas Youden**: limiares verde→amarelo=21, amarelo→laranja=25,
  laranja→vermelho=25 (vs cosméticas 25/50/75 da v3.3, justificadas como
  "coerência visual").
- **IC80 propagado**: `calculaIRCTabocalComIC(snap)` retorna {p10, p50, p90,
  faixa_estavel}. Permite julgar se IRC=49 vs 50 é estatisticamente distinto.
- **Série histórica regenerada**: `IRC_HISTORICO_CALCULADO` agora usa
  `calculaIRCTabocal` real (5 componentes), não v2.1 (2 componentes).
  Antes: comparação temporal inválida.
- **Seed PRNG fixa (42, Mulberry32)**: bootstrap reprodutível.
- **Hash de pesos**: cada artefato carimba SHA-256 dos pesos + git SHA.

### Limitações honestas mantidas
- n=112 eventos ainda é modesto para 4 g.l. (literatura pede 10-20 eventos/parâmetro).
- onda_branco e anomalia_pp não calibráveis retrospectivamente (sem dados).
- p-valor de treino não-significativo: mais dados necessários para confirmação.
- O IRC v3.5 é **indicador composto operacional defensável**, NÃO um modelo
  preditivo com IC apertado.

---

## v3.4 (22/mai/2026) — Endurecimento do modelo CMR/ETA (não do IRC)

- Curva CMR isotônica (PAV elimina 17 inversões).
- Slope extrapolação Theil-Sen + IC bootstrap (0,80 [0,74; 0,82]).
- Matriz de covariância MVN(k, h_min) para recessão Itacoatiara.
- Monte Carlo end-to-end na ETA (n=10000, propagação completa).
- Validação LOO da recessão: RMSE 18,6 dias, bias correction +12d.
- Forecasting por análogos históricos (v3.5 separação).
- Pesos do IRC permaneceram v3.3 (problemas críticos do índice ainda não
  endereçados nesse ponto).

---

## v3.3 (anterior) — IRC-Tabocal com calado parametrizável

- Calado-alvo parametrizável por assinante (slider 7-13m).
- Curva CMR oficial da Capitania substitui distância heurística ao gatilho.
- Pesos alegadamente "calibrados rigorosamente" — auditoria posterior mostrou
  que era label leakage. **Não use estes números em apresentações.**

---

## v3.0-v3.2 — IRC-Tabocal inicial

- Substituição do parâmetro Manaus 17,7m por cota Itacoatiara como anchor.
- Componente lag_operacional inicial (heurística delta − 13m).
- Coexistência com IRC-Manaus v2.1 para divergência regulatória.

---

## v2.1 — IRC-Manaus (legado)

- Soma ponderada de LWS-Manaus + HMM + Onda Branco + Anomalia PP.
- Mantido como referência regulatória ANTAQ. Em v3.5 renomeado para
  `IRC_VERSAO = "v3.5-manaus"` para sincronização de versionamento.

---

## Como auditar uma resposta da API

`GET /api/irc` retorna campo `metadata`:
```json
{
  "irc_tabocal_versao": "v3.5",
  "pesos_hash": "3e5370fe129c4491",
  "calibracao_git_sha": "<sha>",
  "calibracao_data": "2026-05-22T...",
  "rho_train": 0.0776,
  "rho_test": 0.5816,
  "p_valor_perm": 0.2459,
  "seed": 42
}
```

Reprodução: clone o repo no `calibracao_git_sha`, rode
`node scripts/calibra-irc-v35.mjs` — `pesos_hash` deve bater bit-a-bit.
