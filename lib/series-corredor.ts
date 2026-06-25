/**
 * lib/series-corredor.ts
 * Camada de dados do Corredor Paranaguá (Porto × Ferrovia × Frete × Espera).
 * Fonte ÚNICA de séries para o painel e para o ITC (lib/itc.ts).
 *
 * Convenção do Observatório: nada de dado hardcoded espalhado nos componentes —
 * toda série vive aqui, com procedência etiquetada. Pontos não-oficiais são marcados.
 * Módulo puro: sem dependências de React/Next. Drop em `lib/`.
 *
 * Atualização: trocar as constantes por `loadSeriesCorredor()` quando o ETL estiver no ar.
 */

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------
export type Procedencia = "oficial" | "derivado" | "interpolado" | "estimativa-ibi";

export interface PontoAnual {
  ano: number;
  valor: number;
  /** ausente = "oficial" */
  procedencia?: Procedencia;
  nota?: string;
}

export interface PontoFrete {
  /** rótulo do período, ex.: "1T22" */
  periodo: string;
  /** R$/t */
  valor: number;
  procedencia?: Procedencia;
  nota?: string;
}

export interface FonteRef {
  id: string;
  nome: string;
  url?: string;
  cadencia: string;
}

// ------------------------------------------------------------------
// Registro de fontes
// ------------------------------------------------------------------
export const FONTES: Record<string, FonteRef> = {
  portosPR: { id: "portosPR", nome: "Portos do Paraná / Comex Stat", cadencia: "mensal/anual" },
  antaq: {
    id: "antaq",
    nome: "ANTAQ — Estatístico Aquaviário (dados abertos)",
    url: "https://web.antaq.gov.br/anuario/",
    cadencia: "mensal",
  },
  safras: { id: "safras", nome: "Safras & Mercado — boletim de fretes", cadencia: "semanal" },
  cnt: { id: "cnt", nome: "CNT — Pesquisa de Rodovias 2025", cadencia: "anual" },
  observatorio: { id: "observatorio", nome: "Observatório IBI", cadencia: "—" },
};

// ------------------------------------------------------------------
// Séries — Porto
// ------------------------------------------------------------------
/** Movimentação total dos Portos do Paraná (milhões de toneladas). Fonte: FONTES.portosPR */
export const MOVIMENTACAO_MI_T: PontoAnual[] = [
  { ano: 2022, valor: 58.4, procedencia: "derivado", nota: "derivado de +12% reportado p/ 2023" },
  { ano: 2023, valor: 65.4 },
  { ano: 2024, valor: 66.8 },
  { ano: 2025, valor: 73.5 },
];
/** Crescimento da movimentação 2025 vs 2024 (%). Fonte: Comex Stat. */
export const MOVIMENTACAO_YOY_2025 = 10.1;

/** Contêineres movimentados (milhões de TEU). Fonte: FONTES.portosPR */
export const TEU_MI: PontoAnual[] = [
  { ano: 2023, valor: 1.253 },
  { ano: 2024, valor: 1.558 },
  { ano: 2025, valor: 1.662 },
];

/** Capacidade de descarga ferroviária do corredor (vagões/dia). Moegão. */
export const VAGOES_DIA_ANTES = 550;
export const VAGOES_DIA_MOEGAO = 900; // +63%
export const MOEGAO_INVESTIMENTO_MI = 658; // R$ mi (BNDES)

// ------------------------------------------------------------------
// Séries — Frete
// ------------------------------------------------------------------
/**
 * Frete rodoviário Cascavel→Paranaguá (R$/t).
 * Pontos semanais representativos. Fonte: FONTES.safras.
 * TODO(ETL): substituir por série semanal completa do boletim.
 */
export const FRETE_CASCAVEL_PARANAGUA: PontoFrete[] = [
  { periodo: "1T22", valor: 95 },
  { periodo: "2T22", valor: 110 },
  { periodo: "1T23", valor: 150 },
  { periodo: "3T23", valor: 200, nota: "pico da série — ago/2023" },
  { periodo: "1T25", valor: 160, nota: "nível recente — faixa R$ 135–165/t em 2025" },
];

