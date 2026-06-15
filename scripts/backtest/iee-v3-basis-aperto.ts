// scripts/backtest/iee-v3-basis-aperto.ts
// EXPLORATÓRIO — pré-registro v3-desenho (docs/pre-registro-iee-v3-desenho.md).
//
// Testa se os pilares candidatos da v3 preveem a espera EA em t+2 melhor que o
// baseline v2 (Spearman 0,23 · MAE 27,3 p.p.):
//   - BASIS  = preço porto − preço interior (soja), R$/sc      → H1
//   - APERTO = (frete observado − custo modelado) / custo      → H2
//
// NÃO altera o IEE: só mede e reporta. Roda contra o alvo REAL (espera EA,
// data/antaq/espera-semanal.json); aguarda os caches CEPEA/SIFRECA — sem eles,
// reporta "aguardando dados" e não promove nada (regra do pré-registro).
//
//   npx tsx scripts/backtest/iee-v3-basis-aperto.ts

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { semanaISODeData } from "../../lib/iee";
import { __backtest } from "../../lib/agro-content";
import esperaEA from "../../data/antaq/espera-semanal.json";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORREDOR = "santos";
const BASELINE = { spearman: 0.23, mae: 27.3 }; // v2 registrado no backtest final
const LIMIAR_H1 = { spearman: 0.35, mae: 27.3 }; // critério congelado p/ o Basis
const MIN_PARES = 20;

type SemanaEA = [string, number, number]; // [segunda ISO, espera_h, n]

function lerCache(rel: string): { status?: string; corredores?: Record<string, [string, number][]> } | null {
  try { return JSON.parse(readFileSync(join(RAIZ, rel), "utf8")); } catch { return null; }
}

/** percentil sazonal walk-forward de uma série [data, valor]. */
function pctlWF(pts: { d: string; v: number }[]): { d: string; pctl: number }[] {
  const dets = __backtest.percentisWalkForward(
    pts.map((p) => ({ d: p.d, semanaISO: semanaISODeData(p.d), bruto: p.v })),
  );
  return pts.map((p, i) => ({ d: p.d, pctl: dets[i].percentil }));
}

function rank(a: number[]): number[] {
  const idx = a.map((v, i) => [v, i] as [number, number]).sort((p, q) => p[0] - q[0]);
  const r = new Array<number>(a.length);
  idx.forEach(([, i], k) => (r[i] = k + 1));
  return r;
}

function spearman(xs: number[], ys: number[]): number {
  const rx = rank(xs), ry = rank(ys), n = xs.length, m = (n + 1) / 2;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const ax = rx[i] - m, ay = ry[i] - m; num += ax * ay; dx += ax * ax; dy += ay * ay; }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

/** segunda-feira da semana ISO de uma data (alvo usa segundas como chave). */
function segundaISO(iso: string): Date {
  const dt = new Date(iso + "T00:00:00Z");
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = segunda
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt;
}

/** alinha predictor(t) vs alvo(t+2): normaliza p/ segunda ISO e soma 2 semanas. */
function alinha(pred: { d: string; pctl: number }[], alvo: Map<string, number>) {
  const X: number[] = [], Y: number[] = [];
  for (const p of pred) {
    const dT2 = new Date(segundaISO(p.d).getTime() + 14 * 86400000).toISOString().slice(0, 10);
    const y = alvo.get(dT2);
    if (y != null) { X.push(p.pctl); Y.push(y); }
  }
  return { X, Y };
}

function avalia(nome: string, serie: { d: string; v: number }[], alvo: Map<string, number>): number | null {
  const { X, Y } = alinha(pctlWF(serie), alvo);
  if (X.length < MIN_PARES) { console.log(`⏳ ${nome}: amostra curta (${X.length} pares) — inconclusivo.`); return null; }
  const s = spearman(X, Y);
  const mae = X.reduce((acc, _, i) => acc + Math.abs(X[i] - Y[i]), 0) / X.length;
  console.log(`   ${nome}: Spearman ${s.toFixed(2)} · MAE ${mae.toFixed(1)} p.p. (${X.length} pares)`);
  return s;
}

function main() {
  const espera = (esperaEA.corredores as Record<string, SemanaEA[]>)[CORREDOR] ?? [];
  if (!espera.length) { console.error("[v3] alvo (espera EA) ausente — abortando."); process.exitCode = 1; return; }
  const alvo = new Map(pctlWF(espera.map(([d, h]) => ({ d, v: h }))).map((p) => [p.d, p.pctl]));

  console.log("=== IEE v3 — teste exploratório (pré-registro v3-desenho) ===");
  console.log(`Alvo: percentil da espera EA em t+2 · ${CORREDOR} · ${espera.length} semanas`);
  console.log(`Baseline v2: Spearman ${BASELINE.spearman} · MAE ${BASELINE.mae} p.p.`);
  console.log(`Critério H1 (Basis): Spearman ≥ ${LIMIAR_H1.spearman} E MAE < ${LIMIAR_H1.mae}\n`);

  // --- H1: BASIS ---
  console.log("H1 · BASIS (preço porto − interior):");
  const basis = lerCache("data/cepea/basis-semanal.json");
  if (!basis || basis.status !== "ok" || !basis.corredores?.[CORREDOR]?.length) {
    console.log("   ⏳ aguardando dados — gere data/cepea/basis-semanal.json (scripts/cepea/gera-basis.py).");
  } else {
    avalia("basis", basis.corredores[CORREDOR].map(([d, v]) => ({ d, v })), alvo);
  }

  // --- H2: APERTO (frete − custo) vs T-custo ---
  console.log("\nH2 · APERTO (frete − custo) vs T-custo:");
  const frete = lerCache("data/imea/frete-semanal.json");
  const custo = __backtest.serieTModelada(CORREDOR as never).map((p) => ({ d: p.d, custo: p.custoPorT }));
  const sCusto = avalia("T-custo", custo.map((c) => ({ d: c.d, v: c.custo })), alvo);
  if (!frete || frete.status !== "ok" || !frete.corredores?.[CORREDOR]?.length) {
    console.log("   ⏳ APERTO aguardando frete IMEA — data/imea/frete-semanal.json.");
  } else {
    // custo (datas ANP) e frete (segundas ISO) casam por semana ISO (segunda).
    const custoPorSemana = new Map(custo.map((c) => [segundaISO(c.d).toISOString().slice(0, 10), c.custo]));
    const aperto = frete.corredores[CORREDOR]
      .map(([d, f]) => { const k = segundaISO(d).toISOString().slice(0, 10); const c = custoPorSemana.get(k); return c ? { d: k, v: (f - c) / c } : null; })
      .filter((x): x is { d: string; v: number } => x != null);
    const sAperto = avalia("aperto", aperto, alvo);
    if (sAperto != null && sCusto != null) {
      console.log(`   → H2 ${sAperto > sCusto ? "✓ Aperto supera o T-custo" : "✗ Aperto não supera o T-custo"}`);
    }
  }

  console.log("\nNada promovido a peso > 0 — só com gate OOS + novo pré-registro de parâmetro (regra do pré-registro).");
}
main();
