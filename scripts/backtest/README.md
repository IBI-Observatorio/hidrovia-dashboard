# Backtest do IEE — vereditos consolidados

> Gerado por `scripts/backtest/iee-final.ts` em 2026-06-10. NÃO editar à mão.
> Pré-registro v0: sha256 `58ea29736ebc9747…` congelado em 2026-06-10.

## Episódios-âncora

| Episódio | Veredito | Detalhe |
|---|---|---|
| out-2024-seca-tabocal | ✓ acusou | percentil médio 98.8 (critério ≥90) · P_H máx 83.2 (critério ≥80) |
| mar-2026-choque-diesel | ✓ acusou | P_T Santos 13 semanas pós-choque, mín 100.0 (critério = 100 sustentado) |
| pico-safra-2026 | ✓ acusou | P_S máx abr–mai/26: Santos 100.0 · Paranaguá 100.0 (critério ≥95) |
| dez-2025-fila-santos | ◌ registrado (não verificável) | NÃO VERIFICÁVEL — sem histórico de line-up (PASSO 2); lacuna estrutural declarada no pré-registro |
| jan-2025-salto-frete | ◌ registrado (não verificável) | FORA DE ESCOPO — T é custo modelado, não frete negociado (decisão registrada) |

## Métrica-alvo

MAE do IEE(t) contra tempo médio de espera no line-up em t+2: NÃO COMPUTÁVEL — histórico de F começou em 10/06/2026. Computar quando houver ≥ 26 semanas de fila acumulada.

## Regras (do pré-registro)

- Os pesos do IEE (F/T/S/H por corredor) e os pesos internos do H são JULGAMENTO v0 declarado e permanecem FIXOS até calibração pré-registrada.
- Critério de substituição: pesos calibrados (wₖ ≥ 0, Σwₖ = 1) só substituem os v0 se reduzirem o MAE out-of-sample em validação walk-forward contra a métrica-alvo.
- Métrica-alvo: o IEE da semana t deve prever o tempo médio de espera no line-up em t+2. HOJE NÃO COMPUTÁVEL: exige histórico de fila (F) que só começou a acumular em 10/06/2026 — registrado como critério futuro, não como número.
- Nenhum coeficiente é ajustado retroativamente para 'encaixar' episódio. Episódio não acusado é reportado e bloqueia publicação da leitura retroativa, nunca corrigido por ajuste de peso.
- Percentis são walk-forward (sem lookahead); séries com menos de 3 safras usam z robusto (mediana/MAD) e carregam o rótulo 'calibração em construção' na interface.
- Toda mudança de parâmetro gera novo pré-registro versionado (hash novo), com diff e justificativa públicas.

## Scripts

- `iee-santos.ts` — S+T retroativos de Santos (jan/2025→), veredito dez/2025 e jan/2025.
- `iee-paranagua.ts` — S+T de Paranaguá + perfil sazonal Santos × Paranaguá.
- `iee-arco-norte.ts` — H 2017→2026 (episódio out/2024), consolidado 3 corredores, contribuição H.
- `iee-final.ts` — este: integridade do pré-registro + episódios-âncora + README.
