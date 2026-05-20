// Bootstrap não-paramétrico para quantificar incerteza:
//   (a) das fronteiras GMM do IDN (re-amostra a série histórica, recalibra)
//   (b) dos percentis DOY de cada estação (re-amostra a série)
//
// Saída: lib/incerteza-idn.ts — usada pelo dashboard para mostrar IC95% no IDN.
//
// Uso: node scripts/bootstrap-incerteza.mjs [N_BOOTSTRAP=200]

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const N_BOOTSTRAP = parseInt(process.argv[2] ?? "200", 10);

// Mesma config do calibra-limiares-idn.mjs
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
const PERIODO = { inicio: 2016, fim: 2023 };
const JANELA_DIAS = 15;

const diaDoAno = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
};

// ---------------------------------------------------------------------------
// Carrega séries suavizadas e indexadas por (ano, doy) — facilita bootstrap por ano
// ---------------------------------------------------------------------------
function carrega(arq) {
  const txt = readFileSync(join(ROOT, "data", arq), "utf-8").replace(/^﻿/, "");
  const bruto = new Map();
  for (const l of txt.trim().split(/\r?\n/).slice(1)) {
    const [d, c] = l.split(",");
    if (d && c) bruto.set(d, +c);
  }
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
for (const [est, arq] of Object.entries(ARQUIVOS)) series[est] = carrega(arq);

// ---------------------------------------------------------------------------
// Bootstrap: re-amostra ANOS (cluster bootstrap para preservar autocorrelação intra-ano)
// ---------------------------------------------------------------------------
const ANOS = [];
for (let a = PERIODO.inicio; a <= PERIODO.fim; a++) ANOS.push(a);

function reamostraAnos() {
  // Sorteia ANOS.length anos com reposição
  const sorteados = [];
  for (let i = 0; i < ANOS.length; i++) {
    sorteados.push(ANOS[Math.floor(Math.random() * ANOS.length)]);
  }
  return sorteados;
}

// Recalcula percentis DOY para um subset de anos
function calculaPercentisDOY(anosSubset) {
  const setAnos = new Set(anosSubset);
  const out = {};
  for (const est of Object.keys(ARQUIVOS)) {
    const porDOY = new Map();
    for (const [iso, cota] of series[est]) {
      const ano = +iso.slice(0, 4);
      if (!setAnos.has(ano)) continue;
      const doy = diaDoAno(iso);
      if (!porDOY.has(doy)) porDOY.set(doy, []);
      porDOY.get(doy).push(cota);
    }
    const p10 = new Array(367).fill(null);
    const p90 = new Array(367).fill(null);
    for (let d = 1; d <= 366; d++) {
      const am = [];
      for (let off = -JANELA_DIAS; off <= JANELA_DIAS; off++) {
        let alvo = d + off;
        if (alvo < 1) alvo += 366;
        if (alvo > 366) alvo -= 366;
        const v = porDOY.get(alvo);
        if (v) am.push(...v);
      }
      if (am.length >= 20) {
        const ord = [...am].sort((a, b) => a - b);
        p10[d] = ord[Math.floor(0.1 * (ord.length - 1))];
        p90[d] = ord[Math.floor(0.9 * (ord.length - 1))];
      }
    }
    out[est] = { p10, p90 };
  }
  return out;
}

function idnDia(iso, percentis) {
  const d = diaDoAno(iso);
  function pos(pesos) {
    let sv = 0, sp = 0;
    for (const [est, w] of Object.entries(pesos)) {
      const c = series[est]?.get(iso);
      if (c == null) continue;
      const p10 = percentis[est]?.p10[d];
      const p90 = percentis[est]?.p90[d];
      if (p10 == null || p90 == null) continue;
      sv += ((c - p10) / (p90 - p10)) * w;
      sp += w;
    }
    return sp > 0 ? sv / sp : NaN;
  }
  return pos(PESOS_SUL) - pos(PESOS_NORTE);
}

// GMM em 1D, K=3 (forçado, pois já validamos pelo BIC no script principal)
function gauss(x, mu, sigma) {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}
function gmm3(data, maxIter = 200) {
  const ord = [...data].sort((a, b) => a - b);
  let mus = [ord[Math.floor(0.17 * ord.length)], ord[Math.floor(0.5 * ord.length)], ord[Math.floor(0.83 * ord.length)]];
  let sigmas = [0.2, 0.2, 0.2];
  let pis = [1/3, 1/3, 1/3];
  for (let iter = 0; iter < maxIter; iter++) {
    const resp = data.map(x => {
      const ps = mus.map((m, k) => pis[k] * gauss(x, m, sigmas[k]));
      const tot = ps.reduce((s, p) => s + p, 0) || 1e-300;
      return ps.map(p => p / tot);
    });
    for (let k = 0; k < 3; k++) {
      const nk = resp.reduce((s, r) => s + r[k], 0);
      pis[k] = nk / data.length;
      mus[k] = resp.reduce((s, r, i) => s + r[k] * data[i], 0) / nk;
      const varK = resp.reduce((s, r, i) => s + r[k] * (data[i] - mus[k]) ** 2, 0) / nk;
      sigmas[k] = Math.max(Math.sqrt(varK), 1e-6);
    }
  }
  const idx = mus.map((_, i) => i).sort((a, b) => mus[a] - mus[b]);
  return { mus: idx.map(i => mus[i]), sigmas: idx.map(i => sigmas[i]), pis: idx.map(i => pis[i]) };
}
function cruzamento(mu1, s1, pi1, mu2, s2, pi2) {
  const a = 1/(2*s1**2) - 1/(2*s2**2);
  const b = mu2/(s2**2) - mu1/(s1**2);
  const c = mu1**2/(2*s1**2) - mu2**2/(2*s2**2) + Math.log((pi2*s1)/(pi1*s2));
  if (Math.abs(a) < 1e-12) return -c / b;
  const disc = b*b - 4*a*c;
  if (disc < 0) return (mu1 + mu2) / 2;
  const r1 = (-b + Math.sqrt(disc)) / (2*a);
  const r2 = (-b - Math.sqrt(disc)) / (2*a);
  const lo = Math.min(mu1, mu2), hi = Math.max(mu1, mu2);
  if (r1 >= lo && r1 <= hi) return r1;
  if (r2 >= lo && r2 <= hi) return r2;
  return (mu1 + mu2) / 2;
}

// ---------------------------------------------------------------------------
// Loop bootstrap
// ---------------------------------------------------------------------------
console.log(`Bootstrap N=${N_BOOTSTRAP} (cluster por ano, ${ANOS.length} anos):`);

const fronteirasBootstrap = []; // cada item: [sul, norte]

for (let b = 0; b < N_BOOTSTRAP; b++) {
  const anosSubset = reamostraAnos();
  const percentis = calculaPercentisDOY(anosSubset);
  // Constrói série de IDN com esses percentis (sobre os anos do subset)
  const idns = [];
  for (const ano of new Set(anosSubset)) {
    for (let mes = 1; mes <= 12; mes++) {
      for (let dia = 1; dia <= 31; dia++) {
        const dt = new Date(Date.UTC(ano, mes - 1, dia));
        if (dt.getUTCMonth() + 1 !== mes) continue;
        const iso = `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
        const v = idnDia(iso, percentis);
        if (!isNaN(v)) idns.push(v);
      }
    }
  }
  if (idns.length < 100) continue;
  const fit = gmm3(idns);
  const f1 = cruzamento(fit.mus[0], fit.sigmas[0], fit.pis[0], fit.mus[1], fit.sigmas[1], fit.pis[1]);
  const f2 = cruzamento(fit.mus[1], fit.sigmas[1], fit.pis[1], fit.mus[2], fit.sigmas[2], fit.pis[2]);
  fronteirasBootstrap.push([f1, f2]);
  if ((b + 1) % 25 === 0) process.stdout.write(`  ${b+1}/${N_BOOTSTRAP}\n`);
}

function quantil(arr, p) {
  const ord = [...arr].sort((a, b) => a - b);
  return ord[Math.floor(p * (ord.length - 1))];
}

const f1s = fronteirasBootstrap.map(x => x[0]);
const f2s = fronteirasBootstrap.map(x => x[1]);

console.log(`\nFronteira Sul × Neutro:`);
console.log(`  mediana = ${quantil(f1s, 0.5).toFixed(3)}`);
console.log(`  IC95%   = [${quantil(f1s, 0.025).toFixed(3)}, ${quantil(f1s, 0.975).toFixed(3)}]`);
console.log(`\nFronteira Neutro × Norte:`);
console.log(`  mediana = ${quantil(f2s, 0.5).toFixed(3)}`);
console.log(`  IC95%   = [${quantil(f2s, 0.025).toFixed(3)}, ${quantil(f2s, 0.975).toFixed(3)}]`);

// ---------------------------------------------------------------------------
// Estimativa de incerteza do IDN atual (depende da composição de pesos +
// da variabilidade dos percentis). Aproximação: σ_idn ≈ desvio-padrão das
// fronteiras × fator de propagação.
// ---------------------------------------------------------------------------
function std(arr) {
  const m = arr.reduce((s, x) => s + x, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}
// Como proxy, estimamos a incerteza do IDN como ±2σ das fronteiras (já que
// percentis e fronteiras herdam variabilidade similar). É uma aproximação
// conservadora — bootstrap completo do IDN diário seria ideal mas custa N²
// computações; aqui usamos a magnitude das fronteiras como proxy.
const stdFronteiras = (std(f1s) + std(f2s)) / 2;
console.log(`\nIncerteza típica do IDN (±2σ): ≈ ±${(2 * stdFronteiras).toFixed(2)}`);

// ---------------------------------------------------------------------------
// Salva resultado
// ---------------------------------------------------------------------------
const ts = `// AUTO-GERADO por scripts/bootstrap-incerteza.mjs — NÃO EDITAR À MÃO.
// Quantifica incerteza das fronteiras GMM e do IDN via bootstrap por ano (N=${N_BOOTSTRAP}).
// Re-amostra anos (cluster bootstrap) preservando autocorrelação intra-ano.

export interface IncertezaIDN {
  n_bootstrap: number;
  fronteira_sul: { mediana: number; ic_lo: number; ic_hi: number };
  fronteira_norte: { mediana: number; ic_lo: number; ic_hi: number };
  std_fronteiras: number;
  banda_idn_2sigma: number;
}

export const INCERTEZA_IDN: IncertezaIDN = ${JSON.stringify({
  n_bootstrap: fronteirasBootstrap.length,
  fronteira_sul: {
    mediana: +quantil(f1s, 0.5).toFixed(3),
    ic_lo:   +quantil(f1s, 0.025).toFixed(3),
    ic_hi:   +quantil(f1s, 0.975).toFixed(3),
  },
  fronteira_norte: {
    mediana: +quantil(f2s, 0.5).toFixed(3),
    ic_lo:   +quantil(f2s, 0.025).toFixed(3),
    ic_hi:   +quantil(f2s, 0.975).toFixed(3),
  },
  std_fronteiras: +stdFronteiras.toFixed(4),
  banda_idn_2sigma: +(2 * stdFronteiras).toFixed(3),
}, null, 2)};
`;
writeFileSync(join(ROOT, "lib/incerteza-idn.ts"), ts);
console.log(`\n✓ lib/incerteza-idn.ts gerado (N=${fronteirasBootstrap.length} réplicas válidas)`);
