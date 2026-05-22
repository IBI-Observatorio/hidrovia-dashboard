// Calibra lag Caracaraí → Manaus com REMOÇÃO SAZONAL.
//
// v1: correlação cruzada bruta foi dominada por sazonalidade compartilhada
// (ambas estações têm o mesmo ciclo anual → correlação alta em lag=0).
//
// v2 (este script):
//   1. Calcula climatologia DOY de cada estação (média e desvio por dia do ano)
//   2. Z-score: subtrai climatologia e divide por desvio (anomalia padronizada)
//   3. Correlação cruzada das ANOMALIAS — sazonalidade já removida
//   4. Segmenta por estado do Negro (alto/normal/baixo)
//
// Saída: lib/lag-branco-manaus.ts com lag por regime + IC bootstrap.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function lerCSV(arquivo, coluna) {
  const linhas = readFileSync(join(ROOT, "data", arquivo), "utf-8").trim().split("\n");
  const cab = linhas[0].split(",");
  const idx = cab.indexOf(coluna);
  const mapa = new Map();
  for (let i = 1; i < linhas.length; i++) {
    const partes = linhas[i].split(",");
    const v = parseFloat(partes[idx]);
    if (!isNaN(v)) mapa.set(partes[0], v);
  }
  return mapa;
}

const caracarai = lerCSV("caracarai_hidroweb.csv", "cota_m");
const manaus    = lerCSV("4estacoes_2016_2025.csv", "MAO");
const datasComum = [...caracarai.keys()].filter((d) => manaus.has(d)).sort();
console.log(`Datas em comum: ${datasComum.length}`);

// ─── 1. Climatologia DOY ─────────────────────────────────────────────────────
function doy(iso) {
  const d = new Date(iso + "T00:00:00Z");
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.floor((d - start) / 86400000) + 1;
}

function climatologia(mapa) {
  const porDOY = Array.from({ length: 367 }, () => []);
  for (const [data, v] of mapa) {
    const d = doy(data);
    porDOY[d].push(v);
  }
  // Janela ±15d para suavizar
  const mu = [null], sigma = [null];
  for (let d = 1; d <= 366; d++) {
    const vals = [];
    for (let off = -15; off <= 15; off++) {
      let alvo = d + off;
      if (alvo < 1)   alvo += 366;
      if (alvo > 366) alvo -= 366;
      vals.push(...porDOY[alvo]);
    }
    if (vals.length < 10) { mu.push(null); sigma.push(null); continue; }
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const s = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
    mu.push(m); sigma.push(s);
  }
  return { mu, sigma };
}

const climCaracarai = climatologia(caracarai);
const climManaus    = climatologia(manaus);

// ─── 2. Anomalias z-score ────────────────────────────────────────────────────
function zscores(mapa, clim) {
  const out = new Map();
  for (const [data, v] of mapa) {
    const d = doy(data);
    if (clim.mu[d] == null || clim.sigma[d] == null || clim.sigma[d] === 0) continue;
    out.set(data, (v - clim.mu[d]) / clim.sigma[d]);
  }
  return out;
}

const zCaracarai = zscores(caracarai, climCaracarai);
const zManaus    = zscores(manaus, climManaus);
console.log(`Anomalias Caracaraí: ${zCaracarai.size}, Manaus: ${zManaus.size}`);

// ─── 3. Correlação cruzada das anomalias ────────────────────────────────────
function correlacao(serieA, serieB, lag) {
  const pares = [];
  for (const [dataA, vA] of serieA) {
    const dt = new Date(dataA + "T00:00:00Z");
    dt.setUTCDate(dt.getUTCDate() + lag);
    const dataB = dt.toISOString().slice(0, 10);
    const vB = serieB.get(dataB);
    if (vB == null) continue;
    pares.push([vA, vB]);
  }
  if (pares.length < 50) return null;
  const mX = pares.reduce((a, [x]) => a + x, 0) / pares.length;
  const mY = pares.reduce((a, [, y]) => a + y, 0) / pares.length;
  let num = 0, dX = 0, dY = 0;
  for (const [x, y] of pares) {
    num += (x - mX) * (y - mY);
    dX  += (x - mX) ** 2;
    dY  += (y - mY) ** 2;
  }
  return { r: num / Math.sqrt(dX * dY), n: pares.length };
}

