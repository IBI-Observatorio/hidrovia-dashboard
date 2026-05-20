// AUTO-GERADO por scripts/calibra-limiares-idn.mjs — NÃO EDITAR À MÃO.
// Limiares do IDN calibrados empiricamente via Gaussian Mixture Model (GMM).
// Método: K-componentes selecionado por BIC (menor é melhor).
// Série: 2916 valores diários, 2016–2023, MA-7d trailing.

export interface CalibracaoIDN {
  metodo: string;
  periodo: { inicio: number; fim: number };
  n_observacoes: number;
  k_otimo: number;
  bic: number;
  aic: number;
  componentes: { pi: number; mu: number; sigma: number }[];
  fronteiras: number[];        // K-1 cruzamentos, em ordem crescente
  candidatos: { K: number; bic: number; aic: number }[];
}

export const CALIBRACAO_IDN: CalibracaoIDN = {
  "metodo": "GMM-3componentes",
  "periodo": {
    "inicio": 2016,
    "fim": 2023
  },
  "n_observacoes": 2916,
  "k_otimo": 3,
  "bic": 2729.49,
  "aic": 2681.66,
  "componentes": [
    {
      "pi": 0.3447,
      "mu": -0.4017,
      "sigma": 0.1854
    },
    {
      "pi": 0.521,
      "mu": 0.1213,
      "sigma": 0.2319
    },
    {
      "pi": 0.1343,
      "mu": 0.6095,
      "sigma": 0.1626
    }
  ],
  "fronteiras": [
    -0.185,
    0.491
  ],
  "candidatos": [
    {
      "K": 2,
      "bic": 2742.46,
      "aic": 2712.57
    },
    {
      "K": 3,
      "bic": 2729.49,
      "aic": 2681.66
    },
    {
      "K": 4,
      "bic": 2750.74,
      "aic": 2684.99
    }
  ]
};
