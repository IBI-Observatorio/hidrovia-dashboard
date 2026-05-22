// AUTO-GERADO por scripts/calibra-irc-v36-antaq.mjs em 2026-05-22T15:53:33.657Z
// SEED: 42 · GIT: b77f6a4 (dirty)
//
// Calibração v3.6 do IRC-Tabocal contra RÓTULOS OPERACIONAIS ANTAQ.
//
// MUDANÇA-CHAVE vs v3.5: severidade externa derivada de tonelagem efetivamente
// transportada nos 4 portos do cluster Tabocal (Manaus, Itacoatiara, Santarém,
// Itaituba), padronizada por resíduo de regressão temporal. Substitui rótulo
// hidrológico (P_DOY de cotas) que tinha causa comum com componentes do IRC.
//
// Performance:
//   ρ_train (≤2022, n=84): 0.0647
//   ρ_test  (≥2023, n=28):  0.3051
//   p-valor (perm n=2000):          0.2834
//
// Comparação contra sevOp:
//   Pesos v3.5 → ρ_train=-0.073, ρ_test=0.340
//   Pesos v3.6 → ρ_train=0.065, ρ_test=0.305

export const PESOS_IRC_TABOCAL_V36 = {
  calado_tabocal:  0.087,
  hmm_extremo:     0.087,
  onda_branco:     0.1,
  anomalia_pp:     0.1,
  lag_operacional: 0.626,
} as const;

export const PESOS_IRC_TABOCAL_V36_HASH = "01b2c0a791648c0c";

export const CALIBRACAO_IRC_V36 = {
  metodologia:        "Rótulos operacionais ANTAQ (anomalia de tonelagem nos 4 portos do cluster Tabocal, resíduo de regressão temporal)",
  n_treino:           84,
  n_teste:            28,
  rho_train:          0.0647,
  rho_test:           0.3051,
  p_valor_perm:       0.2834,
  n_permutacoes:      2000,
  alpha_regularizacao: 0.7,
  pesos_v35_aplicados_sevop: {
    rho_train: -0.0731,
    rho_test:  0.3398,
  },
  ganho_v36_vs_v35: {
    train: 0.1378,
    test:  -0.0347,
  },
  seed:               42,
  gerado_em:          "2026-05-22T15:53:33.658Z",
  git_sha:            "b77f6a4f724bb4a3f081fe1d832a53980ef2791f",
  git_dirty:          true,
} as const;