console.log("\n══════ Correlação cruzada das ANOMALIAS (sazonalidade removida) ══════");
console.log("Lag (d) | Correlação | n");
let melhor = { lag: 0, r: -Infinity };
const corrs = [];
for (let lag = 0; lag <= 60; lag += 2) {
  const c = correlacao(zCaracarai, zManaus, lag);
  if (!c) continue;
  corrs.push({ lag, r: c.r, n: c.n });
  if (c.r > melhor.r) melhor = { lag, r: c.r };
  if (lag % 5 === 0 || lag === melhor.lag) {
    const marcador = lag === melhor.lag ? " ←" : "";
    console.log(`  ${String(lag).padStart(2)}    | ${c.r.toFixed(4)}    | ${c.n}${marcador}`);
  }
}
console.log(`\n→ Lag de propagação ÓTIMO (anti-sazonal): ${melhor.lag} dias (r=${melhor.r.toFixed(4)})`);

// ─── 4. Segmentação por estado do Negro alto (proxy: SGC z-score) ────────────
const sgcCsv = readFileSync(join(ROOT, "data", "sgc_hidroweb.csv"), "utf-8");
const sgcMapa = new Map();
{
  const linhas = sgcCsv.trim().split("\n");
  for (let i = 1; i < linhas.length; i++) {
    const [d, v] = linhas[i].split(",");
    const x = parseFloat(v);
    if (!isNaN(x)) sgcMapa.set(d, x);
  }
}
const climSGC = climatologia(sgcMapa);
const zSGC = zscores(sgcMapa, climSGC);

function correlacaoFiltrada(serieA, serieB, lag, filtroDatas) {
  const pares = [];
  for (const [dataA, vA] of serieA) {
    if (!filtroDatas.has(dataA)) continue;
    const dt = new Date(dataA + "T00:00:00Z");
    dt.setUTCDate(dt.getUTCDate() + lag);
    const dataB = dt.toISOString().slice(0, 10);
    const vB = serieB.get(dataB);
    if (vB == null) continue;
    pares.push([vA, vB]);
  }
  if (pares.length < 30) return null;
  const mX = pares.reduce((a, [x]) => a + x, 0) / pares.length;
  const mY = pares.reduce((a, [, y]) => a + y, 0) / pares.length;
  let num = 0, dX = 0, dY = 0;
  for (const [x, y] of pares) {
    num += (x - mX) * (y - mY);
    dX  += (x - mX) ** 2;
    dY  += (y - mY) ** 2;
  }
  return { r: num / Math.sqrt(dX * dY), n: pares.length };
}

console.log("\n══════ Lag por regime do Negro (z-score SGC) ══════");
const regimes = [
  { nome: "Negro BAIXO (z_SGC < -0.5) [Driver Norte]", cond: (z) => z < -0.5 },
  { nome: "Negro NORMAL (-0.5 ≤ z ≤ +0.5)",            cond: (z) => z >= -0.5 && z <= 0.5 },
  { nome: "Negro ALTO (z_SGC > +0.5) [Driver Sul]",   cond: (z) => z > 0.5 },
];

const lagsPorRegime = {};
for (const reg of regimes) {
  const datasReg = new Set();
  for (const [d, z] of zSGC) {
    if (reg.cond(z)) datasReg.add(d);
  }
  let melhorReg = { lag: 0, r: -Infinity };
  for (let lag = 0; lag <= 60; lag += 1) {
    const c = correlacaoFiltrada(zCaracarai, zManaus, lag, datasReg);
    if (!c) continue;
    if (c.r > melhorReg.r) melhorReg = { lag, r: c.r };
  }
  console.log(`  ${reg.nome.padEnd(50)} → lag=${melhorReg.lag}d (r=${melhorReg.r.toFixed(3)})`);
  lagsPorRegime[reg.nome] = { lag: melhorReg.lag, r: melhorReg.r };
}

