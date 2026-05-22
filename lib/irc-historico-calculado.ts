// AUTO-GERADO por scripts/gera-irc-historico.mjs em 2026-05-22T14:13:21.832Z
// GIT: b77f6a4 (dirty)
//
// Série histórica do IRC-Tabocal v3.5 calculada RETROATIVAMENTE.
//
// CORREÇÃO DA AUDITORIA (v3.5 vs v3.3): esta série agora usa a MESMA fórmula
// do produto v3.5 (calculaIRCTabocal com 5 componentes + não-compensação).
// A versão anterior usava IRC v2.1 (LWS+HMM apenas) e era INCONSISTENTE com
// o número exibido na API.
//
// Limitações honestas:
//   • onda_branco fixado em 0 (série Caracaraí diária histórica não consolidada)
//   • anomalia_pp fixado em 0 (parser SGB não retrocede a 2016)
//   • Esses componentes contribuem apenas no IRC ATUAL (não retrospectivo).
//   • IRC retroativo ≈ pesos_calado·c_calado + pesos_hmm·c_hmm + pesos_lag·c_lag
//     (onda e pp pesam 0 efetivamente nesta série, mas SOMA dos pesos ainda é 1).

export interface PontoIRC {
  data:           string;
  irc:            number;
  faixa:          "verde" | "amarelo" | "laranja" | "vermelho";
  idn:            number;
  cota_manaus_m:  number;
  cota_ita_m:     number;
}

