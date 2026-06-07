// Monte Carlo do DCF (Build Brief §4.4).
//
// Amostra {uplift CAPEX, haircut demanda, slip} (N≈10k) com PRNG seedável
// (reprodutível) e deriva:
//   • distribuição de TIR
//   • distribuição do "ano de break-even" (1º ano com VPL acumulado ≥ 0 ao WACC)
//   • P(spread < 0) = P(TIR < WACC)  → alimenta a P(leilão por ano) do módulo 1
//
// Sempre rotular as saídas como "saída de modelo · ilustrativo".

import { type ModelingParams, type Levers, LEVERS_NEUTROS } from "./types";
import { buildCashflow } from "./cashflow";
import { irr } from "./irr";
import { sampleLevers, distribPadrao, type DistribParams } from "./referenceClass";
import { makeRng } from "../prng";

export interface MonteCarloResult {
  n: number;
  seed: number;
  tirs: number[];           // ordenado
  anosBreakeven: (number | null)[];
  tirMediana: number;
  tirP5: number;
  tirP95: number;
  tirMedia: number;
  pSpreadNeg: number;       // P(TIR < WACC)
  pSpreadNegIC: [number, number]; // IC95 (Wald) sobre a proporção
  anoBreakevenMediano: number | null;
  histograma: { bin: number; count: number }[];
}

function percentil(ordenado: number[], p: number): number {
  if (ordenado.length === 0) return NaN;
  const idx = (ordenado.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return ordenado[lo];
  return ordenado[lo] + (idx - lo) * (ordenado[hi] - ordenado[lo]);
}

/** 1º ano-calendário em que o VPL acumulado (ao WACC) cruza para ≥ 0. */
function anoBreakeven(
  fcl: number[],
  anos: number[],
  wacc: number,
): number | null {
  let acc = 0;
  for (let t = 0; t < fcl.length; t++) {
    acc += fcl[t] / Math.pow(1 + wacc, t);
    if (acc >= 0) return anos[t];
  }
  return null;
}

/** Histograma de TIR em `bins` faixas iguais entre min e max observados. */
function histograma(tirs: number[], bins = 24): { bin: number; count: number }[] {
  if (tirs.length === 0) return [];
  const min = tirs[0];
  const max = tirs[tirs.length - 1];
  const w = (max - min) / bins || 1;
  const out = Array.from({ length: bins }, (_, i) => ({
    bin: min + (i + 0.5) * w,
    count: 0,
  }));
  for (const v of tirs) {
    let i = Math.floor((v - min) / w);
    if (i >= bins) i = bins - 1;
    if (i < 0) i = 0;
    out[i].count++;
  }
  return out;
}

/**
 * Roda o Monte Carlo. Reprodutível: mesma `seed` ⇒ mesmo resultado.
 *
 * @param baseLevers alavancas calibradas do oficial (tarifa-teto + O&M de
 *                   fechamento) sobre as quais o sorteio de uplift/haircut/slip
 *                   é aplicado.
 */
export function runMonteCarlo(
  params: ModelingParams,
  baseLevers: Levers = LEVERS_NEUTROS,
  n = 10000,
  seed = 42,
  distrib: DistribParams = distribPadrao(),
): MonteCarloResult {
  const rng = makeRng(seed);
  const tirs: number[] = [];
  const anosBreakeven: (number | null)[] = [];

  for (let i = 0; i < n; i++) {
    const levers = sampleLevers(rng, baseLevers, distrib);
    const { fcl, anos } = buildCashflow(params, levers);
    const t = irr(fcl, 0.1);
    // Draw sem TIR = capital nunca retorna (prejuízo perpétuo). NÃO descartar
    // (isso subestimaria o risco): contar como TIR ≈ −100% e sem break-even.
    if (isFinite(t)) {
      tirs.push(t);
      anosBreakeven.push(anoBreakeven(fcl, anos, params.wacc));
    } else {
      tirs.push(-1);
      anosBreakeven.push(null);
    }
  }

  tirs.sort((a, b) => a - b);
  const nValid = tirs.length;
  const media = tirs.reduce((a, b) => a + b, 0) / Math.max(1, nValid);
  const negativos = tirs.filter((t) => t < params.wacc).length;
  const p = negativos / Math.max(1, nValid);
  const se = Math.sqrt((p * (1 - p)) / Math.max(1, nValid));

  const beValidos = anosBreakeven
    .filter((a): a is number => a !== null)
    .sort((a, b) => a - b);
  const beMediano =
    beValidos.length > 0 ? beValidos[Math.floor(beValidos.length / 2)] : null;

  return {
    n: nValid,
    seed,
    tirs,
    anosBreakeven,
    tirMediana: percentil(tirs, 0.5),
    tirP5: percentil(tirs, 0.05),
    tirP95: percentil(tirs, 0.95),
    tirMedia: media,
    pSpreadNeg: p,
    pSpreadNegIC: [Math.max(0, p - 1.96 * se), Math.min(1, p + 1.96 * se)],
    anoBreakevenMediano: beMediano,
    histograma: histograma(tirs),
  };
}
