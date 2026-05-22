// Calibração v3.6 do IRC-Tabocal contra RÓTULOS OPERACIONAIS ANTAQ.
//
// Fecha o gap #1: severidade agora é anomalia de tonelagem mensal nos 4 portos
// do cluster Tabocal (Manaus, Itacoatiara, Santarém, Itaituba), padronizada por
// resíduo de regressão temporal. Removido viés hidrológico do rótulo.
//
// Discovery preliminar: ρ(sev_externa P_DOY, sev_operacional ANTAQ) = -0.06.
// As duas rotulagens NÃO ESTÃO CORRELACIONADAS. A v3.5 estava calibrada contra
// estresse hidrológico, não operacional. Esta v3.6 corrige.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

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

// ─── Carrega eventos com sev OPERACIONAL ─────────────────────────────────
const eventosJson = JSON.parse(readFileSync(join(ROOT, "data", "antaq", "eventos-tabocal-sevop.json"), "utf-8"));
const eventos = eventosJson.eventos.filter((e) => e.sevOp != null);
console.log(`Eventos com rótulo operacional ANTAQ: ${eventos.length}`);

// Distribuição
const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
for (const e of eventos) dist[e.sevOp]++;
console.log(`Distribuição sev_op: 1=${dist[1]}, 2=${dist[2]}, 3=${dist[3]}, 4=${dist[4]}, 5=${dist[5]}`);

const treino = eventos.filter((e) => e.ano <= 2022);
const teste  = eventos.filter((e) => e.ano >= 2023);
console.log(`Treino (≤2022): ${treino.length} · Teste (≥2023): ${teste.length}`);

