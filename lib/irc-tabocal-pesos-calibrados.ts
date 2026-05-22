// AUTO-GERADO por scripts/calibra-rigorosa-irc-tabocal.mjs em 2026-05-22T00:28:23.501Z
// Pesos do IRC-Tabocal calibrados por:
//   - Grid search (n=1009 combinações)
//   - Otimização contínua (gradiente projetado, 200 iter)
//   - Ensemble (média grid + contínuo)
//   - Regularização 60/40 (ensemble/uniforme)
// Validação:
//   - LOO CV: ρ = 0.8675
//   - Block CV temporal (treino ≤2023, teste ≥2024): ρ = 0.7818
// Robustez:
//   - Block bootstrap n=500 (autocorrelação anual)
//   - Drop-one análise (sensibilidade)

export const PESOS_IRC_TABOCAL_CALIBRADOS = {
  calado_tabocal:  0.41,
  hmm_extremo:     0.11,
  onda_branco:     0.11,
  anomalia_pp:     0.26,
  lag_operacional: 0.11,
} as const;

export const IRC_TABOCAL_CALIBRACAO = {
  n_eventos:         21,
  data_calibracao:   "2026-05-22",

  // Métricas in-sample
  rho_spearman_in:   0.8494,
  pearson_in:        0.8721,
  rmse_in:           19.01,
  auc_discriminacao: 1,

  // Validação out-of-sample
  rho_spearman_loo:        0.8675,
  rho_spearman_temporal:   0.7818,

  // Bootstrap IC80 dos pesos
  bootstrap: {
    n_amostras: 500,
    calado_tabocal:  { mediana: 0.6, ic80: [0.3, 0.6] },
    hmm_extremo:     { mediana: 0.05, ic80: [0.05, 0.15] },
    onda_branco:     { mediana: 0.05, ic80: [0.05, 0.15] },
    anomalia_pp:     { mediana: 0.25, ic80: [0.15, 0.25] },
    lag_operacional: { mediana: 0.05, ic80: [0.05, 0.15] },
  },

  // Comparação com baselines
  baselines: {
    rho_uniforme:    0.7182,   // todos pesos iguais (0.2)
    rho_so_calado:   0.7273,   // só componente calado_tabocal
  },
} as const;
