// Camada Reference-Class Forecasting (Build Brief §4.2/4.3).
//
// Três alavancas corrigem o viés de otimismo do caso oficial:
//   • Uplift de CAPEX  — sobrecusto sistemático da classe ferroviária
//     (Flyvbjerg: média ~+40%). Lognormal calibrável.
//   • Haircut de demanda — realização abaixo da projeção.
//   • Slip de cronograma — atraso no início (IBAMA reabriu o EIA de 2020).
//
// E as ÂNCORAS DE CALIBRAÇÃO obrigatórias:
//   • Oficial:  inputs sourçados → TIR ≈ WACC (emerge, sem botão de fechamento).
//   • Realista: TIR-alvo de Frischtak (1,6%) alcançada pela COMBINAÇÃO das três
//     alavancas — CAPEX = mediana da classe de ref. (sourced) + slip = execução
//     realista − obra (sourced) + haircut de demanda RESIDUAL (resolvido) — em vez
//     de inflar só o CAPEX. A TIR emerge da combinação, como no caso oficial.

import {
  type ModelingParams,
  type Levers,
  type ReferenceClassEntry,
  type Asset,
  LEVERS_NEUTROS,
  numVal,
} from "./types";
import { tirCenario } from "./cashflow";
import { solve } from "./irr";
import { randn } from "../prng";
import railRefClass from "../../data/referenceClass/rail.json";

/**
 * Alvo do caso realista: TIR = 1,6% (Frischtak/Amazônia 2030, 06/nov/2024).
 * É o PISO PESSIMISTA sourçado — único valor de TIR realista citável na fonte
 * primária (junto do 11,04% oficial). Não há, na fonte, uma faixa ponderada.
 */
export const TIR_REALISTA_ALVO = 0.016;

/** Classe de referência ferroviária carregada do seed. */
export const REFERENCE_CLASS: ReferenceClassEntry[] =
  railRefClass as ReferenceClassEntry[];

/** Sobrecusto médio da classe ferroviária → mediana do uplift de CAPEX. */
export function upliftMedianoDaClasse(
  entries: ReferenceClassEntry[] = REFERENCE_CLASS,
): number {
  const m =
    entries.reduce((s, e) => s + e.sobrecustoPct, 0) / Math.max(1, entries.length);
  return 1 + m;
}

/** TIR de um cenário, com piso de −100% quando o capital nunca retorna (sem TIR). */
function tirSafe(params: ModelingParams, levers: Levers): number {
  const t = tirCenario(params, levers);
  return isFinite(t) ? t : -1;
}

export interface CalibracaoOficial {
  levers: Levers;
  operatingRatio: number; // O&M/receita (input sourçado, não botão de fechamento)
  tir: number;
}

/**
 * Cenário oficial = avaliação DIRETA do modelo com inputs sourçados, SEM botão de
 * fechamento. Com a tarifa-teto (R$ 110,05), o operating ratio de 65% (faixa
 * heavy-haul), os tributos (IRPJ+CSLL 34%) com depreciação e o aporte reais, a TIR
 * cai NATURALMENTE no WACC (11,04%) — a antiga limitação (O&M inflado p/ ~71% que
 * contaminava o Monte Carlo) foi removida.
 */
export function calibrarOficial(params: ModelingParams): CalibracaoOficial {
  const levers: Levers = { ...LEVERS_NEUTROS };
  return {
    levers,
    operatingRatio: params.opexPctReceita,
    tir: tirCenario(params, levers),
  };
}

export interface CalibracaoRealista {
  levers: Levers;
  capexUplift: number;     // multiplicador de CAPEX = mediana da classe (sourced)
  slipAnos: number;        // atraso = execução realista − obra (sourced no seed)
  demandaHaircut: number;  // alavanca RESIDUAL resolvida p/ a TIR-alvo (model output)
  haircutImplicito: number;// 1 − demandaHaircut (perda de demanda implícita)
  upliftClasse: number;    // mediana da classe de referência (= capexUplift)
  tir: number;
}

export interface RealistaOpts {
  target?: number;      // TIR-alvo (default 1,6% = piso Frischtak)
  capexUplift?: number; // default = mediana da classe de ref.
  slipAnos?: number;    // default 0; caller passa (execução realista − obra) do seed
  haircutFloor?: number;// piso do haircut residual (default 0,3)
}

/** Slip de cronograma do realista = execução realista − obra oficial (anos), do seed. */
export function slipRealista(asset: Asset, obraAnos: number): number {
  const exec = asset.realistaAnchor?.execucaoAnos;
  return exec !== undefined ? Math.max(0, numVal(exec) - obraAnos) : 0;
}

