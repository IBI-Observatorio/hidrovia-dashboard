// Gera percentis P10/Med/P90 de VAZÃO (m³/s) por dia-do-ano para as 8 estações
// com série pública. Saída: lib/percentis-vazao-doy.ts
//
// Período de referência: 2016–2023 (Moura usa 2022-2023 — climatologia parcial).
// Janela ±15 dias. Mesma metodologia dos percentis de cota.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PERIODO_REF = { inicio: 2016, fim: 2023 };
const JANELA_DIAS = 15;
const SUAVIZACAO_DIAS = 7; // trailing MA — idêntico ao gerador de cotas

const ESTACOES = {
  // Norte
  Curicuriari: "data/curicuriari_vazao.csv",
  Serrinha:    "data/serrinha_vazao.csv",
  Moura:       "data/moura_vazao.csv",      // série curta (2022+)
  Caracarai:   "data/caracarai_vazao.csv",
  // Sul
  PortoVelho:  "data/portovelho_vazao.csv",
  Humaita:     "data/humaita_vazao.csv",
  Manicore:    "data/manicore_vazao.csv",
  Labrea:      "data/labrea_vazao.csv",
};

function diaDoAno(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

function lerCSV(caminho) {
  const txt = readFileSync(caminho, "utf-8").replace(/^﻿/, "");
  return txt.trim().split(/\r?\n/).slice(1)
    .map(l => l.split(","))
    .filter(p => p.length === 2 && p[1] && !isNaN(+p[1]))
    .map(([data, q]) => ({ data, vazao: +q, doy: diaDoAno(data) }));
}

// Trailing MA de N dias — descarta pontos sem janela completa.
function suavizaTrailing(obs, dias) {
  if (dias <= 1) return obs;
  const ord = [...obs].sort((a, b) => a.data.localeCompare(b.data));
  const porData = new Map(ord.map(o => [o.data, o]));
  const result = [];
  for (const o of ord) {
    const vs = [];
    const dt = new Date(`${o.data}T00:00:00Z`);
    let ok = true;
    for (let k = 0; k < dias; k++) {
      const dp = new Date(dt);
      dp.setUTCDate(dp.getUTCDate() - k);
      const iso = dp.toISOString().slice(0, 10);
      const v = porData.get(iso);
      if (!v) { ok = false; break; }
      vs.push(v.vazao);
    }
    if (!ok) continue;
    result.push({ ...o, vazao: vs.reduce((s,x)=>s+x,0) / vs.length });
  }
  return result;
}

function percentil(arr, p) {
  if (!arr.length) return NaN;
  const ord = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (ord.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? ord[lo] : ord[lo] + (ord[hi] - ord[lo]) * (idx - lo);
}

function calcula(obs) {
  const ref = obs.filter(o => {
    const a = +o.data.slice(0, 4);
    return a >= PERIODO_REF.inicio && a <= PERIODO_REF.fim;
  });
  const porDOY = new Map();
  for (const o of ref) {
    if (!porDOY.has(o.doy)) porDOY.set(o.doy, []);
    porDOY.get(o.doy).push(o.vazao);
  }
  const p10 = new Array(367).fill(null);
  const p90 = new Array(367).fill(null);
  const mediana = new Array(367).fill(null);
  for (let d = 1; d <= 366; d++) {
    const am = [];
    for (let off = -JANELA_DIAS; off <= JANELA_DIAS; off++) {
      let alvo = d + off;
      if (alvo < 1) alvo += 366;
      if (alvo > 366) alvo -= 366;
      const v = porDOY.get(alvo);
      if (v) am.push(...v);
    }
    if (am.length >= 20) { // menor threshold porque Moura tem ~3 anos
      p10[d] = +percentil(am, 10).toFixed(1);
      p90[d] = +percentil(am, 90).toFixed(1);
      mediana[d] = +percentil(am, 50).toFixed(1);
    }
  }
  return { p10, p90, mediana, n_observacoes: ref.length };
}

const resultado = {};
for (const [est, csv] of Object.entries(ESTACOES)) {
  const obsRaw = lerCSV(join(ROOT, csv));
  const obs = suavizaTrailing(obsRaw, SUAVIZACAO_DIAS);
  resultado[est] = calcula(obs);
  console.log(`${est}: ${obsRaw.length} raw → ${obs.length} MA${SUAVIZACAO_DIAS}d, ${resultado[est].n_observacoes} no período ${PERIODO_REF.inicio}-${PERIODO_REF.fim}`);
}

const ts = `// AUTO-GERADO por scripts/gera-percentis-vazao-doy.mjs — NÃO EDITAR À MÃO.
// Percentis de VAZÃO (m³/s) por dia-do-ano sobre série suavizada (MA${SUAVIZACAO_DIAS}d trailing).
// Janela ±${JANELA_DIAS} dias. Período de referência: ${PERIODO_REF.inicio}–${PERIODO_REF.fim}.
// Moura usa apenas 2022-2023 (climatologia parcial; flag n_observacoes baixo).

export const SUAVIZACAO_DIAS_VAZAO = ${SUAVIZACAO_DIAS};

export interface PercentisVazaoDOY {
  p10: (number | null)[];
  p90: (number | null)[];
  mediana: (number | null)[];
  n_observacoes: number;
}

export const PERIODO_REFERENCIA_VAZAO = { inicio: ${PERIODO_REF.inicio}, fim: ${PERIODO_REF.fim}, janela_dias: ${JANELA_DIAS} };

export const PERCENTIS_VAZAO_DOY: Record<string, PercentisVazaoDOY> = ${JSON.stringify(resultado, null, 2)};
`;

writeFileSync(join(ROOT, "lib/percentis-vazao-doy.ts"), ts);
console.log("✓ lib/percentis-vazao-doy.ts gerado");
