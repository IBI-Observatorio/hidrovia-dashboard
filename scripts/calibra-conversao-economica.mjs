// Calibra a CAMADA DE CONVERSÃO ECONÔMICA do IRC v3.6.
//
// Função: dado IRC ∈ [0, 100], devolve E[anomalia % de tonelagem | IRC] +
// intervalo de confiança IC80. Permite traduzir o índice em valor monetário
// para armadores (Cargill, Amaggi, Hermasa).
//
// Metodologia:
//   1. Calcula IRC v3.6 em cada um dos 112 eventos rotulados
//   2. Para cada evento, computa anomalia % de tonelagem vs mediana DOY mensal
//   3. Ajusta regressão local LOESS (ou polinomial robusta) IRC → anomalia%
//   4. Persiste curva calibrada com banda IC80 bootstrap

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SEED = 42;

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let GIT_SHA = "unknown", GIT_DIRTY = false;
try {
  GIT_SHA = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  GIT_DIRTY = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf-8" }).trim().length > 0;
} catch {}

// ─── Carrega eventos com IRC v3.6 calculado ──────────────────────────────
const eventosJson = JSON.parse(readFileSync(join(ROOT, "data", "antaq", "eventos-tabocal-sevop.json"), "utf-8"));
const eventos = eventosJson.eventos.filter((e) => e.sevOp != null && e.anomalia_operacional != null);

// Componentes (cópia v36)
const cmrCurvaTS = readFileSync(join(ROOT, "lib", "cmr-itacoatiara-calibrada.ts"), "utf-8");
const cmrCurvaMatch = cmrCurvaTS.match(/CURVA_CMR_CALIBRADA[\s\S]*?=\s*(\[[\s\S]*?\]);/);
const CURVA = eval(cmrCurvaMatch[1]).map((p) => [p[0], p[1]]);
function cmrDe(c) {
  if (c <= CURVA[0][0]) return 5.63;
  const u = CURVA[CURVA.length - 1];
  if (c >= u[0]) return u[1] + (c - u[0]) * 0.80;
  for (let i = 0; i < CURVA.length - 1; i++)
    if (c >= CURVA[i][0] && c <= CURVA[i + 1][0]) {
      const t = (c - CURVA[i][0]) / (CURVA[i + 1][0] - CURVA[i][0] || 1);
      return CURVA[i][1] + t * (CURVA[i + 1][1] - CURVA[i][1]);
    }
  return 5.63;
}
function compCalado(cota) {
  const def = Math.max(0, 11 - cmrDe(cota));
  if (def <= 0) return 0;
  if (def >= 5.5) return 100;
  if (def <= 2.5) return def * 20;
  return 50 + (def - 2.5) * (50 / 3);
}
const HMM_MU = [-0.4104, 0.051, 0.4982];
const HMM_SIGMA = [0.1627, 0.1237, 0.178];
const HMM_T7 = [[0.8951, 0.0997, 0.0053], [0.1047, 0.7938, 0.1016], [0.0069, 0.1269, 0.8662]];
function compHMM(idn) {
  const i = Math.max(-0.9, Math.min(0.9, idn));
  const probs = HMM_MU.map((m, k) => Math.exp(-((i - m) ** 2) / (2 * HMM_SIGMA[k] ** 2)) / (HMM_SIGMA[k] * Math.sqrt(2 * Math.PI)));
  const tot = probs.reduce((s, v) => s + v, 0);
  const norm = probs.map((p) => p / tot);
  let mx = 0, idx = 0;
  for (let k = 0; k < 3; k++) if (norm[k] > mx) { mx = norm[k]; idx = k; }
  const pc = HMM_T7[idx][0] + HMM_T7[idx][2];
  return Math.max(0, Math.min(100, 50 + ((pc - 0.67) / 0.3) * 50));
}
const lagCalibTS = readFileSync(join(ROOT, "lib", "lag-ortogonal-calibrado.ts"), "utf-8");
const LAG_A = parseFloat(lagCalibTS.match(/a:\s*(-?[0-9.]+),/)[1]);
const LAG_B = parseFloat(lagCalibTS.match(/b:\s*(-?[0-9.]+),/)[1]);
function compLag(mao, ita) {
  const esp = LAG_A + LAG_B * mao;
  const a = -(ita - esp);
  return Math.max(0, Math.min(100, 30 + (a / 3) * 70));
}

// Pesos v3.6
const pesosTS = readFileSync(join(ROOT, "lib", "irc-tabocal-pesos-calibrados-v36.ts"), "utf-8");
const pesos = {
  calado: parseFloat(pesosTS.match(/calado_tabocal:\s*([0-9.]+)/)[1]),
  hmm:    parseFloat(pesosTS.match(/hmm_extremo:\s*([0-9.]+)/)[1]),
  onda:   parseFloat(pesosTS.match(/onda_branco:\s*([0-9.]+)/)[1]),
  pp:     parseFloat(pesosTS.match(/anomalia_pp:\s*([0-9.]+)/)[1]),
  lag:    parseFloat(pesosTS.match(/lag_operacional:\s*([0-9.]+)/)[1]),
};

