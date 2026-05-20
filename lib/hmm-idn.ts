// AUTO-GERADO por scripts/calibra-hmm.mjs — NÃO EDITAR À MÃO.
// Hidden Markov Model gaussiano K=3 calibrado sobre IDN diário 2016-2023.
// Diferente do GMM, captura TRANSIÇÕES entre regimes ao longo do tempo.

export interface CalibracaoHMM {
  k: number;
  nomes: string[];
  componentes: { mu: number; sigma: number; pi_inicial: number }[];
  matriz_transicao: number[][];          // A[i][j] = P(s_{t+1}=j | s_t=i)
  matriz_transicao_7d: number[][];       // A^7
  matriz_transicao_30d: number[][];      // A^30
  persistencia_dias: number[];           // 1/(1-A[k][k])
  n_observacoes: number;
  log_likelihood: number;
}

export const CALIBRACAO_HMM: CalibracaoHMM = {
  "k": 3,
  "nomes": [
    "Sul",
    "Sincronizado",
    "Norte"
  ],
  "componentes": [
    {
      "mu": -0.4104,
      "sigma": 0.1627,
      "pi_inicial": 0
    },
    {
      "mu": 0.051,
      "sigma": 0.1237,
      "pi_inicial": 1
    },
    {
      "mu": 0.4982,
      "sigma": 0.178,
      "pi_inicial": 0
    }
  ],
  "matriz_transicao": [
    [
      0.9834,
      0.0166,
      0
    ],
    [
      0.0174,
      0.9655,
      0.0171
    ],
    [
      0,
      0.0214,
      0.9786
    ]
  ],
  "matriz_transicao_7d": [
    [
      0.8951,
      0.0997,
      0.0053
    ],
    [
      0.1047,
      0.7938,
      0.1016
    ],
    [
      0.0069,
      0.1269,
      0.8662
    ]
  ],
  "matriz_transicao_30d": [
    [
      0.6753,
      0.2595,
      0.0653
    ],
    [
      0.2725,
      0.4782,
      0.2493
    ],
    [
      0.0856,
      0.3115,
      0.6028
    ]
  ],
  "persistencia_dias": [
    60.4,
    29,
    46.7
  ],
  "n_observacoes": 2916,
  "log_likelihood": 1128.48
};

// Classifica um IDN observado no estado mais provável do HMM (max gauss)
export function estadoHMM(idn: number): { indice: number; nome: string; probabilidades: number[] } {
  const probs = CALIBRACAO_HMM.componentes.map(c => {
    return Math.exp(-((idn - c.mu) ** 2) / (2 * c.sigma * c.sigma)) / (c.sigma * Math.sqrt(2 * Math.PI));
  });
  const tot = probs.reduce((s, x) => s + x, 0) || 1;
  const norm = probs.map(p => p / tot);
  const indice = norm.indexOf(Math.max(...norm));
  return { indice, nome: CALIBRACAO_HMM.nomes[indice], probabilidades: norm };
}
