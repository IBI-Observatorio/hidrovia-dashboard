// Camada Reference-Class Forecasting (Build Brief §4.2/4.3).
//
// Três alavancas corrigem o viés de otimismo do caso oficial:
//   • Uplift de CAPEX  — sobrecusto sistemático da classe ferroviária
//     (Flyvbjerg: média ~+40%). Lognormal calibrável.
//   • Haircut de demanda — realização abaixo da projeção.
//   • Slip de cronograma — atraso no início (IBAMA reabriu o EIA de 2020).
//
// E as ÂNCORAS DE CALIBRAÇÃO obrigatórias:
//   • Oficial:  tarifa calibrada para TIR ≈ WACC (por construção).
//   • Realista: O&M + uplift + haircut calibrados para TIR ≈ 11,04%
//     (Frischtak/Amazônia 2030, jun/2024).

import {
  type ModelingParams,
  type Levers,
  type ReferenceClassEntry,
  LEVERS_NEUTROS,
} from "./types";
import { tirCenario } from "./cashflow";
import { solve } from "./irr";
import { randn } from "../prng";
import railRefClass from "../../data/referenceClass/rail.json";

/** Alvo do caso realista: TIR ≈ 1,6% (Frischtak/Amazônia 2030, 06/nov/2024). */
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
  upliftImplicito: number;        // multiplicador de CAPEX implícito no alvo
  sobrecustoImplicitoPct: number; // upliftImplicito − 1
  upliftClasse: number;           // mediana da classe de referência (p/ comparar)
  tir: number;
}

/**
 * Calibra o caso realista para a TIR-alvo (default 1,6%, Frischtak/Amazônia 2030,
 * 06/nov/2024). Parte do oficial (tarifa-teto + operating ratio + tributos reais) e
 * resolve o SOBRECUSTO DE CAPEX implícito que reconcilia com a TIR realista.
 *
 * ATENÇÃO (proxy honesto): é uma alavanca ÚNICA. A Frischtak chega a 1,6% com
 * CAPEX +46% (parâmetros da FICO 1) E execução 9→22 anos. Como aqui só mexemos no
 * CAPEX, o uplift implícito SUPERESTIMA o sobrecusto (absorve também o atraso). Os
 * 1,6% são a âncora sourçada; este uplift é só a leitura "se fosse só custo".
 * TIR é monótona decrescente no uplift → bisseção robusta.
 */
export function calibrarRealista(
  params: ModelingParams,
  oficialLevers: Levers,
  target: number = TIR_REALISTA_ALVO,
): CalibracaoRealista {
  const f = (uplift: number) => tirSafe(params, { ...oficialLevers, capexUplift: uplift });
  const uplift = solve(f, target, 1, 12); // CAPEX ×1 (oficial) … ×12
  const levers: Levers = { ...oficialLevers, capexUplift: uplift };
  return {
    levers,
    upliftImplicito: uplift,
    sobrecustoImplicitoPct: uplift - 1,
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

export function distribPadrao(): DistribParams {
  return {
    upliftMediana: upliftMedianoDaClasse(),
    upliftSigma: 0.22,
    haircutMediana: 0.92,
    haircutSigma: 0.1,
    slipMedia: 2,
    slipSigma: 0.6,
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
