// Barril público do motor DCF + conveniência de análise de um ativo.

export * from "./types";
export * from "./irr";
export * from "./cashflow";
export * from "./referenceClass";
export * from "./montecarlo";

import {
  type Asset,
  type Levers,
  type ScenarioResult,
  LEVERS_NEUTROS,
} from "./types";
import { paramsFromAsset, buildCashflow, tirCenario } from "./cashflow";
import { npv } from "./irr";
import { calibrarOficial, calibrarRealista } from "./referenceClass";
import { runMonteCarlo, type MonteCarloResult } from "./montecarlo";

/** Avalia um conjunto de alavancas e devolve um `ScenarioResult` completo. */
export function avaliarCenario(
  asset: Asset,
  id: ScenarioResult["id"],
  label: string,
  levers: Levers,
): ScenarioResult {
  const params = paramsFromAsset(asset);
  const cashflow = buildCashflow(params, levers);
  const tir = tirCenario(params, levers);
  const vpl = npv(params.wacc, cashflow.fcl);
  return { id, label, levers, tir, spread: tir - params.wacc, vpl, cashflow };
}

export interface AnaliseAtivo {
  oficial: ScenarioResult;
  realista: ScenarioResult;
  monteCarlo: MonteCarloResult;
  tarifaTeto: number;             // R$/mil TKU (tarifa-teto oficial, fixa)
  operatingRatio: number;         // O&M/receita do oficial (input sourçado)
  upliftImplicito: number;        // multiplicador de CAPEX do realista
  sobrecustoImplicitoPct: number; // upliftImplicito − 1
  upliftClasse: number;           // mediana da classe de referência
  wacc: number;
}

/**
 * Pipeline de análise do ativo: ancora o Oficial nas fontes ANTT (tarifa-teto +
 * TIR=WACC=11,04%), calibra o Realista para a TIR de Frischtak (1,6%), roda o
 * Monte Carlo e devolve tudo pronto para a UI. Reprodutível pela `seed`.
 */
export function analisarAtivo(
  asset: Asset,
  opts: { mcN?: number; seed?: number } = {},
): AnaliseAtivo {
  const params = paramsFromAsset(asset);
  const cof = calibrarOficial(params);
  const cre = calibrarRealista(params, cof.levers);

  const oficial = avaliarCenario(asset, "oficial", "Oficial", cof.levers);
  const realista = avaliarCenario(asset, "realista", "Realista", cre.levers);
  const monteCarlo = runMonteCarlo(
    params,
    cof.levers,
    opts.mcN ?? 10000,
    opts.seed ?? 42,
  );

  return {
    oficial,
    realista,
    monteCarlo,
    tarifaTeto: params.tarifaTKU * 1000,
    operatingRatio: cof.operatingRatio,
    upliftImplicito: cre.upliftImplicito,
    sobrecustoImplicitoPct: cre.sobrecustoImplicitoPct,
    upliftClasse: cre.upliftClasse,
    wacc: params.wacc,
  };
}

export { LEVERS_NEUTROS };
