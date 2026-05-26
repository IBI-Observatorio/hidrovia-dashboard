// AUTO-GERADO por scripts/bootstrap-incerteza.mjs — NÃO EDITAR À MÃO.
// Quantifica incerteza das fronteiras GMM e do IDN via bootstrap por ano (N=200).
// Re-amostra anos (cluster bootstrap) preservando autocorrelação intra-ano.

export interface IncertezaIDN {
  n_bootstrap: number;
  fronteira_sul: { mediana: number; ic_lo: number; ic_hi: number };
  fronteira_norte: { mediana: number; ic_lo: number; ic_hi: number };
  std_fronteiras: number;
  banda_idn_2sigma: number;
}

export const INCERTEZA_IDN: IncertezaIDN = {
  "n_bootstrap": 200,
  "fronteira_sul": {
    "mediana": -0.135,
    "ic_lo": -0.788,
    "ic_hi": 0.041
  },
  "fronteira_norte": {
    "mediana": 0.31,
    "ic_lo": -0.12,
    "ic_hi": 0.597
  },
  "std_fronteiras": 0.168,
  "banda_idn_2sigma": 0.336
};
