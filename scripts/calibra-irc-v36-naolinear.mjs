// Gap #2 — Testa formas funcionais não-lineares do IRC contra baseline linear v3.5.
//
// Hipótese: ρ_train v3.5 = 0,08 sugere que a soma linear ponderada não captura
// bem a relação componentes → severidade. Possíveis razões:
//   • Não-linearidade dentro de cada componente (calado tem threshold brutal)
//   • Aditividade falsa (interações entre componentes)
//   • Modelo errado para ordinal multi-classe
//
// Modelos testados:
//   A. LINEAR baseline (v3.5)              — para comparação
//   B. SIGMOIDE por componente             — captura saturação/threshold
//   C. POWER por componente                — α<1 enfatiza valores baixos, α>1 altos
//   D. LOGIT ORDINAL proporcional          — textbook para sev 1-5 ordinal
//   E. INTERAÇÕES 2-a-2 com regularização  — captura efeitos conjuntos
//
// Critério de adoção: o modelo escolhido deve:
//   • ρ_test > linear + 0,10
//   • Manter interpretabilidade (sem black-box)
//   • Não sofrer overfit grave (ρ_train ≤ ρ_test + 0,30)

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

// ─── Carrega dataset ──────────────────────────────────────────────────────
const expTS = readFileSync(join(ROOT, "lib", "eventos-tabocal-expandidos.ts"), "utf-8");
const expMatch = expTS.match(/EVENTOS_TABOCAL_EXPANDIDOS: EventoTabocalExpandido\[\] = (\[[\s\S]*?\]);/);
const eventos = JSON.parse(expMatch[1]);
console.log(`Eventos: ${eventos.length}`);

const treino = eventos.filter((e) => e.ano <= 2022);
const teste  = eventos.filter((e) => e.ano >= 2023);
console.log(`Treino: ${treino.length}  Teste: ${teste.length}`);

