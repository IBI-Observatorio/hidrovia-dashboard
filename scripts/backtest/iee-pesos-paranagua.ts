// scripts/backtest/iee-pesos-paranagua.ts
// EVIDÊNCIA da calibração de pesos do IEE-PARANAGUÁ (mesma metodologia do
// Santos, iee-v4-pesos-f.ts). Pgua tinha pesos v0 NUNCA validados (F/T/S
// 0,40/0,35/0,25). Aqui medimos cada pilar e o composto contra a espera EA de
// Paranaguá em t+2. NÃO altera o índice — mede.
//
//   F = pressão de chegadas ANTAQ (soma 4 sem), sem leakage (não usa a espera)
//   T = custo rodoviário modelado (rotas PR + bitrem)
//   S = pressão de safra (hinterlândia PR/SC × participação Comex)
//
//   npx tsx scripts/backtest/iee-pesos-paranagua.ts

import { semanaISODeData } from "../../lib/iee";
import { __backtest as bt } from "../../lib/agro-content";
import esperaEA from "../../data/antaq/espera-semanal.json";

const CORR = "paranagua";
const MS_SEM = 7 * 86400000;
const JANELA_F = 4;

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
  const det = bt.percentisWalkForward(pts);
  return new Map(pts.map((p, i) => [segunda(p.d), det[i].percentil]));
}

type Linha = [string, number, number];

function main() {
  const serieEA = ((esperaEA.corredores as unknown as Record<string, Linha[]>)[CORR])
    .slice().sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const nser = serieEA.map(([, , n]) => n);
  const ptsF = serieEA
    .map(([d], i) => {
      if (i + 1 < JANELA_F) return null;
      let s = 0; for (let j = i - JANELA_F + 1; j <= i; j++) s += nser[j];
      return { d, semanaISO: semanaISODeData(d), bruto: s };
    })
    .filter(Boolean) as { d: string; semanaISO: number; bruto: number }[];
  const pF = pctlMap(ptsF);
  const pT = pctlMap((bt.serieTModelada(CORR as never) as { d: string; semanaISO: number; custoPorT: number }[])
    .map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.custoPorT })));
  const pS = pctlMap((bt.serieSReal(CORR as never) as { d: string; semanaISO: number; bruto: number }[])
    .map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.bruto })));

  const detE = bt.percentisWalkForward(serieEA.map(([d, h]) => ({ d, semanaISO: semanaISODeData(d), bruto: h })));
  const alvo = new Map(serieEA.map(([d], i) => [segunda(d), detE[i].percentil]));

  const semanas = [...pF.keys()].filter((k) => pT.has(k) && pS.has(k)).sort();
  console.log(`=== Sweep F×T×S — PARANAGUÁ vs espera t+2 (F = chegadas ANTAQ, soma-${JANELA_F}sem) ===`);
  console.log(`semanas F∩T∩S: ${semanas.length}`);
  const vF = semanas.map((k) => pF.get(k)!), vT = semanas.map((k) => pT.get(k)!), vS = semanas.map((k) => pS.get(k)!);
  console.log(`corr percentis: F↔T ${spearman(vF, vT).toFixed(2)} · F↔S ${spearman(vF, vS).toFixed(2)} · T↔S ${spearman(vT, vS).toFixed(2)}\n`);

  function avalia(wF: number, wT: number, wS: number) {
    const X: number[] = [], Y: number[] = [];
    for (const k of semanas) {
      const comp = wF * pF.get(k)! + wT * pT.get(k)! + wS * pS.get(k)!;
      const k2 = new Date(new Date(k + "T00:00:00Z").getTime() + 2 * MS_SEM).toISOString().slice(0, 10);
      const y = alvo.get(k2);
      if (y != null) { X.push(comp); Y.push(y); }
    }
    const mae = X.reduce((a, _, i) => a + Math.abs(X[i] - Y[i]), 0) / X.length;
    return { s: spearman(X, Y), mae, n: X.length };
  }

  const ref = [
    { nome: "só F          ", w: [1, 0, 0] },
    { nome: "só T          ", w: [0, 1, 0] },
    { nome: "só S          ", w: [0, 0, 1] },
    { nome: "v0 atual F0,40/T0,35/S0,25", w: [0.40, 0.35, 0.25] },
    { nome: "cand F0,40/T0,40/S0,20", w: [0.40, 0.40, 0.20] },
    { nome: "cand F0,35/T0,45/S0,20", w: [0.35, 0.45, 0.20] },
    { nome: "cand F0,30/T0,50/S0,20", w: [0.30, 0.50, 0.20] },
    { nome: "cand F0,45/T0,40/S0,15", w: [0.45, 0.40, 0.15] },
    { nome: "cand F0,50/T0,40/S0,10 (Santos)", w: [0.50, 0.40, 0.10] },
  ];
  console.log(" combo                        | Spearman   MAE   pares");
  for (const r of ref) {
    const [wF, wT, wS] = r.w; const a = avalia(wF, wT, wS);
    console.log(`${r.nome.padEnd(28)} |  ${a.s.toFixed(2).padStart(5)}   ${a.mae.toFixed(1)}   ${a.n}`);
  }
  console.log("");

  let best = { wF: 0, wT: 0, wS: 0, s: -2, mae: 0, n: 0 };
  for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20 - i; j++) {
    const wF = i / 20, wT = j / 20, wS = 1 - wF - wT;
    const a = avalia(wF, wT, wS);
    if (a.s > best.s) best = { wF, wT, wS, ...a };
  }
  console.log(`ÓTIMO in-sample (passo 0,05): F=${best.wF.toFixed(2)} T=${best.wT.toFixed(2)} S=${best.wS.toFixed(2)}`);
  console.log(`  → Spearman ${best.s.toFixed(2)} · MAE ${best.mae.toFixed(1)} · n=${best.n} (SE≈±${(1 / Math.sqrt(best.n - 1)).toFixed(2)})`);
  console.log("Seleção IN-SAMPLE — sugestiva. Escolher pesos redondos próximos do ótimo, não o canto.");
}
main();