/** Referência de frete rodoviário recente (R$/t, 1T25; faixa 2025 ~R$ 135–165). */
export const FRETE_ROD_REF = 160;
/** Desconto típico do modal ferroviário vs rodoviário (ILOS/mercado). */
export const FRETE_FER_DESCONTO = 0.3;
/** Contexto MT→PR (R$/t). */
export const FRETE_SORRISO_PARANAGUA = 490;

// ------------------------------------------------------------------
// Séries — Ferrovia / split modal
// ------------------------------------------------------------------
/** Participação do modal ferroviário no escoamento de Paranaguá (~20%). */
export const SPLIT_FERROVIARIO_PARANAGUA = 0.2;
/** Benchmark: São Francisco do Sul (~50% dos grãos por trem). */
export const SPLIT_FERROVIARIO_BENCHMARK = 0.5;
/** Alvo de cenário com integração Ferroeste × Malha Sul. */
export const SPLIT_META_INTEGRACAO = 0.5;

// ------------------------------------------------------------------
// Séries — Espera portuária
// ------------------------------------------------------------------
/** Tempo médio de espera p/ atracação, longo curso (h). Fonte: ANTAQ jan–nov/2025. */
export const ESPERA_LONGO_CURSO_H = 122.1;
/** Espera, cabotagem (h). Fonte: ANTAQ jan–nov/2025. */
export const ESPERA_CABOTAGEM_H = 65.58;
/** Parcela da estadia portuária que é espera, não operação. procedência: estimativa-ibi (sem fonte pública limpa; não exibida no painel). */
export const ESPERA_PARCELA_ESTADIA = 0.53;
/** Demurrage/sobre-estadia nacional (R$ bi/ano) — NÃO é o custo econômico total da espera. procedência: derivado de Bain & Company, 2024 (US$ 2,3 bi × ~R$ 6/US$). */
export const CUSTO_ESPERA_BI_ANO = 14;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
/** Último ponto de uma série anual. */
export function ultimoAnual(serie: PontoAnual[]): PontoAnual {
  return serie[serie.length - 1];
}
/** Variação a/a (%) entre os dois últimos pontos anuais. */
export function yoyAnual(serie: PontoAnual[]): number | null {
  if (serie.length < 2) return null;
  const a = serie[serie.length - 2].valor;
  const b = serie[serie.length - 1].valor;
  return ((b - a) / a) * 100;
}

// ------------------------------------------------------------------
// Seam assíncrono (ETL)
// ------------------------------------------------------------------
export interface SerieCorredor {
  movimentacao: PontoAnual[];
  teu: PontoAnual[];
  frete: PontoFrete[];
  esperaLongoCursoH: number;
  splitFerroviario: number;
  atualizadoEm: string;
}

/**
 * Carrega o pacote de séries do corredor.
 * HOJE: resolve a base estática deste módulo (já etiquetada por procedência).
 * TODO(ETL): popular num job server-side a partir de:
 *   - movimentação/TEU → ANTAQ Estatístico Aquaviário (FONTES.antaq);
 *   - frete            → boletim Safras & Mercado (FONTES.safras);
 *   - espera           → ANTAQ (diferença chegada-ao-fundeio × atracação).
 * Manter EXATAMENTE esta forma tipada para o painel não precisar mudar.
 */
export async function loadSeriesCorredor(): Promise<SerieCorredor> {
  return {
    movimentacao: MOVIMENTACAO_MI_T,
    teu: TEU_MI,
    frete: FRETE_CASCAVEL_PARANAGUA,
    esperaLongoCursoH: ESPERA_LONGO_CURSO_H,
    splitFerroviario: SPLIT_FERROVIARIO_PARANAGUA,
    atualizadoEm: "2026-01",
  };
}
