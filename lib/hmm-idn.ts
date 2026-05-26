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
      "mu": -0.4262,
      "sigma": 0.1771,
      "pi_inicial": 0
    },
    {
      "mu": 0.0453,
      "sigma": 0.1058,
      "pi_inicial": 1
    },
    {
      "mu": 0.4536,
      "sigma": 0.1697,
      "pi_inicial": 0
    }
  ],
  "matriz_transicao": [
    [
      0.9876,
      0.0124,
      0
    ],
    [
      0.0141,
      0.9638,
      0.0221
    ],
    [
      0,
      0.0254,
      0.9746
    ]
  ],
  "matriz_transicao_7d": [
    [
      0.9196,
      0.0753,
      0.0051
    ],
    [
      0.0858,
      0.7855,
      0.1288
    ],
    [
      0.0067,
      0.1481,
      0.8452
    ]
  ],
  "matriz_transicao_30d": [
    [
      0.7327,
      0.2046,
      0.0627
    ],
    [
      0.2329,
      0.4686,
      0.2985
    ],
    [
      0.0821,
      0.3434,
      0.5746
    ]
  ],
  "persistencia_dias": [
    80.5,
    27.6,
    39.3
  ],
  "n_observacoes": 2916,
  "log_likelihood": 1209.96
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
