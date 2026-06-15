// scripts/backtest/iee-v3-pesos.ts
// EVIDÊNCIA da recalibração de pesos do IEE-Santos (pré-registro v3).
// Sweep wT×wS do composto vs espera EA em t+2. NÃO altera o índice — mede.
// F fica de fora (sem histórico no período do backtest); H não entra em Santos.
//
//   npx tsx scripts/backtest/iee-v3-pesos.ts

import { semanaISODeData } from "../../lib/iee";
import { __backtest } from "../../lib/agro-content";
import esperaEA from "../../data/antaq/espera-semanal.json";

const CORR = "santos";

function segunda(iso: string): string {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}
function rank(a: number[]): number[] {
  const idx = a.map((v, i) => [v, i] as [number, number]).sort((p, q) => p[0] - q[0]);
  const r = new Array<number>(a.length);
  idx.forEach(([, i], k) => (r[i] = k + 1));
  return r;
}
function spearman(x: number[], y: number[]): number {
  const rx = rank(x), ry = rank(y), n = x.length, m = (n + 1) / 2;
  let s = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = rx[i] - m, b = ry[i] - m; s += a * b; dx += a * a; dy += b * b; }
  return dx && dy ? s / Math.sqrt(dx * dy) : 0;
}
function pctlMap(pts: { d: string; semanaISO: number; bruto: number }[]): Map<string, number> {
  const det = __backtest.percentisWalkForward(pts);
  return new Map(pts.map((p, i) => [segunda(p.d), det[i].percentil]));
}

function main() {
  const pT = pctlMap((__backtest.serieTModelada(CORR as never) as { d: string; semanaISO: number; custoPorT: number }[])
    .map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.custoPorT })));
  const pS = pctlMap((__backtest.serieSReal(CORR as never) as { d: string; semanaISO: number; bruto: number }[])
    .map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.bruto })));

  const espera = (esperaEA.corredores as unknown as Record<string, [string, number, number][]>)[CORR];
  const detE = __backtest.percentisWalkForward(espera.map(([d, h]) => ({ d, semanaISO: semanaISODeData(d), bruto: h })));
  const alvo = new Map(espera.map(([d], i) => [segunda(d), detE[i].percentil]));

  const semanas = [...pT.keys()].filter((k) => pS.has(k)).sort();
  function avalia(wT: number) {
    const X: number[] = [], Y: number[] = [];
    for (const k of semanas) {
      const comp = wT * pT.get(k)! + (1 - wT) * pS.get(k)!;
      const kT2 = new Date(new Date(k + "T00:00:00Z").getTime() + 14 * 86400000).toISOString().slice(0, 10);
      const y = alvo.get(kT2);
      if (y != null) { X.push(comp); Y.push(y); }
    }
    const mae = X.reduce((a, _, i) => a + Math.abs(X[i] - Y[i]), 0) / X.length;
    return { s: spearman(X, Y), mae, n: X.length };
  }

  console.log("=== Sweep de pesos — Santos · T vs S vs espera t+2 ===");
  console.log(`semanas T∩S: ${semanas.length}\n wT   wS  | Spearman   MAE   pares`);
  let best = { wT: -1, s: -2, mae: 0, n: 0 };
  for (let i = 0; i <= 20; i++) {
    const wT = i / 20;
    const r = avalia(wT);
    if (r.s > best.s) best = { wT, ...r };
    const marca = wT === 0.6 ? "  ← v3 (T0,60/S0,15 efetivo s/F)" : (wT === 1 ? "  ← só T" : (wT === 0 ? "  ← só S" : ""));
    console.log(`${wT.toFixed(2)} ${(1 - wT).toFixed(2)} |  ${r.s.toFixed(2).padStart(5)}   ${r.mae.toFixed(1)}   ${r.n}${marca}`);
  }
  console.log(`\nÓTIMO in-sample: wT=${best.wT.toFixed(2)} → Spearman ${best.s.toFixed(2)} (n=${best.n}, SE≈±${(1 / Math.sqrt(best.n - 1)).toFixed(2)}).`);
  console.log("Seleção IN-SAMPLE — sugestivo. v3 adota T dominante (composto), não o extremo wT=1.");
}
main();