// ─── Bootstrap IC ────────────────────────────────────────────────────────────
function bootstrapLag(serieA, serieB, nBoot = 200) {
  const lags = [];
  const datas = [...serieA.keys()];
  for (let i = 0; i < nBoot; i++) {
    // Block bootstrap (blocos de 30d para respeitar autocorrelação)
    const datasBoot = new Set();
    while (datasBoot.size < datas.length) {
      const idx = Math.floor(Math.random() * datas.length);
      for (let j = idx; j < Math.min(idx + 30, datas.length); j++) {
        datasBoot.add(datas[j]);
      }
    }
    let melhorBoot = { lag: 0, r: -Infinity };
    for (let lag = 0; lag <= 60; lag += 2) {
      const c = correlacaoFiltrada(serieA, serieB, lag, datasBoot);
      if (!c) continue;
      if (c.r > melhorBoot.r) melhorBoot = { lag, r: c.r };
    }
    lags.push(melhorBoot.lag);
  }
  lags.sort((a, b) => a - b);
  return {
    mediana: lags[Math.floor(lags.length / 2)],
    p10: lags[Math.floor(lags.length * 0.10)],
    p90: lags[Math.floor(lags.length * 0.90)],
  };
}

console.log("\n══════ Bootstrap IC80 do lag global ══════");
const boot = bootstrapLag(zCaracarai, zManaus, 100);
console.log(`  Lag mediana: ${boot.mediana}d | IC80: ${boot.p10}–${boot.p90}d`);

// ─── Saída TypeScript ───────────────────────────────────────────────────────
const ts = `// AUTO-GERADO por scripts/calibra-lag-anti-sazonal.mjs em ${new Date().toISOString()}
// Lag de propagação Caracaraí (Rio Branco) → Manaus (Rio Negro) calibrado por
// correlação cruzada das ANOMALIAS Z-SCORE (sazonalidade removida via janela
// DOY ±15d em série 2016-2025) e segmentado por estado do Negro alto.

export const LAG_BRANCO_MANAUS = {
  // Lag global ótimo (todos os regimes agregados)
  lag_otimo:      ${melhor.lag},
  correlacao:     ${+melhor.r.toFixed(4)},

  // Bootstrap IC80 (n=100, block bootstrap 30d)
  lag_mediana:    ${boot.mediana},
  lag_ic80_lo:    ${boot.p10},
  lag_ic80_hi:    ${boot.p90},
  sigma_estimado: ${+((boot.p90 - boot.p10) / 2.56).toFixed(1)},

  // Por regime do Negro alto (proxy: z-score SGC)
  lag_negro_baixo:  ${lagsPorRegime["Negro BAIXO (z_SGC < -0.5) [Driver Norte]"]?.lag ?? 22},   // Driver Norte
  lag_negro_normal: ${lagsPorRegime["Negro NORMAL (-0.5 ≤ z ≤ +0.5)"]?.lag ?? 30},
  lag_negro_alto:   ${lagsPorRegime["Negro ALTO (z_SGC > +0.5) [Driver Sul]"]?.lag ?? 35},     // Driver Sul

  // Correlações por regime
  r_negro_baixo:  ${+(lagsPorRegime["Negro BAIXO (z_SGC < -0.5) [Driver Norte]"]?.r ?? 0).toFixed(3)},
  r_negro_normal: ${+(lagsPorRegime["Negro NORMAL (-0.5 ≤ z ≤ +0.5)"]?.r ?? 0).toFixed(3)},
  r_negro_alto:   ${+(lagsPorRegime["Negro ALTO (z_SGC > +0.5) [Driver Sul]"]?.r ?? 0).toFixed(3)},
} as const;
`;

writeFileSync(join(ROOT, "lib", "lag-branco-manaus.ts"), ts, "utf-8");
console.log(`\n✓ Gerado lib/lag-branco-manaus.ts`);
