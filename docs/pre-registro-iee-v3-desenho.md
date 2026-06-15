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

## Estado (2026-06-15)

- Pré-registro de desenho: **congelado** (este documento).
- Backtest exploratório: **implementado** (`iee-v3-basis-aperto.ts`), roda contra
  o alvo real; **aguardando** os caches CEPEA/SIFRECA (gerador documentado).
- Impacto no IEE publicado: **nenhum** — pilares a peso 0 até o gate.
