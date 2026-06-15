# Pré-registro IEE v3 — DESENHO (não calibração)

> **Congelado em 2026-06-15, ANTES de construir qualquer série ou rodar
> backtest.** Este documento existe para evitar overfitting: a hipótese e o
> critério de aprovação são declarados primeiro; o resultado vem depois e não
> pode ser editado para "encaixar". Mesmo princípio dos episódios-âncora.

## Motivação (auditoria econômica, jun/2026)

Duas críticas 🔴 à v2, anteriores a qualquer coeficiente:

1. **Validade preditiva fraca.** Baseline v2 registrado no backtest:
   IEE-Santos(t) vs percentil da espera EA em t+2 → **Spearman 0,23 · MAE 27,3 p.p.**
   (46 semanas). O produto promete "antecipar 3 semanas"; a evidência ainda não sustenta.
2. **O T mede CUSTO (≈ diesel macro), não o aperto.** O estresse logístico mora no
   *spread* frete − custo (margem + escassez), não no nível de custo. O episódio
   "mar-2026 choque diesel" que leva P_T a 100 é, economicamente, reação a um
   choque de petróleo global — não a congestionamento de corredor.

## Hipóteses (falsificáveis)

- **H1 — Basis.** O percentil sazonal walk-forward do **basis de soja**
  (preço porto − preço interior, R$/sc) na semana t prevê o percentil da espera
  EA em t+2 **melhor que o baseline v2**. Critério: Spearman ≥ **0,35** E
  MAE < **27,3** p.p., out-of-sample (walk-forward), em Santos.
- **H2 — Aperto.** O percentil do **spread frete − custo**
  ((Frete_SIFRECA − Custo_engine)/Custo) na semana t prevê a espera em t+2 melhor
  que o T-custo isolado. Critério: Spearman do Aperto > Spearman do T-custo, OOS.

## Dados (fontes declaradas)

| Sinal | Fonte | Cadência | Cache alvo |
|---|---|---|---|
| Preço porto (soja) | CEPEA/ESALQ — Indicador Soja Paranaguá/Santos | diária→semanal | `data/cepea/basis-semanal.json` |
| Preço interior MT | CEPEA/ESALQ ou IMEA — soja Mato Grosso/Sorriso | semanal | idem |
| Frete observado | SIFRECA/ESALQ + IMEA (Sorriso→Santos) | mensal/semanal | `data/sifreca/frete-semanal.json` |
| Custo modelado | engine IBI atual (`lib/custeio-rodoviario.ts`) | semanal | já no repo |
| **Alvo** | espera EA (ANTAQ) — `data/antaq/espera-semanal.json` | semanal | **já no repo (real)** |

## Método (igual ao resto do IEE)

- Percentil **sazonal walk-forward** (sem lookahead); <3 safras → z robusto,
  rótulo "calibração em construção".
- Alinhamento: predictor(t) vs alvo(t+2), pareando por semana ISO + 14 dias.
- Métrica: **Spearman** (rank) e **MAE** entre percentil do predictor(t) e
  percentil da espera(t+2), em p.p. — mesma definição do baseline v2.
- Script reprodutível: `scripts/backtest/iee-v3-basis-aperto.ts`.

## Regra de promoção (decisão)

Um pilar novo (Basis/Aperto) **só entra no IEE ponderado** se passar o critério
acima E reduzir o MAE out-of-sample do IEE combinado vs o baseline F/T/S — a
**mesma regra de substituição já vigente** (pesos calibrados só substituem v0 se
reduzirem o MAE OOS). Até lá, o pilar é exibido com **peso 0** ("calibração em
construção") — não altera o IEE publicado.

## O que invalida / encerra

- H1/H2 **não** atingem o critério → o pilar é reportado como testado e
  rejeitado (fica como diagnóstico peso 0), nunca forçado por ajuste.
- Sem a série de dado (CEPEA/SIFRECA) o backtest reporta "aguardando dados" e
  **não** promove nada — ausência de dado nunca vira ausência de gate.
- Qualquer promoção a peso > 0 exige **novo pré-registro de parâmetro** (hash,
  v3) com o resultado anexado.

## Resultado — H1 Basis (2026-06-15) · ❌ REPROVADO

Dado obtido (CEPEA Soja Paranaguá + IMEA Soja MT "disponível compra"), basis
semanal 2023-01→2026-06 (170 semanas, médio ~R$ 23/sc). Gerador:
`scripts/cepea/gera-basis.py`. Teste: `scripts/backtest/iee-v3-basis-aperto.ts`.

| Métrica | Basis (percentil sazonal WF) | Baseline v2 | Critério H1 |
|---|---|---|---|
| Spearman vs espera t+2 | **−0,16** | 0,23 | ≥ 0,35 |
| MAE | **42,9 p.p.** | 27,3 | < 27,3 |
| Pares | 153 | — | — |

**Veredito: H1 rejeitado.** O Basis **não** é promovido — permanece peso 0
(diagnóstico), nunca forçado (regra do pré-registro).

**Por que falhou (achado real):** no *nível bruto*, basis(t) vs espera(t+2) dá
Spearman **+0,33** — mas isso é o **co-movimento sazonal** que a normalização do
IEE remove de propósito (um valor alto só conta se for alto *para aquela época*).
O resíduo sazonal do basis — ainda por cima com só 3 safras (regime z-robusto,
frágil) — **não** prevê a fila, e o sinal chega a inverter. Lição: o basis pode
ter valor como *nível*, não como percentil sazonal na régua atual do IEE.
Reavaliar quando houver ≥5 safras de série, ou testar o basis em nível (fora da
normalização sazonal) como exceção declarada.

## Estado (2026-06-15)

- Pré-registro de desenho: **congelado**; H1 (Basis) **testado e rejeitado** (acima).
- H2 (Aperto): **aguardando** frete SIFRECA (`data/sifreca/frete-semanal.json`).
  Nota informativa do mesmo backtest: o **T-custo isolado** prevê a espera t+2 com
  Spearman **0,33 · MAE 26,3** (58 pares) — acima do IEE composto (0,23), sugerindo
  que o blend F/T/S dilui o T (candidato a revisão de pesos, sob pré-registro).
- Impacto no IEE publicado: **nenhum** — nada promovido a peso > 0.