export const IRC_HISTORICO_CALCULADO: PontoIRC[] = [
  {
    "data": "2016-01-07",
    "irc": 10,
    "faixa": "verde",
    "idn": 0.206,
    "cota_manaus_m": 18.12,
    "cota_ita_m": 4.95
  },
  {
    "data": "2016-01-14",
    "irc": 9,
    "faixa": "verde",
    "idn": 0.074,
    "cota_manaus_m": 18.92,
    "cota_ita_m": 5.66
  },
  {
    "data": "2016-01-21",
    "irc": 2.8,
    "faixa": "verde",
    "idn": 0.218,
    "cota_manaus_m": 19.61,
    "cota_ita_m": 6.28
  },
  {
    "data": "2016-01-28",
    "irc": 13.9,
    "faixa": "verde",
    "idn": 0.303,
    "cota_manaus_m": 20.11,
    "cota_ita_m": 6.73
  },
  {
    "data": "2016-02-04",
    "irc": 2.5,
    "faixa": "verde",
    "idn": 0.112,
    "cota_manaus_m": 20.13,
    "cota_ita_m": 6.81
  },
  {
    "data": "2016-02-11",
    "irc": 2.2,
    "faixa": "verde",
    "idn": 0.136,
    "cota_manaus_m": 19.95,
    "cota_ita_m": 6.79
  },
  {
    "data": "2016-02-18",
    "irc": 1.7,
    "faixa": "verde",
    "idn": 0.169,
    "cota_manaus_m": 19.68,
    "cota_ita_m": 6.8
  },
  {
    "data": "2016-02-25",
    "irc": 1.8,
    "faixa": "verde",
    "idn": -0.068,
    "cota_manaus_m": 19.63,
    "cota_ita_m": 6.73
  },
  {
    "data": "2016-03-03",
    "irc": 13.6,
    "faixa": "verde",
    "idn": -0.269,
    "cota_manaus_m": 20.16,
    "cota_ita_m": 7.2
  },
  {
    "data": "2016-03-10",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.308,
    "cota_manaus_m": 21.04,
    "cota_ita_m": 7.93
  },
  {
    "data": "2016-03-17",
    "irc": 1.6,
    "faixa": "verde",
    "idn": -0.095,
    "cota_manaus_m": 21.95,
    "cota_ita_m": 8.84
  },
  {
    "data": "2016-03-24",
    "irc": 1.6,
    "faixa": "verde",
    "idn": -0.157,
    "cota_manaus_m": 22.64,
    "cota_ita_m": 9.46
  },
  {
    "data": "2016-03-31",
    "irc": 13.4,
    "faixa": "verde",
    "idn": -0.179,
    "cota_manaus_m": 23.3,
    "cota_ita_m": 10.03
  },
  {
    "data": "2016-04-07",
    "irc": 1.2,
    "faixa": "verde",
    "idn": -0.139,
    "cota_manaus_m": 23.68,
    "cota_ita_m": 10.54
  },
  {
    "data": "2016-04-14",
    "irc": 13.5,
    "faixa": "verde",
    "idn": -0.348,
    "cota_manaus_m": 24.41,
    "cota_ita_m": 10.96
  },
  {
    "data": "2016-04-21",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.344,
    "cota_manaus_m": 24.86,
    "cota_ita_m": 11.23
  },
  {
    "data": "2016-04-28",
    "irc": 14,
    "faixa": "verde",
    "idn": -0.175,
    "cota_manaus_m": 25.3,
    "cota_ita_m": 11.5
  },
  {
    "data": "2016-05-05",
    "irc": 2.3,
    "faixa": "verde",
    "idn": -0.159,
    "cota_manaus_m": 25.8,
    "cota_ita_m": 11.83
  },
  {
    "data": "2016-05-12",
    "irc": 14.5,
    "faixa": "verde",
    "idn": -0.308,
    "cota_manaus_m": 26.29,
    "cota_ita_m": 12.11
  },
  {
    "data": "2016-05-19",
    "irc": 14.7,
    "faixa": "verde",
    "idn": -0.292,
    "cota_manaus_m": 26.61,
    "cota_ita_m": 12.3
  },
  {
    "data": "2016-05-26",
    "irc": 3,
    "faixa": "verde",
    "idn": -0.07,
    "cota_manaus_m": 26.85,
    "cota_ita_m": 12.43
  },
  {
    "data": "2016-06-02",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.205,
    "cota_manaus_m": 27.01,
    "cota_ita_m": 12.49
  },
  {
    "data": "2016-06-09",
    "irc": 15.1,
    "faixa": "verde",
    "idn": -0.447,
    "cota_manaus_m": 27.11,
    "cota_ita_m": 12.5
  },
  {
    "data": "2016-06-16",
    "irc": 15.2,
    "faixa": "verde",
    "idn": -0.365,
    "cota_manaus_m": 27.19,
    "cota_ita_m": 12.52
  },
  {
    "data": "2016-06-23",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.439,
    "cota_manaus_m": 27.17,
    "cota_ita_m": 12.48
  },
  {
    "data": "2016-06-30",
    "irc": 15.4,
    "faixa": "verde",
    "idn": -0.518,
    "cota_manaus_m": 27.18,
    "cota_ita_m": 12.43
  },
  {
    "data": "2016-07-07",
    "irc": 15.5,
    "faixa": "verde",
    "idn": -0.464,
    "cota_manaus_m": 27.11,
    "cota_ita_m": 12.32
  },
  {
    "data": "2016-07-14",
    "irc": 15.6,
    "faixa": "verde",
    "idn": -0.674,
    "cota_manaus_m": 27.02,
    "cota_ita_m": 12.2
  },
  {
    "data": "2016-07-21",
    "irc": 15.7,
    "faixa": "verde",
    "idn": -0.619,
    "cota_manaus_m": 26.85,
    "cota_ita_m": 12.02
  },
  {
    "data": "2016-07-28",
    "irc": 15.7,
    "faixa": "verde",
    "idn": -0.746,
    "cota_manaus_m": 26.72,
    "cota_ita_m": 11.89
  },
  {
    "data": "2016-08-04",
    "irc": 15.8,
    "faixa": "verde",
    "idn": -0.845,
    "cota_manaus_m": 26.46,
    "cota_ita_m": 11.6
  },
  {
    "data": "2016-08-11",
    "irc": 15.8,
    "faixa": "verde",
    "idn": -0.778,
    "cota_manaus_m": 26.1,
    "cota_ita_m": 11.29
  },
  {
    "data": "2016-08-18",
    "irc": 15.8,
    "faixa": "verde",
    "idn": -0.675,
    "cota_manaus_m": 25.69,
    "cota_ita_m": 10.94
  },
  {
    "data": "2016-08-25",
    "irc": 15.7,
    "faixa": "verde",
    "idn": -0.381,
    "cota_manaus_m": 25.13,
    "cota_ita_m": 10.49
  },
  {
    "data": "2016-09-01",
    "irc": 15.6,
    "faixa": "verde",
    "idn": -0.378,
    "cota_manaus_m": 24.38,
    "cota_ita_m": 9.9
  },
  {
    "data": "2016-09-08",
    "irc": 15.4,
    "faixa": "verde",
    "idn": -0.246,
    "cota_manaus_m": 23.43,
    "cota_ita_m": 9.16
  },
  {
    "data": "2016-09-15",
    "irc": 3.4,
    "faixa": "verde",
    "idn": -0.129,
    "cota_manaus_m": 22.22,
    "cota_ita_m": 8.17
  },
  {
    "data": "2016-09-22",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.34,
    "cota_manaus_m": 20.8,
    "cota_ita_m": 7.18
  },
  {
    "data": "2016-09-29",
    "irc": 16.5,
    "faixa": "verde",
    "idn": -0.321,
    "cota_manaus_m": 19.57,
    "cota_ita_m": 6.14
  },
  {
    "data": "2016-10-06",
    "irc": 22.2,
    "faixa": "amarelo",
    "idn": -0.199,
    "cota_manaus_m": 18.74,
    "cota_ita_m": 5.3
  },
  {
    "data": "2016-10-13",
    "irc": 22.4,
    "faixa": "amarelo",
    "idn": -0.208,
    "cota_manaus_m": 18.34,
    "cota_ita_m": 4.85
  },
  {
    "data": "2016-10-20",
    "irc": 22.3,
    "faixa": "amarelo",
    "idn": -0.256,
    "cota_manaus_m": 18.16,
    "cota_ita_m": 4.76
  },
  {
    "data": "2016-10-27",
    "irc": 10.7,
    "faixa": "verde",
    "idn": -0.088,
    "cota_manaus_m": 18.2,
    "cota_ita_m": 4.68
  },
  {
    "data": "2016-11-03",
    "irc": 22.5,
    "faixa": "amarelo",
    "idn": -0.178,
    "cota_manaus_m": 18.32,
    "cota_ita_m": 4.8
  },
  {
    "data": "2016-11-10",
    "irc": 10.6,
    "faixa": "verde",
    "idn": -0.013,
    "cota_manaus_m": 18.25,
    "cota_ita_m": 4.78
  },
  {
    "data": "2016-11-17",
    "irc": 10.4,
    "faixa": "verde",
    "idn": 0.105,
    "cota_manaus_m": 18.05,
    "cota_ita_m": 4.69
  },
  {
    "data": "2016-11-24",
    "irc": 10.1,
    "faixa": "verde",
    "idn": 0.188,
    "cota_manaus_m": 17.82,
    "cota_ita_m": 4.62
  },
  {
    "data": "2016-12-01",
    "irc": 10.8,
    "faixa": "verde",
    "idn": -0.094,
    "cota_manaus_m": 17.74,
    "cota_ita_m": 4.56
  },
  {
    "data": "2016-12-08",
    "irc": 25.5,
    "faixa": "vermelho",
    "idn": -0.215,
    "cota_manaus_m": 17.39,
    "cota_ita_m": 4.34
  },
  {
    "data": "2016-12-15",
    "irc": 26.7,
    "faixa": "vermelho",
    "idn": -0.202,
    "cota_manaus_m": 17.2,
    "cota_ita_m": 4.25
  },
  {
    "data": "2016-12-22",
    "irc": 21.1,
    "faixa": "amarelo",
    "idn": -0.295,
    "cota_manaus_m": 17.6,
    "cota_ita_m": 4.86
  },
  {
    "data": "2016-12-29",
    "irc": 18.7,
    "faixa": "verde",
    "idn": -0.566,
    "cota_manaus_m": 18.81,
    "cota_ita_m": 5.83
  },
  {
    "data": "2017-01-05",
    "irc": 14.2,
    "faixa": "verde",
    "idn": -0.666,
    "cota_manaus_m": 20.25,
    "cota_ita_m": 6.99
  },
  {
    "data": "2017-01-12",
    "irc": 14.4,
    "faixa": "verde",
    "idn": -0.663,
    "cota_manaus_m": 21.42,
    "cota_ita_m": 7.9
  },
  {
    "data": "2017-01-19",
    "irc": 14.5,
    "faixa": "verde",
    "idn": -0.522,
    "cota_manaus_m": 22.48,
    "cota_ita_m": 8.8
  },
  {
    "data": "2017-01-26",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.407,
    "cota_manaus_m": 23.39,
    "cota_ita_m": 9.43
  },
  {
    "data": "2017-02-02",
    "irc": 14.6,
    "faixa": "verde",
    "idn": -0.21,
    "cota_manaus_m": 24.15,
    "cota_ita_m": 10.21
  },
  {
    "data": "2017-02-09",
    "irc": 14.2,
    "faixa": "verde",
    "idn": -0.435,
    "cota_manaus_m": 24.7,
    "cota_ita_m": 10.85
  },
  {
    "data": "2017-02-16",
    "irc": 14.3,
    "faixa": "verde",
    "idn": -0.505,
    "cota_manaus_m": 25.05,
    "cota_ita_m": 11.12
  },
  {
    "data": "2017-02-23",
    "irc": 14.1,
    "faixa": "verde",
    "idn": -0.194,
    "cota_manaus_m": 25.38,
    "cota_ita_m": 11.5
  },
  {
    "data": "2017-03-02",
    "irc": 2.2,
    "faixa": "verde",
    "idn": -0.091,
    "cota_manaus_m": 25.72,
    "cota_ita_m": 11.85
  },
  {
    "data": "2017-03-09",
    "irc": 1.9,
    "faixa": "verde",
    "idn": -0.135,
    "cota_manaus_m": 26.03,
    "cota_ita_m": 12.26
  },
  {
    "data": "2017-03-16",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.437,
    "cota_manaus_m": 26.39,
    "cota_ita_m": 12.6
  },
  {
    "data": "2017-03-23",
    "irc": 13.8,
    "faixa": "verde",
    "idn": -0.527,
    "cota_manaus_m": 26.84,
    "cota_ita_m": 12.94
  },
  {
    "data": "2017-03-30",
    "irc": 13.8,
    "faixa": "verde",
    "idn": -0.388,
    "cota_manaus_m": 27.19,
    "cota_ita_m": 13.22
  },
  {
    "data": "2017-04-06",
    "irc": 13.9,
    "faixa": "verde",
    "idn": -0.226,
    "cota_manaus_m": 27.59,
    "cota_ita_m": 13.53
  },
  {
    "data": "2017-04-13",
    "irc": 2.1,
    "faixa": "verde",
    "idn": 0.106,
    "cota_manaus_m": 27.82,
    "cota_ita_m": 13.7
  },
  {
    "data": "2017-04-20",
    "irc": 2,
    "faixa": "verde",
    "idn": 0.177,
    "cota_manaus_m": 27.95,
    "cota_ita_m": 13.87
  },
  {
    "data": "2017-04-27",
    "irc": 2.1,
    "faixa": "verde",
    "idn": 0.074,
    "cota_manaus_m": 28.16,
    "cota_ita_m": 14.02
  },
  {
    "data": "2017-05-04",
    "irc": 13.4,
    "faixa": "verde",
    "idn": 0.414,
    "cota_manaus_m": 28.43,
    "cota_ita_m": 14.19
  },
  {
    "data": "2017-05-11",
    "irc": 13.6,
    "faixa": "verde",
    "idn": 0.263,
    "cota_manaus_m": 28.65,
    "cota_ita_m": 14.32
  },
  {
    "data": "2017-05-18",
    "irc": 2.5,
    "faixa": "verde",
    "idn": -0.023,
    "cota_manaus_m": 28.81,
    "cota_ita_m": 14.36
  },
  {
    "data": "2017-05-25",
    "irc": 14,
    "faixa": "verde",
    "idn": 0.255,
    "cota_manaus_m": 28.91,
    "cota_ita_m": 14.34
  },
  {
    "data": "2017-06-01",
    "irc": 14.1,
    "faixa": "verde",
    "idn": 0.575,
    "cota_manaus_m": 28.97,
    "cota_ita_m": 14.32
  },
  {
    "data": "2017-06-08",
    "irc": 14.1,
    "faixa": "verde",
    "idn": 0.72,
    "cota_manaus_m": 28.96,
    "cota_ita_m": 14.3
  },
  {
    "data": "2017-06-15",
    "irc": 14.2,
    "faixa": "verde",
    "idn": 0.621,
    "cota_manaus_m": 28.85,
    "cota_ita_m": 14.17
  },
  {
    "data": "2017-06-22",
    "irc": 14.3,
    "faixa": "verde",
    "idn": 0.712,
    "cota_manaus_m": 28.7,
    "cota_ita_m": 13.98
  },
  {
    "data": "2017-06-29",
    "irc": 14.4,
    "faixa": "verde",
    "idn": 0.603,
    "cota_manaus_m": 28.59,
    "cota_ita_m": 13.86
  },
  {
    "data": "2017-07-06",
    "irc": 14.5,
    "faixa": "verde",
    "idn": 0.328,
    "cota_manaus_m": 28.48,
    "cota_ita_m": 13.7
  },
  {
    "data": "2017-07-13",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.093,
    "cota_manaus_m": 28.31,
    "cota_ita_m": 13.51
  },
  {
    "data": "2017-07-20",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.126,
    "cota_manaus_m": 28.08,
    "cota_ita_m": 13.27
  },
  {
    "data": "2017-07-27",
    "irc": 14.8,
    "faixa": "verde",
    "idn": 0.278,
    "cota_manaus_m": 27.79,
    "cota_ita_m": 12.97
  },
  {
    "data": "2017-08-03",
    "irc": 3.5,
    "faixa": "verde",
    "idn": 0.167,
    "cota_manaus_m": 27.4,
    "cota_ita_m": 12.65
  },
  {
    "data": "2017-08-10",
    "irc": 4.1,
    "faixa": "verde",
    "idn": 0.003,
    "cota_manaus_m": 27.14,
    "cota_ita_m": 12.14
  },
  {
    "data": "2017-08-17",
    "irc": 3.3,
    "faixa": "verde",
    "idn": 0.086,
    "cota_manaus_m": 26.18,
    "cota_ita_m": 11.67
  },
  {
    "data": "2017-08-24",
    "irc": 3.2,
    "faixa": "verde",
    "idn": 0.243,
    "cota_manaus_m": 25.19,
    "cota_ita_m": 10.86
  },
  {
    "data": "2017-08-31",
    "irc": 14.2,
    "faixa": "verde",
    "idn": 0.568,
    "cota_manaus_m": 23.83,
    "cota_ita_m": 9.82
  },
  {
    "data": "2017-09-07",
    "irc": 13.9,
    "faixa": "verde",
    "idn": 0.269,
    "cota_manaus_m": 22.14,
    "cota_ita_m": 8.49
  },
  {
    "data": "2017-09-14",
    "irc": 2.7,
    "faixa": "verde",
    "idn": 0.077,
    "cota_manaus_m": 20.5,
    "cota_ita_m": 7.06
  },
  {
    "data": "2017-09-21",
    "irc": 17.2,
    "faixa": "verde",
    "idn": 0.339,
    "cota_manaus_m": 19.21,
    "cota_ita_m": 5.95
  },
  {
    "data": "2017-09-28",
    "irc": 21,
    "faixa": "amarelo",
    "idn": 0.352,
    "cota_manaus_m": 18.14,
    "cota_ita_m": 5.05
  },
  {
    "data": "2017-10-05",
    "irc": 13.3,
    "faixa": "verde",
    "idn": 0.028,
    "cota_manaus_m": 17.39,
    "cota_ita_m": 4.35
  },
  {
    "data": "2017-10-12",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.158,
    "cota_manaus_m": 17.43,
    "cota_ita_m": 4.34
  },
  {
    "data": "2017-10-19",
    "irc": 23.8,
    "faixa": "amarelo",
    "idn": -0.465,
    "cota_manaus_m": 17.68,
    "cota_ita_m": 4.4
  },
  {
    "data": "2017-10-26",
    "irc": 23.9,
    "faixa": "amarelo",
    "idn": -0.345,
    "cota_manaus_m": 17.77,
    "cota_ita_m": 4.44
  },
  {
    "data": "2017-11-02",
    "irc": 25.8,
    "faixa": "vermelho",
    "idn": -0.322,
    "cota_manaus_m": 17.79,
    "cota_ita_m": 4.35
  },
  {
    "data": "2017-11-09",
    "irc": 10.5,
    "faixa": "verde",
    "idn": -0.152,
    "cota_manaus_m": 18.17,
    "cota_ita_m": 4.75
  },
  {
    "data": "2017-11-16",
    "irc": 10.5,
    "faixa": "verde",
    "idn": 0.095,
    "cota_manaus_m": 18.66,
    "cota_ita_m": 5.17
  },
  {
    "data": "2017-11-23",
    "irc": 21.4,
    "faixa": "amarelo",
    "idn": 0.261,
    "cota_manaus_m": 18.96,
    "cota_ita_m": 5.54
  },
  {
    "data": "2017-11-30",
    "irc": 19.1,
    "faixa": "verde",
    "idn": 0.423,
    "cota_manaus_m": 19.27,
    "cota_ita_m": 5.8
  },
  {
    "data": "2017-12-07",
    "irc": 16.4,
    "faixa": "verde",
    "idn": 0.519,
    "cota_manaus_m": 19.38,
    "cota_ita_m": 6.02
  },
  {
    "data": "2017-12-14",
    "irc": 14.6,
    "faixa": "verde",
    "idn": 0.594,
    "cota_manaus_m": 19.43,
    "cota_ita_m": 6.19
  },
  {
    "data": "2017-12-21",
    "irc": 13.7,
    "faixa": "verde",
    "idn": 0.607,
    "cota_manaus_m": 19.69,
    "cota_ita_m": 6.47
  },
  {
    "data": "2017-12-28",
    "irc": 13.5,
    "faixa": "verde",
    "idn": 0.48,
    "cota_manaus_m": 20.24,
    "cota_ita_m": 7.01
  },
  {
    "data": "2018-01-04",
    "irc": 13.4,
    "faixa": "verde",
    "idn": 0.525,
    "cota_manaus_m": 20.87,
    "cota_ita_m": 7.61
  },
  {
    "data": "2018-01-11",
    "irc": 13.3,
    "faixa": "verde",
    "idn": 0.436,
    "cota_manaus_m": 21.41,
    "cota_ita_m": 8.16
  },
  {
    "data": "2018-01-18",
    "irc": 13.3,
    "faixa": "verde",
    "idn": 0.543,
    "cota_manaus_m": 21.86,
    "cota_ita_m": 8.55
  },
  {
    "data": "2018-01-25",
    "irc": 13.1,
    "faixa": "verde",
    "idn": 0.521,
    "cota_manaus_m": 22.21,
    "cota_ita_m": 8.96
  },
  {
    "data": "2018-02-01",
    "irc": 13,
    "faixa": "verde",
    "idn": 0.296,
    "cota_manaus_m": 22.61,
    "cota_ita_m": 9.33
  },
  {
    "data": "2018-02-08",
    "irc": 13,
    "faixa": "verde",
    "idn": 0.31,
    "cota_manaus_m": 23.1,
    "cota_ita_m": 9.78
  },
  {
    "data": "2018-02-15",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.519,
    "cota_manaus_m": 23.57,
    "cota_ita_m": 10.26
  },
  {
    "data": "2018-02-22",
    "irc": 12.6,
    "faixa": "verde",
    "idn": 0.59,
    "cota_manaus_m": 23.97,
    "cota_ita_m": 10.74
  },
  {
    "data": "2018-03-01",
    "irc": 12.5,
    "faixa": "verde",
    "idn": 0.619,
    "cota_manaus_m": 24.28,
    "cota_ita_m": 11.04
  },
  {
    "data": "2018-03-08",
    "irc": 12.5,
    "faixa": "verde",
    "idn": 0.716,
    "cota_manaus_m": 24.49,
    "cota_ita_m": 11.22
  },
  {
    "data": "2018-03-15",
    "irc": 12.4,
    "faixa": "verde",
    "idn": 0.731,
    "cota_manaus_m": 24.51,
    "cota_ita_m": 11.3
  },
  {
    "data": "2018-03-22",
    "irc": 12.3,
    "faixa": "verde",
    "idn": 0.871,
    "cota_manaus_m": 24.5,
    "cota_ita_m": 11.31
  },
  {
    "data": "2018-03-29",
    "irc": 12.1,
    "faixa": "verde",
    "idn": 0.897,
    "cota_manaus_m": 24.41,
    "cota_ita_m": 11.33
  },
  {
    "data": "2018-04-05",
    "irc": 12,
    "faixa": "verde",
    "idn": 0.576,
    "cota_manaus_m": 24.54,
    "cota_ita_m": 11.5
  },
  {
    "data": "2018-04-12",
    "irc": 12.2,
    "faixa": "verde",
    "idn": 0.487,
    "cota_manaus_m": 24.93,
    "cota_ita_m": 11.75
  },
  {
    "data": "2018-04-19",
    "irc": 12.3,
    "faixa": "verde",
    "idn": 0.52,
    "cota_manaus_m": 25.41,
    "cota_ita_m": 12.14
  },
  {
    "data": "2018-04-26",
    "irc": 12.4,
    "faixa": "verde",
    "idn": 0.52,
    "cota_manaus_m": 25.86,
    "cota_ita_m": 12.46
  },
  {
    "data": "2018-05-03",
    "irc": 12.7,
    "faixa": "verde",
    "idn": 0.283,
    "cota_manaus_m": 26.33,
    "cota_ita_m": 12.74
  },
  {
    "data": "2018-05-10",
    "irc": 1.9,
    "faixa": "verde",
    "idn": 0.038,
    "cota_manaus_m": 26.83,
    "cota_ita_m": 12.97
  },
  {
    "data": "2018-05-17",
    "irc": 2.2,
    "faixa": "verde",
    "idn": 0.038,
    "cota_manaus_m": 27.27,
    "cota_ita_m": 13.2
  },
  {
    "data": "2018-05-24",
    "irc": 2.4,
    "faixa": "verde",
    "idn": 0.1,
    "cota_manaus_m": 27.64,
    "cota_ita_m": 13.42
  },
  {
    "data": "2018-05-31",
    "irc": 2.5,
    "faixa": "verde",
    "idn": 0.078,
    "cota_manaus_m": 27.94,
    "cota_ita_m": 13.6
  },
  {
    "data": "2018-06-07",
    "irc": 2.7,
    "faixa": "verde",
    "idn": -0.043,
    "cota_manaus_m": 28.14,
    "cota_ita_m": 13.68
  },
  {
    "data": "2018-06-14",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.007,
    "cota_manaus_m": 28.26,
    "cota_ita_m": 13.69
  },
  {
    "data": "2018-06-21",
    "irc": 3,
    "faixa": "verde",
    "idn": -0.13,
    "cota_manaus_m": 28.36,
    "cota_ita_m": 13.72
  },
  {
    "data": "2018-06-28",
    "irc": 15.1,
    "faixa": "verde",
    "idn": -0.3,
    "cota_manaus_m": 28.37,
    "cota_ita_m": 13.62
  },
  {
    "data": "2018-07-05",
    "irc": 15.2,
    "faixa": "verde",
    "idn": -0.402,
    "cota_manaus_m": 28.29,
    "cota_ita_m": 13.52
  },
  {
    "data": "2018-07-12",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.443,
    "cota_manaus_m": 28.26,
    "cota_ita_m": 13.41
  },
  {
    "data": "2018-07-19",
    "irc": 15.4,
    "faixa": "verde",
    "idn": -0.494,
    "cota_manaus_m": 28.17,
    "cota_ita_m": 13.31
  },
  {
    "data": "2018-07-26",
    "irc": 15.4,
    "faixa": "verde",
    "idn": -0.456,
    "cota_manaus_m": 27.96,
    "cota_ita_m": 13.11
  },
  {
    "data": "2018-08-02",
    "irc": 15.5,
    "faixa": "verde",
    "idn": -0.465,
    "cota_manaus_m": 27.71,
    "cota_ita_m": 12.87
  },
  {
    "data": "2018-08-09",
    "irc": 15.5,
    "faixa": "verde",
    "idn": -0.545,
    "cota_manaus_m": 27.37,
    "cota_ita_m": 12.53
  },
  {
    "data": "2018-08-16",
    "irc": 15.6,
    "faixa": "verde",
    "idn": -0.161,
    "cota_manaus_m": 26.95,
    "cota_ita_m": 12.15
  },
  {
    "data": "2018-08-23",
    "irc": 3.7,
    "faixa": "verde",
    "idn": -0.027,
    "cota_manaus_m": 26.54,
    "cota_ita_m": 11.8
  },
  {
    "data": "2018-08-30",
    "irc": 3.6,
    "faixa": "verde",
    "idn": 0.132,
    "cota_manaus_m": 25.92,
    "cota_ita_m": 11.31
  },
  {
    "data": "2018-09-06",
    "irc": 3.5,
    "faixa": "verde",
    "idn": 0.107,
    "cota_manaus_m": 25.25,
    "cota_ita_m": 10.76
  },
  {
    "data": "2018-09-13",
    "irc": 3.6,
    "faixa": "verde",
    "idn": -0.14,
    "cota_manaus_m": 24.55,
    "cota_ita_m": 10.14
  },
  {
    "data": "2018-09-20",
    "irc": 15.2,
    "faixa": "verde",
    "idn": -0.163,
    "cota_manaus_m": 23.81,
    "cota_ita_m": 9.6
  },
  {
    "data": "2018-09-27",
    "irc": 3.3,
    "faixa": "verde",
    "idn": 0.046,
    "cota_manaus_m": 22.91,
    "cota_ita_m": 8.83
  },
  {
    "data": "2018-10-04",
    "irc": 14.3,
    "faixa": "verde",
    "idn": 0.31,
    "cota_manaus_m": 21.67,
    "cota_ita_m": 7.89
  },
  {
    "data": "2018-10-11",
    "irc": 4.6,
    "faixa": "verde",
    "idn": 0.231,
    "cota_manaus_m": 21.07,
    "cota_ita_m": 6.59
  },
  {
    "data": "2018-10-18",
    "irc": 22.5,
    "faixa": "amarelo",
    "idn": 0.371,
    "cota_manaus_m": 19.24,
    "cota_ita_m": 5.29
  },
  {
    "data": "2018-10-25",
    "irc": 26.5,
    "faixa": "vermelho",
    "idn": 0.469,
    "cota_manaus_m": 18.31,
    "cota_ita_m": 4.34
  },
  {
    "data": "2018-11-01",
    "irc": 27.5,
    "faixa": "vermelho",
    "idn": 0.428,
    "cota_manaus_m": 17.16,
    "cota_ita_m": 3.97
  },
  {
    "data": "2018-11-08",
    "irc": 27.2,
    "faixa": "vermelho",
    "idn": 0.592,
    "cota_manaus_m": 17.05,
    "cota_ita_m": 4.02
  },
  {
    "data": "2018-11-15",
    "irc": 26.3,
    "faixa": "vermelho",
    "idn": 0.62,
    "cota_manaus_m": 17.26,
    "cota_ita_m": 4.23
  },
  {
    "data": "2018-11-22",
    "irc": 21.2,
    "faixa": "amarelo",
    "idn": 0.64,
    "cota_manaus_m": 17.79,
    "cota_ita_m": 4.68
  },
  {
    "data": "2018-11-29",
    "irc": 21.2,
    "faixa": "amarelo",
    "idn": 0.453,
    "cota_manaus_m": 18.37,
    "cota_ita_m": 5.17
  },
  {
    "data": "2018-12-13",
    "irc": 13.4,
    "faixa": "verde",
    "idn": 0.305,
    "cota_manaus_m": 20.61,
    "cota_ita_m": 7.39
  },
  {
    "data": "2018-12-20",
    "irc": 13.7,
    "faixa": "verde",
    "idn": 0.382,
    "cota_manaus_m": 21.67,
    "cota_ita_m": 8.17
  },
  {
    "data": "2018-12-27",
    "irc": 13.6,
    "faixa": "verde",
    "idn": 0.404,
    "cota_manaus_m": 22.36,
    "cota_ita_m": 8.84
  },
  {
    "data": "2019-01-03",
    "irc": 13.6,
    "faixa": "verde",
    "idn": 0.593,
    "cota_manaus_m": 22.88,
    "cota_ita_m": 9.29
  },
  {
    "data": "2019-01-10",
    "irc": 13.5,
    "faixa": "verde",
    "idn": 0.719,
    "cota_manaus_m": 23.35,
    "cota_ita_m": 9.76
  },
  {
    "data": "2019-01-17",
    "irc": 13.5,
    "faixa": "verde",
    "idn": 0.691,
    "cota_manaus_m": 23.76,
    "cota_ita_m": 10.08
  },
  {
    "data": "2019-01-24",
    "irc": 13.2,
    "faixa": "verde",
    "idn": 0.715,
    "cota_manaus_m": 24.04,
    "cota_ita_m": 10.49
  },
  {
    "data": "2019-01-31",
    "irc": 13.1,
    "faixa": "verde",
    "idn": 0.496,
    "cota_manaus_m": 24.32,
    "cota_ita_m": 10.79
  },
  {
    "data": "2019-02-07",
    "irc": 13.2,
    "faixa": "verde",
    "idn": 0.447,
    "cota_manaus_m": 24.6,
    "cota_ita_m": 10.96
  },
  {
    "data": "2019-02-14",
    "irc": 13,
    "faixa": "verde",
    "idn": 0.317,
    "cota_manaus_m": 24.97,
    "cota_ita_m": 11.38
  },
  {
    "data": "2019-02-21",
    "irc": 12.9,
    "faixa": "verde",
    "idn": 0.344,
    "cota_manaus_m": 25.26,
    "cota_ita_m": 11.69
  },
  {
    "data": "2019-02-28",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.606,
    "cota_manaus_m": 25.58,
    "cota_ita_m": 12.04
  },
  {
    "data": "2019-03-07",
    "irc": 12.7,
    "faixa": "verde",
    "idn": 0.833,
    "cota_manaus_m": 25.71,
    "cota_ita_m": 12.21
  },
  {
    "data": "2019-03-14",
    "irc": 12.3,
    "faixa": "verde",
    "idn": 0.923,
    "cota_manaus_m": 25.81,
    "cota_ita_m": 12.48
  },
  {
    "data": "2019-03-21",
    "irc": 12.2,
    "faixa": "verde",
    "idn": 0.841,
    "cota_manaus_m": 25.91,
    "cota_ita_m": 12.59
  },
  {
    "data": "2019-03-28",
    "irc": 12.4,
    "faixa": "verde",
    "idn": 0.82,
    "cota_manaus_m": 26.1,
    "cota_ita_m": 12.68
  },
  {
    "data": "2019-04-04",
    "irc": 12.4,
    "faixa": "verde",
    "idn": 0.83,
    "cota_manaus_m": 26.37,
    "cota_ita_m": 12.91
  },
  {
    "data": "2019-04-11",
    "irc": 12.4,
    "faixa": "verde",
    "idn": 0.848,
    "cota_manaus_m": 26.62,
    "cota_ita_m": 13.13
  },
  {
    "data": "2019-04-18",
    "irc": 12.5,
    "faixa": "verde",
    "idn": 0.901,
    "cota_manaus_m": 26.89,
    "cota_ita_m": 13.32
  },
  {
    "data": "2019-04-25",
    "irc": 12.6,
    "faixa": "verde",
    "idn": 0.858,
    "cota_manaus_m": 27.23,
    "cota_ita_m": 13.55
  },
  {
    "data": "2019-05-02",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.734,
    "cota_manaus_m": 27.58,
    "cota_ita_m": 13.78
  },
  {
    "data": "2019-05-09",
    "irc": 12.9,
    "faixa": "verde",
    "idn": 0.61,
    "cota_manaus_m": 27.89,
    "cota_ita_m": 13.96
  },
  {
    "data": "2019-05-16",
    "irc": 13.3,
    "faixa": "verde",
    "idn": 0.37,
    "cota_manaus_m": 28.23,
    "cota_ita_m": 14.09
  },
  {
    "data": "2019-05-23",
    "irc": 2.2,
    "faixa": "verde",
    "idn": 0.244,
    "cota_manaus_m": 28.61,
    "cota_ita_m": 14.34
  },
  {
    "data": "2019-05-30",
    "irc": 2.4,
    "faixa": "verde",
    "idn": 0.046,
    "cota_manaus_m": 28.9,
    "cota_ita_m": 14.48
  },
  {
    "data": "2019-06-06",
    "irc": 2.8,
    "faixa": "verde",
    "idn": -0.032,
    "cota_manaus_m": 29.17,
    "cota_ita_m": 14.55
  },
  {
    "data": "2019-06-13",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.03,
    "cota_manaus_m": 29.31,
    "cota_ita_m": 14.61
  },
  {
    "data": "2019-06-20",
    "irc": 3,
    "faixa": "verde",
    "idn": 0.002,
    "cota_manaus_m": 29.4,
    "cota_ita_m": 14.62
  },
  {
    "data": "2019-06-27",
    "irc": 3.2,
    "faixa": "verde",
    "idn": 0.053,
    "cota_manaus_m": 29.38,
    "cota_ita_m": 14.52
  },
  {
    "data": "2019-07-04",
    "irc": 3.2,
    "faixa": "verde",
    "idn": 0.036,
    "cota_manaus_m": 29.26,
    "cota_ita_m": 14.41
  },
  {
    "data": "2019-07-11",
    "irc": 3.2,
    "faixa": "verde",
    "idn": 0.019,
    "cota_manaus_m": 29.12,
    "cota_ita_m": 14.28
  },
  {
    "data": "2019-07-18",
    "irc": 3.3,
    "faixa": "verde",
    "idn": 0.085,
    "cota_manaus_m": 28.91,
    "cota_ita_m": 14.07
  },
  {
    "data": "2019-07-25",
    "irc": 14.6,
    "faixa": "verde",
    "idn": 0.291,
    "cota_manaus_m": 28.66,
    "cota_ita_m": 13.83
  },
  {
    "data": "2019-08-01",
    "irc": 14.6,
    "faixa": "verde",
    "idn": 0.319,
    "cota_manaus_m": 28.3,
    "cota_ita_m": 13.51
  },
  {
    "data": "2019-08-08",
    "irc": 14.6,
    "faixa": "verde",
    "idn": 0.294,
    "cota_manaus_m": 27.9,
    "cota_ita_m": 13.17
  },
  {
    "data": "2019-08-15",
    "irc": 14.6,
    "faixa": "verde",
    "idn": 0.296,
    "cota_manaus_m": 27.51,
    "cota_ita_m": 12.81
  },
  {
    "data": "2019-08-22",
    "irc": 3.5,
    "faixa": "verde",
    "idn": 0.06,
    "cota_manaus_m": 27.16,
    "cota_ita_m": 12.44
  },
  {
    "data": "2019-08-29",
    "irc": 3.5,
    "faixa": "verde",
    "idn": -0.086,
    "cota_manaus_m": 26.62,
    "cota_ita_m": 11.97
  },
  {
    "data": "2019-09-05",
    "irc": 3.5,
    "faixa": "verde",
    "idn": -0.025,
    "cota_manaus_m": 25.98,
    "cota_ita_m": 11.44
  },
  {
    "data": "2019-09-12",
    "irc": 3.2,
    "faixa": "verde",
    "idn": 0.035,
    "cota_manaus_m": 25.05,
    "cota_ita_m": 10.76
  },
  {
    "data": "2019-09-19",
    "irc": 3,
    "faixa": "verde",
    "idn": 0.021,
    "cota_manaus_m": 23.91,
    "cota_ita_m": 9.85
  },
  {
    "data": "2019-09-26",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.103,
    "cota_manaus_m": 22.46,
    "cota_ita_m": 8.64
  },
  {
    "data": "2019-10-03",
    "irc": 2.6,
    "faixa": "verde",
    "idn": -0.155,
    "cota_manaus_m": 20.78,
    "cota_ita_m": 7.35
  },
  {
    "data": "2019-10-10",
    "irc": 3.2,
    "faixa": "verde",
    "idn": -0.11,
    "cota_manaus_m": 19.43,
    "cota_ita_m": 6.2
  },
  {
    "data": "2019-10-17",
    "irc": 10,
    "faixa": "verde",
    "idn": 0.227,
    "cota_manaus_m": 18.66,
    "cota_ita_m": 5.4
  },
  {
    "data": "2019-10-24",
    "irc": 9.8,
    "faixa": "verde",
    "idn": -0.009,
    "cota_manaus_m": 18.11,
    "cota_ita_m": 5.02
  },
  {
    "data": "2019-10-31",
    "irc": 10.2,
    "faixa": "verde",
    "idn": 0.085,
    "cota_manaus_m": 18.47,
    "cota_ita_m": 5.17
  },
  {
    "data": "2019-11-07",
    "irc": 10.4,
    "faixa": "verde",
    "idn": 0.129,
    "cota_manaus_m": 18.87,
    "cota_ita_m": 5.41
  },
  {
    "data": "2019-11-14",
    "irc": 9.9,
    "faixa": "verde",
    "idn": 0.018,
    "cota_manaus_m": 19.2,
    "cota_ita_m": 5.63
  },
  {
    "data": "2019-11-21",
    "irc": 6.4,
    "faixa": "verde",
    "idn": -0.122,
    "cota_manaus_m": 19.54,
    "cota_ita_m": 5.96
  },
  {
    "data": "2019-11-28",
    "irc": 3.1,
    "faixa": "verde",
    "idn": -0.058,
    "cota_manaus_m": 20.17,
    "cota_ita_m": 6.57
  },
  {
    "data": "2019-12-05",
    "irc": 3.5,
    "faixa": "verde",
    "idn": 0.129,
    "cota_manaus_m": 21.01,
    "cota_ita_m": 7.11
  },
  {
    "data": "2019-12-12",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.173,
    "cota_manaus_m": 21.38,
    "cota_ita_m": 7.47
  },
  {
    "data": "2019-12-19",
    "irc": 3,
    "faixa": "verde",
    "idn": 0.177,
    "cota_manaus_m": 21.67,
    "cota_ita_m": 7.93
  },
  {
    "data": "2019-12-26",
    "irc": 2.6,
    "faixa": "verde",
    "idn": 0.231,
    "cota_manaus_m": 22.25,
    "cota_ita_m": 8.61
  },
  {
    "data": "2020-01-02",
    "irc": 2.7,
    "faixa": "verde",
    "idn": 0.178,
    "cota_manaus_m": 22.99,
    "cota_ita_m": 9.23
  },
  {
    "data": "2020-01-09",
    "irc": 13.7,
    "faixa": "verde",
    "idn": 0.399,
    "cota_manaus_m": 23.43,
    "cota_ita_m": 9.7
  },
  {
    "data": "2020-01-16",
    "irc": 13.7,
    "faixa": "verde",
    "idn": 0.721,
    "cota_manaus_m": 23.95,
    "cota_ita_m": 10.15
  },
  {
    "data": "2020-01-23",
    "irc": 13.8,
    "faixa": "verde",
    "idn": 0.66,
    "cota_manaus_m": 24.32,
    "cota_ita_m": 10.43
  },
  {
    "data": "2020-01-30",
    "irc": 14,
    "faixa": "verde",
    "idn": 0.423,
    "cota_manaus_m": 24.54,
    "cota_ita_m": 10.55
  },
  {
    "data": "2020-02-06",
    "irc": 14,
    "faixa": "verde",
    "idn": 0.34,
    "cota_manaus_m": 24.62,
    "cota_ita_m": 10.58
  },
  {
    "data": "2020-02-13",
    "irc": 13.8,
    "faixa": "verde",
    "idn": 0.489,
    "cota_manaus_m": 24.54,
    "cota_ita_m": 10.62
  },
  {
    "data": "2020-02-20",
    "irc": 13.7,
    "faixa": "verde",
    "idn": 0.668,
    "cota_manaus_m": 24.61,
    "cota_ita_m": 10.74
  },
  {
    "data": "2020-02-27",
    "irc": 13.3,
    "faixa": "verde",
    "idn": 0.673,
    "cota_manaus_m": 24.52,
    "cota_ita_m": 10.87
  },
  {
    "data": "2020-03-05",
    "irc": 13.1,
    "faixa": "verde",
    "idn": 0.559,
    "cota_manaus_m": 24.6,
    "cota_ita_m": 11.02
  },
  {
    "data": "2020-03-12",
    "irc": 12.9,
    "faixa": "verde",
    "idn": 0.301,
    "cota_manaus_m": 24.68,
    "cota_ita_m": 11.21
  },
  {
    "data": "2020-03-19",
    "irc": 1.4,
    "faixa": "verde",
    "idn": 0.237,
    "cota_manaus_m": 24.87,
    "cota_ita_m": 11.48
  },
  {
    "data": "2020-03-26",
    "irc": 1.2,
    "faixa": "verde",
    "idn": 0.215,
    "cota_manaus_m": 25.12,
    "cota_ita_m": 11.79
  },
  {
    "data": "2020-04-02",
    "irc": 12.5,
    "faixa": "verde",
    "idn": 0.426,
    "cota_manaus_m": 25.34,
    "cota_ita_m": 11.95
  },
  {
    "data": "2020-04-09",
    "irc": 12.4,
    "faixa": "verde",
    "idn": 0.255,
    "cota_manaus_m": 25.48,
    "cota_ita_m": 12.14
  },
  {
    "data": "2020-04-16",
    "irc": 1.3,
    "faixa": "verde",
    "idn": 0.081,
    "cota_manaus_m": 25.88,
    "cota_ita_m": 12.39
  },
  {
    "data": "2020-04-23",
    "irc": 1.5,
    "faixa": "verde",
    "idn": 0.213,
    "cota_manaus_m": 26.31,
    "cota_ita_m": 12.67
  },
  {
    "data": "2020-04-30",
    "irc": 1.7,
    "faixa": "verde",
    "idn": 0.18,
    "cota_manaus_m": 26.72,
    "cota_ita_m": 12.95
  },
  {
    "data": "2020-05-07",
    "irc": 13.1,
    "faixa": "verde",
    "idn": 0.394,
    "cota_manaus_m": 27.12,
    "cota_ita_m": 13.2
  },
  {
    "data": "2020-05-14",
    "irc": 13.3,
    "faixa": "verde",
    "idn": 0.327,
    "cota_manaus_m": 27.47,
    "cota_ita_m": 13.41
  },
  {
    "data": "2020-05-21",
    "irc": 2.4,
    "faixa": "verde",
    "idn": 0.151,
    "cota_manaus_m": 27.83,
    "cota_ita_m": 13.58
  },
  {
    "data": "2020-05-28",
    "irc": 2.6,
    "faixa": "verde",
    "idn": 0.223,
    "cota_manaus_m": 28.17,
    "cota_ita_m": 13.77
  },
  {
    "data": "2020-06-04",
    "irc": 2.6,
    "faixa": "verde",
    "idn": 0.014,
    "cota_manaus_m": 28.35,
    "cota_ita_m": 13.91
  },
  {
    "data": "2020-06-11",
    "irc": 2.8,
    "faixa": "verde",
    "idn": -0.031,
    "cota_manaus_m": 28.49,
    "cota_ita_m": 13.96
  },
  {
    "data": "2020-06-18",
    "irc": 2.9,
    "faixa": "verde",
    "idn": -0.072,
    "cota_manaus_m": 28.52,
    "cota_ita_m": 13.9
  },
  {
    "data": "2020-06-25",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.204,
    "cota_manaus_m": 28.45,
    "cota_ita_m": 13.78
  },
  {
    "data": "2020-07-02",
    "irc": 3.2,
    "faixa": "verde",
    "idn": -0.155,
    "cota_manaus_m": 28.37,
    "cota_ita_m": 13.64
  },
  {
    "data": "2020-07-09",
    "irc": 3.3,
    "faixa": "verde",
    "idn": -0.062,
    "cota_manaus_m": 28.3,
    "cota_ita_m": 13.55
  },
  {
    "data": "2020-07-16",
    "irc": 3.4,
    "faixa": "verde",
    "idn": -0.02,
    "cota_manaus_m": 28.17,
    "cota_ita_m": 13.38
  },
  {
    "data": "2020-07-23",
    "irc": 14.7,
    "faixa": "verde",
    "idn": 0.307,
    "cota_manaus_m": 27.94,
    "cota_ita_m": 13.15
  },
  {
    "data": "2020-07-30",
    "irc": 3.5,
    "faixa": "verde",
    "idn": 0.211,
    "cota_manaus_m": 27.6,
    "cota_ita_m": 12.82
  },
  {
    "data": "2020-08-06",
    "irc": 14.8,
    "faixa": "verde",
    "idn": 0.304,
    "cota_manaus_m": 27.2,
    "cota_ita_m": 12.47
  },
  {
    "data": "2020-08-13",
    "irc": 14.8,
    "faixa": "verde",
    "idn": 0.358,
    "cota_manaus_m": 26.77,
    "cota_ita_m": 12.07
  },
  {
    "data": "2020-08-20",
    "irc": 3.5,
    "faixa": "verde",
    "idn": 0.09,
    "cota_manaus_m": 26.15,
    "cota_ita_m": 11.57
  },
  {
    "data": "2020-08-27",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.228,
    "cota_manaus_m": 25.39,
    "cota_ita_m": 10.96
  },
  {
    "data": "2020-09-03",
    "irc": 14.3,
    "faixa": "verde",
    "idn": 0.605,
    "cota_manaus_m": 24.33,
    "cota_ita_m": 10.18
  },
  {
    "data": "2020-09-10",
    "irc": 14,
    "faixa": "verde",
    "idn": 0.511,
    "cota_manaus_m": 22.95,
    "cota_ita_m": 9.15
  },
  {
    "data": "2020-09-17",
    "irc": 13.8,
    "faixa": "verde",
    "idn": 0.383,
    "cota_manaus_m": 21.28,
    "cota_ita_m": 7.81
  },
  {
    "data": "2020-09-24",
    "irc": 13.5,
    "faixa": "verde",
    "idn": 0.254,
    "cota_manaus_m": 19.53,
    "cota_ita_m": 6.39
  },
  {
    "data": "2020-10-01",
    "irc": 9.7,
    "faixa": "verde",
    "idn": 0.223,
    "cota_manaus_m": 18.13,
    "cota_ita_m": 5.12
  },
  {
    "data": "2020-10-08",
    "irc": 14.9,
    "faixa": "verde",
    "idn": 0.049,
    "cota_manaus_m": 17.21,
    "cota_ita_m": 4.24
  },
  {
    "data": "2020-10-15",
    "irc": 30.3,
    "faixa": "vermelho",
    "idn": -0.329,
    "cota_manaus_m": 16.97,
    "cota_ita_m": 3.85
  },
  {
    "data": "2020-10-22",
    "irc": 28.1,
    "faixa": "vermelho",
    "idn": -0.375,
    "cota_manaus_m": 17.08,
    "cota_ita_m": 3.92
  },
  {
    "data": "2020-10-29",
    "irc": 32.7,
    "faixa": "vermelho",
    "idn": -0.287,
    "cota_manaus_m": 16.89,
    "cota_ita_m": 3.73
  },
  {
    "data": "2020-11-05",
    "irc": 34.9,
    "faixa": "vermelho",
    "idn": -0.284,
    "cota_manaus_m": 16.61,
    "cota_ita_m": 3.51
  },
  {
    "data": "2020-11-12",
    "irc": 35.1,
    "faixa": "vermelho",
    "idn": -0.411,
    "cota_manaus_m": 16.67,
    "cota_ita_m": 3.49
  },
  {
    "data": "2020-11-19",
    "irc": 32.6,
    "faixa": "vermelho",
    "idn": -0.617,
    "cota_manaus_m": 16.92,
    "cota_ita_m": 3.78
  },
  {
    "data": "2020-11-26",
    "irc": 28.3,
    "faixa": "vermelho",
    "idn": -0.447,
    "cota_manaus_m": 17.29,
    "cota_ita_m": 3.99
  },
  {
    "data": "2020-12-03",
    "irc": 23.9,
    "faixa": "amarelo",
    "idn": -0.582,
    "cota_manaus_m": 17.76,
    "cota_ita_m": 4.45
  },
  {
    "data": "2020-12-10",
    "irc": 22.5,
    "faixa": "amarelo",
    "idn": -0.708,
    "cota_manaus_m": 18.59,
    "cota_ita_m": 5.05
  },
  {
    "data": "2020-12-17",
    "irc": 20.1,
    "faixa": "verde",
    "idn": -0.403,
    "cota_manaus_m": 19.4,
    "cota_ita_m": 5.79
  },
  {
    "data": "2020-12-24",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.185,
    "cota_manaus_m": 20.29,
    "cota_ita_m": 6.62
  },
  {
    "data": "2020-12-31",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.334,
    "cota_manaus_m": 21.11,
    "cota_ita_m": 7.37
  },
  {
    "data": "2021-01-07",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.323,
    "cota_manaus_m": 22.02,
    "cota_ita_m": 8.2
  },
  {
    "data": "2021-01-14",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.401,
    "cota_manaus_m": 22.82,
    "cota_ita_m": 8.95
  },
  {
    "data": "2021-01-21",
    "irc": 14.6,
    "faixa": "verde",
    "idn": -0.34,
    "cota_manaus_m": 23.62,
    "cota_ita_m": 9.71
  },
  {
    "data": "2021-01-28",
    "irc": 14.5,
    "faixa": "verde",
    "idn": -0.248,
    "cota_manaus_m": 24.21,
    "cota_ita_m": 10.27
  },
  {
    "data": "2021-02-04",
    "irc": 14.3,
    "faixa": "verde",
    "idn": -0.336,
    "cota_manaus_m": 24.68,
    "cota_ita_m": 10.79
  },
  {
    "data": "2021-02-11",
    "irc": 14.2,
    "faixa": "verde",
    "idn": -0.29,
    "cota_manaus_m": 25,
    "cota_ita_m": 11.13
  },
  {
    "data": "2021-02-18",
    "irc": 14,
    "faixa": "verde",
    "idn": -0.181,
    "cota_manaus_m": 25.4,
    "cota_ita_m": 11.56
  },
  {
    "data": "2021-02-25",
    "irc": 2,
    "faixa": "verde",
    "idn": 0.113,
    "cota_manaus_m": 25.65,
    "cota_ita_m": 11.88
  },
  {
    "data": "2021-03-04",
    "irc": 12.9,
    "faixa": "verde",
    "idn": 0.273,
    "cota_manaus_m": 25.88,
    "cota_ita_m": 12.23
  },
  {
    "data": "2021-03-11",
    "irc": 1.4,
    "faixa": "verde",
    "idn": 0.242,
    "cota_manaus_m": 26.13,
    "cota_ita_m": 12.59
  },
  {
    "data": "2021-03-18",
    "irc": 1.4,
    "faixa": "verde",
    "idn": 0.189,
    "cota_manaus_m": 26.53,
    "cota_ita_m": 12.94
  },
  {
    "data": "2021-03-25",
    "irc": 1.5,
    "faixa": "verde",
    "idn": 0.185,
    "cota_manaus_m": 26.95,
    "cota_ita_m": 13.24
  },
  {
    "data": "2021-04-01",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.321,
    "cota_manaus_m": 27.34,
    "cota_ita_m": 13.54
  },
  {
    "data": "2021-04-08",
    "irc": 1.7,
    "faixa": "verde",
    "idn": 0.096,
    "cota_manaus_m": 27.7,
    "cota_ita_m": 13.8
  },
  {
    "data": "2021-04-15",
    "irc": 13.8,
    "faixa": "verde",
    "idn": -0.22,
    "cota_manaus_m": 28.08,
    "cota_ita_m": 14.03
  },
  {
    "data": "2021-04-22",
    "irc": 14,
    "faixa": "verde",
    "idn": -0.246,
    "cota_manaus_m": 28.54,
    "cota_ita_m": 14.31
  },
  {
    "data": "2021-04-29",
    "irc": 2.4,
    "faixa": "verde",
    "idn": -0.104,
    "cota_manaus_m": 28.98,
    "cota_ita_m": 14.59
  },
  {
    "data": "2021-05-06",
    "irc": 2.4,
    "faixa": "verde",
    "idn": -0.12,
    "cota_manaus_m": 29.3,
    "cota_ita_m": 14.85
  },
  {
    "data": "2021-05-13",
    "irc": 14.4,
    "faixa": "verde",
    "idn": -0.172,
    "cota_manaus_m": 29.6,
    "cota_ita_m": 15.05
  },
  {
    "data": "2021-05-20",
    "irc": 2.7,
    "faixa": "verde",
    "idn": -0.112,
    "cota_manaus_m": 29.81,
    "cota_ita_m": 15.16
  },
  {
    "data": "2021-05-27",
    "irc": 14.7,
    "faixa": "verde",
    "idn": -0.194,
    "cota_manaus_m": 29.93,
    "cota_ita_m": 15.19
  },
  {
    "data": "2021-06-03",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.261,
    "cota_manaus_m": 29.98,
    "cota_ita_m": 15.18
  },
  {
    "data": "2021-06-10",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.386,
    "cota_manaus_m": 30,
    "cota_ita_m": 15.15
  },
  {
    "data": "2021-06-17",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.276,
    "cota_manaus_m": 30.02,
    "cota_ita_m": 15.09
  },
  {
    "data": "2021-06-24",
    "irc": 15.1,
    "faixa": "verde",
    "idn": -0.172,
    "cota_manaus_m": 30.01,
    "cota_ita_m": 15.05
  },
  {
    "data": "2021-07-01",
    "irc": 15.2,
    "faixa": "verde",
    "idn": -0.199,
    "cota_manaus_m": 29.94,
    "cota_ita_m": 14.96
  },
  {
    "data": "2021-07-08",
    "irc": 3.3,
    "faixa": "verde",
    "idn": 0.072,
    "cota_manaus_m": 29.8,
    "cota_ita_m": 14.82
  },
  {
    "data": "2021-07-15",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.065,
    "cota_manaus_m": 29.62,
    "cota_ita_m": 14.64
  },
  {
    "data": "2021-07-22",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.081,
    "cota_manaus_m": 29.35,
    "cota_ita_m": 14.38
  },
  {
    "data": "2021-07-29",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.217,
    "cota_manaus_m": 29.02,
    "cota_ita_m": 14.11
  },
  {
    "data": "2021-08-05",
    "irc": 3.4,
    "faixa": "verde",
    "idn": -0.026,
    "cota_manaus_m": 28.67,
    "cota_ita_m": 13.8
  },
  {
    "data": "2021-08-12",
    "irc": 3.5,
    "faixa": "verde",
    "idn": -0.152,
    "cota_manaus_m": 28.25,
    "cota_ita_m": 13.41
  },
  {
    "data": "2021-08-19",
    "irc": 15.4,
    "faixa": "verde",
    "idn": -0.291,
    "cota_manaus_m": 27.85,
    "cota_ita_m": 13.04
  },
  {
    "data": "2021-08-26",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.449,
    "cota_manaus_m": 27.3,
    "cota_ita_m": 12.58
  },
  {
    "data": "2021-09-02",
    "irc": 15.4,
    "faixa": "verde",
    "idn": -0.542,
    "cota_manaus_m": 26.74,
    "cota_ita_m": 12.06
  },
  {
    "data": "2021-09-09",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.639,
    "cota_manaus_m": 25.95,
    "cota_ita_m": 11.41
  },
  {
    "data": "2021-09-16",
    "irc": 15.2,
    "faixa": "verde",
    "idn": -0.493,
    "cota_manaus_m": 24.99,
    "cota_ita_m": 10.63
  },
  {
    "data": "2021-09-23",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.268,
    "cota_manaus_m": 23.87,
    "cota_ita_m": 9.76
  },
  {
    "data": "2021-09-30",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.365,
    "cota_manaus_m": 22.76,
    "cota_ita_m": 8.83
  },
  {
    "data": "2021-10-07",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.523,
    "cota_manaus_m": 21.82,
    "cota_ita_m": 7.98
  },
  {
    "data": "2021-10-14",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.564,
    "cota_manaus_m": 21.04,
    "cota_ita_m": 7.29
  },
  {
    "data": "2021-10-21",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.603,
    "cota_manaus_m": 20.15,
    "cota_ita_m": 6.54
  },
  {
    "data": "2021-10-28",
    "irc": 17.4,
    "faixa": "verde",
    "idn": -0.468,
    "cota_manaus_m": 19.66,
    "cota_ita_m": 6.07
  },
  {
    "data": "2021-11-04",
    "irc": 19.8,
    "faixa": "verde",
    "idn": -0.468,
    "cota_manaus_m": 19.44,
    "cota_ita_m": 5.84
  },
  {
    "data": "2021-11-11",
    "irc": 18,
    "faixa": "verde",
    "idn": -0.527,
    "cota_manaus_m": 19.63,
    "cota_ita_m": 5.98
  },
  {
    "data": "2021-11-18",
    "irc": 15.4,
    "faixa": "verde",
    "idn": -0.583,
    "cota_manaus_m": 19.91,
    "cota_ita_m": 6.25
  },
  {
    "data": "2021-11-25",
    "irc": 15.1,
    "faixa": "verde",
    "idn": -0.363,
    "cota_manaus_m": 20.53,
    "cota_ita_m": 6.81
  },
  {
    "data": "2021-12-02",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.302,
    "cota_manaus_m": 21.12,
    "cota_ita_m": 7.37
  },
  {
    "data": "2021-12-09",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.173,
    "cota_manaus_m": 21.69,
    "cota_ita_m": 7.93
  },
  {
    "data": "2021-12-16",
    "irc": 14.7,
    "faixa": "verde",
    "idn": -0.276,
    "cota_manaus_m": 22.35,
    "cota_ita_m": 8.6
  },
  {
    "data": "2021-12-23",
    "irc": 14.6,
    "faixa": "verde",
    "idn": -0.32,
    "cota_manaus_m": 23.05,
    "cota_ita_m": 9.24
  },
  {
    "data": "2021-12-30",
    "irc": 14.6,
    "faixa": "verde",
    "idn": -0.228,
    "cota_manaus_m": 23.69,
    "cota_ita_m": 9.78
  },
  {
    "data": "2022-01-06",
    "irc": 2.6,
    "faixa": "verde",
    "idn": 0.004,
    "cota_manaus_m": 24.16,
    "cota_ita_m": 10.3
  },
  {
    "data": "2022-01-13",
    "irc": 2.3,
    "faixa": "verde",
    "idn": 0.173,
    "cota_manaus_m": 24.42,
    "cota_ita_m": 10.67
  },
  {
    "data": "2022-01-20",
    "irc": 13.4,
    "faixa": "verde",
    "idn": 0.316,
    "cota_manaus_m": 24.48,
    "cota_ita_m": 10.76
  },
  {
    "data": "2022-01-27",
    "irc": 1.8,
    "faixa": "verde",
    "idn": -0.023,
    "cota_manaus_m": 24.19,
    "cota_ita_m": 10.68
  },
  {
    "data": "2022-02-03",
    "irc": 13.4,
    "faixa": "verde",
    "idn": -0.174,
    "cota_manaus_m": 23.92,
    "cota_ita_m": 10.58
  },
  {
    "data": "2022-02-10",
    "irc": 1.3,
    "faixa": "verde",
    "idn": -0.007,
    "cota_manaus_m": 23.88,
    "cota_ita_m": 10.65
  },
  {
    "data": "2022-02-17",
    "irc": 1.2,
    "faixa": "verde",
    "idn": -0.107,
    "cota_manaus_m": 23.94,
    "cota_ita_m": 10.79
  },
  {
    "data": "2022-02-24",
    "irc": 13,
    "faixa": "verde",
    "idn": -0.269,
    "cota_manaus_m": 24.18,
    "cota_ita_m": 11.02
  },
  {
    "data": "2022-03-03",
    "irc": 13.1,
    "faixa": "verde",
    "idn": -0.294,
    "cota_manaus_m": 24.66,
    "cota_ita_m": 11.38
  },
  {
    "data": "2022-03-10",
    "irc": 13.2,
    "faixa": "verde",
    "idn": -0.567,
    "cota_manaus_m": 25.19,
    "cota_ita_m": 11.79
  },
  {
    "data": "2022-03-17",
    "irc": 13.4,
    "faixa": "verde",
    "idn": -0.788,
    "cota_manaus_m": 25.81,
    "cota_ita_m": 12.22
  },
  {
    "data": "2022-03-24",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.55,
    "cota_manaus_m": 26.49,
    "cota_ita_m": 12.69
  },
  {
    "data": "2022-03-31",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.569,
    "cota_manaus_m": 27.16,
    "cota_ita_m": 13.25
  },
  {
    "data": "2022-04-07",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.484,
    "cota_manaus_m": 27.63,
    "cota_ita_m": 13.68
  },
  {
    "data": "2022-04-14",
    "irc": 13.6,
    "faixa": "verde",
    "idn": -0.389,
    "cota_manaus_m": 28.01,
    "cota_ita_m": 14.03
  },
  {
    "data": "2022-04-21",
    "irc": 13.8,
    "faixa": "verde",
    "idn": -0.309,
    "cota_manaus_m": 28.4,
    "cota_ita_m": 14.3
  },
  {
    "data": "2022-04-28",
    "irc": 13.9,
    "faixa": "verde",
    "idn": -0.307,
    "cota_manaus_m": 28.67,
    "cota_ita_m": 14.48
  },
  {
    "data": "2022-05-05",
    "irc": 14,
    "faixa": "verde",
    "idn": -0.337,
    "cota_manaus_m": 28.95,
    "cota_ita_m": 14.67
  },
  {
    "data": "2022-05-12",
    "irc": 14.2,
    "faixa": "verde",
    "idn": -0.291,
    "cota_manaus_m": 29.16,
    "cota_ita_m": 14.73
  },
  {
    "data": "2022-05-19",
    "irc": 14.4,
    "faixa": "verde",
    "idn": -0.381,
    "cota_manaus_m": 29.3,
    "cota_ita_m": 14.76
  },
  {
    "data": "2022-05-26",
    "irc": 14.6,
    "faixa": "verde",
    "idn": -0.597,
    "cota_manaus_m": 29.39,
    "cota_ita_m": 14.75
  },
  {
    "data": "2022-06-02",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.795,
    "cota_manaus_m": 29.51,
    "cota_ita_m": 14.76
  },
  {
    "data": "2022-06-09",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.807,
    "cota_manaus_m": 29.61,
    "cota_ita_m": 14.77
  },
  {
    "data": "2022-06-16",
    "irc": 15.1,
    "faixa": "verde",
    "idn": -0.659,
    "cota_manaus_m": 29.72,
    "cota_ita_m": 14.77
  },
  {
    "data": "2022-06-23",
    "irc": 15.2,
    "faixa": "verde",
    "idn": -0.508,
    "cota_manaus_m": 29.75,
    "cota_ita_m": 14.78
  },
  {
    "data": "2022-06-30",
    "irc": 15.2,
    "faixa": "verde",
    "idn": -0.393,
    "cota_manaus_m": 29.69,
    "cota_ita_m": 14.7
  },
  {
    "data": "2022-07-07",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.433,
    "cota_manaus_m": 29.53,
    "cota_ita_m": 14.53
  },
  {
    "data": "2022-07-14",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.434,
    "cota_manaus_m": 29.3,
    "cota_ita_m": 14.32
  },
  {
    "data": "2022-07-21",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.429,
    "cota_manaus_m": 29,
    "cota_ita_m": 14.05
  },
  {
    "data": "2022-07-28",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.368,
    "cota_manaus_m": 28.67,
    "cota_ita_m": 13.77
  },
  {
    "data": "2022-08-04",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.431,
    "cota_manaus_m": 28.3,
    "cota_ita_m": 13.45
  },
  {
    "data": "2022-08-11",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.336,
    "cota_manaus_m": 27.9,
    "cota_ita_m": 13.09
  },
  {
    "data": "2022-08-18",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.068,
    "cota_manaus_m": 27.46,
    "cota_ita_m": 12.76
  },
  {
    "data": "2022-08-25",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.041,
    "cota_manaus_m": 26.93,
    "cota_ita_m": 12.27
  },
  {
    "data": "2022-09-01",
    "irc": 3.5,
    "faixa": "verde",
    "idn": -0.127,
    "cota_manaus_m": 26.25,
    "cota_ita_m": 11.67
  },
  {
    "data": "2022-09-08",
    "irc": 15.1,
    "faixa": "verde",
    "idn": -0.447,
    "cota_manaus_m": 25.45,
    "cota_ita_m": 11.07
  },
  {
    "data": "2022-09-15",
    "irc": 15,
    "faixa": "verde",
    "idn": -0.619,
    "cota_manaus_m": 24.52,
    "cota_ita_m": 10.3
  },
  {
    "data": "2022-09-22",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.549,
    "cota_manaus_m": 23.3,
    "cota_ita_m": 9.31
  },
  {
    "data": "2022-09-29",
    "irc": 2.8,
    "faixa": "verde",
    "idn": -0.044,
    "cota_manaus_m": 21.74,
    "cota_ita_m": 8.08
  },
  {
    "data": "2022-10-06",
    "irc": 2.7,
    "faixa": "verde",
    "idn": -0.145,
    "cota_manaus_m": 20.09,
    "cota_ita_m": 6.68
  },
  {
    "data": "2022-10-13",
    "irc": 9.6,
    "faixa": "verde",
    "idn": -0.139,
    "cota_manaus_m": 18.3,
    "cota_ita_m": 5.31
  },
  {
    "data": "2022-10-20",
    "irc": 27.5,
    "faixa": "vermelho",
    "idn": -0.167,
    "cota_manaus_m": 16.85,
    "cota_ita_m": 4
  },
  {
    "data": "2022-10-27",
    "irc": 22.7,
    "faixa": "amarelo",
    "idn": -0.031,
    "cota_manaus_m": 16.2,
    "cota_ita_m": 3.37
  },
  {
    "data": "2022-11-03",
    "irc": 23,
    "faixa": "amarelo",
    "idn": -0.034,
    "cota_manaus_m": 16.64,
    "cota_ita_m": 3.56
  },
  {
    "data": "2022-11-10",
    "irc": 27.2,
    "faixa": "vermelho",
    "idn": -0.336,
    "cota_manaus_m": 17.53,
    "cota_ita_m": 4.3
  },
  {
    "data": "2022-11-17",
    "irc": 22.3,
    "faixa": "amarelo",
    "idn": -0.462,
    "cota_manaus_m": 18.25,
    "cota_ita_m": 4.84
  },
  {
    "data": "2022-11-24",
    "irc": 22.4,
    "faixa": "amarelo",
    "idn": -0.406,
    "cota_manaus_m": 18.41,
    "cota_ita_m": 4.94
  },
  {
    "data": "2022-12-01",
    "irc": 22.1,
    "faixa": "amarelo",
    "idn": -0.669,
    "cota_manaus_m": 18.3,
    "cota_ita_m": 4.95
  },
  {
    "data": "2022-12-08",
    "irc": 22.2,
    "faixa": "amarelo",
    "idn": -0.649,
    "cota_manaus_m": 18.67,
    "cota_ita_m": 5.24
  },
  {
    "data": "2022-12-15",
    "irc": 21.6,
    "faixa": "amarelo",
    "idn": -0.613,
    "cota_manaus_m": 19.13,
    "cota_ita_m": 5.63
  },
  {
    "data": "2022-12-22",
    "irc": 20.4,
    "faixa": "verde",
    "idn": -0.502,
    "cota_manaus_m": 19.19,
    "cota_ita_m": 5.74
  },
  {
    "data": "2022-12-29",
    "irc": 19,
    "faixa": "verde",
    "idn": -0.22,
    "cota_manaus_m": 19.19,
    "cota_ita_m": 5.89
  },
  {
    "data": "2023-01-05",
    "irc": 2.3,
    "faixa": "verde",
    "idn": 0.082,
    "cota_manaus_m": 19.44,
    "cota_ita_m": 6.31
  },
  {
    "data": "2023-01-12",
    "irc": 2.1,
    "faixa": "verde",
    "idn": -0.129,
    "cota_manaus_m": 19.75,
    "cota_ita_m": 6.7
  },
  {
    "data": "2023-01-19",
    "irc": 13.9,
    "faixa": "verde",
    "idn": -0.495,
    "cota_manaus_m": 20.17,
    "cota_ita_m": 7.07
  },
  {
    "data": "2023-01-26",
    "irc": 14,
    "faixa": "verde",
    "idn": -0.623,
    "cota_manaus_m": 21.05,
    "cota_ita_m": 7.77
  },
  {
    "data": "2023-02-02",
    "irc": 14.2,
    "faixa": "verde",
    "idn": -0.677,
    "cota_manaus_m": 21.92,
    "cota_ita_m": 8.45
  },
  {
    "data": "2023-02-09",
    "irc": 14.2,
    "faixa": "verde",
    "idn": -0.503,
    "cota_manaus_m": 22.66,
    "cota_ita_m": 9.08
  },
  {
    "data": "2023-02-16",
    "irc": 13.8,
    "faixa": "verde",
    "idn": -0.355,
    "cota_manaus_m": 23.18,
    "cota_ita_m": 9.72
  },
  {
    "data": "2023-02-23",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.503,
    "cota_manaus_m": 23.7,
    "cota_ita_m": 10.26
  },
  {
    "data": "2023-03-02",
    "irc": 13.6,
    "faixa": "verde",
    "idn": -0.525,
    "cota_manaus_m": 24.3,
    "cota_ita_m": 10.8
  },
  {
    "data": "2023-03-09",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.579,
    "cota_manaus_m": 24.9,
    "cota_ita_m": 11.28
  },
  {
    "data": "2023-03-16",
    "irc": 13.9,
    "faixa": "verde",
    "idn": -0.546,
    "cota_manaus_m": 25.49,
    "cota_ita_m": 11.71
  },
  {
    "data": "2023-03-23",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.449,
    "cota_manaus_m": 25.7,
    "cota_ita_m": 11.97
  },
  {
    "data": "2023-03-30",
    "irc": 1.7,
    "faixa": "verde",
    "idn": -0.063,
    "cota_manaus_m": 25.92,
    "cota_ita_m": 12.26
  },
  {
    "data": "2023-07-06",
    "irc": 14.3,
    "faixa": "verde",
    "idn": 0.655,
    "cota_manaus_m": 27.9,
    "cota_ita_m": 13.29
  },
  {
    "data": "2023-07-13",
    "irc": 14.4,
    "faixa": "verde",
    "idn": 0.407,
    "cota_manaus_m": 27.65,
    "cota_ita_m": 13.05
  },
  {
    "data": "2023-07-20",
    "irc": 14.5,
    "faixa": "verde",
    "idn": 0.539,
    "cota_manaus_m": 27.38,
    "cota_ita_m": 12.77
  },
  {
    "data": "2023-07-27",
    "irc": 14.6,
    "faixa": "verde",
    "idn": 0.68,
    "cota_manaus_m": 27.07,
    "cota_ita_m": 12.41
  },
  {
    "data": "2023-08-03",
    "irc": 14.6,
    "faixa": "verde",
    "idn": 0.32,
    "cota_manaus_m": 26.6,
    "cota_ita_m": 12.01
  },
  {
    "data": "2023-08-10",
    "irc": 14.6,
    "faixa": "verde",
    "idn": 0.312,
    "cota_manaus_m": 26.06,
    "cota_ita_m": 11.55
  },
  {
    "data": "2023-08-17",
    "irc": 3.4,
    "faixa": "verde",
    "idn": 0.195,
    "cota_manaus_m": 25.48,
    "cota_ita_m": 11.05
  },
  {
    "data": "2023-08-24",
    "irc": 3.3,
    "faixa": "verde",
    "idn": 0.179,
    "cota_manaus_m": 24.71,
    "cota_ita_m": 10.39
  },
  {
    "data": "2023-08-31",
    "irc": 14.5,
    "faixa": "verde",
    "idn": 0.267,
    "cota_manaus_m": 23.76,
    "cota_ita_m": 9.59
  },
  {
    "data": "2023-09-07",
    "irc": 14.2,
    "faixa": "verde",
    "idn": 0.265,
    "cota_manaus_m": 22.44,
    "cota_ita_m": 8.6
  },
  {
    "data": "2023-09-14",
    "irc": 13.9,
    "faixa": "verde",
    "idn": 0.382,
    "cota_manaus_m": 20.63,
    "cota_ita_m": 7.17
  },
  {
    "data": "2023-09-21",
    "irc": 20.8,
    "faixa": "verde",
    "idn": 0.359,
    "cota_manaus_m": 18.34,
    "cota_ita_m": 5.37
  },
  {
    "data": "2023-09-28",
    "irc": 22.2,
    "faixa": "amarelo",
    "idn": 0.137,
    "cota_manaus_m": 16.11,
    "cota_ita_m": 3.53
  },
  {
    "data": "2023-10-05",
    "irc": 33.1,
    "faixa": "vermelho",
    "idn": 0.084,
    "cota_manaus_m": 14.9,
    "cota_ita_m": 2.38
  },
  {
    "data": "2023-10-12",
    "irc": 45.9,
    "faixa": "vermelho",
    "idn": 0.041,
    "cota_manaus_m": 14.04,
    "cota_ita_m": 1.45
  },
  {
    "data": "2023-10-19",
    "irc": 61.3,
    "faixa": "vermelho",
    "idn": 0.159,
    "cota_manaus_m": 13.29,
    "cota_ita_m": 0.89
  },
  {
    "data": "2023-10-26",
    "irc": 67.9,
    "faixa": "vermelho",
    "idn": 0.066,
    "cota_manaus_m": 12.7,
    "cota_ita_m": 0.36
  },
  {
    "data": "2023-11-02",
    "irc": 62.6,
    "faixa": "vermelho",
    "idn": -0.097,
    "cota_manaus_m": 13.08,
    "cota_ita_m": 0.72
  },
  {
    "data": "2023-11-09",
    "irc": 64.1,
    "faixa": "vermelho",
    "idn": 0.177,
    "cota_manaus_m": 13.18,
    "cota_ita_m": 0.62
  },
  {
    "data": "2023-11-16",
    "irc": 64.1,
    "faixa": "vermelho",
    "idn": 0.205,
    "cota_manaus_m": 12.96,
    "cota_ita_m": 0.62
  },
  {
    "data": "2023-11-23",
    "irc": 61.1,
    "faixa": "vermelho",
    "idn": -0.017,
    "cota_manaus_m": 13.33,
    "cota_ita_m": 0.9
  },
  {
    "data": "2023-11-30",
    "irc": 36.8,
    "faixa": "vermelho",
    "idn": 0.002,
    "cota_manaus_m": 14.48,
    "cota_ita_m": 1.71
  },
  {
    "data": "2023-12-07",
    "irc": 36.1,
    "faixa": "vermelho",
    "idn": 0.092,
    "cota_manaus_m": 14.97,
    "cota_ita_m": 2.09
  },
  {
    "data": "2023-12-14",
    "irc": 28.3,
    "faixa": "vermelho",
    "idn": 0.195,
    "cota_manaus_m": 15.79,
    "cota_ita_m": 2.91
  },
  {
    "data": "2023-12-21",
    "irc": 15.9,
    "faixa": "verde",
    "idn": 0.071,
    "cota_manaus_m": 17.14,
    "cota_ita_m": 4.11
  },
  {
    "data": "2023-12-28",
    "irc": 10.3,
    "faixa": "verde",
    "idn": 0.072,
    "cota_manaus_m": 18.22,
    "cota_ita_m": 4.88
  },
  {
    "data": "2024-01-04",
    "irc": 8.6,
    "faixa": "verde",
    "idn": -0.05,
    "cota_manaus_m": 19.16,
    "cota_ita_m": 5.73
  },
  {
    "data": "2024-01-11",
    "irc": 3,
    "faixa": "verde",
    "idn": -0.1,
    "cota_manaus_m": 19.87,
    "cota_ita_m": 6.37
  },
  {
    "data": "2024-01-18",
    "irc": 14.6,
    "faixa": "verde",
    "idn": -0.188,
    "cota_manaus_m": 20.58,
    "cota_ita_m": 7.07
  },
  {
    "data": "2024-01-25",
    "irc": 14.6,
    "faixa": "verde",
    "idn": -0.293,
    "cota_manaus_m": 20.91,
    "cota_ita_m": 7.36
  },
  {
    "data": "2024-02-01",
    "irc": 14.4,
    "faixa": "verde",
    "idn": -0.185,
    "cota_manaus_m": 21.2,
    "cota_ita_m": 7.71
  },
  {
    "data": "2024-02-08",
    "irc": 2.4,
    "faixa": "verde",
    "idn": -0.063,
    "cota_manaus_m": 21.54,
    "cota_ita_m": 8.09
  },
  {
    "data": "2024-02-15",
    "irc": 14,
    "faixa": "verde",
    "idn": -0.186,
    "cota_manaus_m": 21.77,
    "cota_ita_m": 8.41
  },
  {
    "data": "2024-02-22",
    "irc": 13.9,
    "faixa": "verde",
    "idn": -0.27,
    "cota_manaus_m": 21.93,
    "cota_ita_m": 8.6
  },
  {
    "data": "2024-02-29",
    "irc": 2,
    "faixa": "verde",
    "idn": -0.006,
    "cota_manaus_m": 22.22,
    "cota_ita_m": 8.88
  },
  {
    "data": "2024-03-07",
    "irc": 1.9,
    "faixa": "verde",
    "idn": 0.241,
    "cota_manaus_m": 22.59,
    "cota_ita_m": 9.27
  },
  {
    "data": "2024-03-14",
    "irc": 1.7,
    "faixa": "verde",
    "idn": 0.218,
    "cota_manaus_m": 22.83,
    "cota_ita_m": 9.54
  },
  {
    "data": "2024-03-21",
    "irc": 1.7,
    "faixa": "verde",
    "idn": 0.06,
    "cota_manaus_m": 23.11,
    "cota_ita_m": 9.82
  },
  {
    "data": "2024-03-28",
    "irc": 1.8,
    "faixa": "verde",
    "idn": -0.016,
    "cota_manaus_m": 23.5,
    "cota_ita_m": 10.12
  },
  {
    "data": "2024-04-04",
    "irc": 1.7,
    "faixa": "verde",
    "idn": 0.063,
    "cota_manaus_m": 23.84,
    "cota_ita_m": 10.42
  },
  {
    "data": "2024-04-11",
    "irc": 13.6,
    "faixa": "verde",
    "idn": -0.218,
    "cota_manaus_m": 24.2,
    "cota_ita_m": 10.71
  },
  {
    "data": "2024-04-18",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.304,
    "cota_manaus_m": 24.66,
    "cota_ita_m": 11.09
  },
  {
    "data": "2024-04-25",
    "irc": 1.9,
    "faixa": "verde",
    "idn": -0.133,
    "cota_manaus_m": 25.11,
    "cota_ita_m": 11.46
  },
  {
    "data": "2024-05-02",
    "irc": 13.7,
    "faixa": "verde",
    "idn": -0.168,
    "cota_manaus_m": 25.41,
    "cota_ita_m": 11.72
  },
  {
    "data": "2024-05-09",
    "irc": 13.9,
    "faixa": "verde",
    "idn": -0.167,
    "cota_manaus_m": 25.67,
    "cota_ita_m": 11.86
  },
  {
    "data": "2024-05-16",
    "irc": 14,
    "faixa": "verde",
    "idn": -0.25,
    "cota_manaus_m": 25.85,
    "cota_ita_m": 11.96
  },
  {
    "data": "2024-05-23",
    "irc": 2.4,
    "faixa": "verde",
    "idn": -0.143,
    "cota_manaus_m": 26.15,
    "cota_ita_m": 12.1
  },
  {
    "data": "2024-05-30",
    "irc": 14.5,
    "faixa": "verde",
    "idn": -0.238,
    "cota_manaus_m": 26.4,
    "cota_ita_m": 12.22
  },
  {
    "data": "2024-06-06",
    "irc": 14.7,
    "faixa": "verde",
    "idn": -0.417,
    "cota_manaus_m": 26.63,
    "cota_ita_m": 12.31
  },
  {
    "data": "2024-06-13",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.709,
    "cota_manaus_m": 26.81,
    "cota_ita_m": 12.35
  },
  {
    "data": "2024-06-20",
    "irc": 15.2,
    "faixa": "verde",
    "idn": -0.86,
    "cota_manaus_m": 26.85,
    "cota_ita_m": 12.26
  },
  {
    "data": "2024-06-27",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.717,
    "cota_manaus_m": 26.82,
    "cota_ita_m": 12.17
  },
  {
    "data": "2024-07-04",
    "irc": 15.4,
    "faixa": "verde",
    "idn": -0.724,
    "cota_manaus_m": 26.73,
    "cota_ita_m": 12.03
  },
  {
    "data": "2024-07-11",
    "irc": 15.5,
    "faixa": "verde",
    "idn": -0.557,
    "cota_manaus_m": 26.49,
    "cota_ita_m": 11.79
  },
  {
    "data": "2024-07-18",
    "irc": 15.5,
    "faixa": "verde",
    "idn": -0.445,
    "cota_manaus_m": 26.14,
    "cota_ita_m": 11.48
  },
  {
    "data": "2024-07-25",
    "irc": 15.5,
    "faixa": "verde",
    "idn": -0.469,
    "cota_manaus_m": 25.64,
    "cota_ita_m": 11.07
  },
  {
    "data": "2024-08-01",
    "irc": 15.5,
    "faixa": "verde",
    "idn": -0.551,
    "cota_manaus_m": 25.09,
    "cota_ita_m": 10.58
  },
  {
    "data": "2024-08-08",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.495,
    "cota_manaus_m": 24.29,
    "cota_ita_m": 9.98
  },
  {
    "data": "2024-08-15",
    "irc": 15.3,
    "faixa": "verde",
    "idn": -0.43,
    "cota_manaus_m": 23.45,
    "cota_ita_m": 9.22
  },
  {
    "data": "2024-08-22",
    "irc": 15.2,
    "faixa": "verde",
    "idn": -0.368,
    "cota_manaus_m": 22.15,
    "cota_ita_m": 8.18
  },
  {
    "data": "2024-08-29",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.292,
    "cota_manaus_m": 20.53,
    "cota_ita_m": 6.9
  },
  {
    "data": "2024-09-05",
    "irc": 21.9,
    "faixa": "amarelo",
    "idn": -0.472,
    "cota_manaus_m": 18.75,
    "cota_ita_m": 5.45
  },
  {
    "data": "2024-09-12",
    "irc": 27.7,
    "faixa": "vermelho",
    "idn": -0.596,
    "cota_manaus_m": 16.97,
    "cota_ita_m": 4
  },
  {
    "data": "2024-09-19",
    "irc": 42.7,
    "faixa": "vermelho",
    "idn": -0.666,
    "cota_manaus_m": 15.29,
    "cota_ita_m": 2.56
  },
  {
    "data": "2024-09-26",
    "irc": 59.4,
    "faixa": "vermelho",
    "idn": -0.912,
    "cota_manaus_m": 13.92,
    "cota_ita_m": 1.38
  },
  {
    "data": "2024-10-03",
    "irc": 67.1,
    "faixa": "vermelho",
    "idn": -0.905,
    "cota_manaus_m": 12.77,
    "cota_ita_m": 0.4
  },
  {
    "data": "2024-10-10",
    "irc": 71.8,
    "faixa": "vermelho",
    "idn": -1.048,
    "cota_manaus_m": 12.11,
    "cota_ita_m": 0.02
  },
  {
    "data": "2024-10-17",
    "irc": 71.6,
    "faixa": "vermelho",
    "idn": -0.736,
    "cota_manaus_m": 12.25,
    "cota_ita_m": 0.04
  },
  {
    "data": "2024-10-24",
    "irc": 70.1,
    "faixa": "vermelho",
    "idn": -0.452,
    "cota_manaus_m": 12.5,
    "cota_ita_m": 0.2
  },
  {
    "data": "2024-10-31",
    "irc": 72,
    "faixa": "vermelho",
    "idn": -0.305,
    "cota_manaus_m": 12.18,
    "cota_ita_m": -0.17
  },
  {
    "data": "2024-11-07",
    "irc": 72,
    "faixa": "vermelho",
    "idn": -0.154,
    "cota_manaus_m": 12.19,
    "cota_ita_m": -0.13
  },
  {
    "data": "2024-11-14",
    "irc": 67.1,
    "faixa": "vermelho",
    "idn": 0.064,
    "cota_manaus_m": 13.09,
    "cota_ita_m": 0.49
  },
  {
    "data": "2024-11-21",
    "irc": 55.3,
    "faixa": "vermelho",
    "idn": 0.293,
    "cota_manaus_m": 14.15,
    "cota_ita_m": 1.51
  },
  {
    "data": "2024-11-28",
    "irc": 39.1,
    "faixa": "vermelho",
    "idn": 0.12,
    "cota_manaus_m": 14.3,
    "cota_ita_m": 1.65
  },
  {
    "data": "2024-12-05",
    "irc": 46.9,
    "faixa": "vermelho",
    "idn": 0.276,
    "cota_manaus_m": 14.65,
    "cota_ita_m": 2.03
  },
  {
    "data": "2024-12-12",
    "irc": 40.1,
    "faixa": "vermelho",
    "idn": 0.388,
    "cota_manaus_m": 15.44,
    "cota_ita_m": 2.71
  },
  {
    "data": "2024-12-19",
    "irc": 33.1,
    "faixa": "vermelho",
    "idn": 0.41,
    "cota_manaus_m": 16.34,
    "cota_ita_m": 3.62
  },
  {
    "data": "2024-12-26",
    "irc": 22.3,
    "faixa": "amarelo",
    "idn": 0.392,
    "cota_manaus_m": 17.38,
    "cota_ita_m": 4.51
  },
  {
    "data": "2025-01-02",
    "irc": 9.4,
    "faixa": "verde",
    "idn": 0.133,
    "cota_manaus_m": 18.58,
    "cota_ita_m": 5.56
  },
  {
    "data": "2025-01-09",
    "irc": 14.4,
    "faixa": "verde",
    "idn": -0.172,
    "cota_manaus_m": 19.99,
    "cota_ita_m": 6.68
  },
  {
    "data": "2025-01-16",
    "irc": 2.4,
    "faixa": "verde",
    "idn": -0.099,
    "cota_manaus_m": 20.9,
    "cota_ita_m": 7.56
  },
  {
    "data": "2025-01-23",
    "irc": 13.4,
    "faixa": "verde",
    "idn": 0.33,
    "cota_manaus_m": 21.68,
    "cota_ita_m": 8.34
  },
  {
    "data": "2025-01-30",
    "irc": 13.2,
    "faixa": "verde",
    "idn": 0.454,
    "cota_manaus_m": 22.17,
    "cota_ita_m": 8.87
  },
  {
    "data": "2025-02-06",
    "irc": 1.5,
    "faixa": "verde",
    "idn": 0.073,
    "cota_manaus_m": 22.23,
    "cota_ita_m": 9.14
  },
  {
    "data": "2025-02-13",
    "irc": 1.3,
    "faixa": "verde",
    "idn": -0.13,
    "cota_manaus_m": 22.39,
    "cota_ita_m": 9.4
  },
  {
    "data": "2025-02-20",
    "irc": 13.2,
    "faixa": "verde",
    "idn": -0.308,
    "cota_manaus_m": 23.01,
    "cota_ita_m": 9.9
  },
  {
    "data": "2025-02-27",
    "irc": 13.3,
    "faixa": "verde",
    "idn": -0.303,
    "cota_manaus_m": 23.79,
    "cota_ita_m": 10.52
  },
  {
    "data": "2025-03-06",
    "irc": 1.5,
    "faixa": "verde",
    "idn": -0.136,
    "cota_manaus_m": 24.5,
    "cota_ita_m": 11.13
  },
  {
    "data": "2025-03-13",
    "irc": 1.4,
    "faixa": "verde",
    "idn": 0.176,
    "cota_manaus_m": 25.03,
    "cota_ita_m": 11.63
  },
  {
    "data": "2025-03-20",
    "irc": 12.6,
    "faixa": "verde",
    "idn": 0.275,
    "cota_manaus_m": 25.47,
    "cota_ita_m": 12.05
  },
  {
    "data": "2025-03-27",
    "irc": 12.5,
    "faixa": "verde",
    "idn": 0.403,
    "cota_manaus_m": 25.86,
    "cota_ita_m": 12.41
  },
  {
    "data": "2025-04-03",
    "irc": 12.4,
    "faixa": "verde",
    "idn": 0.518,
    "cota_manaus_m": 26.15,
    "cota_ita_m": 12.71
  },
  {
    "data": "2025-04-10",
    "irc": 12.4,
    "faixa": "verde",
    "idn": 0.432,
    "cota_manaus_m": 26.47,
    "cota_ita_m": 13
  },
  {
    "data": "2025-04-17",
    "irc": 1.2,
    "faixa": "verde",
    "idn": 0.189,
    "cota_manaus_m": 26.91,
    "cota_ita_m": 13.37
  },
  {
    "data": "2025-04-24",
    "irc": 12.6,
    "faixa": "verde",
    "idn": 0.283,
    "cota_manaus_m": 27.34,
    "cota_ita_m": 13.67
  },
  {
    "data": "2025-05-01",
    "irc": 12.7,
    "faixa": "verde",
    "idn": 0.399,
    "cota_manaus_m": 27.73,
    "cota_ita_m": 13.94
  },
  {
    "data": "2025-05-05",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.526,
    "cota_manaus_m": 27.9,
    "cota_ita_m": 14.04
  },
  {
    "data": "2025-05-06",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.545,
    "cota_manaus_m": 27.92,
    "cota_ita_m": 14.06
  },
  {
    "data": "2025-05-07",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.55,
    "cota_manaus_m": 27.96,
    "cota_ita_m": 14.09
  },
  {
    "data": "2025-05-08",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.538,
    "cota_manaus_m": 27.99,
    "cota_ita_m": 14.11
  },
  {
    "data": "2025-05-09",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.52,
    "cota_manaus_m": 28.02,
    "cota_ita_m": 14.14
  },
  {
    "data": "2025-05-10",
    "irc": 12.8,
    "faixa": "verde",
    "idn": 0.498,
    "cota_manaus_m": 28.05,
    "cota_ita_m": 14.15
  },
  {
    "data": "2025-05-11",
    "irc": 12.9,
    "faixa": "verde",
    "idn": 0.48,
    "cota_manaus_m": 28.07,
    "cota_ita_m": 14.16
  },
  {
    "data": "2025-05-12",
    "irc": 12.9,
    "faixa": "verde",
    "idn": 0.462,
    "cota_manaus_m": 28.09,
    "cota_ita_m": 14.16
  },
  {
    "data": "2025-05-13",
    "irc": 12.9,
    "faixa": "verde",
    "idn": 0.445,
    "cota_manaus_m": 28.12,
    "cota_ita_m": 14.18
  },
  {
    "data": "2025-05-14",
    "irc": 12.9,
    "faixa": "verde",
    "idn": 0.44,
    "cota_manaus_m": 28.14,
    "cota_ita_m": 14.2
  },
  {
    "data": "2025-05-15",
    "irc": 12.9,
    "faixa": "verde",
    "idn": 0.444,
    "cota_manaus_m": 28.17,
    "cota_ita_m": 14.22
  },
  {
    "data": "2025-05-16",
    "irc": 13,
    "faixa": "verde",
    "idn": 0.456,
    "cota_manaus_m": 28.21,
    "cota_ita_m": 14.23
  },
  {
    "data": "2025-05-17",
    "irc": 13,
    "faixa": "verde",
    "idn": 0.469,
    "cota_manaus_m": 28.25,
    "cota_ita_m": 14.25
  },
  {
    "data": "2025-05-18",
    "irc": 13,
    "faixa": "verde",
    "idn": 0.472,
    "cota_manaus_m": 28.29,
    "cota_ita_m": 14.28
  },
  {
    "data": "2025-05-19",
    "irc": 13,
    "faixa": "verde",
    "idn": 0.469,
    "cota_manaus_m": 28.32,
    "cota_ita_m": 14.3
  },
  {
    "data": "2025-05-20",
    "irc": 13.1,
    "faixa": "verde",
    "idn": 0.461,
    "cota_manaus_m": 28.35,
    "cota_ita_m": 14.31
  },
  {
    "data": "2025-05-21",
    "irc": 13.1,
    "faixa": "verde",
    "idn": 0.446,
    "cota_manaus_m": 28.38,
    "cota_ita_m": 14.3
  },
  {
    "data": "2025-05-22",
    "irc": 13.1,
    "faixa": "verde",
    "idn": 0.429,
    "cota_manaus_m": 28.4,
    "cota_ita_m": 14.32
  },
  {
    "data": "2025-05-23",
    "irc": 13.1,
    "faixa": "verde",
    "idn": 0.419,
    "cota_manaus_m": 28.42,
    "cota_ita_m": 14.33
  },
  {
    "data": "2025-05-24",
    "irc": 13.2,
    "faixa": "verde",
    "idn": 0.404,
    "cota_manaus_m": 28.45,
    "cota_ita_m": 14.34
  },
  {
    "data": "2025-05-25",
    "irc": 13.2,
    "faixa": "verde",
    "idn": 0.402,
    "cota_manaus_m": 28.47,
    "cota_ita_m": 14.35
  },
  {
    "data": "2025-05-26",
    "irc": 13.2,
    "faixa": "verde",
    "idn": 0.384,
    "cota_manaus_m": 28.49,
    "cota_ita_m": 14.36
  },
  {
    "data": "2025-05-27",
    "irc": 13.2,
    "faixa": "verde",
    "idn": 0.368,
    "cota_manaus_m": 28.51,
    "cota_ita_m": 14.36
  },
  {
    "data": "2025-05-28",
    "irc": 13.3,
    "faixa": "verde",
    "idn": 0.35,
    "cota_manaus_m": 28.54,
    "cota_ita_m": 14.36
  },
  {
    "data": "2025-05-29",
    "irc": 13.3,
    "faixa": "verde",
    "idn": 0.338,
    "cota_manaus_m": 28.55,
    "cota_ita_m": 14.35
  },
  {
    "data": "2025-05-30",
    "irc": 13.3,
    "faixa": "verde",
    "idn": 0.318,
    "cota_manaus_m": 28.57,
    "cota_ita_m": 14.36
  },
  {
    "data": "2025-05-31",
    "irc": 13.4,
    "faixa": "verde",
    "idn": 0.305,
    "cota_manaus_m": 28.59,
    "cota_ita_m": 14.35
  },
  {
    "data": "2025-06-01",
    "irc": 13.4,
    "faixa": "verde",
    "idn": 0.294,
    "cota_manaus_m": 28.6,
    "cota_ita_m": 14.35
  },
  {
    "data": "2025-06-02",
    "irc": 13.4,
    "faixa": "verde",
    "idn": 0.288,
    "cota_manaus_m": 28.61,
    "cota_ita_m": 14.38
  },
  {
    "data": "2025-06-03",
    "irc": 13.5,
    "faixa": "verde",
    "idn": 0.288,
    "cota_manaus_m": 28.65,
    "cota_ita_m": 14.37
  },
  {
    "data": "2025-06-04",
    "irc": 13.5,
    "faixa": "verde",
    "idn": 0.286,
    "cota_manaus_m": 28.66,
    "cota_ita_m": 14.37
  },
  {
    "data": "2025-06-05",
    "irc": 13.5,
    "faixa": "verde",
    "idn": 0.273,
    "cota_manaus_m": 28.68,
    "cota_ita_m": 14.38
  },
  {
    "data": "2025-06-06",
    "irc": 13.5,
    "faixa": "verde",
    "idn": 0.254,
    "cota_manaus_m": 28.69,
    "cota_ita_m": 14.38
  },
  {
    "data": "2025-06-07",
    "irc": 2.3,
    "faixa": "verde",
    "idn": 0.228,
    "cota_manaus_m": 28.71,
    "cota_ita_m": 14.39
  },
  {
    "data": "2025-06-08",
    "irc": 2.3,
    "faixa": "verde",
    "idn": 0.189,
    "cota_manaus_m": 28.74,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-06-09",
    "irc": 2.4,
    "faixa": "verde",
    "idn": 0.15,
    "cota_manaus_m": 28.76,
    "cota_ita_m": 14.4
  },
  {
    "data": "2025-06-10",
    "irc": 2.4,
    "faixa": "verde",
    "idn": 0.112,
    "cota_manaus_m": 28.78,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-06-11",
    "irc": 2.4,
    "faixa": "verde",
    "idn": 0.079,
    "cota_manaus_m": 28.79,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-06-12",
    "irc": 2.4,
    "faixa": "verde",
    "idn": 0.048,
    "cota_manaus_m": 28.81,
    "cota_ita_m": 14.4
  },
  {
    "data": "2025-06-13",
    "irc": 2.5,
    "faixa": "verde",
    "idn": 0.019,
    "cota_manaus_m": 28.85,
    "cota_ita_m": 14.42
  },
  {
    "data": "2025-06-14",
    "irc": 2.5,
    "faixa": "verde",
    "idn": -0.016,
    "cota_manaus_m": 28.86,
    "cota_ita_m": 14.43
  },
  {
    "data": "2025-06-15",
    "irc": 2.5,
    "faixa": "verde",
    "idn": -0.053,
    "cota_manaus_m": 28.87,
    "cota_ita_m": 14.43
  },
  {
    "data": "2025-06-16",
    "irc": 2.5,
    "faixa": "verde",
    "idn": -0.082,
    "cota_manaus_m": 28.89,
    "cota_ita_m": 14.43
  },
  {
    "data": "2025-06-17",
    "irc": 2.5,
    "faixa": "verde",
    "idn": -0.105,
    "cota_manaus_m": 28.9,
    "cota_ita_m": 14.43
  },
  {
    "data": "2025-06-18",
    "irc": 2.6,
    "faixa": "verde",
    "idn": -0.131,
    "cota_manaus_m": 28.91,
    "cota_ita_m": 14.43
  },
  {
    "data": "2025-06-19",
    "irc": 2.6,
    "faixa": "verde",
    "idn": -0.149,
    "cota_manaus_m": 28.92,
    "cota_ita_m": 14.44
  },
  {
    "data": "2025-06-20",
    "irc": 14.5,
    "faixa": "verde",
    "idn": -0.162,
    "cota_manaus_m": 28.93,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-06-21",
    "irc": 14.5,
    "faixa": "verde",
    "idn": -0.166,
    "cota_manaus_m": 28.94,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-06-22",
    "irc": 14.5,
    "faixa": "verde",
    "idn": -0.162,
    "cota_manaus_m": 28.95,
    "cota_ita_m": 14.42
  },
  {
    "data": "2025-06-23",
    "irc": 2.7,
    "faixa": "verde",
    "idn": -0.157,
    "cota_manaus_m": 28.96,
    "cota_ita_m": 14.42
  },
  {
    "data": "2025-06-24",
    "irc": 2.7,
    "faixa": "verde",
    "idn": -0.142,
    "cota_manaus_m": 28.97,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-06-25",
    "irc": 2.7,
    "faixa": "verde",
    "idn": -0.126,
    "cota_manaus_m": 28.97,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-06-26",
    "irc": 2.7,
    "faixa": "verde",
    "idn": -0.115,
    "cota_manaus_m": 28.98,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-06-27",
    "irc": 2.8,
    "faixa": "verde",
    "idn": -0.094,
    "cota_manaus_m": 28.99,
    "cota_ita_m": 14.4
  },
  {
    "data": "2025-06-28",
    "irc": 2.7,
    "faixa": "verde",
    "idn": -0.074,
    "cota_manaus_m": 29,
    "cota_ita_m": 14.42
  },
  {
    "data": "2025-06-29",
    "irc": 2.8,
    "faixa": "verde",
    "idn": -0.054,
    "cota_manaus_m": 29.01,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-06-30",
    "irc": 2.8,
    "faixa": "verde",
    "idn": -0.025,
    "cota_manaus_m": 29.02,
    "cota_ita_m": 14.42
  },
  {
    "data": "2025-07-01",
    "irc": 2.8,
    "faixa": "verde",
    "idn": 0.015,
    "cota_manaus_m": 29.02,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-07-02",
    "irc": 2.8,
    "faixa": "verde",
    "idn": 0.022,
    "cota_manaus_m": 29.02,
    "cota_ita_m": 14.41
  },
  {
    "data": "2025-07-03",
    "irc": 2.8,
    "faixa": "verde",
    "idn": -0.052,
    "cota_manaus_m": 29.03,
    "cota_ita_m": 14.42
  },
  {
    "data": "2025-07-04",
    "irc": 2.8,
    "faixa": "verde",
    "idn": 0.002,
    "cota_manaus_m": 29.04,
    "cota_ita_m": 14.44
  },
  {
    "data": "2025-07-05",
    "irc": 2.8,
    "faixa": "verde",
    "idn": 0.051,
    "cota_manaus_m": 29.05,
    "cota_ita_m": 14.44
  },
  {
    "data": "2025-07-06",
    "irc": 2.8,
    "faixa": "verde",
    "idn": 0.092,
    "cota_manaus_m": 29.05,
    "cota_ita_m": 14.42
  },
  {
    "data": "2025-07-07",
    "irc": 2.8,
    "faixa": "verde",
    "idn": 0.125,
    "cota_manaus_m": 29.05,
    "cota_ita_m": 14.42
  },
  {
    "data": "2025-07-08",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.14,
    "cota_manaus_m": 29.05,
    "cota_ita_m": 14.4
  },
  {
    "data": "2025-07-09",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.144,
    "cota_manaus_m": 29.03,
    "cota_ita_m": 14.37
  },
  {
    "data": "2025-07-10",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.14,
    "cota_manaus_m": 29.01,
    "cota_ita_m": 14.35
  },
  {
    "data": "2025-07-11",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.128,
    "cota_manaus_m": 28.99,
    "cota_ita_m": 14.35
  },
  {
    "data": "2025-07-12",
    "irc": 2.8,
    "faixa": "verde",
    "idn": 0.115,
    "cota_manaus_m": 28.97,
    "cota_ita_m": 14.34
  },
  {
    "data": "2025-07-13",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.099,
    "cota_manaus_m": 28.96,
    "cota_ita_m": 14.32
  },
  {
    "data": "2025-07-14",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.083,
    "cota_manaus_m": 28.95,
    "cota_ita_m": 14.3
  },
  {
    "data": "2025-07-15",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.071,
    "cota_manaus_m": 28.93,
    "cota_ita_m": 14.27
  },
  {
    "data": "2025-07-16",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.058,
    "cota_manaus_m": 28.91,
    "cota_ita_m": 14.25
  },
  {
    "data": "2025-07-17",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.051,
    "cota_manaus_m": 28.89,
    "cota_ita_m": 14.23
  },
  {
    "data": "2025-07-18",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.039,
    "cota_manaus_m": 28.87,
    "cota_ita_m": 14.22
  },
  {
    "data": "2025-07-19",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.024,
    "cota_manaus_m": 28.85,
    "cota_ita_m": 14.21
  },
  {
    "data": "2025-07-20",
    "irc": 2.9,
    "faixa": "verde",
    "idn": 0.003,
    "cota_manaus_m": 28.82,
    "cota_ita_m": 14.2
  },
  {
    "data": "2025-07-21",
    "irc": 2.9,
    "faixa": "verde",
    "idn": -0.029,
    "cota_manaus_m": 28.79,
    "cota_ita_m": 14.17
  },
  {
    "data": "2025-07-22",
    "irc": 2.9,
    "faixa": "verde",
    "idn": -0.066,
    "cota_manaus_m": 28.77,
    "cota_ita_m": 14.14
  },
  {
    "data": "2025-07-23",
    "irc": 2.9,
    "faixa": "verde",
    "idn": -0.107,
    "cota_manaus_m": 28.75,
    "cota_ita_m": 14.1
  },
  {
    "data": "2025-07-24",
    "irc": 2.9,
    "faixa": "verde",
    "idn": -0.141,
    "cota_manaus_m": 28.72,
    "cota_ita_m": 14.08
  },
  {
    "data": "2025-07-25",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.185,
    "cota_manaus_m": 28.69,
    "cota_ita_m": 14.05
  },
  {
    "data": "2025-07-26",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.216,
    "cota_manaus_m": 28.67,
    "cota_ita_m": 14.02
  },
  {
    "data": "2025-07-27",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.174,
    "cota_manaus_m": 28.64,
    "cota_ita_m": 14
  },
  {
    "data": "2025-07-28",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.178,
    "cota_manaus_m": 28.61,
    "cota_ita_m": 13.98
  },
  {
    "data": "2025-07-29",
    "irc": 14.8,
    "faixa": "verde",
    "idn": -0.181,
    "cota_manaus_m": 28.58,
    "cota_ita_m": 13.94
  },
  {
    "data": "2025-07-30",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.189,
    "cota_manaus_m": 28.55,
    "cota_ita_m": 13.89
  },
  {
    "data": "2025-07-31",
    "irc": 14.9,
    "faixa": "verde",
    "idn": -0.193,
    "cota_manaus_m": 28.52,
    "cota_ita_m": 13.87
  }
];

export const IRC_HISTORICO_RESUMO = {
  n_pontos:        561,
  irc_min:         1.2,
  irc_max:         72,
  irc_medio:       13.23,
  distribuicao:    {"verde":495,"amarelo":24,"laranja":0,"vermelho":42},
  versao_irc:      "v3.5",
  componentes_zerados_retrospectivamente: ["onda_branco", "anomalia_pp"],
  gerado_em:       "2026-05-22T14:13:21.836Z",
  git_sha:         "b77f6a4f724bb4a3f081fe1d832a53980ef2791f",
  git_dirty:       true,
} as const;
