// Calibra os limiares do IDN por clustering empírico (Gaussian Mixture Model).
//
// 1. Reconstrói série diária do IDN para 2016–2023 usando:
//    - cotas MA-7d trailing
//    - percentis DOY já gerados em lib/percentis-doy.ts
//    - 11 estações com pesos definidos em lib/sub-bacias.ts
// 2. Roda GMM via EM para K=2, 3, 4 componentes
// 3. Escolhe K por BIC (Bayesian Information Criterion)
// 4. Extrai fronteiras (pontos de cruzamento entre gaussianas adjacentes)
// 5. Salva resultado em lib/limiares-idn.ts

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Configuração — DEVE bater com lib/sub-bacias.ts
// ---------------------------------------------------------------------------
const PESOS_NORTE = {
  SGC: 0.30, Curicuriari: 0.20, Serrinha: 0.20, Moura: 0.05, Caracarai: 0.25,
};
const PESOS_SUL = {
  Abuna: 0.15, PortoVelho: 0.20, Humaita: 0.15, Manicore: 0.10, Borba: 0.15, Labrea: 0.25,
};
const ARQUIVOS = {
  SGC: 'sgc_hidroweb.csv',
  Curicuriari: 'curicuriari_hidroweb.csv',
  Serrinha: 'serrinha_hidroweb.csv',
  Moura: 'moura_hidroweb.csv',
  Caracarai: 'caracarai_hidroweb.csv',
  Abuna: 'abuna_hidroweb.csv',
  PortoVelho: 'portovelho_hidroweb.csv',
  Humaita: 'humaita_hidroweb.csv',
  Manicore: 'manicore_hidroweb.csv',
  Borba: 'borba_hidroweb.csv',
  Labrea: 'labrea_hidroweb.csv',
};
const SUAVIZACAO = 7;
const PERIODO = { inicio: 2016, fim: 2023 };

// ---------------------------------------------------------------------------
// Carrega percentis DOY já gerados
// ---------------------------------------------------------------------------
const ptxt = readFileSync(join(ROOT, "lib/percentis-doy.ts"), "utf-8");
const PERCENTIS = JSON.parse(ptxt.match(/PERCENTIS_DOY[^=]*=\s*({[\s\S]*?});/)[1]);

const diaDoAno = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
};

// ---------------------------------------------------------------------------
// Carrega séries e aplica MA-7d trailing
// ---------------------------------------------------------------------------
function carregaSerieSuavizada(arq) {
  const txt = readFileSync(join(ROOT, "data", arq), "utf-8").replace(/^﻿/, "");
  const bruto = new Map();
  for (const l of txt.trim().split(/\r?\n/).slice(1)) {
    const [d, c] = l.split(",");
    if (d && c) bruto.set(d, +c);
  }
  // MA-7d trailing
  const suave = new Map();
  for (const [iso] of bruto) {
    const vs = [];
    const dt = new Date(iso + "T00:00:00Z");
    let ok = true;
    for (let k = 0; k < SUAVIZACAO; k++) {
      const dp = new Date(dt); dp.setUTCDate(dp.getUTCDate() - k);
      const v = bruto.get(dp.toISOString().slice(0, 10));
      if (v == null) { ok = false; break; }
      vs.push(v);
    }
    if (ok) suave.set(iso, vs.reduce((s, x) => s + x, 0) / vs.length);
  }
  return suave;
}

const series = {};
for (const [est, arq] of Object.entries(ARQUIVOS)) {
  series[est] = carregaSerieSuavizada(arq);
}

// ---------------------------------------------------------------------------
// Calcula IDN diário 2016-2023
// ---------------------------------------------------------------------------
function posSubBacia(papel, pesos, isoBase) {
  const d = diaDoAno(isoBase);
  let sv = 0, sp = 0;
  for (const [est, w] of Object.entries(pesos)) {
    const c = series[est]?.get(isoBase);
    if (c == null) continue;
    const p10 = PERCENTIS[est]?.p10[d];
    const p90 = PERCENTIS[est]?.p90[d];
    const med = PERCENTIS[est]?.mediana[d];
    if (p10 == null || p90 == null || med == null) continue;
    sv += ((c - med) / (p90 - p10)) * w;
    sp += w;
  }
  return sp > 0 ? sv / sp : NaN;
}

