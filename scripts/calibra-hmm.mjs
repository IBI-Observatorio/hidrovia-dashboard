// Hidden Markov Model gaussiano para regimes do IDN.
//
// Diferença do GMM: o HMM modela TRANSIÇÕES entre regimes ao longo do tempo,
// não apenas a distribuição estática. Resultado adicional:
//   - Matriz de transição A: P(regime t+1 | regime t)
//   - Probabilidade de mudança de regime nos próximos N dias
//
// Estados: K=3 (Sul, Sincronizado, Norte) — mesma escolha do GMM.
// Treinamento via Baum-Welch (EM para HMM).
//
// Saída: lib/hmm-idn.ts

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Reusa a série histórica diária de IDN já calculada (não decimada)
const txt = readFileSync(join(ROOT, "lib/idn-historico-calculado.ts"), "utf-8");
// Extrai apenas a série recente diária (180d) — para HMM, ela é representativa
// e tem alta densidade temporal (não decimada)
const matches = txt.match(/IDN_RECENTE_DIARIO[^=]*=\s*(\[[\s\S]*?\]);/);
const recentes = JSON.parse(matches[1]);

// Para HMM precisamos da série CONTÍNUA do período de calibração 2016–2023.
// Vou recalcular aqui (replicando lógica de gera-idn-historico.mjs)
// para ter densidade diária sobre todo o período de referência.
const PESOS_NORTE = { SGC: 0.30, Curicuriari: 0.20, Serrinha: 0.20, Moura: 0.05, Caracarai: 0.25 };
const PESOS_SUL   = { Abuna: 0.15, PortoVelho: 0.20, Humaita: 0.15, Manicore: 0.10, Borba: 0.15, Labrea: 0.25 };
const ARQUIVOS = {
  SGC: 'sgc_hidroweb.csv', Curicuriari: 'curicuriari_hidroweb.csv',
  Serrinha: 'serrinha_hidroweb.csv', Moura: 'moura_hidroweb.csv',
  Caracarai: 'caracarai_hidroweb.csv', Abuna: 'abuna_hidroweb.csv',
  PortoVelho: 'portovelho_hidroweb.csv', Humaita: 'humaita_hidroweb.csv',
  Manicore: 'manicore_hidroweb.csv', Borba: 'borba_hidroweb.csv',
  Labrea: 'labrea_hidroweb.csv',
};
const SUAVIZACAO = 7;
const ptxt = readFileSync(join(ROOT, "lib/percentis-doy.ts"), "utf-8");
const PERCENTIS = JSON.parse(ptxt.match(/PERCENTIS_DOY[^=]*=\s*({[\s\S]*?});/)[1]);

const diaDoAno = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
};

function carrega(arq) {
  const t = readFileSync(join(ROOT, "data", arq), "utf-8").replace(/^﻿/, "");
  const m = new Map();
  for (const l of t.trim().split(/\r?\n/).slice(1)) {
    const [d, c] = l.split(",");
    if (d && c) m.set(d, +c);
  }
  return m;
}
function suaviza(map) {
  const out = new Map();
  for (const [iso] of map) {
    const vs = [];
    const dt = new Date(iso + "T00:00:00Z");
    let ok = true;
    for (let k = 0; k < SUAVIZACAO; k++) {
      const dp = new Date(dt); dp.setUTCDate(dp.getUTCDate() - k);
      const v = map.get(dp.toISOString().slice(0, 10));
      if (v == null) { ok = false; break; }
      vs.push(v);
    }
    if (ok) out.set(iso, vs.reduce((s, x) => s + x, 0) / vs.length);
  }
  return out;
}
const series = {};
for (const [e, a] of Object.entries(ARQUIVOS)) series[e] = suaviza(carrega(a));

function idnDia(iso) {
  const d = diaDoAno(iso);
  function pos(pesos) {
    let sv = 0, sp = 0;
    for (const [est, w] of Object.entries(pesos)) {
      const c = series[est]?.get(iso);
      if (c == null) continue;
      const p10 = PERCENTIS[est]?.p10[d];
      const p90 = PERCENTIS[est]?.p90[d];
      if (p10 == null || p90 == null) continue;
      sv += ((c - p10) / (p90 - p10)) * w;
      sp += w;
    }
    return sp > 0 ? sv / sp : NaN;
  }
  return pos(PESOS_SUL) - pos(PESOS_NORTE);
}

// Constrói série CONTÍNUA 2016-2023 (essencial para HMM — gaps quebram a cadeia)
const serieDiaria = [];
const dt0 = new Date(Date.UTC(2016, 0, 1));
const dt1 = new Date(Date.UTC(2023, 11, 31));
for (let dt = new Date(dt0); dt <= dt1; dt.setUTCDate(dt.getUTCDate() + 1)) {
  const iso = dt.toISOString().slice(0, 10);
  const v = idnDia(iso);
  if (!isNaN(v)) serieDiaria.push(v);
}
console.log(`Série IDN diária 2016–2023: ${serieDiaria.length} valores`);

