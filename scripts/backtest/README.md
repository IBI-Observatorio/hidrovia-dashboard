# Backtest do IEE — vereditos consolidados

> Gerado por `scripts/backtest/iee-final.ts` em 2026-06-17. NÃO editar à mão.
> Pré-registro v6: sha256 `1fa32db7c7aa1b70…` congelado em 2026-06-17.

## Episódios-âncora

| Episódio | Veredito | Detalhe |
|---|---|---|
| out-2024-seca-tabocal | ✓ acusou | percentil médio 98.8 (critério ≥90) · P_H máx 83.2 (critério ≥80) |
| mar-2026-choque-diesel | ✓ acusou | P_T Santos 13 semanas pós-choque, mín 100.0 (critério = 100 sustentado) |
| pico-safra-2026 | ✓ acusou | P_S máx abr–mai/26: Santos 100.0 · Paranaguá 100.0 (critério ≥95) |
| dez-2025-fila-santos | ◌ registrado (não verificável) | VERIFICADO CONTRA A EA: espera média dez/2025 = 149 h ≈ média de 2025 (165 h) — episódio NÃO CONFIRMADO como excepcional; âncora SUBSTITUÍDO no v1 (ver out-2023) |
| out-2023-espera-recorde | ✓ acusou | referência histórica da métrica-alvo: 5/5 maiores esperas da série 2016–2026 caem em ago–out/2023 (pico 397 h em 2023-10-09) |
| jan-2025-salto-frete | ◌ registrado (não verificável) | FORA DE ESCOPO — T é custo modelado, não frete negociado (decisão registrada) |

## Métrica-alvo

IEE-Santos(t) = F·0,50 + T·0,40 + S·0,10 (v6) vs percentil da espera EA em t+2 (46 semanas, abr/2025→fev/2026): Spearman 0.58 · MAE 21.9 p.p. F (pressão de chegadas ANTAQ) ENTRA na composição — saltou de 0,43 (v3, sem F) para o valor atual. CAVEAT: in-sample, n≈46, SE±0,15.

## Regras (do pré-registro)

- Os pesos do IEE (F/T/S/H por corredor) e os pesos internos do H são JULGAMENTO v0 declarado e permanecem FIXOS até calibração pré-registrada.
- Critério de substituição: pesos calibrados (wₖ ≥ 0, Σwₖ = 1) só substituem os v0 se reduzirem o MAE out-of-sample em validação walk-forward contra a métrica-alvo.
- Métrica-alvo: o IEE da semana t deve prever o tempo médio de espera no line-up em t+2, medido pela TEsperaAtracacao da Estatística Aquaviária ANTAQ (atracações com grão embarcado). Baseline v1 (Spearman/MAE) registrado no backtest final.
- Nenhum coeficiente é ajustado retroativamente para 'encaixar' episódio. Episódio não acusado é reportado e bloqueia publicação da leitura retroativa, nunca corrigido por ajuste de peso.
- Percentis são walk-forward (sem lookahead); séries com menos de 3 safras usam z robusto (mediana/MAD) e carregam o rótulo 'calibração em construção' na interface.
- Toda mudança de parâmetro gera novo pré-registro versionado (hash novo), com diff e justificativa públicas.

## Scripts

- `iee-santos.ts` — S+T retroativos de Santos (jan/2025→), veredito dez/2025 e jan/2025.
- `iee-paranagua.ts` — S+T de Paranaguá + perfil sazonal Santos × Paranaguá.
- `iee-arco-norte.ts` — H 2017→2026 (episódio out/2024), consolidado 3 corredores, contribuição H.
- `iee-final.ts` — este: integridade do pré-registro + episódios-âncora + README.
