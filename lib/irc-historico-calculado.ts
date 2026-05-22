// AUTO-GERADO por scripts/gera-irc-historico.mjs em 2026-05-21T23:10:22.668Z
// Série histórica do IRC (Índice de Risco de Calado) calculada retroativamente.
// Componentes Onda Branco e Anomalia Precipitação fixados em 0 nesta v1 por
// falta de dados retroativos consolidados — pontos refletem só LWS + HMM.

export interface PontoIRC {
  data:    string;     // YYYY-MM-DD
  irc:     number;     // 0..100
  faixa:   "verde" | "amarelo" | "laranja" | "vermelho";
  idn:     number;     // IDN do dia (para cross-ref com outros gráficos)
  cota_m:  number;     // cota Manaus do dia
}

export const IRC_HISTORICO_CALCULADO: PontoIRC[] = [
  {
    "data": "2016-01-07",
    "irc": 71.2,
    "faixa": "laranja",
    "idn": 0.206,
    "cota_m": 18.12
  },
  {
    "data": "2016-01-14",
    "irc": 57.7,
    "faixa": "laranja",
    "idn": 0.074,
    "cota_m": 18.92
  },
  {
    "data": "2016-01-21",
    "irc": 46.1,
    "faixa": "amarelo",
    "idn": 0.218,
    "cota_m": 19.61
  },
  {
    "data": "2016-01-28",
    "irc": 55.8,
    "faixa": "laranja",
    "idn": 0.303,
    "cota_m": 20.11
  },
  {
    "data": "2016-02-04",
    "irc": 37.3,
    "faixa": "amarelo",
    "idn": 0.112,
    "cota_m": 20.13
  },
  {
    "data": "2016-02-11",
    "irc": 40.3,
    "faixa": "amarelo",
    "idn": 0.136,
    "cota_m": 19.95
  },
  {
    "data": "2016-02-18",
    "irc": 44.9,
    "faixa": "amarelo",
    "idn": 0.169,
    "cota_m": 19.68
  },
  {
    "data": "2016-02-25",
    "irc": 45.7,
    "faixa": "amarelo",
    "idn": -0.068,
    "cota_m": 19.63
  },
  {
    "data": "2016-03-03",
    "irc": 55.7,
    "faixa": "laranja",
    "idn": -0.269,
    "cota_m": 20.16
  },
  {
    "data": "2016-03-10",
    "irc": 40.8,
    "faixa": "amarelo",
    "idn": -0.308,
    "cota_m": 21.04
  },
  {
    "data": "2016-03-17",
    "irc": 6.5,
    "faixa": "verde",
    "idn": -0.095,
    "cota_m": 21.95
  },
  {
    "data": "2016-03-24",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.157,
    "cota_m": 22.64
  },
  {
    "data": "2016-03-31",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.179,
    "cota_m": 23.3
  },
  {
    "data": "2016-04-07",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.139,
    "cota_m": 23.68
  },
  {
    "data": "2016-04-14",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.348,
    "cota_m": 24.41
  },
  {
    "data": "2016-04-21",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.344,
    "cota_m": 24.86
  },
  {
    "data": "2016-04-28",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.175,
    "cota_m": 25.3
  },
  {
    "data": "2016-05-05",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.159,
    "cota_m": 25.8
  },
  {
    "data": "2016-05-12",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.308,
    "cota_m": 26.29
  },
  {
    "data": "2016-05-19",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.292,
    "cota_m": 26.61
  },
  {
    "data": "2016-05-26",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.07,
    "cota_m": 26.85
  },
  {
    "data": "2016-06-02",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.205,
    "cota_m": 27.01
  },
  {
    "data": "2016-06-09",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.447,
    "cota_m": 27.11
  },
  {
    "data": "2016-06-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.365,
    "cota_m": 27.19
  },
  {
    "data": "2016-06-23",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.439,
    "cota_m": 27.17
  },
  {
    "data": "2016-06-30",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.518,
    "cota_m": 27.18
  },
  {
    "data": "2016-07-07",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.464,
    "cota_m": 27.11
  },
  {
    "data": "2016-07-14",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.674,
    "cota_m": 27.02
  },
  {
    "data": "2016-07-21",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.619,
    "cota_m": 26.85
  },
  {
    "data": "2016-07-28",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.746,
    "cota_m": 26.72
  },
  {
    "data": "2016-08-04",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.845,
    "cota_m": 26.46
  },
  {
    "data": "2016-08-11",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.778,
    "cota_m": 26.1
  },
  {
    "data": "2016-08-18",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.675,
    "cota_m": 25.69
  },
  {
    "data": "2016-08-25",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.381,
    "cota_m": 25.13
  },
  {
    "data": "2016-09-01",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.378,
    "cota_m": 24.38
  },
  {
    "data": "2016-09-08",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.246,
    "cota_m": 23.43
  },
  {
    "data": "2016-09-15",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.129,
    "cota_m": 22.22
  },
  {
    "data": "2016-09-22",
    "irc": 44.8,
    "faixa": "amarelo",
    "idn": -0.34,
    "cota_m": 20.8
  },
  {
    "data": "2016-09-29",
    "irc": 65.6,
    "faixa": "laranja",
    "idn": -0.321,
    "cota_m": 19.57
  },
  {
    "data": "2016-10-06",
    "irc": 79.7,
    "faixa": "vermelho",
    "idn": -0.199,
    "cota_m": 18.74
  },
  {
    "data": "2016-10-13",
    "irc": 86.4,
    "faixa": "vermelho",
    "idn": -0.208,
    "cota_m": 18.34
  },
  {
    "data": "2016-10-20",
    "irc": 89.5,
    "faixa": "vermelho",
    "idn": -0.256,
    "cota_m": 18.16
  },
  {
    "data": "2016-10-27",
    "irc": 69.9,
    "faixa": "laranja",
    "idn": -0.088,
    "cota_m": 18.2
  },
  {
    "data": "2016-11-03",
    "irc": 86.8,
    "faixa": "vermelho",
    "idn": -0.178,
    "cota_m": 18.32
  },
  {
    "data": "2016-11-10",
    "irc": 69,
    "faixa": "laranja",
    "idn": -0.013,
    "cota_m": 18.25
  },
  {
    "data": "2016-11-17",
    "irc": 72.5,
    "faixa": "laranja",
    "idn": 0.105,
    "cota_m": 18.05
  },
  {
    "data": "2016-11-24",
    "irc": 76.3,
    "faixa": "vermelho",
    "idn": 0.188,
    "cota_m": 17.82
  },
  {
    "data": "2016-12-01",
    "irc": 77.7,
    "faixa": "vermelho",
    "idn": -0.094,
    "cota_m": 17.74
  },
  {
    "data": "2016-12-08",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.215,
    "cota_m": 17.39
  },
  {
    "data": "2016-12-15",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.202,
    "cota_m": 17.2
  },
  {
    "data": "2016-12-22",
    "irc": 98.4,
    "faixa": "vermelho",
    "idn": -0.295,
    "cota_m": 17.6
  },
  {
    "data": "2016-12-29",
    "irc": 78.5,
    "faixa": "vermelho",
    "idn": -0.566,
    "cota_m": 18.81
  },
  {
    "data": "2017-01-05",
    "irc": 54.1,
    "faixa": "laranja",
    "idn": -0.666,
    "cota_m": 20.25
  },
  {
    "data": "2017-01-12",
    "irc": 34.4,
    "faixa": "amarelo",
    "idn": -0.663,
    "cota_m": 21.42
  },
  {
    "data": "2017-01-19",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.522,
    "cota_m": 22.48
  },
  {
    "data": "2017-01-26",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.407,
    "cota_m": 23.39
  },
  {
    "data": "2017-02-02",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.21,
    "cota_m": 24.15
  },
  {
    "data": "2017-02-09",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.435,
    "cota_m": 24.7
  },
  {
    "data": "2017-02-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.505,
    "cota_m": 25.05
  },
  {
    "data": "2017-02-23",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.194,
    "cota_m": 25.38
  },
  {
    "data": "2017-03-02",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.091,
    "cota_m": 25.72
  },
  {
    "data": "2017-03-09",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.135,
    "cota_m": 26.03
  },
  {
    "data": "2017-03-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.437,
    "cota_m": 26.39
  },
  {
    "data": "2017-03-23",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.527,
    "cota_m": 26.84
  },
  {
    "data": "2017-03-30",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.388,
    "cota_m": 27.19
  },
  {
    "data": "2017-04-06",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.226,
    "cota_m": 27.59
  },
  {
    "data": "2017-04-13",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.106,
    "cota_m": 27.82
  },
  {
    "data": "2017-04-20",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.177,
    "cota_m": 27.95
  },
  {
    "data": "2017-04-27",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.074,
    "cota_m": 28.16
  },
  {
    "data": "2017-05-04",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.414,
    "cota_m": 28.43
  },
  {
    "data": "2017-05-11",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.263,
    "cota_m": 28.65
  },
  {
    "data": "2017-05-18",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.023,
    "cota_m": 28.81
  },
  {
    "data": "2017-05-25",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.255,
    "cota_m": 28.91
  },
  {
    "data": "2017-06-01",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.575,
    "cota_m": 28.97
  },
  {
    "data": "2017-06-08",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.72,
    "cota_m": 28.96
  },
  {
    "data": "2017-06-15",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.621,
    "cota_m": 28.85
  },
  {
    "data": "2017-06-22",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.712,
    "cota_m": 28.7
  },
  {
    "data": "2017-06-29",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.603,
    "cota_m": 28.59
  },
  {
    "data": "2017-07-06",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.328,
    "cota_m": 28.48
  },
  {
    "data": "2017-07-13",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.093,
    "cota_m": 28.31
  },
  {
    "data": "2017-07-20",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.126,
    "cota_m": 28.08
  },
  {
    "data": "2017-07-27",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.278,
    "cota_m": 27.79
  },
  {
    "data": "2017-08-03",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.167,
    "cota_m": 27.4
  },
  {
    "data": "2017-08-10",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.003,
    "cota_m": 27.14
  },
  {
    "data": "2017-08-17",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.086,
    "cota_m": 26.18
  },
  {
    "data": "2017-08-24",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.243,
    "cota_m": 25.19
  },
  {
    "data": "2017-08-31",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.568,
    "cota_m": 23.83
  },
  {
    "data": "2017-09-07",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.269,
    "cota_m": 22.14
  },
  {
    "data": "2017-09-14",
    "irc": 31,
    "faixa": "amarelo",
    "idn": 0.077,
    "cota_m": 20.5
  },
  {
    "data": "2017-09-21",
    "irc": 71,
    "faixa": "laranja",
    "idn": 0.339,
    "cota_m": 19.21
  },
  {
    "data": "2017-09-28",
    "irc": 89.1,
    "faixa": "vermelho",
    "idn": 0.352,
    "cota_m": 18.14
  },
  {
    "data": "2017-10-05",
    "irc": 81.7,
    "faixa": "vermelho",
    "idn": 0.028,
    "cota_m": 17.39
  },
  {
    "data": "2017-10-12",
    "irc": 81.3,
    "faixa": "vermelho",
    "idn": -0.158,
    "cota_m": 17.43
  },
  {
    "data": "2017-10-19",
    "irc": 97.5,
    "faixa": "vermelho",
    "idn": -0.465,
    "cota_m": 17.68
  },
  {
    "data": "2017-10-26",
    "irc": 96.1,
    "faixa": "vermelho",
    "idn": -0.345,
    "cota_m": 17.77
  },
  {
    "data": "2017-11-02",
    "irc": 95.7,
    "faixa": "vermelho",
    "idn": -0.322,
    "cota_m": 17.79
  },
  {
    "data": "2017-11-09",
    "irc": 70.4,
    "faixa": "laranja",
    "idn": -0.152,
    "cota_m": 18.17
  },
  {
    "data": "2017-11-16",
    "irc": 62.1,
    "faixa": "laranja",
    "idn": 0.095,
    "cota_m": 18.66
  },
  {
    "data": "2017-11-23",
    "irc": 75.2,
    "faixa": "vermelho",
    "idn": 0.261,
    "cota_m": 18.96
  },
  {
    "data": "2017-11-30",
    "irc": 70,
    "faixa": "laranja",
    "idn": 0.423,
    "cota_m": 19.27
  },
  {
    "data": "2017-12-07",
    "irc": 68.1,
    "faixa": "laranja",
    "idn": 0.519,
    "cota_m": 19.38
  },
  {
    "data": "2017-12-14",
    "irc": 67.3,
    "faixa": "laranja",
    "idn": 0.594,
    "cota_m": 19.43
  },
  {
    "data": "2017-12-21",
    "irc": 62.9,
    "faixa": "laranja",
    "idn": 0.607,
    "cota_m": 19.69
  },
  {
    "data": "2017-12-28",
    "irc": 53.6,
    "faixa": "laranja",
    "idn": 0.48,
    "cota_m": 20.24
  },
  {
    "data": "2018-01-04",
    "irc": 42.9,
    "faixa": "amarelo",
    "idn": 0.525,
    "cota_m": 20.87
  },
  {
    "data": "2018-01-11",
    "irc": 33.8,
    "faixa": "amarelo",
    "idn": 0.436,
    "cota_m": 21.41
  },
  {
    "data": "2018-01-18",
    "irc": 26.2,
    "faixa": "amarelo",
    "idn": 0.543,
    "cota_m": 21.86
  },
  {
    "data": "2018-01-25",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.521,
    "cota_m": 22.21
  },
  {
    "data": "2018-02-01",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.296,
    "cota_m": 22.61
  },
  {
    "data": "2018-02-08",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.31,
    "cota_m": 23.1
  },
  {
    "data": "2018-02-15",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.519,
    "cota_m": 23.57
  },
  {
    "data": "2018-02-22",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.59,
    "cota_m": 23.97
  },
  {
    "data": "2018-03-01",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.619,
    "cota_m": 24.28
  },
  {
    "data": "2018-03-08",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.716,
    "cota_m": 24.49
  },
  {
    "data": "2018-03-15",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.731,
    "cota_m": 24.51
  },
  {
    "data": "2018-03-22",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.871,
    "cota_m": 24.5
  },
  {
    "data": "2018-03-29",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.897,
    "cota_m": 24.41
  },
  {
    "data": "2018-04-05",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.576,
    "cota_m": 24.54
  },
  {
    "data": "2018-04-12",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.487,
    "cota_m": 24.93
  },
  {
    "data": "2018-04-19",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.52,
    "cota_m": 25.41
  },
  {
    "data": "2018-04-26",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.52,
    "cota_m": 25.86
  },
  {
    "data": "2018-05-03",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.283,
    "cota_m": 26.33
  },
  {
    "data": "2018-05-10",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.038,
    "cota_m": 26.83
  },
  {
    "data": "2018-05-17",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.038,
    "cota_m": 27.27
  },
  {
    "data": "2018-05-24",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.1,
    "cota_m": 27.64
  },
  {
    "data": "2018-05-31",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.078,
    "cota_m": 27.94
  },
  {
    "data": "2018-06-07",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.043,
    "cota_m": 28.14
  },
  {
    "data": "2018-06-14",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.007,
    "cota_m": 28.26
  },
  {
    "data": "2018-06-21",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.13,
    "cota_m": 28.36
  },
  {
    "data": "2018-06-28",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.3,
    "cota_m": 28.37
  },
  {
    "data": "2018-07-05",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.402,
    "cota_m": 28.29
  },
  {
    "data": "2018-07-12",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.443,
    "cota_m": 28.26
  },
  {
    "data": "2018-07-19",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.494,
    "cota_m": 28.17
  },
  {
    "data": "2018-07-26",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.456,
    "cota_m": 27.96
  },
  {
    "data": "2018-08-02",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.465,
    "cota_m": 27.71
  },
  {
    "data": "2018-08-09",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.545,
    "cota_m": 27.37
  },
  {
    "data": "2018-08-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.161,
    "cota_m": 26.95
  },
  {
    "data": "2018-08-23",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.027,
    "cota_m": 26.54
  },
  {
    "data": "2018-08-30",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.132,
    "cota_m": 25.92
  },
  {
    "data": "2018-09-06",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.107,
    "cota_m": 25.25
  },
  {
    "data": "2018-09-13",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.14,
    "cota_m": 24.55
  },
  {
    "data": "2018-09-20",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.163,
    "cota_m": 23.81
  },
  {
    "data": "2018-09-27",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.046,
    "cota_m": 22.91
  },
  {
    "data": "2018-10-04",
    "irc": 29.4,
    "faixa": "amarelo",
    "idn": 0.31,
    "cota_m": 21.67
  },
  {
    "data": "2018-10-11",
    "irc": 21.3,
    "faixa": "verde",
    "idn": 0.231,
    "cota_m": 21.07
  },
  {
    "data": "2018-10-18",
    "irc": 70.5,
    "faixa": "laranja",
    "idn": 0.371,
    "cota_m": 19.24
  },
  {
    "data": "2018-10-25",
    "irc": 86.2,
    "faixa": "vermelho",
    "idn": 0.469,
    "cota_m": 18.31
  },
  {
    "data": "2018-11-01",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.428,
    "cota_m": 17.16
  },
  {
    "data": "2018-11-08",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.592,
    "cota_m": 17.05
  },
  {
    "data": "2018-11-15",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.62,
    "cota_m": 17.26
  },
  {
    "data": "2018-11-22",
    "irc": 95,
    "faixa": "vermelho",
    "idn": 0.64,
    "cota_m": 17.79
  },
  {
    "data": "2018-11-29",
    "irc": 85.2,
    "faixa": "vermelho",
    "idn": 0.453,
    "cota_m": 18.37
  },
  {
    "data": "2018-12-13",
    "irc": 47.3,
    "faixa": "amarelo",
    "idn": 0.305,
    "cota_m": 20.61
  },
  {
    "data": "2018-12-20",
    "irc": 29.4,
    "faixa": "amarelo",
    "idn": 0.382,
    "cota_m": 21.67
  },
  {
    "data": "2018-12-27",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.404,
    "cota_m": 22.36
  },
  {
    "data": "2019-01-03",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.593,
    "cota_m": 22.88
  },
  {
    "data": "2019-01-10",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.719,
    "cota_m": 23.35
  },
  {
    "data": "2019-01-17",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.691,
    "cota_m": 23.76
  },
  {
    "data": "2019-01-24",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.715,
    "cota_m": 24.04
  },
  {
    "data": "2019-01-31",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.496,
    "cota_m": 24.32
  },
  {
    "data": "2019-02-07",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.447,
    "cota_m": 24.6
  },
  {
    "data": "2019-02-14",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.317,
    "cota_m": 24.97
  },
  {
    "data": "2019-02-21",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.344,
    "cota_m": 25.26
  },
  {
    "data": "2019-02-28",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.606,
    "cota_m": 25.58
  },
  {
    "data": "2019-03-07",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.833,
    "cota_m": 25.71
  },
  {
    "data": "2019-03-14",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.923,
    "cota_m": 25.81
  },
  {
    "data": "2019-03-21",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.841,
    "cota_m": 25.91
  },
  {
    "data": "2019-03-28",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.82,
    "cota_m": 26.1
  },
  {
    "data": "2019-04-04",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.83,
    "cota_m": 26.37
  },
  {
    "data": "2019-04-11",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.848,
    "cota_m": 26.62
  },
  {
    "data": "2019-04-18",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.901,
    "cota_m": 26.89
  },
  {
    "data": "2019-04-25",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.858,
    "cota_m": 27.23
  },
  {
    "data": "2019-05-02",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.734,
    "cota_m": 27.58
  },
  {
    "data": "2019-05-09",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.61,
    "cota_m": 27.89
  },
  {
    "data": "2019-05-16",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.37,
    "cota_m": 28.23
  },
  {
    "data": "2019-05-23",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.244,
    "cota_m": 28.61
  },
  {
    "data": "2019-05-30",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.046,
    "cota_m": 28.9
  },
  {
    "data": "2019-06-06",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.032,
    "cota_m": 29.17
  },
  {
    "data": "2019-06-13",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.03,
    "cota_m": 29.31
  },
  {
    "data": "2019-06-20",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.002,
    "cota_m": 29.4
  },
  {
    "data": "2019-06-27",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.053,
    "cota_m": 29.38
  },
  {
    "data": "2019-07-04",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.036,
    "cota_m": 29.26
  },
  {
    "data": "2019-07-11",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.019,
    "cota_m": 29.12
  },
  {
    "data": "2019-07-18",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.085,
    "cota_m": 28.91
  },
  {
    "data": "2019-07-25",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.291,
    "cota_m": 28.66
  },
  {
    "data": "2019-08-01",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.319,
    "cota_m": 28.3
  },
  {
    "data": "2019-08-08",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.294,
    "cota_m": 27.9
  },
  {
    "data": "2019-08-15",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.296,
    "cota_m": 27.51
  },
  {
    "data": "2019-08-22",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.06,
    "cota_m": 27.16
  },
  {
    "data": "2019-08-29",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.086,
    "cota_m": 26.62
  },
  {
    "data": "2019-09-05",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.025,
    "cota_m": 25.98
  },
  {
    "data": "2019-09-12",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.035,
    "cota_m": 25.05
  },
  {
    "data": "2019-09-19",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.021,
    "cota_m": 23.91
  },
  {
    "data": "2019-09-26",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.103,
    "cota_m": 22.46
  },
  {
    "data": "2019-10-03",
    "irc": 26.3,
    "faixa": "amarelo",
    "idn": -0.155,
    "cota_m": 20.78
  },
  {
    "data": "2019-10-10",
    "irc": 49.1,
    "faixa": "amarelo",
    "idn": -0.11,
    "cota_m": 19.43
  },
  {
    "data": "2019-10-17",
    "irc": 62.1,
    "faixa": "laranja",
    "idn": 0.227,
    "cota_m": 18.66
  },
  {
    "data": "2019-10-24",
    "irc": 71.4,
    "faixa": "laranja",
    "idn": -0.009,
    "cota_m": 18.11
  },
  {
    "data": "2019-10-31",
    "irc": 65.3,
    "faixa": "laranja",
    "idn": 0.085,
    "cota_m": 18.47
  },
  {
    "data": "2019-11-07",
    "irc": 58.6,
    "faixa": "laranja",
    "idn": 0.129,
    "cota_m": 18.87
  },
  {
    "data": "2019-11-14",
    "irc": 53,
    "faixa": "laranja",
    "idn": 0.018,
    "cota_m": 19.2
  },
  {
    "data": "2019-11-21",
    "irc": 47.2,
    "faixa": "amarelo",
    "idn": -0.122,
    "cota_m": 19.54
  },
  {
    "data": "2019-11-28",
    "irc": 36.6,
    "faixa": "amarelo",
    "idn": -0.058,
    "cota_m": 20.17
  },
  {
    "data": "2019-12-05",
    "irc": 22.3,
    "faixa": "verde",
    "idn": 0.129,
    "cota_m": 21.01
  },
  {
    "data": "2019-12-12",
    "irc": 16.1,
    "faixa": "verde",
    "idn": 0.173,
    "cota_m": 21.38
  },
  {
    "data": "2019-12-19",
    "irc": 11.2,
    "faixa": "verde",
    "idn": 0.177,
    "cota_m": 21.67
  },
  {
    "data": "2019-12-26",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.231,
    "cota_m": 22.25
  },
  {
    "data": "2020-01-02",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.178,
    "cota_m": 22.99
  },
  {
    "data": "2020-01-09",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.399,
    "cota_m": 23.43
  },
  {
    "data": "2020-01-16",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.721,
    "cota_m": 23.95
  },
  {
    "data": "2020-01-23",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.66,
    "cota_m": 24.32
  },
  {
    "data": "2020-01-30",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.423,
    "cota_m": 24.54
  },
  {
    "data": "2020-02-06",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.34,
    "cota_m": 24.62
  },
  {
    "data": "2020-02-13",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.489,
    "cota_m": 24.54
  },
  {
    "data": "2020-02-20",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.668,
    "cota_m": 24.61
  },
  {
    "data": "2020-02-27",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.673,
    "cota_m": 24.52
  },
  {
    "data": "2020-03-05",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.559,
    "cota_m": 24.6
  },
  {
    "data": "2020-03-12",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.301,
    "cota_m": 24.68
  },
  {
    "data": "2020-03-19",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.237,
    "cota_m": 24.87
  },
  {
    "data": "2020-03-26",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.215,
    "cota_m": 25.12
  },
  {
    "data": "2020-04-02",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.426,
    "cota_m": 25.34
  },
  {
    "data": "2020-04-09",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.255,
    "cota_m": 25.48
  },
  {
    "data": "2020-04-16",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.081,
    "cota_m": 25.88
  },
  {
    "data": "2020-04-23",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.213,
    "cota_m": 26.31
  },
  {
    "data": "2020-04-30",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.18,
    "cota_m": 26.72
  },
  {
    "data": "2020-05-07",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.394,
    "cota_m": 27.12
  },
  {
    "data": "2020-05-14",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.327,
    "cota_m": 27.47
  },
  {
    "data": "2020-05-21",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.151,
    "cota_m": 27.83
  },
  {
    "data": "2020-05-28",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.223,
    "cota_m": 28.17
  },
  {
    "data": "2020-06-04",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.014,
    "cota_m": 28.35
  },
  {
    "data": "2020-06-11",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.031,
    "cota_m": 28.49
  },
  {
    "data": "2020-06-18",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.072,
    "cota_m": 28.52
  },
  {
    "data": "2020-06-25",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.204,
    "cota_m": 28.45
  },
  {
    "data": "2020-07-02",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.155,
    "cota_m": 28.37
  },
  {
    "data": "2020-07-09",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.062,
    "cota_m": 28.3
  },
  {
    "data": "2020-07-16",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.02,
    "cota_m": 28.17
  },
  {
    "data": "2020-07-23",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.307,
    "cota_m": 27.94
  },
  {
    "data": "2020-07-30",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.211,
    "cota_m": 27.6
  },
  {
    "data": "2020-08-06",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.304,
    "cota_m": 27.2
  },
  {
    "data": "2020-08-13",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.358,
    "cota_m": 26.77
  },
  {
    "data": "2020-08-20",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.09,
    "cota_m": 26.15
  },
  {
    "data": "2020-08-27",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.228,
    "cota_m": 25.39
  },
  {
    "data": "2020-09-03",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.605,
    "cota_m": 24.33
  },
  {
    "data": "2020-09-10",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.511,
    "cota_m": 22.95
  },
  {
    "data": "2020-09-17",
    "irc": 36,
    "faixa": "amarelo",
    "idn": 0.383,
    "cota_m": 21.28
  },
  {
    "data": "2020-09-24",
    "irc": 65.6,
    "faixa": "laranja",
    "idn": 0.254,
    "cota_m": 19.53
  },
  {
    "data": "2020-10-01",
    "irc": 71.1,
    "faixa": "laranja",
    "idn": 0.223,
    "cota_m": 18.13
  },
  {
    "data": "2020-10-08",
    "irc": 83.7,
    "faixa": "vermelho",
    "idn": 0.049,
    "cota_m": 17.21
  },
  {
    "data": "2020-10-15",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.329,
    "cota_m": 16.97
  },
  {
    "data": "2020-10-22",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.375,
    "cota_m": 17.08
  },
  {
    "data": "2020-10-29",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.287,
    "cota_m": 16.89
  },
  {
    "data": "2020-11-05",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.284,
    "cota_m": 16.61
  },
  {
    "data": "2020-11-12",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.411,
    "cota_m": 16.67
  },
  {
    "data": "2020-11-19",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.617,
    "cota_m": 16.92
  },
  {
    "data": "2020-11-26",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.447,
    "cota_m": 17.29
  },
  {
    "data": "2020-12-03",
    "irc": 96.3,
    "faixa": "vermelho",
    "idn": -0.582,
    "cota_m": 17.76
  },
  {
    "data": "2020-12-10",
    "irc": 82.2,
    "faixa": "vermelho",
    "idn": -0.708,
    "cota_m": 18.59
  },
  {
    "data": "2020-12-17",
    "irc": 68.5,
    "faixa": "laranja",
    "idn": -0.403,
    "cota_m": 19.4
  },
  {
    "data": "2020-12-24",
    "irc": 53.5,
    "faixa": "laranja",
    "idn": -0.185,
    "cota_m": 20.29
  },
  {
    "data": "2020-12-31",
    "irc": 39.6,
    "faixa": "amarelo",
    "idn": -0.334,
    "cota_m": 21.11
  },
  {
    "data": "2021-01-07",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.323,
    "cota_m": 22.02
  },
  {
    "data": "2021-01-14",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.401,
    "cota_m": 22.82
  },
  {
    "data": "2021-01-21",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.34,
    "cota_m": 23.62
  },
  {
    "data": "2021-01-28",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.248,
    "cota_m": 24.21
  },
  {
    "data": "2021-02-04",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.336,
    "cota_m": 24.68
  },
  {
    "data": "2021-02-11",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.29,
    "cota_m": 25
  },
  {
    "data": "2021-02-18",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.181,
    "cota_m": 25.4
  },
  {
    "data": "2021-02-25",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.113,
    "cota_m": 25.65
  },
  {
    "data": "2021-03-04",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.273,
    "cota_m": 25.88
  },
  {
    "data": "2021-03-11",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.242,
    "cota_m": 26.13
  },
  {
    "data": "2021-03-18",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.189,
    "cota_m": 26.53
  },
  {
    "data": "2021-03-25",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.185,
    "cota_m": 26.95
  },
  {
    "data": "2021-04-01",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.321,
    "cota_m": 27.34
  },
  {
    "data": "2021-04-08",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.096,
    "cota_m": 27.7
  },
  {
    "data": "2021-04-15",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.22,
    "cota_m": 28.08
  },
  {
    "data": "2021-04-22",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.246,
    "cota_m": 28.54
  },
  {
    "data": "2021-04-29",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.104,
    "cota_m": 28.98
  },
  {
    "data": "2021-05-06",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.12,
    "cota_m": 29.3
  },
  {
    "data": "2021-05-13",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.172,
    "cota_m": 29.6
  },
  {
    "data": "2021-05-20",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.112,
    "cota_m": 29.81
  },
  {
    "data": "2021-05-27",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.194,
    "cota_m": 29.93
  },
  {
    "data": "2021-06-03",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.261,
    "cota_m": 29.98
  },
  {
    "data": "2021-06-10",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.386,
    "cota_m": 30
  },
  {
    "data": "2021-06-17",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.276,
    "cota_m": 30.02
  },
  {
    "data": "2021-06-24",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.172,
    "cota_m": 30.01
  },
  {
    "data": "2021-07-01",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.199,
    "cota_m": 29.94
  },
  {
    "data": "2021-07-08",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.072,
    "cota_m": 29.8
  },
  {
    "data": "2021-07-15",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.065,
    "cota_m": 29.62
  },
  {
    "data": "2021-07-22",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.081,
    "cota_m": 29.35
  },
  {
    "data": "2021-07-29",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.217,
    "cota_m": 29.02
  },
  {
    "data": "2021-08-05",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.026,
    "cota_m": 28.67
  },
  {
    "data": "2021-08-12",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.152,
    "cota_m": 28.25
  },
  {
    "data": "2021-08-19",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.291,
    "cota_m": 27.85
  },
  {
    "data": "2021-08-26",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.449,
    "cota_m": 27.3
  },
  {
    "data": "2021-09-02",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.542,
    "cota_m": 26.74
  },
  {
    "data": "2021-09-09",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.639,
    "cota_m": 25.95
  },
  {
    "data": "2021-09-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.493,
    "cota_m": 24.99
  },
  {
    "data": "2021-09-23",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.268,
    "cota_m": 23.87
  },
  {
    "data": "2021-09-30",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.365,
    "cota_m": 22.76
  },
  {
    "data": "2021-10-07",
    "irc": 27.6,
    "faixa": "amarelo",
    "idn": -0.523,
    "cota_m": 21.82
  },
  {
    "data": "2021-10-14",
    "irc": 40.8,
    "faixa": "amarelo",
    "idn": -0.564,
    "cota_m": 21.04
  },
  {
    "data": "2021-10-21",
    "irc": 55.8,
    "faixa": "laranja",
    "idn": -0.603,
    "cota_m": 20.15
  },
  {
    "data": "2021-10-28",
    "irc": 64.1,
    "faixa": "laranja",
    "idn": -0.468,
    "cota_m": 19.66
  },
  {
    "data": "2021-11-04",
    "irc": 67.8,
    "faixa": "laranja",
    "idn": -0.468,
    "cota_m": 19.44
  },
  {
    "data": "2021-11-11",
    "irc": 64.6,
    "faixa": "laranja",
    "idn": -0.527,
    "cota_m": 19.63
  },
  {
    "data": "2021-11-18",
    "irc": 59.9,
    "faixa": "laranja",
    "idn": -0.583,
    "cota_m": 19.91
  },
  {
    "data": "2021-11-25",
    "irc": 49.4,
    "faixa": "amarelo",
    "idn": -0.363,
    "cota_m": 20.53
  },
  {
    "data": "2021-12-02",
    "irc": 39.5,
    "faixa": "amarelo",
    "idn": -0.302,
    "cota_m": 21.12
  },
  {
    "data": "2021-12-09",
    "irc": 29.8,
    "faixa": "amarelo",
    "idn": -0.173,
    "cota_m": 21.69
  },
  {
    "data": "2021-12-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.276,
    "cota_m": 22.35
  },
  {
    "data": "2021-12-23",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.32,
    "cota_m": 23.05
  },
  {
    "data": "2021-12-30",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.228,
    "cota_m": 23.69
  },
  {
    "data": "2022-01-06",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.004,
    "cota_m": 24.16
  },
  {
    "data": "2022-01-13",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.173,
    "cota_m": 24.42
  },
  {
    "data": "2022-01-20",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.316,
    "cota_m": 24.48
  },
  {
    "data": "2022-01-27",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.023,
    "cota_m": 24.19
  },
  {
    "data": "2022-02-03",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.174,
    "cota_m": 23.92
  },
  {
    "data": "2022-02-10",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.007,
    "cota_m": 23.88
  },
  {
    "data": "2022-02-17",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.107,
    "cota_m": 23.94
  },
  {
    "data": "2022-02-24",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.269,
    "cota_m": 24.18
  },
  {
    "data": "2022-03-03",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.294,
    "cota_m": 24.66
  },
  {
    "data": "2022-03-10",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.567,
    "cota_m": 25.19
  },
  {
    "data": "2022-03-17",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.788,
    "cota_m": 25.81
  },
  {
    "data": "2022-03-24",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.55,
    "cota_m": 26.49
  },
  {
    "data": "2022-03-31",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.569,
    "cota_m": 27.16
  },
  {
    "data": "2022-04-07",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.484,
    "cota_m": 27.63
  },
  {
    "data": "2022-04-14",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.389,
    "cota_m": 28.01
  },
  {
    "data": "2022-04-21",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.309,
    "cota_m": 28.4
  },
  {
    "data": "2022-04-28",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.307,
    "cota_m": 28.67
  },
  {
    "data": "2022-05-05",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.337,
    "cota_m": 28.95
  },
  {
    "data": "2022-05-12",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.291,
    "cota_m": 29.16
  },
  {
    "data": "2022-05-19",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.381,
    "cota_m": 29.3
  },
  {
    "data": "2022-05-26",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.597,
    "cota_m": 29.39
  },
  {
    "data": "2022-06-02",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.795,
    "cota_m": 29.51
  },
  {
    "data": "2022-06-09",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.807,
    "cota_m": 29.61
  },
  {
    "data": "2022-06-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.659,
    "cota_m": 29.72
  },
  {
    "data": "2022-06-23",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.508,
    "cota_m": 29.75
  },
  {
    "data": "2022-06-30",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.393,
    "cota_m": 29.69
  },
  {
    "data": "2022-07-07",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.433,
    "cota_m": 29.53
  },
  {
    "data": "2022-07-14",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.434,
    "cota_m": 29.3
  },
  {
    "data": "2022-07-21",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.429,
    "cota_m": 29
  },
  {
    "data": "2022-07-28",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.368,
    "cota_m": 28.67
  },
  {
    "data": "2022-08-04",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.431,
    "cota_m": 28.3
  },
  {
    "data": "2022-08-11",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.336,
    "cota_m": 27.9
  },
  {
    "data": "2022-08-18",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.068,
    "cota_m": 27.46
  },
  {
    "data": "2022-08-25",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.041,
    "cota_m": 26.93
  },
  {
    "data": "2022-09-01",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.127,
    "cota_m": 26.25
  },
  {
    "data": "2022-09-08",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.447,
    "cota_m": 25.45
  },
  {
    "data": "2022-09-15",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.619,
    "cota_m": 24.52
  },
  {
    "data": "2022-09-22",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.549,
    "cota_m": 23.3
  },
  {
    "data": "2022-09-29",
    "irc": 10,
    "faixa": "verde",
    "idn": -0.044,
    "cota_m": 21.74
  },
  {
    "data": "2022-10-06",
    "irc": 37.9,
    "faixa": "amarelo",
    "idn": -0.145,
    "cota_m": 20.09
  },
  {
    "data": "2022-10-13",
    "irc": 68.2,
    "faixa": "laranja",
    "idn": -0.139,
    "cota_m": 18.3
  },
  {
    "data": "2022-10-20",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.167,
    "cota_m": 16.85
  },
  {
    "data": "2022-10-27",
    "irc": 94.7,
    "faixa": "vermelho",
    "idn": -0.031,
    "cota_m": 16.2
  },
  {
    "data": "2022-11-03",
    "irc": 89.9,
    "faixa": "vermelho",
    "idn": -0.034,
    "cota_m": 16.64
  },
  {
    "data": "2022-11-10",
    "irc": 99.1,
    "faixa": "vermelho",
    "idn": -0.336,
    "cota_m": 17.53
  },
  {
    "data": "2022-11-17",
    "irc": 88,
    "faixa": "vermelho",
    "idn": -0.462,
    "cota_m": 18.25
  },
  {
    "data": "2022-11-24",
    "irc": 85.3,
    "faixa": "vermelho",
    "idn": -0.406,
    "cota_m": 18.41
  },
  {
    "data": "2022-12-01",
    "irc": 87.1,
    "faixa": "vermelho",
    "idn": -0.669,
    "cota_m": 18.3
  },
  {
    "data": "2022-12-08",
    "irc": 80.8,
    "faixa": "vermelho",
    "idn": -0.649,
    "cota_m": 18.67
  },
  {
    "data": "2022-12-15",
    "irc": 73.1,
    "faixa": "laranja",
    "idn": -0.613,
    "cota_m": 19.13
  },
  {
    "data": "2022-12-22",
    "irc": 72,
    "faixa": "laranja",
    "idn": -0.502,
    "cota_m": 19.19
  },
  {
    "data": "2022-12-29",
    "irc": 72,
    "faixa": "laranja",
    "idn": -0.22,
    "cota_m": 19.19
  },
  {
    "data": "2023-01-05",
    "irc": 48.9,
    "faixa": "amarelo",
    "idn": 0.082,
    "cota_m": 19.44
  },
  {
    "data": "2023-01-12",
    "irc": 43.7,
    "faixa": "amarelo",
    "idn": -0.129,
    "cota_m": 19.75
  },
  {
    "data": "2023-01-19",
    "irc": 55.5,
    "faixa": "laranja",
    "idn": -0.495,
    "cota_m": 20.17
  },
  {
    "data": "2023-01-26",
    "irc": 40.6,
    "faixa": "amarelo",
    "idn": -0.623,
    "cota_m": 21.05
  },
  {
    "data": "2023-02-02",
    "irc": 25.9,
    "faixa": "amarelo",
    "idn": -0.677,
    "cota_m": 21.92
  },
  {
    "data": "2023-02-09",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.503,
    "cota_m": 22.66
  },
  {
    "data": "2023-02-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.355,
    "cota_m": 23.18
  },
  {
    "data": "2023-02-23",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.503,
    "cota_m": 23.7
  },
  {
    "data": "2023-03-02",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.525,
    "cota_m": 24.3
  },
  {
    "data": "2023-03-09",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.579,
    "cota_m": 24.9
  },
  {
    "data": "2023-03-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.546,
    "cota_m": 25.49
  },
  {
    "data": "2023-03-23",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.449,
    "cota_m": 25.7
  },
  {
    "data": "2023-03-30",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.063,
    "cota_m": 25.92
  },
  {
    "data": "2023-07-06",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.655,
    "cota_m": 27.9
  },
  {
    "data": "2023-07-13",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.407,
    "cota_m": 27.65
  },
  {
    "data": "2023-07-20",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.539,
    "cota_m": 27.38
  },
  {
    "data": "2023-07-27",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.68,
    "cota_m": 27.07
  },
  {
    "data": "2023-08-03",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.32,
    "cota_m": 26.6
  },
  {
    "data": "2023-08-10",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.312,
    "cota_m": 26.06
  },
  {
    "data": "2023-08-17",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.195,
    "cota_m": 25.48
  },
  {
    "data": "2023-08-24",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.179,
    "cota_m": 24.71
  },
  {
    "data": "2023-08-31",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.267,
    "cota_m": 23.76
  },
  {
    "data": "2023-09-07",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.265,
    "cota_m": 22.44
  },
  {
    "data": "2023-09-14",
    "irc": 47,
    "faixa": "amarelo",
    "idn": 0.382,
    "cota_m": 20.63
  },
  {
    "data": "2023-09-21",
    "irc": 85.7,
    "faixa": "vermelho",
    "idn": 0.359,
    "cota_m": 18.34
  },
  {
    "data": "2023-09-28",
    "irc": 95.7,
    "faixa": "vermelho",
    "idn": 0.137,
    "cota_m": 16.11
  },
  {
    "data": "2023-10-05",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.084,
    "cota_m": 14.9
  },
  {
    "data": "2023-10-12",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.041,
    "cota_m": 14.04
  },
  {
    "data": "2023-10-19",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.159,
    "cota_m": 13.29
  },
  {
    "data": "2023-10-26",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.066,
    "cota_m": 12.7
  },
  {
    "data": "2023-11-02",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.097,
    "cota_m": 13.08
  },
  {
    "data": "2023-11-09",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.177,
    "cota_m": 13.18
  },
  {
    "data": "2023-11-16",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.205,
    "cota_m": 12.96
  },
  {
    "data": "2023-11-23",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.017,
    "cota_m": 13.33
  },
  {
    "data": "2023-11-30",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.002,
    "cota_m": 14.48
  },
  {
    "data": "2023-12-07",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.092,
    "cota_m": 14.97
  },
  {
    "data": "2023-12-14",
    "irc": 99.2,
    "faixa": "vermelho",
    "idn": 0.195,
    "cota_m": 15.79
  },
  {
    "data": "2023-12-21",
    "irc": 84.5,
    "faixa": "vermelho",
    "idn": 0.071,
    "cota_m": 17.14
  },
  {
    "data": "2023-12-28",
    "irc": 69.5,
    "faixa": "laranja",
    "idn": 0.072,
    "cota_m": 18.22
  },
  {
    "data": "2024-01-04",
    "irc": 53.6,
    "faixa": "laranja",
    "idn": -0.05,
    "cota_m": 19.16
  },
  {
    "data": "2024-01-11",
    "irc": 41.6,
    "faixa": "amarelo",
    "idn": -0.1,
    "cota_m": 19.87
  },
  {
    "data": "2024-01-18",
    "irc": 48.5,
    "faixa": "amarelo",
    "idn": -0.188,
    "cota_m": 20.58
  },
  {
    "data": "2024-01-25",
    "irc": 42.9,
    "faixa": "amarelo",
    "idn": -0.293,
    "cota_m": 20.91
  },
  {
    "data": "2024-02-01",
    "irc": 38.1,
    "faixa": "amarelo",
    "idn": -0.185,
    "cota_m": 21.2
  },
  {
    "data": "2024-02-08",
    "irc": 13.4,
    "faixa": "verde",
    "idn": -0.063,
    "cota_m": 21.54
  },
  {
    "data": "2024-02-15",
    "irc": 28.4,
    "faixa": "amarelo",
    "idn": -0.186,
    "cota_m": 21.77
  },
  {
    "data": "2024-02-22",
    "irc": 25.7,
    "faixa": "amarelo",
    "idn": -0.27,
    "cota_m": 21.93
  },
  {
    "data": "2024-02-29",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.006,
    "cota_m": 22.22
  },
  {
    "data": "2024-03-07",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.241,
    "cota_m": 22.59
  },
  {
    "data": "2024-03-14",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.218,
    "cota_m": 22.83
  },
  {
    "data": "2024-03-21",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.06,
    "cota_m": 23.11
  },
  {
    "data": "2024-03-28",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.016,
    "cota_m": 23.5
  },
  {
    "data": "2024-04-04",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.063,
    "cota_m": 23.84
  },
  {
    "data": "2024-04-11",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.218,
    "cota_m": 24.2
  },
  {
    "data": "2024-04-18",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.304,
    "cota_m": 24.66
  },
  {
    "data": "2024-04-25",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.133,
    "cota_m": 25.11
  },
  {
    "data": "2024-05-02",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.168,
    "cota_m": 25.41
  },
  {
    "data": "2024-05-09",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.167,
    "cota_m": 25.67
  },
  {
    "data": "2024-05-16",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.25,
    "cota_m": 25.85
  },
  {
    "data": "2024-05-23",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.143,
    "cota_m": 26.15
  },
  {
    "data": "2024-05-30",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.238,
    "cota_m": 26.4
  },
  {
    "data": "2024-06-06",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.417,
    "cota_m": 26.63
  },
  {
    "data": "2024-06-13",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.709,
    "cota_m": 26.81
  },
  {
    "data": "2024-06-20",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.86,
    "cota_m": 26.85
  },
  {
    "data": "2024-06-27",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.717,
    "cota_m": 26.82
  },
  {
    "data": "2024-07-04",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.724,
    "cota_m": 26.73
  },
  {
    "data": "2024-07-11",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.557,
    "cota_m": 26.49
  },
  {
    "data": "2024-07-18",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.445,
    "cota_m": 26.14
  },
  {
    "data": "2024-07-25",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.469,
    "cota_m": 25.64
  },
  {
    "data": "2024-08-01",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.551,
    "cota_m": 25.09
  },
  {
    "data": "2024-08-08",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.495,
    "cota_m": 24.29
  },
  {
    "data": "2024-08-15",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.43,
    "cota_m": 23.45
  },
  {
    "data": "2024-08-22",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.368,
    "cota_m": 22.15
  },
  {
    "data": "2024-08-29",
    "irc": 49.4,
    "faixa": "amarelo",
    "idn": -0.292,
    "cota_m": 20.53
  },
  {
    "data": "2024-09-05",
    "irc": 79.5,
    "faixa": "vermelho",
    "idn": -0.472,
    "cota_m": 18.75
  },
  {
    "data": "2024-09-12",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.596,
    "cota_m": 16.97
  },
  {
    "data": "2024-09-19",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.666,
    "cota_m": 15.29
  },
  {
    "data": "2024-09-26",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.912,
    "cota_m": 13.92
  },
  {
    "data": "2024-10-03",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.905,
    "cota_m": 12.77
  },
  {
    "data": "2024-10-10",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -1.048,
    "cota_m": 12.11
  },
  {
    "data": "2024-10-17",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.736,
    "cota_m": 12.25
  },
  {
    "data": "2024-10-24",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.452,
    "cota_m": 12.5
  },
  {
    "data": "2024-10-31",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.305,
    "cota_m": 12.18
  },
  {
    "data": "2024-11-07",
    "irc": 100,
    "faixa": "vermelho",
    "idn": -0.154,
    "cota_m": 12.19
  },
  {
    "data": "2024-11-14",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.064,
    "cota_m": 13.09
  },
  {
    "data": "2024-11-21",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.293,
    "cota_m": 14.15
  },
  {
    "data": "2024-11-28",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.12,
    "cota_m": 14.3
  },
  {
    "data": "2024-12-05",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.276,
    "cota_m": 14.65
  },
  {
    "data": "2024-12-12",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.388,
    "cota_m": 15.44
  },
  {
    "data": "2024-12-19",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.41,
    "cota_m": 16.34
  },
  {
    "data": "2024-12-26",
    "irc": 100,
    "faixa": "vermelho",
    "idn": 0.392,
    "cota_m": 17.38
  },
  {
    "data": "2025-01-02",
    "irc": 63.4,
    "faixa": "laranja",
    "idn": 0.133,
    "cota_m": 18.58
  },
  {
    "data": "2025-01-09",
    "irc": 58.5,
    "faixa": "laranja",
    "idn": -0.172,
    "cota_m": 19.99
  },
  {
    "data": "2025-01-16",
    "irc": 24.2,
    "faixa": "verde",
    "idn": -0.099,
    "cota_m": 20.9
  },
  {
    "data": "2025-01-23",
    "irc": 29.2,
    "faixa": "amarelo",
    "idn": 0.33,
    "cota_m": 21.68
  },
  {
    "data": "2025-01-30",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.454,
    "cota_m": 22.17
  },
  {
    "data": "2025-02-06",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.073,
    "cota_m": 22.23
  },
  {
    "data": "2025-02-13",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.13,
    "cota_m": 22.39
  },
  {
    "data": "2025-02-20",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.308,
    "cota_m": 23.01
  },
  {
    "data": "2025-02-27",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.303,
    "cota_m": 23.79
  },
  {
    "data": "2025-03-06",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.136,
    "cota_m": 24.5
  },
  {
    "data": "2025-03-13",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.176,
    "cota_m": 25.03
  },
  {
    "data": "2025-03-20",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.275,
    "cota_m": 25.47
  },
  {
    "data": "2025-03-27",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.403,
    "cota_m": 25.86
  },
  {
    "data": "2025-04-03",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.518,
    "cota_m": 26.15
  },
  {
    "data": "2025-04-10",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.432,
    "cota_m": 26.47
  },
  {
    "data": "2025-04-17",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.189,
    "cota_m": 26.91
  },
  {
    "data": "2025-04-24",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.283,
    "cota_m": 27.34
  },
  {
    "data": "2025-05-01",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.399,
    "cota_m": 27.73
  },
  {
    "data": "2025-05-05",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.526,
    "cota_m": 27.9
  },
  {
    "data": "2025-05-06",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.545,
    "cota_m": 27.92
  },
  {
    "data": "2025-05-07",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.55,
    "cota_m": 27.96
  },
  {
    "data": "2025-05-08",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.538,
    "cota_m": 27.99
  },
  {
    "data": "2025-05-09",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.52,
    "cota_m": 28.02
  },
  {
    "data": "2025-05-10",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.498,
    "cota_m": 28.05
  },
  {
    "data": "2025-05-11",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.48,
    "cota_m": 28.07
  },
  {
    "data": "2025-05-12",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.462,
    "cota_m": 28.09
  },
  {
    "data": "2025-05-13",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.445,
    "cota_m": 28.12
  },
  {
    "data": "2025-05-14",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.44,
    "cota_m": 28.14
  },
  {
    "data": "2025-05-15",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.444,
    "cota_m": 28.17
  },
  {
    "data": "2025-05-16",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.456,
    "cota_m": 28.21
  },
  {
    "data": "2025-05-17",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.469,
    "cota_m": 28.25
  },
  {
    "data": "2025-05-18",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.472,
    "cota_m": 28.29
  },
  {
    "data": "2025-05-19",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.469,
    "cota_m": 28.32
  },
  {
    "data": "2025-05-20",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.461,
    "cota_m": 28.35
  },
  {
    "data": "2025-05-21",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.446,
    "cota_m": 28.38
  },
  {
    "data": "2025-05-22",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.429,
    "cota_m": 28.4
  },
  {
    "data": "2025-05-23",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.419,
    "cota_m": 28.42
  },
  {
    "data": "2025-05-24",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.404,
    "cota_m": 28.45
  },
  {
    "data": "2025-05-25",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.402,
    "cota_m": 28.47
  },
  {
    "data": "2025-05-26",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.384,
    "cota_m": 28.49
  },
  {
    "data": "2025-05-27",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.368,
    "cota_m": 28.51
  },
  {
    "data": "2025-05-28",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.35,
    "cota_m": 28.54
  },
  {
    "data": "2025-05-29",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.338,
    "cota_m": 28.55
  },
  {
    "data": "2025-05-30",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.318,
    "cota_m": 28.57
  },
  {
    "data": "2025-05-31",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.305,
    "cota_m": 28.59
  },
  {
    "data": "2025-06-01",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.294,
    "cota_m": 28.6
  },
  {
    "data": "2025-06-02",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.288,
    "cota_m": 28.61
  },
  {
    "data": "2025-06-03",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.288,
    "cota_m": 28.65
  },
  {
    "data": "2025-06-04",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.286,
    "cota_m": 28.66
  },
  {
    "data": "2025-06-05",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.273,
    "cota_m": 28.68
  },
  {
    "data": "2025-06-06",
    "irc": 23.8,
    "faixa": "verde",
    "idn": 0.254,
    "cota_m": 28.69
  },
  {
    "data": "2025-06-07",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.228,
    "cota_m": 28.71
  },
  {
    "data": "2025-06-08",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.189,
    "cota_m": 28.74
  },
  {
    "data": "2025-06-09",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.15,
    "cota_m": 28.76
  },
  {
    "data": "2025-06-10",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.112,
    "cota_m": 28.78
  },
  {
    "data": "2025-06-11",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.079,
    "cota_m": 28.79
  },
  {
    "data": "2025-06-12",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.048,
    "cota_m": 28.81
  },
  {
    "data": "2025-06-13",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.019,
    "cota_m": 28.85
  },
  {
    "data": "2025-06-14",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.016,
    "cota_m": 28.86
  },
  {
    "data": "2025-06-15",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.053,
    "cota_m": 28.87
  },
  {
    "data": "2025-06-16",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.082,
    "cota_m": 28.89
  },
  {
    "data": "2025-06-17",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.105,
    "cota_m": 28.9
  },
  {
    "data": "2025-06-18",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.131,
    "cota_m": 28.91
  },
  {
    "data": "2025-06-19",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.149,
    "cota_m": 28.92
  },
  {
    "data": "2025-06-20",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.162,
    "cota_m": 28.93
  },
  {
    "data": "2025-06-21",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.166,
    "cota_m": 28.94
  },
  {
    "data": "2025-06-22",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.162,
    "cota_m": 28.95
  },
  {
    "data": "2025-06-23",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.157,
    "cota_m": 28.96
  },
  {
    "data": "2025-06-24",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.142,
    "cota_m": 28.97
  },
  {
    "data": "2025-06-25",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.126,
    "cota_m": 28.97
  },
  {
    "data": "2025-06-26",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.115,
    "cota_m": 28.98
  },
  {
    "data": "2025-06-27",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.094,
    "cota_m": 28.99
  },
  {
    "data": "2025-06-28",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.074,
    "cota_m": 29
  },
  {
    "data": "2025-06-29",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.054,
    "cota_m": 29.01
  },
  {
    "data": "2025-06-30",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.025,
    "cota_m": 29.02
  },
  {
    "data": "2025-07-01",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.015,
    "cota_m": 29.02
  },
  {
    "data": "2025-07-02",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.022,
    "cota_m": 29.02
  },
  {
    "data": "2025-07-03",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.052,
    "cota_m": 29.03
  },
  {
    "data": "2025-07-04",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.002,
    "cota_m": 29.04
  },
  {
    "data": "2025-07-05",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.051,
    "cota_m": 29.05
  },
  {
    "data": "2025-07-06",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.092,
    "cota_m": 29.05
  },
  {
    "data": "2025-07-07",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.125,
    "cota_m": 29.05
  },
  {
    "data": "2025-07-08",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.14,
    "cota_m": 29.05
  },
  {
    "data": "2025-07-09",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.144,
    "cota_m": 29.03
  },
  {
    "data": "2025-07-10",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.14,
    "cota_m": 29.01
  },
  {
    "data": "2025-07-11",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.128,
    "cota_m": 28.99
  },
  {
    "data": "2025-07-12",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.115,
    "cota_m": 28.97
  },
  {
    "data": "2025-07-13",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.099,
    "cota_m": 28.96
  },
  {
    "data": "2025-07-14",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.083,
    "cota_m": 28.95
  },
  {
    "data": "2025-07-15",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.071,
    "cota_m": 28.93
  },
  {
    "data": "2025-07-16",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.058,
    "cota_m": 28.91
  },
  {
    "data": "2025-07-17",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.051,
    "cota_m": 28.89
  },
  {
    "data": "2025-07-18",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.039,
    "cota_m": 28.87
  },
  {
    "data": "2025-07-19",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.024,
    "cota_m": 28.85
  },
  {
    "data": "2025-07-20",
    "irc": 5.6,
    "faixa": "verde",
    "idn": 0.003,
    "cota_m": 28.82
  },
  {
    "data": "2025-07-21",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.029,
    "cota_m": 28.79
  },
  {
    "data": "2025-07-22",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.066,
    "cota_m": 28.77
  },
  {
    "data": "2025-07-23",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.107,
    "cota_m": 28.75
  },
  {
    "data": "2025-07-24",
    "irc": 5.6,
    "faixa": "verde",
    "idn": -0.141,
    "cota_m": 28.72
  },
  {
    "data": "2025-07-25",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.185,
    "cota_m": 28.69
  },
  {
    "data": "2025-07-26",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.216,
    "cota_m": 28.67
  },
  {
    "data": "2025-07-27",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.174,
    "cota_m": 28.64
  },
  {
    "data": "2025-07-28",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.178,
    "cota_m": 28.61
  },
  {
    "data": "2025-07-29",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.181,
    "cota_m": 28.58
  },
  {
    "data": "2025-07-30",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.189,
    "cota_m": 28.55
  },
  {
    "data": "2025-07-31",
    "irc": 24.5,
    "faixa": "verde",
    "idn": -0.193,
    "cota_m": 28.52
  }
];

export const IRC_HISTORICO_RESUMO = {
  n_pontos:      561,
  irc_min:       5.6,
  irc_max:       100,
  irc_medio:     32.2,
  distribuicao:  {"verde":408,"amarelo":40,"laranja":41,"vermelho":72},
} as const;
