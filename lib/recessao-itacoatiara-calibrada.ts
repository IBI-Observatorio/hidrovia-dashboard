// AUTO-GERADO por scripts/calibra-recessao-itacoatiara.mjs em 2026-05-22T13:05:45.490Z
// SEED: 42 · GIT: b77f6a4 (dirty) · reprodutível.
//
// Calibração v3.4 — Modelo de recessão pós-pico de Itacoatiara (16030000).
//
// Correções da auditoria estatística:
//   • Série diária COMPLETA 2016-2025 (itacoatiara_hidroweb.csv, ~3650 obs)
//   • Matriz de covariância Σ(k, h_min) + Cholesky para amostragem MVN
//   • Inclui 2024 (mega-seca, marcado como outlier) e 2025 no ajuste
//   • ρ(k, h_min) reportado: -0.199
//
// Modelo: h(t) = h_min + (h_pico - h_min) * exp(-k * t)
// NÃO EDITAR À MÃO — rode 'node scripts/calibra-recessao-itacoatiara.mjs'.

export interface AjusteRecessaoItacoatiara {
  ano:               number;
  pico_data:         string;
  pico_cota_m:       number;
  k:                 number;
  h_min:             number;
  h_pico_ajustado:   number;
  h_pico_observado:  number;
  rmse_m:            number;
  n_obs:             number;
  /** true se ano atípico (ex: 2024 mega-seca) */
  outlier:           boolean;
}

export const RECESSAO_ITACOATIARA_CALIBRADA = {
  // Médias dos 10 anos (incluindo outliers)
  k_medio:         0.012895,
  k_sigma:         0.002680,
  h_min_medio:     3.58,
  h_min_sigma:     1.908,
  rmse_medio_m:    2.263,

  // Correlação e covariância (k, h_min)
  rho_k_hmin:      -0.1989,
  cov_k_hmin:      -1.016930e-3,

  // Cholesky de Σ — uso: amostrar MVN com randMvn2(rng, [k_medio, h_min_medio], L)
  cholesky_L:      [2.680467e-3, -3.793854e-1, 1.869774e+0] as readonly [number, number, number],

  anos:            [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  n_anos:          10,

  k_min:           0.008465,
  k_max:           0.016756,
  h_min_min:       -0.17,
  h_min_max:       5.84,

  minima_historica: { data: "2024-10-31", cota_m: -0.17 },

  ajustes_por_ano: [
  {
    "ano": 2016,
    "pico_data": "2016-06-13",
    "pico_cota_m": 12.52,
    "k": 0.015793,
    "h_min": 4.22,
    "h_pico_ajustado": 15.59,
    "h_pico_observado": 12.52,
    "rmse_m": 1.588,
    "n_obs": 216,
    "outlier": false
  },
  {
    "ano": 2017,
    "pico_data": "2017-05-15",
    "pico_cota_m": 14.36,
    "k": 0.016756,
    "h_min": 4.32,
    "h_pico_ajustado": 22.31,
    "h_pico_observado": 14.36,
    "rmse_m": 2.543,
    "n_obs": 216,
    "outlier": false
  },
  {
    "ano": 2018,
    "pico_data": "2018-06-19",
    "pico_cota_m": 13.72,
    "k": 0.008465,
    "h_min": 3.9,
    "h_pico_ajustado": 13.11,
    "h_pico_observado": 13.72,
    "rmse_m": 2.35,
    "n_obs": 216,
    "outlier": false
  },
  {
    "ano": 2019,
    "pico_data": "2019-06-18",
    "pico_cota_m": 14.65,
    "k": 0.00927,
    "h_min": 5,
    "h_pico_ajustado": 13.58,
    "h_pico_observado": 14.65,
    "rmse_m": 2.186,
    "n_obs": 216,
    "outlier": false
  },
  {
    "ano": 2020,
    "pico_data": "2020-06-10",
    "pico_cota_m": 13.96,
    "k": 0.013465,
    "h_min": 3.47,
    "h_pico_ajustado": 15.26,
    "h_pico_observado": 13.96,
    "rmse_m": 2.237,
    "n_obs": 216,
    "outlier": false
  },
  {
    "ano": 2021,
    "pico_data": "2021-05-31",
    "pico_cota_m": 15.2,
    "k": 0.012936,
    "h_min": 5.84,
    "h_pico_ajustado": 18.94,
    "h_pico_observado": 15.2,
    "rmse_m": 1.77,
    "n_obs": 216,
    "outlier": false
  },
  {
    "ano": 2022,
    "pico_data": "2022-06-06",
    "pico_cota_m": 14.79,
    "k": 0.012766,
    "h_min": 3.36,
    "h_pico_ajustado": 19.34,
    "h_pico_observado": 14.79,
    "rmse_m": 2.006,
    "n_obs": 216,
    "outlier": false
  },
  {
    "ano": 2023,
    "pico_data": "2023-05-29",
    "pico_cota_m": 13.77,
    "k": 0.01635,
    "h_min": 0.36,
    "h_pico_ajustado": 22.11,
    "h_pico_observado": 13.77,
    "rmse_m": 3.097,
    "n_obs": 216,
    "outlier": false
  },
  {
    "ano": 2024,
    "pico_data": "2024-06-10",
    "pico_cota_m": 12.35,
    "k": 0.011513,
    "h_min": -0.17,
    "h_pico_ajustado": 10.51,
    "h_pico_observado": 12.35,
    "rmse_m": 3.157,
    "n_obs": 216,
    "outlier": true
  },
  {
    "ano": 2025,
    "pico_data": "2025-06-19",
    "pico_cota_m": 14.44,
    "k": 0.011635,
    "h_min": 5.51,
    "h_pico_ajustado": 15.47,
    "h_pico_observado": 14.44,
    "rmse_m": 1.694,
    "n_obs": 216,
    "outlier": false
  }
] as AjusteRecessaoItacoatiara[],
  seed:            42,
  gerado_em:       "2026-05-22T13:05:45.490Z",
  git_sha:         "b77f6a4f724bb4a3f081fe1d832a53980ef2791f",
  git_dirty:       true,
} as const;