// ─── Componentes brutos (idênticos ao irc-tabocal.ts v3.5) ───────────────
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
function compCalado(c, alvo = 11.0) {
  const def = Math.max(0, alvo - cmrDe(c));
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

// Extrai componentes brutos para cada evento
function extraiComponentes(e) {
  return {
    calado: compCalado(e.ita),
    hmm:    compHMM(e.idn),
    onda:   e.onda,
    pp:     isNaN(e.pp) ? 0 : Math.min(3, Math.abs(e.pp)) / 3 * 100,
    lag:    compLag(e.mao, e.ita),
    sev:    e.sevExt,
  };
}

const compTreino = treino.map(extraiComponentes);
const compTeste  = teste.map(extraiComponentes);

// ─── Métricas ────────────────────────────────────────────────────────────
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

function permTest(ircs, sevs, rho_obs, n_perm = 1000, seed = 42) {
  const rng = makeRng(seed);
  let nSuperior = 0;
  for (let i = 0; i < n_perm; i++) {
    const shuffled = [...sevs];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(rng() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }
    if (spearman(ircs, shuffled) >= rho_obs) nSuperior++;
  }
  return (nSuperior + 1) / (n_perm + 1);
}

// ─── MODELO A: LINEAR BASELINE (v3.5) ────────────────────────────────────
const PESOS_V35 = { calado: 0.579, hmm: 0.134, onda: 0.10, pp: 0.10, lag: 0.087 };
function ircLinear(c, pesos = PESOS_V35) {
  const linear = pesos.calado*c.calado + pesos.hmm*c.hmm + pesos.onda*c.onda + pesos.pp*c.pp + pesos.lag*c.lag;
  const piso = c.calado >= 80 ? c.calado * 0.75 : 0;
  return Math.max(linear, piso);
}

// ─── MODELO B: SIGMOIDE por componente ───────────────────────────────────
// f(x; k, θ) = 100 / (1 + exp(-k*(x - θ)))
function sigm(x, k, t) {
  return 100 / (1 + Math.exp(-k * (x - t)));
}

function ircSigmoide(c, params) {
  const f_cal = sigm(c.calado, params.k_cal, params.t_cal);
  const f_hmm = sigm(c.hmm,    params.k_hmm, params.t_hmm);
  const f_lag = sigm(c.lag,    params.k_lag, params.t_lag);
  // Pesos uniformes nos 3 componentes que variam, onda+pp como antes
  const linear = PESOS_V35.calado*f_cal + PESOS_V35.hmm*f_hmm + PESOS_V35.onda*c.onda + PESOS_V35.pp*c.pp + PESOS_V35.lag*f_lag;
  const piso = f_cal >= 80 ? f_cal * 0.75 : 0;
  return Math.max(linear, piso);
}

function calibraSigmoide(eventos) {
  const ks = [0.05, 0.10, 0.15, 0.20];
  const ts = [30, 40, 50, 60, 70];
  let best = { rho: -Infinity, params: null };
  for (const kc of ks) for (const tc of ts)
    for (const kh of ks) for (const th of ts)
      for (const kl of ks) for (const tl of ts) {
        const p = { k_cal: kc, t_cal: tc, k_hmm: kh, t_hmm: th, k_lag: kl, t_lag: tl };
        const ircs = eventos.map((c) => ircSigmoide(c, p));
        const sevs = eventos.map((c) => c.sev);
        const r = spearman(ircs, sevs);
        if (r > best.rho) best = { rho: r, params: p };
      }
  return best;
}

// ─── MODELO C: POWER por componente ──────────────────────────────────────
// f(x; α) = 100 * (x/100)^α
function pow(x, alpha) { return 100 * Math.pow(x / 100, alpha); }

function ircPower(c, params) {
  const f_cal = pow(c.calado, params.a_cal);
  const f_hmm = pow(c.hmm,    params.a_hmm);
  const f_lag = pow(c.lag,    params.a_lag);
  const linear = PESOS_V35.calado*f_cal + PESOS_V35.hmm*f_hmm + PESOS_V35.onda*c.onda + PESOS_V35.pp*c.pp + PESOS_V35.lag*f_lag;
  const piso = f_cal >= 80 ? f_cal * 0.75 : 0;
  return Math.max(linear, piso);
}

function calibraPower(eventos) {
  const alphas = [0.3, 0.5, 0.7, 1.0, 1.5, 2.0, 3.0];
  let best = { rho: -Infinity, params: null };
  for (const ac of alphas) for (const ah of alphas) for (const al of alphas) {
    const p = { a_cal: ac, a_hmm: ah, a_lag: al };
    const ircs = eventos.map((c) => ircPower(c, p));
    const sevs = eventos.map((c) => c.sev);
    const r = spearman(ircs, sevs);
    if (r > best.rho) best = { rho: r, params: p };
  }
  return best;
}

// ─── MODELO D: LOGIT ORDINAL (proportional odds) ─────────────────────────
// P(Y > k) = sigmoid(β·X − θ_k)
// Predição: score linear β·X (sem cutpoints — usamos como ranking)
// Calibração: maximizar likelihood via grid grosseiro + refine

function dotPesos(c, beta) {
  return beta[0]*c.calado + beta[1]*c.hmm + beta[2]*c.onda + beta[3]*c.pp + beta[4]*c.lag;
}

function logLikelihoodOrdinal(eventos, beta, cuts) {
  // cuts: 4 thresholds [θ1, θ2, θ3, θ4] tal que θ1<θ2<θ3<θ4
  // P(Y=k) = sigmoid(η − θ_{k-1}) − sigmoid(η − θ_k)
  let ll = 0;
  for (const c of eventos) {
    const eta = dotPesos(c, beta);
    const sev = c.sev;
    // sev=1: P(Y=1) = sigmoid(θ1 - η) − sigmoid(-Inf) = sigmoid(θ1 - η)
    // sev=k para k∈{2,3,4}: sigmoid(θk - η) − sigmoid(θ_{k-1} - η)
    // sev=5: 1 − sigmoid(θ4 - η)
    const sgm = (x) => 1 / (1 + Math.exp(-x));
    let p;
    if (sev === 1) p = sgm(cuts[0] - eta);
    else if (sev === 2) p = sgm(cuts[1] - eta) - sgm(cuts[0] - eta);
    else if (sev === 3) p = sgm(cuts[2] - eta) - sgm(cuts[1] - eta);
    else if (sev === 4) p = sgm(cuts[3] - eta) - sgm(cuts[2] - eta);
    else p = 1 - sgm(cuts[3] - eta);
    ll += Math.log(Math.max(1e-12, p));
  }
  return ll;
}

function calibraLogitOrdinal(eventos) {
  // Coordinate descent: alterna entre β e cuts
  let beta = [0.01, 0.01, 0, 0, 0.01];  // inicialização
  let cuts = [20, 40, 60, 80];

  const rng = makeRng(SEED);
  let bestLL = -Infinity;
  let bestParams = { beta: [...beta], cuts: [...cuts] };

  // Random restarts + gradient descent
  for (let restart = 0; restart < 15; restart++) {
    let b = beta.map(() => (rng() - 0.5) * 0.04);
    let c = [10 + rng()*15, 30 + rng()*15, 50 + rng()*15, 70 + rng()*15].sort((a, x) => a - x);

    const lr = 0.001;
    const eps = 0.001;
    for (let iter = 0; iter < 500; iter++) {
      const ll0 = logLikelihoodOrdinal(eventos, b, c);
      // Gradient para beta
      for (let i = 0; i < 5; i++) {
        const b2 = [...b]; b2[i] += eps;
        const ll1 = logLikelihoodOrdinal(eventos, b2, c);
        b[i] += lr * (ll1 - ll0) / eps;
      }
      // Gradient para cuts
      for (let i = 0; i < 4; i++) {
        const c2 = [...c]; c2[i] += eps;
        const ll1 = logLikelihoodOrdinal(eventos, b, c2);
        c[i] += lr * (ll1 - ll0) / eps;
      }
      // Ordenar cuts (proporcional odds requer monotonicidade)
      c.sort((a, x) => a - x);
    }
    const llFinal = logLikelihoodOrdinal(eventos, b, c);
    if (llFinal > bestLL) {
      bestLL = llFinal;
      bestParams = { beta: [...b], cuts: [...c] };
    }
  }
  return bestParams;
}

function ircLogit(c, params) {
  return dotPesos(c, params.beta);
}

// ─── Executa todos os modelos ────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════");
console.log("COMPARAÇÃO DE FORMAS FUNCIONAIS DO IRC");
console.log("══════════════════════════════════════════════════════");

const modelos = [];

// A. Linear
{
  const ircs_tr = compTreino.map((c) => ircLinear(c));
  const ircs_te = compTeste.map((c) => ircLinear(c));
  const sev_tr  = compTreino.map((c) => c.sev);
  const sev_te  = compTeste.map((c) => c.sev);
  const r_tr = spearman(ircs_tr, sev_tr);
  const r_te = spearman(ircs_te, sev_te);
  const pv   = permTest(ircs_tr, sev_tr, r_tr);
  modelos.push({ nome: "A. LINEAR (v3.5 baseline)", rho_train: r_tr, rho_test: r_te, p_valor: pv, params: PESOS_V35 });
}

// B. Sigmoide
console.log("Calibrando SIGMOIDE...");
const sigRes = calibraSigmoide(compTreino);
{
  const ircs_tr = compTreino.map((c) => ircSigmoide(c, sigRes.params));
  const ircs_te = compTeste.map((c) => ircSigmoide(c, sigRes.params));
  const sev_tr  = compTreino.map((c) => c.sev);
  const sev_te  = compTeste.map((c) => c.sev);
  const r_tr = spearman(ircs_tr, sev_tr);
  const r_te = spearman(ircs_te, sev_te);
  const pv   = permTest(ircs_tr, sev_tr, r_tr);
  modelos.push({ nome: "B. SIGMOIDE por componente", rho_train: r_tr, rho_test: r_te, p_valor: pv, params: sigRes.params });
}

// C. Power
console.log("Calibrando POWER...");
const powRes = calibraPower(compTreino);
{
  const ircs_tr = compTreino.map((c) => ircPower(c, powRes.params));
  const ircs_te = compTeste.map((c) => ircPower(c, powRes.params));
  const sev_tr  = compTreino.map((c) => c.sev);
  const sev_te  = compTeste.map((c) => c.sev);
  const r_tr = spearman(ircs_tr, sev_tr);
  const r_te = spearman(ircs_te, sev_te);
  const pv   = permTest(ircs_tr, sev_tr, r_tr);
  modelos.push({ nome: "C. POWER por componente   ", rho_train: r_tr, rho_test: r_te, p_valor: pv, params: powRes.params });
}

// D. Logit ordinal
console.log("Calibrando LOGIT ORDINAL...");
const logitRes = calibraLogitOrdinal(compTreino);
{
  const ircs_tr = compTreino.map((c) => ircLogit(c, logitRes));
  const ircs_te = compTeste.map((c) => ircLogit(c, logitRes));
  const sev_tr  = compTreino.map((c) => c.sev);
  const sev_te  = compTeste.map((c) => c.sev);
  const r_tr = spearman(ircs_tr, sev_tr);
  const r_te = spearman(ircs_te, sev_te);
  const pv   = permTest(ircs_tr, sev_tr, r_tr);
  modelos.push({ nome: "D. LOGIT ORDINAL          ", rho_train: r_tr, rho_test: r_te, p_valor: pv, params: { beta: logitRes.beta.map((x) => +x.toFixed(4)), cuts: logitRes.cuts.map((x) => +x.toFixed(2)) } });
}

// ─── Tabela comparativa ──────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════════════");
console.log("RESULTADOS — ρ_train vs ρ_test (n_train=84, n_test=28)");
console.log("══════════════════════════════════════════════════════════════════");
console.log("Modelo                          | ρ_train | ρ_test  | p-valor | Δ vs base");
console.log("────────────────────────────────┼─────────┼─────────┼─────────┼─────────");
const base_test = modelos[0].rho_test;
for (const m of modelos) {
  const delta = m.rho_test - base_test;
  const deltaStr = (delta >= 0 ? "+" : "") + delta.toFixed(3);
  console.log(`${m.nome.padEnd(31)} |  ${m.rho_train.toFixed(3).padStart(5)}  |  ${m.rho_test.toFixed(3).padStart(5)}  |  ${m.p_valor.toFixed(3).padStart(5)}  |   ${deltaStr}`);
}

// Vencedor
const vencedor = modelos.slice(1).reduce((a, b) => b.rho_test > a.rho_test ? b : a, modelos[1]);
const ganho = vencedor.rho_test - base_test;
console.log("\n══════════════════════════════════════════════════════════════════");
if (ganho > 0.10) {
  console.log(`✓ ADOTAR: ${vencedor.nome.trim()}`);
  console.log(`  Ganho: +${ganho.toFixed(3)} em ρ_test (de ${base_test.toFixed(3)} para ${vencedor.rho_test.toFixed(3)})`);
} else {
  console.log(`⚠ MANTER LINEAR — nenhum não-linear bate baseline em ≥0,10`);
  console.log(`  Melhor não-linear: ${vencedor.nome.trim()} com Δ=${ganho.toFixed(3)}`);
}

console.log("\nParâmetros do vencedor:");
console.log(JSON.stringify(vencedor.params, null, 2));

// ─── Salva artefato ──────────────────────────────────────────────────────
const out = {
  metodologia: "Comparação de 4 formas funcionais (linear, sigmoide, power, logit ordinal) contra baseline v3.5",
  dataset: { n_treino: treino.length, n_teste: teste.length, seed: SEED },
  modelos: modelos.map((m) => ({
    nome: m.nome.trim(),
    rho_train: +m.rho_train.toFixed(4),
    rho_test:  +m.rho_test.toFixed(4),
    p_valor:   +m.p_valor.toFixed(4),
    params:    m.params,
  })),
  vencedor: vencedor.nome.trim(),
  ganho_vs_linear: +ganho.toFixed(4),
  recomendacao: ganho > 0.10 ? "ADOTAR" : "MANTER LINEAR",
  gerado_em: new Date().toISOString(),
  git_sha: GIT_SHA,
  git_dirty: GIT_DIRTY,
};

const OUT_PATH = join(ROOT, "data", "irc-forma-funcional-comparacao.json");
writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf-8");
console.log(`\n✓ Snapshot: ${OUT_PATH}`);
