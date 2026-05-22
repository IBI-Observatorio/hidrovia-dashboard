// AUTO-GERADO por scripts/rotula-eventos-tabocal-externo.mjs em 2026-05-22T14:01:24.490Z
// GIT: b77f6a4 (dirty)
//
// Severidade EXTERNA dos eventos âncora, derivada de percentil DOY de cotas
// Manaus + Humaita + Curicuriari — INDEPENDENTES de cota Itacoatiara que entra
// no componente calado_tabocal do IRC.
//
// Concordância exata com rotulagem subjetiva original: 25%
// Concordância ±1 nível:                              63%
// Spearman ρ(obs, ext):                                0.650

export interface SeveridadeExternaEvento {
  /** Data ISO do evento */
  data: string;
  /** Severidade original (subjetiva, baseada em cota ITA) */
  severidade_observada: number;
  /** Severidade externa (derivada de P_DOY de MAO+HUM+CUR) */
  severidade_externa: number | null;
  /** Percentis DOY individuais */
  p_mao: number | null;
  p_hum: number | null;
  p_cur: number | null;
  /** Percentil mediano (referência) */
  p_mediano: number | null;
  /** Quantas estações cobertas (max 3) */
  cobertura: number;
}

export const SEVERIDADE_EXTERNA: SeveridadeExternaEvento[] = [
  {
    "data": "2024-10-31",
    "severidade_observada": 5,
    "severidade_externa": 5,
    "p_mao": 0.007,
    "p_hum": 0.047,
    "p_cur": 0.17,
    "p_mediano": 0.047,
    "cobertura": 3
  },
  {
    "data": "2024-10-13",
    "severidade_observada": 5,
    "severidade_externa": 5,
    "p_mao": 0.03,
    "p_hum": 0.007,
    "p_cur": 0.148,
    "p_mediano": 0.03,
    "cobertura": 3
  },
  {
    "data": "2010-11-15",
    "severidade_observada": 5,
    "severidade_externa": null,
    "p_mao": null,
    "p_hum": null,
    "p_cur": null,
    "p_mediano": null,
    "cobertura": 0
  },
  {
    "data": "2024-09-25",
    "severidade_observada": 4,
    "severidade_externa": 5,
    "p_mao": 0.052,
    "p_hum": 0,
    "p_cur": 0.074,
    "p_mediano": 0.052,
    "cobertura": 3
  },
  {
    "data": "2015-11-01",
    "severidade_observada": 4,
    "severidade_externa": null,
    "p_mao": null,
    "p_hum": null,
    "p_cur": null,
    "p_mediano": null,
    "cobertura": 0
  },
  {
    "data": "2023-10-31",
    "severidade_observada": 4,
    "severidade_externa": 5,
    "p_mao": 0.164,
    "p_hum": 0.148,
    "p_cur": 0.106,
    "p_mediano": 0.148,
    "cobertura": 3
  },
  {
    "data": "2024-11-15",
    "severidade_observada": 4,
    "severidade_externa": 5,
    "p_mao": 0.15,
    "p_hum": 0.047,
    "p_cur": 0.067,
    "p_mediano": 0.067,
    "cobertura": 3
  },
  {
    "data": "2022-09-15",
    "severidade_observada": 3,
    "severidade_externa": 2,
    "p_mao": 0.754,
    "p_hum": 0.141,
    "p_cur": 0.718,
    "p_mediano": 0.718,
    "cobertura": 3
  },
  {
    "data": "2017-10-15",
    "severidade_observada": 3,
    "severidade_externa": 2,
    "p_mao": 0.433,
    "p_hum": 0.705,
    "p_cur": 0.886,
    "p_mediano": 0.705,
    "cobertura": 3
  },
  {
    "data": "2014-11-10",
    "severidade_observada": 3,
    "severidade_externa": null,
    "p_mao": null,
    "p_hum": null,
    "p_cur": null,
    "p_mediano": null,
    "cobertura": 0
  },
  {
    "data": "2026-02-15",
    "severidade_observada": 3,
    "severidade_externa": null,
    "p_mao": null,
    "p_hum": null,
    "p_cur": null,
    "p_mediano": null,
    "cobertura": 0
  },
  {
    "data": "2024-08-15",
    "severidade_observada": 2,
    "severidade_externa": 5,
    "p_mao": 0.052,
    "p_hum": 0.04,
    "p_cur": 0.128,
    "p_mediano": 0.052,
    "cobertura": 3
  },
  {
    "data": "2026-05-19",
    "severidade_observada": 2,
    "severidade_externa": null,
    "p_mao": null,
    "p_hum": null,
    "p_cur": null,
    "p_mediano": null,
    "cobertura": 0
  },
  {
    "data": "2024-04-15",
    "severidade_observada": 2,
    "severidade_externa": 5,
    "p_mao": 0.104,
    "p_hum": 0.047,
    "p_cur": 0.255,
    "p_mediano": 0.104,
    "cobertura": 3
  },
  {
    "data": "2023-07-15",
    "severidade_observada": 2,
    "severidade_externa": 4,
    "p_mao": 0.248,
    "p_hum": 0.403,
    "p_cur": 0.047,
    "p_mediano": 0.248,
    "cobertura": 3
  },
  {
    "data": "2024-12-15",
    "severidade_observada": 2,
    "severidade_externa": 5,
    "p_mao": 0.09,
    "p_hum": 0.503,
    "p_cur": 0.187,
    "p_mediano": 0.187,
    "cobertura": 3
  },
  {
    "data": "2025-04-15",
    "severidade_observada": 1,
    "severidade_externa": 1,
    "p_mao": 0.56,
    "p_hum": 0.98,
    "p_cur": 0.899,
    "p_mediano": 0.899,
    "cobertura": 3
  },
  {
    "data": "2021-06-16",
    "severidade_observada": 1,
    "severidade_externa": 1,
    "p_mao": 0.97,
    "p_hum": 0.671,
    "p_cur": 0.826,
    "p_mediano": 0.826,
    "cobertura": 3
  },
  {
    "data": "2020-05-15",
    "severidade_observada": 1,
    "severidade_externa": 4,
    "p_mao": 0.373,
    "p_hum": 0.349,
    "p_cur": 0.309,
    "p_mediano": 0.349,
    "cobertura": 3
  },
  {
    "data": "2019-06-22",
    "severidade_observada": 1,
    "severidade_externa": 2,
    "p_mao": 0.754,
    "p_hum": 0.805,
    "p_cur": 0.651,
    "p_mediano": 0.754,
    "cobertura": 3
  },
  {
    "data": "2016-07-15",
    "severidade_observada": 1,
    "severidade_externa": 4,
    "p_mao": 0.148,
    "p_hum": 0.228,
    "p_cur": 0.886,
    "p_mediano": 0.228,
    "cobertura": 3
  }
];

export const SEVERIDADE_EXTERNA_META = {
  metodologia:           "Percentil DOY (janela ±7d) de cota Manaus + Humaita + Curicuriari → mediana → escala 1-5 invertida",
  n_eventos:             21,
  n_cobertos:            16,
  concordancia_exata:    4,
  concordancia_dentro_1: 10,
  spearman_obs_vs_ext:   0.6498,
  gerado_em:             "2026-05-22T14:01:24.492Z",
  git_sha:               "b77f6a4f724bb4a3f081fe1d832a53980ef2791f",
  git_dirty:             true,
} as const;