// ─── Componentes (idênticos a v35.mjs) ───────────────────────────────────
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
function compCalado(cota, eta, alvo = 11.0) {
  const def = Math.max(0, alvo - cmrDe(cota));
  let atual;
  if (def <= 0) atual = 0;
  else if (def >= 5.5) atual = 100;
  else if (def <= 2.5) atual = def * 20;
  else atual = 50 + (def - 2.5) * (50 / 3);
  let proj = 0;
  if (eta != null && eta >= 0) {
    if (eta <= 30) proj = 95;
    else if (eta <= 90) proj = 95 - ((eta - 30) / 60) * 55;
    else if (eta <= 180) proj = 40 - ((eta - 90) / 90) * 30;
    else proj = 10 - Math.min(10, (eta - 180) / 30);
  }
  return Math.max(atual, proj);
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
function compPP(cat) { return isNaN(cat) ? 0 : Math.min(3, Math.abs(cat)) / 3 * 100; }
const lagCalibTS = readFileSync(join(ROOT, "lib", "lag-ortogonal-calibrado.ts"), "utf-8");
const LAG_A = parseFloat(lagCalibTS.match(/a:\s*(-?[0-9.]+),/)[1]);
const LAG_B = parseFloat(lagCalibTS.match(/b:\s*(-?[0-9.]+),/)[1]);
function compLag(mao, ita) {
  const esp = LAG_A + LAG_B * mao;
  const a = -(ita - esp);
  return Math.max(0, Math.min(100, 30 + (a / 3) * 70));
}
function calculaIRC(ev, pesos) {
  const c_calado = compCalado(ev.ita, ev.eta);
  const c_hmm    = compHMM(ev.idn);
  const c_onda   = isNaN(ev.onda) ? 0 : ev.onda;
  const c_pp     = compPP(ev.pp);
  const c_lag    = compLag(ev.mao, ev.ita);
  const linear = pesos.calado*c_calado + pesos.hmm*c_hmm + pesos.onda*c_onda + pesos.pp*c_pp + pesos.lag*c_lag;
  const piso = c_calado >= 80 ? c_calado * 0.75 : 0;
  return Math.max(linear, piso);
}

function spearman(x, y) {
  const n = x.length;
  if (n < 2) return NaN;
  const rank = (arr) => {
    const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(n);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const meanRank = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = meanRank;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(x), ry = rank(y);
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx  += (rx[i] - mx) ** 2;
    dy  += (ry[i] - my) ** 2;
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}

// ─── Otimização ──────────────────────────────────────────────────────────
const PESO_FIXO_ONDA = 0.10;
const PESO_FIXO_PP   = 0.10;
const SOMA_LIVRE     = 1.0 - PESO_FIXO_ONDA - PESO_FIXO_PP;

function gridSearch(evs, alvo = "sevOp") {
  let best = { rho: -Infinity, pesos: null };
  const steps = [];
  const N = 21;
  for (let i = 0; i < N; i++) steps.push((i / (N - 1)) * SOMA_LIVRE);
  for (const c of steps) for (const h of steps) {
    if (c + h > SOMA_LIVRE) continue;
    const l = SOMA_LIVRE - c - h;
    if (l < 0) continue;
    const pesos = { calado: c, hmm: h, onda: PESO_FIXO_ONDA, pp: PESO_FIXO_PP, lag: l };
    const ircs = evs.map((e) => calculaIRC(e, pesos));
    const sevs = evs.map((e) => e[alvo]);
    const r = spearman(ircs, sevs);
    if (r > best.rho) best = { rho: r, pesos };
  }
  return best;
}

function gradOpt(evs, pesos0, alvo = "sevOp") {
  let p = { ...pesos0 };
  const lr = 0.02; const eps = 0.005;
  for (let it = 0; it < 200; it++) {
    const ircs = evs.map((e) => calculaIRC(e, p));
    const sevs = evs.map((e) => e[alvo]);
    const r0 = spearman(ircs, sevs);
    const grad = {};
    for (const k of ["calado","hmm","lag"]) {
      const pp = { ...p, [k]: Math.max(0, p[k] + eps) };
      const ircs2 = evs.map((e) => calculaIRC(e, pp));
      grad[k] = (spearman(ircs2, sevs) - r0) / eps;
    }
    for (const k of ["calado","hmm","lag"]) p[k] = Math.max(0.01, p[k] + lr * grad[k]);
    const soma = p.calado + p.hmm + p.lag;
    const fator = SOMA_LIVRE / soma;
    for (const k of ["calado","hmm","lag"]) p[k] *= fator;
  }
  return p;
}

// ─── Pipeline ────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════");
console.log("CALIBRAÇÃO v3.6 — Rótulos operacionais ANTAQ");
console.log("══════════════════════════════════════════════════════");

console.log("\n1. Grid search no treino (alvo: sevOp)...");
const gridRes = gridSearch(treino, "sevOp");
console.log(`   ρ_train (grid): ${gridRes.rho.toFixed(4)}`);
console.log(`   pesos: c=${gridRes.pesos.calado.toFixed(2)} h=${gridRes.pesos.hmm.toFixed(2)} l=${gridRes.pesos.lag.toFixed(2)}`);

console.log("\n2. Gradient refine...");
const refinado = gradOpt(treino, gridRes.pesos, "sevOp");
const rhoTrainRef = spearman(treino.map((e) => calculaIRC(e, refinado)), treino.map((e) => e.sevOp));
console.log(`   ρ_train (refinado): ${rhoTrainRef.toFixed(4)}`);
console.log(`   pesos: c=${refinado.calado.toFixed(3)} h=${refinado.hmm.toFixed(3)} l=${refinado.lag.toFixed(3)}`);

console.log("\n3. Regularização (α=0.7) com uniforme nos livres...");
const UNIF = { calado: SOMA_LIVRE/3, hmm: SOMA_LIVRE/3, lag: SOMA_LIVRE/3 };
const ALPHA = 0.7;
const pesosFinal = { onda: PESO_FIXO_ONDA, pp: PESO_FIXO_PP };
for (const k of ["calado","hmm","lag"]) pesosFinal[k] = ALPHA * refinado[k] + (1 - ALPHA) * UNIF[k];
const sLivre = pesosFinal.calado + pesosFinal.hmm + pesosFinal.lag;
const fator = SOMA_LIVRE / sLivre;
for (const k of ["calado","hmm","lag"]) pesosFinal[k] = +(pesosFinal[k] * fator).toFixed(3);
console.log(`   c=${pesosFinal.calado} h=${pesosFinal.hmm} o=${pesosFinal.onda} p=${pesosFinal.pp} l=${pesosFinal.lag}`);

console.log("\n4. Performance:");
const ircsTrain = treino.map((e) => calculaIRC(e, pesosFinal));
const ircsTest  = teste.map((e) => calculaIRC(e, pesosFinal));
const sevsTrain = treino.map((e) => e.sevOp);
const sevsTest  = teste.map((e) => e.sevOp);
const rhoTrain = spearman(ircsTrain, sevsTrain);
const rhoTest  = spearman(ircsTest, sevsTest);
console.log(`   ρ TRAIN (≤2022, n=${treino.length}): ${rhoTrain.toFixed(4)}`);
console.log(`   ρ TEST  (≥2023, n=${teste.length}):  ${rhoTest.toFixed(4)}`);

// Permutation test
console.log("\n5. Permutation test (p-valor sob H0)...");
const rng = makeRng(SEED);
const N_PERM = 2000;
let nSup = 0;
for (let i = 0; i < N_PERM; i++) {
  const shuffled = [...sevsTrain];
  for (let j = shuffled.length - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
  }
  if (spearman(ircsTrain, shuffled) >= rhoTrain) nSup++;
}
const pValor = (nSup + 1) / (N_PERM + 1);
console.log(`   p-valor: ${pValor.toFixed(4)} (${nSup}/${N_PERM} ≥ ρ obs)`);

console.log("\n6. Comparação v3.5 (sev hidrológica) vs v3.6 (sev operacional):");
// Reaplicar a v3.5 contra sevOp para ver se piora
const PESOS_V35 = { calado: 0.579, hmm: 0.134, onda: 0.10, pp: 0.10, lag: 0.087 };
const ircsV35_tr = treino.map((e) => calculaIRC(e, PESOS_V35));
const ircsV35_te = teste.map((e) => calculaIRC(e, PESOS_V35));
const rhoV35tr_op = spearman(ircsV35_tr, sevsTrain);
const rhoV35te_op = spearman(ircsV35_te, sevsTest);
console.log(`   v3.5 pesos contra sevOp: ρ_train=${rhoV35tr_op.toFixed(3)}, ρ_test=${rhoV35te_op.toFixed(3)}`);
console.log(`   v3.6 pesos contra sevOp: ρ_train=${rhoTrain.toFixed(3)}, ρ_test=${rhoTest.toFixed(3)}`);
console.log(`   Ganho v3.6 vs v3.5 (treino): ${(rhoTrain - rhoV35tr_op).toFixed(3)}`);
console.log(`   Ganho v3.6 vs v3.5 (teste):  ${(rhoTest - rhoV35te_op).toFixed(3)}`);

// ─── Salva artefato ──────────────────────────────────────────────────────
const pesosBloco = `PESOS_IRC_TABOCAL_V36 = {
  calado_tabocal:  ${pesosFinal.calado},
  hmm_extremo:     ${pesosFinal.hmm},
  onda_branco:     ${pesosFinal.onda},
  anomalia_pp:     ${pesosFinal.pp},
  lag_operacional: ${pesosFinal.lag},
}`;
const pesosHash = createHash("sha256").update(pesosBloco).digest("hex").slice(0, 16);

const out = `// AUTO-GERADO por scripts/calibra-irc-v36-antaq.mjs em ${new Date().toISOString()}
// SEED: ${SEED} · GIT: ${GIT_SHA.slice(0, 7)}${GIT_DIRTY ? " (dirty)" : ""}
//
// Calibração v3.6 do IRC-Tabocal contra RÓTULOS OPERACIONAIS ANTAQ.
//
// MUDANÇA-CHAVE vs v3.5: severidade externa derivada de tonelagem efetivamente
// transportada nos 4 portos do cluster Tabocal (Manaus, Itacoatiara, Santarém,
// Itaituba), padronizada por resíduo de regressão temporal. Substitui rótulo
// hidrológico (P_DOY de cotas) que tinha causa comum com componentes do IRC.
//
// Performance:
//   ρ_train (≤2022, n=${treino.length}): ${rhoTrain.toFixed(4)}
//   ρ_test  (≥2023, n=${teste.length}):  ${rhoTest.toFixed(4)}
//   p-valor (perm n=${N_PERM}):          ${pValor.toFixed(4)}
//
// Comparação contra sevOp:
//   Pesos v3.5 → ρ_train=${rhoV35tr_op.toFixed(3)}, ρ_test=${rhoV35te_op.toFixed(3)}
//   Pesos v3.6 → ρ_train=${rhoTrain.toFixed(3)}, ρ_test=${rhoTest.toFixed(3)}

export const PESOS_IRC_TABOCAL_V36 = {
  calado_tabocal:  ${pesosFinal.calado},
  hmm_extremo:     ${pesosFinal.hmm},
  onda_branco:     ${pesosFinal.onda},
  anomalia_pp:     ${pesosFinal.pp},
  lag_operacional: ${pesosFinal.lag},
} as const;

export const PESOS_IRC_TABOCAL_V36_HASH = "${pesosHash}";

export const CALIBRACAO_IRC_V36 = {
  metodologia:        "Rótulos operacionais ANTAQ (anomalia de tonelagem nos 4 portos do cluster Tabocal, resíduo de regressão temporal)",
  n_treino:           ${treino.length},
  n_teste:            ${teste.length},
  rho_train:          ${rhoTrain.toFixed(4)},
  rho_test:           ${rhoTest.toFixed(4)},
  p_valor_perm:       ${pValor.toFixed(4)},
  n_permutacoes:      ${N_PERM},
  alpha_regularizacao: ${ALPHA},
  pesos_v35_aplicados_sevop: {
    rho_train: ${rhoV35tr_op.toFixed(4)},
    rho_test:  ${rhoV35te_op.toFixed(4)},
  },
  ganho_v36_vs_v35: {
    train: ${(rhoTrain - rhoV35tr_op).toFixed(4)},
    test:  ${(rhoTest - rhoV35te_op).toFixed(4)},
  },
  seed:               ${SEED},
  gerado_em:          "${new Date().toISOString()}",
  git_sha:            "${GIT_SHA}",
  git_dirty:          ${GIT_DIRTY},
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "irc-tabocal-pesos-calibrados-v36.ts");
writeFileSync(OUT_PATH, out, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
console.log(`  Hash pesos: ${pesosHash}`);