function calculaIRC(e) {
  const cC = compCalado(e.ita);
  const cH = compHMM(e.idn);
  const cO = e.onda;
  const cP = isNaN(e.pp) ? 0 : Math.min(3, Math.abs(e.pp)) / 3 * 100;
  const cL = compLag(e.mao, e.ita);
  const linear = pesos.calado*cC + pesos.hmm*cH + pesos.onda*cO + pesos.pp*cP + pesos.lag*cL;
  const piso = cC >= 80 ? cC * 0.75 : 0;
  return Math.max(linear, piso);
}

// ─── Calcula IRC + anomalia para cada evento ─────────────────────────────
const pares = eventos.map((e) => ({
  irc: calculaIRC(e),
  // anomalia_operacional = -mediana(z_scores) → POSITIVO quando há queda de
  // tonelagem (z negativo = ton abaixo do esperado). Convertemos para %:
  // queda_pct = anomalia_operacional * 15  (1σ ≈ 15% tonelagem mensal)
  anom_pct: e.anomalia_operacional * 15,  // positivo = queda, negativo = aumento
  ano: e.ano,
}));

// ─── Regressão IRC → anomalia% ───────────────────────────────────────────
// Tenta polinomial 2º grau primeiro, depois 1º
function ols(xs, ys, grau = 2) {
  const n = xs.length;
  const m = grau + 1;
  const X = xs.map((x) => {
    const row = [];
    for (let g = 0; g <= grau; g++) row.push(Math.pow(x, g));
    return row;
  });
  // X^T X
  const XtX = [];
  for (let i = 0; i < m; i++) {
    XtX.push([]);
    for (let j = 0; j < m; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[k][i] * X[k][j];
      XtX[i].push(s);
    }
  }
  // X^T y
  const Xty = [];
  for (let i = 0; i < m; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) s += X[k][i] * ys[k];
    Xty.push(s);
  }
  // Resolve por eliminação Gauss-Jordan
  const A = XtX.map((row, i) => [...row, Xty[i]]);
  for (let i = 0; i < m; i++) {
    // Pivot
    let piv = A[i][i];
    if (Math.abs(piv) < 1e-12) {
      for (let k = i + 1; k < m; k++) if (Math.abs(A[k][i]) > 1e-12) {
        [A[i], A[k]] = [A[k], A[i]];
        piv = A[i][i];
        break;
      }
    }
    for (let j = i; j <= m; j++) A[i][j] /= piv;
    for (let k = 0; k < m; k++) {
      if (k === i) continue;
      const f = A[k][i];
      for (let j = i; j <= m; j++) A[k][j] -= f * A[i][j];
    }
  }
  return A.map((row) => row[m]);  // coeficientes
}

const xs = pares.map((p) => p.irc);
const ys = pares.map((p) => p.anom_pct);

const coef2 = ols(xs, ys, 2);  // [a0, a1, a2] → f(x) = a0 + a1*x + a2*x²
console.log("Regressão IRC → anomalia % (grau 2):");
console.log(`  f(IRC) = ${coef2[0].toFixed(3)} + ${coef2[1].toFixed(3)}·IRC + ${coef2[2].toExponential(3)}·IRC²`);

function predict(irc) {
  return coef2[0] + coef2[1] * irc + coef2[2] * irc * irc;
}

// R²
const meanY = ys.reduce((s, v) => s + v, 0) / ys.length;
let ssRes = 0, ssTot = 0;
for (let i = 0; i < pares.length; i++) {
  const p = predict(xs[i]);
  ssRes += (ys[i] - p) ** 2;
  ssTot += (ys[i] - meanY) ** 2;
}
const r2 = 1 - ssRes / ssTot;
console.log(`  R² = ${r2.toFixed(3)}`);

// ─── Bootstrap para IC80 da predição ─────────────────────────────────────
const rng = makeRng(SEED);
const N_BOOT = 500;
const predRange = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const bootPreds = predRange.map(() => []);

for (let b = 0; b < N_BOOT; b++) {
  // Amostra com reposição
  const idxs = [];
  for (let i = 0; i < pares.length; i++) idxs.push(Math.floor(rng() * pares.length));
  const xsB = idxs.map((i) => xs[i]);
  const ysB = idxs.map((i) => ys[i]);
  const cB = ols(xsB, ysB, 2);
  for (let i = 0; i < predRange.length; i++) {
    const irc = predRange[i];
    bootPreds[i].push(cB[0] + cB[1] * irc + cB[2] * irc * irc);
  }
}

const tabelaPred = predRange.map((irc, i) => {
  const arr = bootPreds[i].sort((a, b) => a - b);
  return {
    irc,
    pred_central: +predict(irc).toFixed(2),
    pred_p10:     +arr[Math.floor(N_BOOT * 0.10)].toFixed(2),
    pred_p90:     +arr[Math.floor(N_BOOT * 0.90)].toFixed(2),
  };
});

