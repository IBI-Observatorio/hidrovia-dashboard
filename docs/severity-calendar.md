# Calendário de Severidade Hidrológica

## Origem dos percentis

Os percentis usados no calendário são os **mesmos** que alimentam o IDN (Índice de Dessincronização Norte-Sul), gerados por `scripts/gera-percentis-doy.mjs` e armazenados em `lib/percentis-doy.ts`.

### Período de referência

**2016–2023** (8 anos)

Os anos 2024 e 2025 são **excluídos** intencionalmente: ambos são anos extremos (2024 = mega-seca histórica, 2025 = ano-base de comparação ativo). Incluí-los no baseline contaminaria a referência climática que serve de denominador para medir exatamente esses desvios.

### Metodologia dos percentis por DOY

1. Série bruta de cada estação → suavização por **média móvel trailing de 7 dias** (MA-7d)
2. Para cada dia-do-ano (DOY 1–366), agrupa todos os valores do período 2016–2023 dentro de uma **janela centrada de ±15 dias** (total de ~31 × 8 = ~248 observações por DOY)
3. Calcula P10, mediana e P90 dessa amostra
4. Armazena como arrays de 367 elementos (índice 0 não usado) em `PERCENTIS_DOY`

A mesma suavização MA-7d é aplicada às séries históricas antes do cálculo das posições relativas, garantindo coerência com o procedimento de runtime do IDN.

## Fórmula de posição relativa (bucketing)

```
pos = (cota_mediana_semana − P10_doy_mid) / (P90_doy_mid − P10_doy_mid)
```

Onde `doy_mid` é o DOY do ponto médio da semana ou decêndio.

| Intervalo `pos` | Cor | Interpretação |
|---|---|---|
| < 0.08 | `#7f1d1d` | Muito seco — abaixo ou próximo do P10 |
| 0.08 – 0.18 | `#b91c1c` | Seco |
| 0.18 – 0.30 | `#ea580c` | Abaixo do normal |
| 0.30 – 0.42 | `#fbbf24` | Levemente seco |
| 0.42 – 0.58 | `#e7e5e4` | Normal (em torno da mediana) |
| 0.58 – 0.72 | `#93c5fd` | Levemente cheio |
| 0.72 – 0.85 | `#2563eb` | Acima do normal |
| ≥ 0.85 | `#1e3a8a` | Muito cheio — próximo ou acima do P90 |

Valores `pos < 0` (abaixo do P10) e `pos > 1` (acima do P90) são possíveis para anos extremos e mapeiam para os buckets mais escuros das extremidades.

## Estações cobertas

| Estação | Código ANA | Rio | Série histórica | Cobertura |
|---|---|---|---|---|
| Itacoatiara | 16030000 | Amazonas | 1927–2026 | 1927–1944, 1997–2026 (gap 1945–1996) |
| Lábrea | 13870000 | Purus | 1927–2025 | ~98% cobertura |
| Manicoré | 15700000 | Madeira | 1967–2025 | ~99% cobertura |

### Gap de Itacoatiara (1945–1996)

A estação 16030000 tem dados digitalizados no HidroWeb para o período 1927–1944 e 1997–presente. Os 52 anos intermediários não estão disponíveis na série digital da ANA. As células aparecem em cinza escuro no calendário. Não há planos de digitalização retroativa conhecidos.

## Arquivos gerados

| Script | Entrada | Saída |
|---|---|---|
| `scripts/converte-hidroweb-itacoatiara.mjs` | `Downloads/16030000_Cotas.csv` + `data/itacoatiara_historico.csv` | `data/itacoatiara_hidroweb.csv` |
| `scripts/gera-percentis-doy.mjs` | `data/*.csv` (12 estações) | `lib/percentis-doy.ts` |
| `scripts/gera-severity-calendar.mjs` | `data/{itacoatiara,labrea,manicore}_hidroweb.csv` + `PERCENTIS_DOY` (inline) | `lib/severity-calendar-precomputed.ts` |

## Regeneração

Para atualizar o calendário com dados mais recentes:

```bash
# 1. Baixar novo CSV do HidroWeb para Itacoatiara (16030000) e extrair para:
#    C:/Users/bruno/Downloads/itacoatiara_extract/16030000_Cotas.csv

node scripts/converte-hidroweb-itacoatiara.mjs
node scripts/gera-percentis-doy.mjs
node scripts/gera-severity-calendar.mjs
```

Os três scripts são idempotentes — podem ser rodados mais de uma vez sem efeitos colaterais.

## Verificação de sanidade

O script `gera-severity-calendar.mjs` imprime automaticamente:

- `Itacoatiara 2024 set-nov: min pos = -0.672 ✓ drought bucket`
- `Labrea 2024 set-nov: min pos = -1.041 ✓ drought bucket`

Valores `< 0.18` confirmam que 2024 aparece nos buckets vermelhos durante a janela de estiagem (set–nov). Se o valor for `≥ 0.18`, há regressão — investigar a série CSV ou os percentis.
