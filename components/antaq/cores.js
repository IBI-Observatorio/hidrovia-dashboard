// Paleta dos indicadores ANTAQ — alinhada com matplotlib do repo de origem
// e com os tokens institucionais do site (#0099D8 ibi-blue, #00A652 ibi-green).

export const PALETA = {
  primaria: '#0099D8',        // ibi-blue
  secundaria: '#00A652',      // ibi-green
  destaque: '#c1322f',        // vermelho ANTAQ (mesmo do matplotlib)
  azulMar: '#3a64a8',         // azul institucional (cabotagem)
  verdeFresco: '#7fb069',     // verde claro (importações)
  laranja: '#f0a04b',
  cinza: '#999999',
  fundo: '#1f2937',           // gray-800
  fundoCard: '#111827',       // gray-900
};

// Cores categóricas para até 8 séries simultâneas
export const CATEGORICA = [
  '#0099D8', '#00A652', '#c1322f', '#f0a04b',
  '#5a4fcf', '#65b89e', '#3a64a8', '#7fb069',
];

// Tema dos clusters (mesma chave que CLUSTERS no metadata.py)
export const CORES_CLUSTER = {
  'eficiencia-operacional': '#c1322f',
  'conteineres':            '#233570',
  'cabotagem-hidrovias':    '#7fb069',
  'geopolitica':            '#5a4fcf',
  'infraestrutura':         '#f0a04b',
  'agronegocio':            '#65b89e',
  'ineditas':               '#0099D8',
};

// Helper para acessar JSONs no /public
export const DATA_BASE = '/data/antaq';