/**
 * Calibra o caso realista para a TIR-alvo (default 1,6%, piso Frischtak/Amazônia
 * 2030, 06/nov/2024) pela COMBINAÇÃO das três alavancas, do mesmo jeito honesto que
 * o oficial — deixando a TIR EMERGIR, sem inflar uma alavanca só:
 *   • CAPEX  = mediana da classe de referência (sourced; Flyvbjerg/Frischtak ~+46%).
 *   • Slip   = execução realista − obra (sourced no seed; 22 − 9 = 13 anos).
 *   • Haircut de demanda = alavanca RESIDUAL resolvida p/ fechar na TIR-alvo.
 *
 * Fixadas as duas alavancas sourçadas, a TIR é monótona crescente no haircut
 * (mais demanda ⇒ mais TIR) → bisseção robusta em [haircutFloor, 1]. Usa tirSafe
 * (NaN→−1) para não saturar no platô sem-TIR. O haircut resultante é SAÍDA DE
 * MODELO (não um número sourçado): é o que sobra de demanda/tarifa para reconciliar
 * o custo+atraso sourçados com a TIR realista sourçada.
 */
export function calibrarRealista(
  params: ModelingParams,
  oficialLevers: Levers,
  opts: RealistaOpts = {},
): CalibracaoRealista {
  const target = opts.target ?? TIR_REALISTA_ALVO;
  const capexUplift = opts.capexUplift ?? upliftMedianoDaClasse();
  const slipAnos = Math.max(0, opts.slipAnos ?? 0);
  const haircutFloor = opts.haircutFloor ?? 0.3;

  const f = (h: number) =>
    tirSafe(params, { ...oficialLevers, capexUplift, slipAnos, demandaHaircut: h });
  let demandaHaircut = solve(f, target, haircutFloor, 1);
  // Alvo acima do alcançável só com haircut (TIR a haircut=1 já < alvo, ou alvo
  // acima da TIR sem haircut): não há demanda a "recuperar" acima do oficial →
  // fixa haircut=1 (sem corte) e deixa a TIR emergir das outras duas alavancas.
  if (!isFinite(demandaHaircut)) demandaHaircut = 1;

  const levers: Levers = { ...oficialLevers, capexUplift, slipAnos, demandaHaircut };
  return {
    levers,
    capexUplift,
    slipAnos,
    demandaHaircut,
    haircutImplicito: 1 - demandaHaircut,
    upliftClasse: upliftMedianoDaClasse(),
    tir: tirCenario(params, levers),
  };
}

// ───────────────────────────── distribuições ─────────────────────────────
// Amostragem das alavancas para o Monte Carlo (§4.4). Lognormais calibráveis.

export interface DistribParams {
  upliftMediana: number;  // mediana do uplift de CAPEX
  upliftSigma: number;    // desvio em log
  haircutMediana: number; // mediana do fator de demanda
  haircutSigma: number;
  slipMedia: number;      // atraso médio (anos)
  slipSigma: number;
}

/**
 * Distribuições do Monte Carlo. A mediana do uplift é a MESMA da classe de
 * referência usada no realista (`upliftMedianoDaClasse`), garantindo que o sorteio
 * e o caso realista partam da mesma premissa de custo.
 *
 * `upliftSigma` é MODELADO (sem fonte): foi calibrado em 0,33 para que a faixa
 * P5–P95 da TIR PASSE A COBRIR as duas âncoras — o oficial (11,04%, que exige um
 * draw de custo ABAIXO da mediana da classe, logo na cauda superior) e o realista
 * (~1,6%, cauda inferior) — sem degenerar o P5 para −100% (o que ocorre com sigmas
 * largos demais, que geram muitos draws sem TIR). Valor mínimo que cobre as duas
 * âncoras de forma não-degenerada. Ver `distribPadrao` como ponto de sensibilidade.
 */
export function distribPadrao(): DistribParams {
  return {
    upliftMediana: upliftMedianoDaClasse(),
    upliftSigma: 0.33,    // modelado — calibrado p/ cobertura P5–P95 das âncoras
    haircutMediana: 0.92, // modelado — realização média de demanda
    haircutSigma: 0.1,    // modelado
    slipMedia: 2,         // modelado — atraso médio de cronograma (anos)
    slipSigma: 0.6,       // modelado
  };
}

/** Amostra lognormal com mediana e sigma-log dados, usando um rng uniforme. */
export function sampleLognormal(
  rng: () => number,
  mediana: number,
  sigmaLog: number,
): number {
  return mediana * Math.exp(sigmaLog * randn(rng));
}

/**
 * Amostra alavancas RCF a partir das distribuições, preservando a base calibrada
 * (tarifa-teto + operating ratio sourçado do oficial) e sorteando uplift/haircut/slip.
 */
export function sampleLevers(
  rng: () => number,
  base: Levers,
  d: DistribParams = distribPadrao(),
): Levers {
  const uplift = sampleLognormal(rng, d.upliftMediana, d.upliftSigma);
  const haircut = sampleLognormal(rng, d.haircutMediana, d.haircutSigma);
  const slip = Math.max(0, Math.round(d.slipMedia * Math.exp(d.slipSigma * randn(rng))));
  return {
    ...base,
    capexUplift: uplift,
    demandaHaircut: haircut,
    slipAnos: slip,
  };
}