// ===========================================================================
// HMM gaussiano K=3 via Baum-Welch
// ===========================================================================
const K = 3;
const T = serieDiaria.length;

// Inicialização: usa quantis para médias, dispersão proporcional ao intervalo
const ord = [...serieDiaria].sort((a, b) => a - b);
let mus = [ord[Math.floor(0.17 * T)], ord[Math.floor(0.5 * T)], ord[Math.floor(0.83 * T)]];
let sigmas = [0.2, 0.2, 0.2];
// pi: distribuição inicial dos estados
let pi = [1/K, 1/K, 1/K];
// A: matriz de transição K×K (linhas somam 1). Inicial: pega-se a diagonal alta
// (auto-loop) que é o esperado em regimes hidrológicos (persistência).
let A = [
  [0.85, 0.10, 0.05],
  [0.07, 0.86, 0.07],
  [0.05, 0.10, 0.85],
];

const gauss = (x, mu, sg) =>
  Math.exp(-((x - mu) ** 2) / (2 * sg * sg)) / (sg * Math.sqrt(2 * Math.PI));

function forward() {
  // alpha[t][k] = P(o1..ot, qt=k) — escalado para estabilidade
  const alpha = Array.from({ length: T }, () => new Array(K).fill(0));
  const c = new Array(T).fill(0); // fatores de escala
  for (let k = 0; k < K; k++) alpha[0][k] = pi[k] * gauss(serieDiaria[0], mus[k], sigmas[k]);
  c[0] = alpha[0].reduce((s, x) => s + x, 0) || 1e-300;
  for (let k = 0; k < K; k++) alpha[0][k] /= c[0];
  for (let t = 1; t < T; t++) {
    for (let k = 0; k < K; k++) {
      let s = 0;
      for (let j = 0; j < K; j++) s += alpha[t-1][j] * A[j][k];
      alpha[t][k] = s * gauss(serieDiaria[t], mus[k], sigmas[k]);
    }
    c[t] = alpha[t].reduce((s, x) => s + x, 0) || 1e-300;
    for (let k = 0; k < K; k++) alpha[t][k] /= c[t];
  }
  const logLik = c.reduce((s, x) => s + Math.log(x), 0);
  return { alpha, c, logLik };
}

function backward(c) {
  const beta = Array.from({ length: T }, () => new Array(K).fill(0));
  for (let k = 0; k < K; k++) beta[T-1][k] = 1 / c[T-1];
  for (let t = T - 2; t >= 0; t--) {
    for (let k = 0; k < K; k++) {
      let s = 0;
      for (let j = 0; j < K; j++) {
        s += A[k][j] * gauss(serieDiaria[t+1], mus[j], sigmas[j]) * beta[t+1][j];
      }
      beta[t][k] = s / c[t];
    }
  }
  return beta;
}

let logLikAnt = -Infinity;
const MAX_ITER = 100;
for (let iter = 0; iter < MAX_ITER; iter++) {
  const { alpha, c, logLik } = forward();
  const beta = backward(c);
  // gamma[t][k] = P(qt=k | obs); xi[t][i][j] = P(qt=i, qt+1=j | obs)
  const gamma = Array.from({ length: T }, () => new Array(K).fill(0));
  for (let t = 0; t < T; t++) {
    let z = 0;
    for (let k = 0; k < K; k++) { gamma[t][k] = alpha[t][k] * beta[t][k] * c[t]; z += gamma[t][k]; }
    for (let k = 0; k < K; k++) gamma[t][k] /= (z || 1);
  }
  // Estima A
  const novoA = Array.from({ length: K }, () => new Array(K).fill(0));
  for (let i = 0; i < K; i++) {
    let denom = 0;
    for (let t = 0; t < T - 1; t++) denom += gamma[t][i];
    for (let j = 0; j < K; j++) {
      let num = 0;
      for (let t = 0; t < T - 1; t++) {
        num += alpha[t][i] * A[i][j] * gauss(serieDiaria[t+1], mus[j], sigmas[j]) * beta[t+1][j];
      }
      novoA[i][j] = num / (denom || 1);
    }
  }
  A = novoA;
  // pi
  pi = gamma[0].slice();
  // Mus e sigmas
  for (let k = 0; k < K; k++) {
    let num = 0, den = 0;
    for (let t = 0; t < T; t++) { num += gamma[t][k] * serieDiaria[t]; den += gamma[t][k]; }
    mus[k] = num / (den || 1);
    let varNum = 0;
    for (let t = 0; t < T; t++) varNum += gamma[t][k] * (serieDiaria[t] - mus[k]) ** 2;
    sigmas[k] = Math.max(Math.sqrt(varNum / (den || 1)), 1e-6);
  }
  if (Math.abs(logLik - logLikAnt) < 1e-5) {
    console.log(`Convergiu em ${iter} iterações, logLik=${logLik.toFixed(2)}`);
    break;
  }
  logLikAnt = logLik;
}

