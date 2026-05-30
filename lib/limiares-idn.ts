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
  "bic": 2632.02,
  "aic": 2584.2,
  "componentes": [
    {
      "pi": 0.3812,
      "mu": -0.4014,
      "sigma": 0.209
    },
    {
      "pi": 0.5397,
      "mu": 0.1592,
      "sigma": 0.2204
    },
    {
      "pi": 0.0791,
      "mu": 0.6566,
      "sigma": 0.0915
    }
  ],
  "fronteiras": [
    -0.153,
    0.557
  ],
  "candidatos": [
    {
      "K": 2,
      "bic": 2703.27,
      "aic": 2673.38
    },
    {
      "K": 3,
      "bic": 2632.02,
      "aic": 2584.2
    },
    {
      "K": 4,
      "bic": 2656.7,
      "aic": 2590.95
    }
  ]
};
