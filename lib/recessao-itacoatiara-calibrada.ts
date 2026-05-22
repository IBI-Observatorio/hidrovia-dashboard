// AUTO-GERADO por scripts/calibra-recessao-itacoatiara.mjs em 2026-05-22T00:00:57.120Z
// Calibração do modelo de recessão pós-pico de Itacoatiara (16030000).
// Ponto de controle REAL do calado operacional no canal Tabocal.
//
// Modelo: h(t) = h_min + (h_pico - h_min) * exp(-k * t)
//   t = dias desde o pico de cheia (abr-jul típico)
//
// Diferenças vs Manaus: pico mais cedo (mai-jun), h_min pode ser negativo
// (zero da régua é local), range total maior.
//
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
}

export const RECESSAO_ITACOATIARA_CALIBRADA = {
  k_medio:         0.012220,
  k_sigma:         0.003038,
  h_min_medio:     3.81,
  rmse_medio_m:    2.301,

  anos:            [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
  n_anos:          8,

  k_min:           0.008302,
  k_max:           0.016756,
  h_min_min:       0.36,
  h_min_max:       5.84,

  // Mínima histórica observada (referência para gatilho operacional Tabocal)
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
    "n_obs": 216
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
    "n_obs": 216
  },
  {
    "ano": 2018,
    "pico_data": "2018-06-19",
    "pico_cota_m": 13.72,
    "k": 0.00847,
    "h_min": 3.9,
    "h_pico_ajustado": 13.11,
    "h_pico_observado": 13.72,
    "rmse_m": 2.356,
    "n_obs": 215
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
    "n_obs": 216
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
    "n_obs": 216
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
    "n_obs": 216
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
    "n_obs": 216
  },
  {
    "ano": 2023,
    "pico_data": "2023-07-01",
    "pico_cota_m": 13.42,
    "k": 0.008302,
    "h_min": 0.36,
    "h_pico_ajustado": 8.61,
    "h_pico_observado": 13.42,
    "rmse_m": 3.726,
    "n_obs": 214
  }
] as AjusteRecessaoItacoatiara[],
} as const;
