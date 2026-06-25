/**
 * lib/itc.ts
 * ITC — Índice de Tensão do Corredor (0–100). Corredor Paranaguá.
 *
 * Composto CONSTRUÍDO (não é ajuste econométrico), nos moldes do IRC:
 *   4 sub-índices normalizados min–max + pesos explícitos + faixas com cor.
 * Quanto maior, maior a tensão estrutural — porto empurrando contra a malha,
 * frete pressionando, navio parado.
 *
 * Fonte ÚNICA do índice: não fabricar "tensão" fora deste módulo.
 * Depende apenas de lib/series-corredor.ts (dados). Sem React/Next.
 *
 * RECALIBRAÇÃO: para ajustar o índice, mexer em (a) PESOS_ITC e (b) as âncoras
 * min–max dentro de cada sub-função. Tudo abaixo é transparente e testável.
 */

import {
  SPLIT_FERROVIARIO_BENCHMARK,
  SPLIT_FERROVIARIO_PARANAGUA,
  SPLIT_META_INTEGRACAO,
  FRETE_ROD_REF,
  FRETE_FER_DESCONTO,
  ESPERA_LONGO_CURSO_H,
  MOVIMENTACAO_YOY_2025,
} from "./series-corredor";

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------
export interface EntradaITC {
  /** participação ferroviária, 0..1 */
  railShare: number;
  /** frete-equivalente do corredor (R$/t, blend rod×fer) */
  freteCorredor: number;
  /** espera p/ atracação (h) */
  esperaH: number;
  /** crescimento a/a da movimentação (%) */
  movYoY: number;
}
export interface SubindicesITC {
  ferrovia: number;
  frete: number;
  porto: number;
  espera: number;
}
export interface FaixaITC {
  nome: string;
  cor: string;
  /** limite superior exclusivo da faixa */
  max: number;
}
export interface ResultadoITC {
  total: number;
  comp: SubindicesITC;
  faixa: FaixaITC;
}
export interface PontoITC {
  ano: number;
  valor: number;
  faixa: FaixaITC;
  nota?: string;
}

// ------------------------------------------------------------------
// Pesos e faixas (tokens do design system — espelha COR_FAIXA do IRC)
// ------------------------------------------------------------------
export const PESOS_ITC = { ferrovia: 0.35, frete: 0.25, porto: 0.2, espera: 0.2 } as const;

export const FAIXAS_ITC: FaixaITC[] = [
  { nome: "Baixa", cor: "#00a652", max: 35 },
  { nome: "Moderada", cor: "#D4922A", max: 55 },
  { nome: "Elevada", cor: "#c1322f", max: 75 },
  { nome: "Crítica", cor: "#A0153E", max: 101 },
];
export const COR_FAIXA_ITC: Record<string, string> = Object.fromEntries(
  FAIXAS_ITC.map((f) => [f.nome, f.cor])
) as Record<string, string>;

export function faixaITC(total: number): FaixaITC {
  return FAIXAS_ITC.find((f) => total < f.max) ?? FAIXAS_ITC[FAIXAS_ITC.length - 1];
}

// ------------------------------------------------------------------
// Utilitários de normalização
// ------------------------------------------------------------------
const clamp = (x: number, a = 0, b = 100): number => Math.max(a, Math.min(b, x));
const norm = (x: number, lo: number, hi: number): number => clamp(((x - lo) / (hi - lo)) * 100);

/** Frete-equivalente do corredor: blend rodoviário × ferroviário ponderado pelo split. */
export function freteEquivalente(
  railShare: number,
  rod: number = FRETE_ROD_REF,
  descFer: number = FRETE_FER_DESCONTO
): number {
  return (1 - railShare) * rod + railShare * rod * (1 - descFer);
}

// ------------------------------------------------------------------
// Sub-índices (exportados para transparência e teste)
// ------------------------------------------------------------------
/** Lacuna ferroviária: distância ao benchmark 50% + prêmio de risco de transição (fev/2027). */
export function subLacunaFerroviaria(railShare: number): number {
  const lacuna = norm(SPLIT_FERROVIARIO_BENCHMARK - railShare, 0, 0.5);
  return clamp(lacuna * 0.8 + 20);
}
/** Pressão de frete: piso R$95 (mín. 2022) — teto R$200 (pico 2023). */
export function subPressaoFrete(freteCorredor: number): number {
  return norm(freteCorredor, 95, 200);
}
/** Pressão portuária: crescimento da movimentação correndo à frente do trilho. */
export function subPressaoPortuaria(movYoY: number, railShare: number): number {
  return clamp(
    norm(movYoY, 0, 12) * 0.6 + norm(SPLIT_FERROVIARIO_BENCHMARK - railShare, 0, 0.5) * 0.4
  );
}
/** Custo de espera: 50h (bom) — 180h (crítico). */
export function subCustoEspera(esperaH: number): number {
  return norm(esperaH, 50, 180);
}

// ------------------------------------------------------------------
// Cálculo principal
// ------------------------------------------------------------------
export function calculaITC(e: EntradaITC): ResultadoITC {
  const comp: SubindicesITC = {
    ferrovia: Math.round(subLacunaFerroviaria(e.railShare)),
    frete: Math.round(subPressaoFrete(e.freteCorredor)),
    porto: Math.round(subPressaoPortuaria(e.movYoY, e.railShare)),
    espera: Math.round(subCustoEspera(e.esperaH)),
  };
  const total = Math.round(
    PESOS_ITC.ferrovia * comp.ferrovia +
      PESOS_ITC.frete * comp.frete +
      PESOS_ITC.porto * comp.porto +
      PESOS_ITC.espera * comp.espera
  );
  return { total, comp, faixa: faixaITC(total) };
}

/** ITC com os inputs correntes das séries oficiais (cenário "hoje"). */
export function calculaITC_Agora(railShare: number = SPLIT_FERROVIARIO_PARANAGUA): ResultadoITC {
  return calculaITC({
    railShare,
    freteCorredor: freteEquivalente(railShare),
    esperaH: ESPERA_LONGO_CURSO_H,
    movYoY: MOVIMENTACAO_YOY_2025,
  });
}

/** Cenário de integração ferroviária (meta 50/50). */
export function calculaITC_Integracao(): ResultadoITC {
  return calculaITC_Agora(SPLIT_META_INTEGRACAO);
}

// ------------------------------------------------------------------
// Trajetória reconstruída
// Dirigida por movimentação e frete OBSERVADOS; componentes estruturais
// (lacuna ferroviária, espera) mantidos em nível de época.
// ------------------------------------------------------------------
interface DriverAnual {
  ano: number;
  movYoY: number;
  freteRod: number;
  esperaH: number;
  nota?: string;
}
const DRIVERS_ANUAIS: DriverAnual[] = [
  { ano: 2023, movYoY: 12.0, freteRod: 170, esperaH: 110 },
  { ano: 2024, movYoY: 2.1, freteRod: 150, esperaH: 110, nota: "frete interpolado" },
  { ano: 2025, movYoY: 10.1, freteRod: 160, esperaH: ESPERA_LONGO_CURSO_H },
];

export const ITC_HISTORICO_CALCULADO: PontoITC[] = DRIVERS_ANUAIS.map((d) => {
  const r = calculaITC({
    railShare: SPLIT_FERROVIARIO_PARANAGUA,
    freteCorredor: freteEquivalente(SPLIT_FERROVIARIO_PARANAGUA, d.freteRod),
    esperaH: d.esperaH,
    movYoY: d.movYoY,
  });
  return { ano: d.ano, valor: r.total, faixa: r.faixa, nota: d.nota };
});
