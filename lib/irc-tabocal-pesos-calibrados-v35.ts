// AUTO-GERADO por scripts/calibra-irc-v35.mjs em 2026-05-22T15:39:35.204Z
// SEED: 42 · GIT: b77f6a4 (dirty)
//
// Calibração v3.5 do IRC-Tabocal com TODAS as correções da auditoria:
//   • Rótulos EXTERNOS (P_DOY de MAO+HUM+CUR, não cota_ITA) → label leakage eliminado
//   • Hold-out temporal (treino ≤2022, teste 2023+) → lookahead bias eliminado
//   • Seed PRNG Mulberry32 → bootstrap reproduzível
//   • Lag ortogonalizado (resíduo MAO~ITA) → multicolinearidade eliminada
//   • Não-compensação (max(linear, piso_dominador)) → calado severo não mascarável
//   • Permutation test → p-valor sob H0 reportado
//
// Performance honesta:
//   ρ_train (≤2022, n=84): 0.0776
//   ρ_test  (≥2023, n=28):  0.5816
//   p-valor (perm n=2000):          0.2459

export const PESOS_IRC_TABOCAL_V35 = {
  calado_tabocal:  0.579,
  hmm_extremo:     0.134,
  onda_branco:     0.1,
  anomalia_pp:     0.1,
  lag_operacional: 0.087,
} as const;

/** SHA-256 dos pesos (primeiros 16 chars). Identifica unicamente esta calibração. */
export const PESOS_IRC_TABOCAL_V35_HASH = "3e5370fe129c4491";

export const CALIBRACAO_IRC_V35 = {
  metodologia:        "rótulos externos + hold-out temporal + seed PRNG + lag ortogonal + não-compensação + permutation test",
  n_treino:           84,
  n_teste:            28,
  rho_train:          0.0776,
  rho_test:           0.5816,
  ratio_train_test:   0.13,
  p_valor_perm:       0.2459,
  n_permutacoes:      2000,
  n_bootstrap:        500,
  alpha_regularizacao: 0.7,
  ic80_pesos: {
    calado : { p10: 0.00, p50: 0.20, p90: 0.70 },
    hmm    : { p10: 0.10, p50: 0.60, p90: 0.70 },
    onda   : { p10: 0.10, p50: 0.10, p90: 0.10 },
    pp     : { p10: 0.10, p50: 0.10, p90: 0.10 },
    lag    : { p10: 0.00, p50: 0.00, p90: 0.10 },
  },
  seed:               42,
  gerado_em:          "2026-05-22T15:39:35.204Z",
  git_sha:            "b77f6a4f724bb4a3f081fe1d832a53980ef2791f",
  git_dirty:          true,
} as const;
