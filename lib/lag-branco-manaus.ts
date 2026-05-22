// AUTO-GERADO por scripts/calibra-lag-anti-sazonal.mjs em 2026-05-21T22:59:43.081Z
// Lag de propagação Caracaraí (Rio Branco) → Manaus (Rio Negro) calibrado por
// correlação cruzada das ANOMALIAS Z-SCORE (sazonalidade removida via janela
// DOY ±15d em série 2016-2025) e segmentado por estado do Negro alto.

export const LAG_BRANCO_MANAUS = {
  // Lag global ótimo (todos os regimes agregados)
  lag_otimo:      20,
  correlacao:     0.4746,

  // Bootstrap IC80 (n=100, block bootstrap 30d)
  lag_mediana:    20,
  lag_ic80_lo:    20,
  lag_ic80_hi:    20,
  sigma_estimado: 0,

  // Por regime do Negro alto (proxy: z-score SGC)
  lag_negro_baixo:  38,   // Driver Norte
  lag_negro_normal: 0,
  lag_negro_alto:   13,     // Driver Sul

  // Correlações por regime
  r_negro_baixo:  0.29,
  r_negro_normal: 0.304,
  r_negro_alto:   0.319,
} as const;
