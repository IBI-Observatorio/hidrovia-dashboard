// AUTO-GERADO por scripts/calibra-lag-ortogonal.mjs em 2026-05-22T14:03:15.559Z
// GIT: b77f6a4 (dirty)
//
// Calibração da regressão ITA = a + b·MAO usada para ORTOGONALIZAR o componente
// lag_operacional do IRC-Tabocal. O resíduo da regressão é, por construção OLS,
// ortogonal à cota MAO — e empiricamente próximo de ortogonal à cota ITA também
// (cor=9.43e-2).

export const LAG_ORTOGONAL_CALIBRADO = {
  // ITA_esperada = a + b·MAO
  a:                -10.7545,
  b:                0.8703,
  r2:               0.9911,
  rmse_m:           0.358,
  sd_residuos_m:    0.358,
  cor_residuo_ita:  9.433e-2,
  q05_residuo:      -0.48,
  q50_residuo:      -0.05,
  q95_residuo:      0.66,
  n_pares:          3404,
  gerado_em:        "2026-05-22T14:03:15.562Z",
  git_sha:          "b77f6a4f724bb4a3f081fe1d832a53980ef2791f",
  git_dirty:        true,
} as const;