// Ordena estados por mu crescente (Sul, Sincronizado, Norte)
const idx = mus.map((_, i) => i).sort((a, b) => mus[a] - mus[b]);
const musO = idx.map((i) => mus[i]);
const sigmasO = idx.map((i) => sigmas[i]);
const piO = idx.map((i) => pi[i]);
const AO = idx.map((i) => idx.map((j) => A[i][j]));

console.log(`\nEstados HMM (ordenados Sul → Sincronizado → Norte):`);
const NOMES = ["Sul", "Sincronizado", "Norte"];
for (let k = 0; k < K; k++) {
  console.log(`  ${NOMES[k]}: μ=${musO[k].toFixed(3)}  σ=${sigmasO[k].toFixed(3)}  π0=${piO[k].toFixed(3)}`);
}
console.log(`\nMatriz de transição A (linha = estado atual, coluna = próximo):`);
console.log(`             Sul   Sinc   Norte`);
for (let i = 0; i < K; i++) {
  const linha = NOMES[i].padEnd(11) + " " + AO[i].map(v => v.toFixed(3).padStart(6)).join(" ");
  console.log(`  ${linha}`);
}

// Persistência média de cada regime (1 / (1 - A[k][k]))
const persistencias = AO.map((linha, k) => 1 / (1 - linha[k]));
console.log(`\nPersistência média de cada regime (dias):`);
for (let k = 0; k < K; k++) {
  console.log(`  ${NOMES[k]}: ${persistencias[k].toFixed(1)} dias`);
}

// Probabilidade de mudança de regime em N dias a partir do estado atual
// Para estado atual s_now, faz A^N e lê linha s_now
function elevaMatriz(M, n) {
  let result = M.map(l => [...l]);
  for (let i = 1; i < n; i++) {
    const novo = Array.from({ length: K }, () => new Array(K).fill(0));
    for (let a = 0; a < K; a++)
      for (let b = 0; b < K; b++)
        for (let c = 0; c < K; c++)
          novo[a][b] += result[a][c] * M[c][b];
    result = novo;
  }
  return result;
}

const A7  = elevaMatriz(AO, 7);
const A30 = elevaMatriz(AO, 30);

console.log(`\nP(regime em +7 dias | regime atual):`);
console.log(`             Sul   Sinc   Norte`);
for (let i = 0; i < K; i++) {
  console.log(`  ${NOMES[i].padEnd(11)} ${A7[i].map(v => v.toFixed(3).padStart(6)).join(" ")}`);
}
console.log(`\nP(regime em +30 dias | regime atual):`);
console.log(`             Sul   Sinc   Norte`);
for (let i = 0; i < K; i++) {
  console.log(`  ${NOMES[i].padEnd(11)} ${A30[i].map(v => v.toFixed(3).padStart(6)).join(" ")}`);
}

// Salva
const ts = `// AUTO-GERADO por scripts/calibra-hmm.mjs — NÃO EDITAR À MÃO.
// Hidden Markov Model gaussiano K=3 calibrado sobre IDN diário 2016-2023.
// Diferente do GMM, captura TRANSIÇÕES entre regimes ao longo do tempo.

export interface CalibracaoHMM {
  k: number;
  nomes: string[];
  componentes: { mu: number; sigma: number; pi_inicial: number }[];
  matriz_transicao: number[][];          // A[i][j] = P(s_{t+1}=j | s_t=i)
  matriz_transicao_7d: number[][];       // A^7
  matriz_transicao_30d: number[][];      // A^30
  persistencia_dias: number[];           // 1/(1-A[k][k])
  n_observacoes: number;
  log_likelihood: number;
}

export const CALIBRACAO_HMM: CalibracaoHMM = ${JSON.stringify({
  k: K,
  nomes: NOMES,
  componentes: musO.map((mu, k) => ({
    mu: +mu.toFixed(4),
    sigma: +sigmasO[k].toFixed(4),
    pi_inicial: +piO[k].toFixed(4),
  })),
  matriz_transicao: AO.map(l => l.map(v => +v.toFixed(4))),
  matriz_transicao_7d: A7.map(l => l.map(v => +v.toFixed(4))),
  matriz_transicao_30d: A30.map(l => l.map(v => +v.toFixed(4))),
  persistencia_dias: persistencias.map(v => +v.toFixed(1)),
  n_observacoes: T,
  log_likelihood: +logLikAnt.toFixed(2),
}, null, 2)};

// Classifica um IDN observado no estado mais provável do HMM (max gauss)
export function estadoHMM(idn: number): { indice: number; nome: string; probabilidades: number[] } {
  const probs = CALIBRACAO_HMM.componentes.map(c => {
    return Math.exp(-((idn - c.mu) ** 2) / (2 * c.sigma * c.sigma)) / (c.sigma * Math.sqrt(2 * Math.PI));
  });
  const tot = probs.reduce((s, x) => s + x, 0) || 1;
  const norm = probs.map(p => p / tot);
  const indice = norm.indexOf(Math.max(...norm));
  return { indice, nome: CALIBRACAO_HMM.nomes[indice], probabilidades: norm };
}
`;
writeFileSync(join(ROOT, "lib/hmm-idn.ts"), ts);
console.log("\n✓ lib/hmm-idn.ts gerado");