const idns = [];
for (let ano = PERIODO.inicio; ano <= PERIODO.fim; ano++) {
  for (let mes = 1; mes <= 12; mes++) {
    for (let dia = 1; dia <= 31; dia++) {
      const dt = new Date(Date.UTC(ano, mes - 1, dia));
      if (dt.getUTCMonth() + 1 !== mes) continue;
      const iso = `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
      const norte = posSubBacia("Norte", PESOS_NORTE, iso);
      const sul   = posSubBacia("Sul",   PESOS_SUL,   iso);
      if (isNaN(norte) || isNaN(sul)) continue;
      idns.push(sul - norte);
    }
  }
}
console.log(`Série histórica de IDN: ${idns.length} valores (${PERIODO.inicio}–${PERIODO.fim})`);
console.log(`  min=${Math.min(...idns).toFixed(3)}  max=${Math.max(...idns).toFixed(3)}  mean=${(idns.reduce((s,x)=>s+x,0)/idns.length).toFixed(3)}`);

// ---------------------------------------------------------------------------
// GMM via Expectation-Maximization 1D
// ---------------------------------------------------------------------------
function gaussiana(x, mu, sigma) {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

function gmm1D(data, K, maxIter = 500, tol = 1e-6) {
  // Inicialização: K quantis igualmente espaçados como médias
  const ordenado = [...data].sort((a, b) => a - b);
  const mus = [];
  const sigmas = [];
  const pis = [];
  for (let k = 0; k < K; k++) {
    const q = ordenado[Math.floor(((k + 0.5) / K) * ordenado.length)];
    mus.push(q);
    sigmas.push((ordenado.at(-1) - ordenado[0]) / (2 * K)); // dispersão inicial
    pis.push(1 / K);
  }

  let logLikAnterior = -Infinity;
  let iter = 0;
  for (; iter < maxIter; iter++) {
    // E-step: responsabilidades
    const resp = data.map((x) => {
      const ps = mus.map((mu, k) => pis[k] * gaussiana(x, mu, sigmas[k]));
      const tot = ps.reduce((s, p) => s + p, 0) || 1e-300;
      return ps.map((p) => p / tot);
    });

    // M-step
    const novosPis = [];
    const novosMus = [];
    const novosSigmas = [];
    for (let k = 0; k < K; k++) {
      const nk = resp.reduce((s, r) => s + r[k], 0);
      novosPis.push(nk / data.length);
      const muk = resp.reduce((s, r, i) => s + r[k] * data[i], 0) / nk;
      novosMus.push(muk);
      const varK = resp.reduce((s, r, i) => s + r[k] * (data[i] - muk) ** 2, 0) / nk;
      novosSigmas.push(Math.max(Math.sqrt(varK), 1e-6));
    }
    mus.splice(0, K, ...novosMus);
    sigmas.splice(0, K, ...novosSigmas);
    pis.splice(0, K, ...novosPis);

    // Log-likelihood
    const logLik = data.reduce((s, x) => {
      const px = mus.reduce((t, mu, k) => t + pis[k] * gaussiana(x, mu, sigmas[k]), 0);
      return s + Math.log(Math.max(px, 1e-300));
    }, 0);
    if (Math.abs(logLik - logLikAnterior) < tol) break;
    logLikAnterior = logLik;
  }

  // Ordena componentes por média crescente
  const idx = mus.map((_, i) => i).sort((a, b) => mus[a] - mus[b]);
  const muOrd = idx.map((i) => mus[i]);
  const sigmaOrd = idx.map((i) => sigmas[i]);
  const piOrd = idx.map((i) => pis[i]);

  // BIC: -2*logLik + p*ln(n) onde p = 3K-1 parâmetros livres
  const p = 3 * K - 1;
  const bic = -2 * logLikAnterior + p * Math.log(data.length);
  const aic = -2 * logLikAnterior + 2 * p;

  return { mus: muOrd, sigmas: sigmaOrd, pis: piOrd, logLik: logLikAnterior, bic, aic, iter };
}

// ---------------------------------------------------------------------------
// Cruzamento entre duas gaussianas adjacentes (resolve igualdade de densidade)
// ---------------------------------------------------------------------------
function cruzamento(mu1, sigma1, pi1, mu2, sigma2, pi2) {
  // Resolve pi1*N(x|mu1,sigma1) = pi2*N(x|mu2,sigma2)
  // Equivale a equação quadrática em x. Pegamos a raiz dentro de (mu1, mu2).
  const a = 1/(2*sigma1**2) - 1/(2*sigma2**2);
  const b = mu2/(sigma2**2) - mu1/(sigma1**2);
  const c = mu1**2/(2*sigma1**2) - mu2**2/(2*sigma2**2) + Math.log((pi2*sigma1)/(pi1*sigma2));
  if (Math.abs(a) < 1e-12) {
    return -c / b; // caso linear (sigmas iguais)
  }
  const disc = b*b - 4*a*c;
  if (disc < 0) return (mu1 + mu2) / 2; // fallback
  const r1 = (-b + Math.sqrt(disc)) / (2*a);
  const r2 = (-b - Math.sqrt(disc)) / (2*a);
  // pega raiz entre mu1 e mu2
  const lo = Math.min(mu1, mu2), hi = Math.max(mu1, mu2);
  if (r1 >= lo && r1 <= hi) return r1;
  if (r2 >= lo && r2 <= hi) return r2;
  return (mu1 + mu2) / 2;
}

// ---------------------------------------------------------------------------
// Roda GMM com K=2, 3, 4 e escolhe por BIC
// ---------------------------------------------------------------------------
const candidatos = [2, 3, 4].map((K) => ({ K, ...gmm1D(idns, K) }));
console.log("\nResultados GMM:");
for (const r of candidatos) {
  console.log(`  K=${r.K}: BIC=${r.bic.toFixed(1)}  AIC=${r.aic.toFixed(1)}  iter=${r.iter}`);
  for (let k = 0; k < r.K; k++) {
    console.log(`    comp ${k}: π=${r.pis[k].toFixed(3)} μ=${r.mus[k].toFixed(3)} σ=${r.sigmas[k].toFixed(3)}`);
  }
}

// Menor BIC vence
const melhor = candidatos.reduce((a, b) => (b.bic < a.bic ? b : a));
console.log(`\n✓ K ótimo por BIC: ${melhor.K}`);

// Extrai fronteiras (K-1 cruzamentos entre componentes adjacentes)
const fronteiras = [];
for (let k = 0; k < melhor.K - 1; k++) {
  fronteiras.push(+cruzamento(
    melhor.mus[k], melhor.sigmas[k], melhor.pis[k],
    melhor.mus[k+1], melhor.sigmas[k+1], melhor.pis[k+1]
  ).toFixed(3));
}
console.log(`Fronteiras (limiares calibrados): ${fronteiras.join(", ")}`);

// ---------------------------------------------------------------------------
// Salva resultado em lib/limiares-idn.ts
// ---------------------------------------------------------------------------
const ts = `// AUTO-GERADO por scripts/calibra-limiares-idn.mjs — NÃO EDITAR À MÃO.
// Limiares do IDN calibrados empiricamente via Gaussian Mixture Model (GMM).
// Método: K-componentes selecionado por BIC (menor é melhor).
// Série: ${idns.length} valores diários, ${PERIODO.inicio}–${PERIODO.fim}, MA-${SUAVIZACAO}d trailing.

export interface CalibracaoIDN {
  metodo: string;
  periodo: { inicio: number; fim: number };
  n_observacoes: number;
  k_otimo: number;
  bic: number;
  aic: number;
  componentes: { pi: number; mu: number; sigma: number }[];
  fronteiras: number[];        // K-1 cruzamentos, em ordem crescente
  candidatos: { K: number; bic: number; aic: number }[];
}

export const CALIBRACAO_IDN: CalibracaoIDN = ${JSON.stringify({
  metodo: `GMM-${melhor.K}componentes`,
  periodo: PERIODO,
  n_observacoes: idns.length,
  k_otimo: melhor.K,
  bic: +melhor.bic.toFixed(2),
  aic: +melhor.aic.toFixed(2),
  componentes: melhor.mus.map((mu, k) => ({
    pi: +melhor.pis[k].toFixed(4),
    mu: +mu.toFixed(4),
    sigma: +melhor.sigmas[k].toFixed(4),
  })),
  fronteiras,
  candidatos: candidatos.map(c => ({ K: c.K, bic: +c.bic.toFixed(2), aic: +c.aic.toFixed(2) })),
}, null, 2)};
`;
writeFileSync(join(ROOT, "lib/limiares-idn.ts"), ts);
console.log("\n✓ lib/limiares-idn.ts gerado");
