// AUTO-GERADO por scripts/calibra-recessao.mjs em 2026-05-21T18:42:23.085Z
// Calibração do modelo de recessão pós-pico de Manaus (14990000), baseada na
// coluna MAO de data/4estacoes_2016_2025.csv (anos 2016-2023).
//
// Modelo: h(t) = h_min + (h_pico - h_min) * exp(-k * t)
//   onde t = dias desde o pico de cheia
//
// NÃO EDITAR À MÃO — rode 'node scripts/calibra-recessao.mjs' para regenerar.

export interface AjusteRecessao {
  ano:               number;
  pico_data:         string;   // YYYY-MM-DD
  pico_cota_m:       number;
  k:                 number;
  h_min:             number;
  h_pico_ajustado:   number;
  h_pico_observado:  number;
  rmse_m:            number;
  n_obs:             number;
}

export const RECESSAO_CALIBRADA = {
  // Parâmetros agregados (uso primário pelo projetaRecessao)
  k_medio:         0.018340,
  k_sigma:         0.002729,
  h_min_medio:     16.82,
  rmse_medio_m:    2.611,

  // Anos cobertos pela calibração
  anos:            [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
  n_anos:          8,

  // Range observado de k (para banda IC80 dinâmica)
  k_min:           0.015067,
  k_max:           0.022003,

  // Ajustes por ano (debug, validação visual)
  ajustes_por_ano: [
  {
    "ano": 2016,
    "pico_data": "2016-06-15",
    "pico_cota_m": 27.19,
    "k": 0.021675,
    "h_min": 17.2,
    "h_pico_ajustado": 38.82,
    "h_pico_observado": 27.19,
    "rmse_m": 3.112,
    "n_obs": 185
  },
  {
    "ano": 2017,
    "pico_data": "2017-06-03",
    "pico_cota_m": 29,
    "k": 0.021364,
    "h_min": 17.34,
    "h_pico_ajustado": 38.28,
    "h_pico_observado": 29,
    "rmse_m": 3.038,
    "n_obs": 185
  },
  {
    "ano": 2018,
    "pico_data": "2018-06-23",
    "pico_cota_m": 28.38,
    "k": 0.015932,
    "h_min": 17.05,
    "h_pico_ajustado": 34.24,
    "h_pico_observado": 28.38,
    "rmse_m": 2.32,
    "n_obs": 184
  },
  {
    "ano": 2019,
    "pico_data": "2019-06-22",
    "pico_cota_m": 29.42,
    "k": 0.015067,
    "h_min": 18.06,
    "h_pico_ajustado": 32.57,
    "h_pico_observado": 29.42,
    "rmse_m": 2.064,
    "n_obs": 185
  },
  {
    "ano": 2020,
    "pico_data": "2020-06-18",
    "pico_cota_m": 28.52,
    "k": 0.022003,
    "h_min": 16.6,
    "h_pico_ajustado": 36.98,
    "h_pico_observado": 28.52,
    "rmse_m": 2.794,
    "n_obs": 185
  },
  {
    "ano": 2021,
    "pico_data": "2021-06-16",
    "pico_cota_m": 30.02,
    "k": 0.018091,
    "h_min": 19.44,
    "h_pico_ajustado": 37.01,
    "h_pico_observado": 30.02,
    "rmse_m": 2.221,
    "n_obs": 185
  },
  {
    "ano": 2022,
    "pico_data": "2022-06-22",
    "pico_cota_m": 29.75,
    "k": 0.015609,
    "h_min": 16.19,
    "h_pico_ajustado": 35.45,
    "h_pico_observado": 29.75,
    "rmse_m": 2.356,
    "n_obs": 185
  },
  {
    "ano": 2023,
    "pico_data": "2023-07-01",
    "pico_cota_m": 28.02,
    "k": 0.016982,
    "h_min": 12.7,
    "h_pico_ajustado": 29.72,
    "h_pico_observado": 28.02,
    "rmse_m": 2.985,
    "n_obs": 184
  }
] as AjusteRecessao[],
} as const;
