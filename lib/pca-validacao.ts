// AUTO-GERADO por scripts/pca-validacao-pesos.mjs — NÃO EDITAR À MÃO.
// Validação dos pesos das sub-bacias contra loadings empíricos PC2.

export interface PCAValidacao {
  variancia_explicada_pc1: number;
  variancia_explicada_pc2: number;
  separacao_norte_sul_pc2: number;
  loadings_pc1: Record<string, number>;
  loadings_pc2: Record<string, number>;
  pesos_atuais: Record<string, number>;
  pesos_pca_norte: Record<string, number>;
  pesos_pca_sul: Record<string, number>;
}

export const PCA_VALIDACAO: PCAValidacao = {
  "variancia_explicada_pc1": 52.1,
  "variancia_explicada_pc2": 42.9,
  "separacao_norte_sul_pc2": 0.441,
  "loadings_pc1": {
    "SGC": 0.007,
    "Curicuriari": 0.007,
    "Serrinha": 0.033,
    "Moura": 0.109,
    "Caracarai": -0.105,
    "Abuna": 0.407,
    "PortoVelho": 0.409,
    "Humaita": 0.414,
    "Manicore": 0.416,
    "Borba": 0.363,
    "Labrea": 0.408
  },
  "loadings_pc2": {
    "SGC": 0.449,
    "Curicuriari": 0.449,
    "Serrinha": 0.45,
    "Moura": 0.419,
    "Caracarai": 0.405,
    "Abuna": -0.072,
    "PortoVelho": -0.073,
    "Humaita": -0.05,
    "Manicore": 0.007,
    "Borba": 0.198,
    "Labrea": -0.048
  },
  "pesos_atuais": {
    "SGC": 0.3,
    "Curicuriari": 0.2,
    "Serrinha": 0.2,
    "Moura": 0.05,
    "Caracarai": 0.25,
    "Abuna": 0.15,
    "PortoVelho": 0.2,
    "Humaita": 0.15,
    "Manicore": 0.1,
    "Borba": 0.15,
    "Labrea": 0.25
  },
  "pesos_pca_norte": {
    "SGC": 0.207,
    "Curicuriari": 0.207,
    "Serrinha": 0.207,
    "Moura": 0.193,
    "Caracarai": 0.186
  },
  "pesos_pca_sul": {
    "Abuna": 0.16,
    "PortoVelho": 0.162,
    "Humaita": 0.112,
    "Manicore": 0.016,
    "Borba": 0.442,
    "Labrea": 0.107
  }
};