console.log("\nTabela de conversão IRC → anomalia % esperada (bootstrap n=500):");
console.log("  IRC | central | P10  | P90");
for (const r of tabelaPred) {
  console.log(`  ${String(r.irc).padStart(3)} | ${r.pred_central.toFixed(1).padStart(6)}% | ${r.pred_p10.toFixed(1).padStart(5)}% | ${r.pred_p90.toFixed(1).padStart(5)}%`);
}

// ─── Salva artefato ──────────────────────────────────────────────────────
const out = `// AUTO-GERADO por scripts/calibra-conversao-economica.mjs em ${new Date().toISOString()}
// SEED: ${SEED} · GIT: ${GIT_SHA.slice(0, 7)}${GIT_DIRTY ? " (dirty)" : ""}
//
// Camada de conversão IRC → anomalia % de tonelagem esperada (gap #1 completo).
// Regressão polinomial grau 2 calibrada em 112 eventos rotulados contra dados
// ANTAQ. R² = ${r2.toFixed(3)}.
//
// Uso operacional:
//   import { caladoEconomico } from "./conversao-economica";
//   const r = caladoEconomico(IRC=65, volume_ton_mes=250_000, frete_R$ton=180);
//   // → { anomalia_pct: +18.5, ton_em_risco: 46_250, R$_em_risco: 8.3M, IC80: [...] }

export interface CurvaPontoConversao {
  irc: number;
  anomalia_pct_central: number;
  anomalia_pct_p10: number;
  anomalia_pct_p90: number;
}

export const CURVA_CONVERSAO_IRC_ANOMALIA: CurvaPontoConversao[] = ${JSON.stringify(
  tabelaPred.map((r) => ({
    irc: r.irc,
    anomalia_pct_central: r.pred_central,
    anomalia_pct_p10: r.pred_p10,
    anomalia_pct_p90: r.pred_p90,
  })),
  null,
  2,
)};

export const CONVERSAO_ECONOMICA_META = {
  metodologia:  "Polinomial grau 2 IRC → anomalia % vs tonelagem mensal esperada (ANTAQ 2010-2025, 4 portos)",
  coeficientes: { a0: ${coef2[0].toFixed(6)}, a1: ${coef2[1].toFixed(6)}, a2: ${coef2[2].toExponential(6)} },
  r2:           ${r2.toFixed(4)},
  n_eventos:    ${pares.length},
  n_bootstrap:  ${N_BOOT},
  seed:         ${SEED},
  gerado_em:    "${new Date().toISOString()}",
  git_sha:      "${GIT_SHA}",
  git_dirty:    ${GIT_DIRTY},
} as const;

/**
 * Converte IRC em estimativa de impacto econômico.
 *
 * @param irc                IRC atual (0-100)
 * @param volume_mensal_ton  Tonelagem mensal típica do operador
 * @param frete_R$_por_ton   Frete médio em R$/ton (default 180)
 */
export function caladoEconomico(
  irc: number,
  volume_mensal_ton: number,
  frete_R$_por_ton = 180,
) {
  const { a0, a1, a2 } = CONVERSAO_ECONOMICA_META.coeficientes;
  const anomalia = a0 + a1 * irc + a2 * irc * irc;  // %
  // Interpola IC80 da tabela
  const curva = CURVA_CONVERSAO_IRC_ANOMALIA;
  let lo = 0, hi = curva.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (curva[m].irc <= irc) lo = m; else hi = m;
  }
  const t = (irc - curva[lo].irc) / (curva[hi].irc - curva[lo].irc || 1);
  const p10 = curva[lo].anomalia_pct_p10 + t * (curva[hi].anomalia_pct_p10 - curva[lo].anomalia_pct_p10);
  const p90 = curva[lo].anomalia_pct_p90 + t * (curva[hi].anomalia_pct_p90 - curva[lo].anomalia_pct_p90);

  const ton_em_risco_central = +(volume_mensal_ton * Math.max(0, anomalia) / 100).toFixed(0);
  const ton_em_risco_p10     = +(volume_mensal_ton * Math.max(0, p10) / 100).toFixed(0);
  const ton_em_risco_p90     = +(volume_mensal_ton * Math.max(0, p90) / 100).toFixed(0);

  return {
    irc,
    anomalia_pct_central: +anomalia.toFixed(2),
    anomalia_pct_p10:     +p10.toFixed(2),
    anomalia_pct_p90:     +p90.toFixed(2),
    ton_em_risco_central,
    ton_em_risco_p10,
    ton_em_risco_p90,
    valor_em_risco_R$:    Math.round(ton_em_risco_central * frete_R$_por_ton),
    valor_p10_R$:         Math.round(ton_em_risco_p10 * frete_R$_por_ton),
    valor_p90_R$:         Math.round(ton_em_risco_p90 * frete_R$_por_ton),
  };
}
`;

const OUT_PATH = join(ROOT, "lib", "conversao-economica.ts");
writeFileSync(OUT_PATH, out, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
