// Pré-computa o Calendário de Severidade Hidrológica.
//
// IMPORTANTE: usa os percentis P10/P90 de public/data/percentis-doy.json,
// gerado por gera-percentis-doy.mjs. Sempre rode gera-percentis-doy.mjs
// primeiro para garantir que os dois artefatos usam a mesma baseline.
//
// pos = (cota_mediana - p10_doy) / (p90_doy - p10_doy)
//   < 0  → abaixo do P10 (estiagem extrema)
//   ~0.5 → próximo à mediana
//   > 1  → acima do P90 (cheia excepcional)
//
// Uso:
//   node scripts/gera-percentis-doy.mjs   # gera percentis-doy.json primeiro
//   node scripts/gera-severity-calendar.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// --- Carrega percentis canônicos do IDN pipeline ---
const percPath = join(ROOT, "public/data/percentis-doy.json");
if (!existsSync(percPath)) {
  console.error("❌ public/data/percentis-doy.json não encontrado.");
  console.error("   Execute primeiro: node scripts/gera-percentis-doy.mjs");
  process.exit(1);
}
const { periodo: PERIODO_REF, estacoes: PERCENTIS } = JSON.parse(readFileSync(percPath, "utf-8"));
console.log(`✓ percentis carregados: ${Object.keys(PERCENTIS).join(", ")} (ref ${PERIODO_REF.inicio}–${PERIODO_REF.fim})`);

// Ano mínimo de exibição — corta séries longas para manter o heatmap legível
const DISPLAY_ANO_MIN = 2010;
const SUAVIZACAO = 7; // deve ser igual ao usado em gera-percentis-doy.mjs

// Todas as estações do IDN + calha principal
// Chave = nome usado em PERCENTIS (deve bater exatamente)
const ESTACOES = {
  // Sub-bacia Norte (Negro + Branco)
  SGC:         "data/sgc_hidroweb.csv",
  Curicuriari: "data/curicuriari_hidroweb.csv",
  Serrinha:    "data/serrinha_hidroweb.csv",
  Moura:       "data/moura_hidroweb.csv",
  Caracarai:   "data/caracarai_hidroweb.csv",
  // Sub-bacia Sul (Madeira + Purus)
  Abuna:       "data/abuna_hidroweb.csv",
  PortoVelho:  "data/portovelho_hidroweb.csv",
  Humaita:     "data/humaita_hidroweb.csv",
  Manicore:    "data/manicore_hidroweb.csv",
  Borba:       "data/borba_hidroweb.csv",
  Labrea:      "data/labrea_hidroweb.csv",
  // Calha principal
  Itacoatiara: "data/itacoatiara_hidroweb.csv",
};

// --- Helpers ---
function doy(dataISO) {
  const [y, m, d] = dataISO.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

function addDays(isoDate, n) {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

function lerCSV(rel) {
  const txt = readFileSync(join(ROOT, rel), "utf-8").replace(/^﻿/, "");
  return txt.trim().split(/\r?\n/).slice(1)
    .map((l) => { const [d, c] = l.split(","); return { data: d, cota: +c, doy: doy(d) }; })
    .filter((r) => r.data && !isNaN(r.cota));
}

function suaviza(obs) {
  const ord = [...obs].sort((a, b) => a.data.localeCompare(b.data));
  const idx = new Map(ord.map((o) => [o.data, o]));
  const out = [];
  for (const o of ord) {
    let soma = 0, ok = true;
    for (let k = 0; k < SUAVIZACAO; k++) {
      const prev = idx.get(addDays(o.data, -k));
      if (!prev) { ok = false; break; }
      soma += prev.cota;
    }
    if (ok) out.push({ ...o, cota: soma / SUAVIZACAO });
  }
  return out;
}

function semanas(ano) {
  const dias = isLeap(ano) ? 366 : 365;
  const result = [];
  for (let w = 1; w <= 52; w++) {
    const doyStart = (w - 1) * 7 + 1;
    const doyEnd   = w === 52 ? dias : w * 7;
    const doyMid   = Math.round((doyStart + doyEnd) / 2);
    result.push({ periodo: w, doyStart, doyEnd, doyMid });
  }
  return result;
}

function decendios(ano) {
  const dias = isLeap(ano) ? 366 : 365;
  const result = [];
  for (let d = 1; d <= 36; d++) {
    const doyStart = (d - 1) * 10 + 1;
    const doyEnd   = d === 36 ? dias : d * 10;
    const doyMid   = Math.round((doyStart + doyEnd) / 2);
    result.push({ periodo: d, doyStart, doyEnd, doyMid });
  }
  return result;
}

function isoDataDeDOY(ano, d) {
  const dt = new Date(Date.UTC(ano, 0, 1));
  dt.setUTCDate(dt.getUTCDate() + d - 1);
  return dt.toISOString().slice(0, 10);
}

function mediana(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

// --- Processa cada estação usando percentis canônicos ---
function processaEstacao(nome, csvRel) {
  const perc = PERCENTIS[nome];
  if (!perc) {
    console.warn(`  ⚠ ${nome}: sem percentis em percentis-doy.json — pulando`);
    return null;
  }
  const p10 = perc.p10;   // array [null, v1..v366]
  const p90 = perc.p90;

  const obsRaw = lerCSV(csvRel);
  const obs    = suaviza(obsRaw);
  const porData = new Map(obs.map((o) => [o.data, o.cota]));

  const anosComDados = new Set(obs.map((o) => +o.data.slice(0, 4)));
  const anoMinSerie  = Math.min(...anosComDados);
  const anoMax       = Math.max(...anosComDados);
  const anoMin       = Math.max(anoMinSerie, DISPLAY_ANO_MIN);
  const todosAnos    = Array.from({ length: anoMax - anoMin + 1 }, (_, i) => anoMin + i);

  const weekly    = [];
  const decendial = [];

  for (const ano of todosAnos) {
    for (const seg of semanas(ano)) {
      const vals = [];
      for (let d = seg.doyStart; d <= seg.doyEnd; d++) {
        const v = porData.get(isoDataDeDOY(ano, d));
        if (v !== undefined) vals.push(v);
      }
      const med  = mediana(vals);
      const p10v = p10[seg.doyMid];
      const p90v = p90[seg.doyMid];
      const pos  = (med !== null && p10v != null && p90v != null && p90v !== p10v)
        ? +((med - p10v) / (p90v - p10v)).toFixed(4) : null;
      weekly.push({ year: ano, week: seg.periodo, doy_mid: seg.doyMid,
                    cota_m: med !== null ? +med.toFixed(3) : null, pos });
    }
    for (const seg of decendios(ano)) {
      const vals = [];
      for (let d = seg.doyStart; d <= seg.doyEnd; d++) {
        const v = porData.get(isoDataDeDOY(ano, d));
        if (v !== undefined) vals.push(v);
      }
      const med  = mediana(vals);
      const p10v = p10[seg.doyMid];
      const p90v = p90[seg.doyMid];
      const pos  = (med !== null && p10v != null && p90v != null && p90v !== p10v)
        ? +((med - p10v) / (p90v - p10v)).toFixed(4) : null;
      decendial.push({ year: ano, decend: seg.periodo, doy_mid: seg.doyMid,
                       cota_m: med !== null ? +med.toFixed(3) : null, pos });
    }
  }

  const numYears      = anoMax - anoMin + 1;
  const weeklyFlat    = new Array(numYears * 52 * 2).fill(null);
  const decendialFlat = new Array(numYears * 36 * 2).fill(null);

  for (const c of weekly) {
    const yi = c.year - anoMin;
    weeklyFlat[(yi * 52 + (c.week - 1)) * 2]     = c.pos;
    weeklyFlat[(yi * 52 + (c.week - 1)) * 2 + 1] = c.cota_m;
  }
  for (const c of decendial) {
    const yi = c.year - anoMin;
    decendialFlat[(yi * 36 + (c.decend - 1)) * 2]     = c.pos;
    decendialFlat[(yi * 36 + (c.decend - 1)) * 2 + 1] = c.cota_m;
  }

  console.log(`  ${nome}: ${todosAnos.length} anos (${anoMin}–${anoMax}), ${anosComDados.size} com dados`);

  // Sanity check — seca de 2024 deve aparecer como seco em estações relevantes
  const check2024 = weekly.filter(c => c.year === 2024 && c.doy_mid >= 244 && c.doy_mid <= 335 && c.pos !== null);
  if (check2024.length) {
    const minPos = Math.min(...check2024.map(c => c.pos));
    const ok = minPos < 0.25;
    console.log(`    2024 set-nov min pos=${minPos.toFixed(3)} ${ok ? "✓" : "⚠ verifique"}`);
  }

  return { anoMin, anoMax, numYears, weekly: weeklyFlat, decendial: decendialFlat };
}

// --- Processa todas as estações ---
const resultado = {};
for (const [nome, csv] of Object.entries(ESTACOES)) {
  const r = processaEstacao(nome, csv);
  if (r) resultado[nome] = r;
}

// --- Emite TypeScript ---
const stationUnion = Object.keys(resultado).map(k => `"${k}"`).join(" | ");

function serStation(s) {
  return `{
    anoMin: ${s.anoMin}, anoMax: ${s.anoMax}, numYears: ${s.numYears},
    weekly: [${s.weekly.join(",")}],
    decendial: [${s.decendial.join(",")}]
  }`;
}

const ts = `// AUTO-GERADO por scripts/gera-severity-calendar.mjs — NÃO EDITAR À MÃO.
// Percentis lidos de public/data/percentis-doy.json (gerado por gera-percentis-doy.mjs).
// Baseline: MA-7d trailing, janela ±15 dias, referência ${PERIODO_REF.inicio}–${PERIODO_REF.fim}.
//
// pos = (cota_mediana - p10_doy) / (p90_doy - p10_doy)
//   < 0  : abaixo do P10   ~0.5: mediana   > 1: acima do P90

export type SeverityStation = ${stationUnion};

export interface SeverityStationData {
  anoMin:    number;
  anoMax:    number;
  numYears:  number;
  /** flat interleaved [pos, cota_m] × numYears × 52 */
  weekly:    (number | null | undefined)[];
  /** flat interleaved [pos, cota_m] × numYears × 36 */
  decendial: (number | null | undefined)[];
}

export const SEVERITY_PERIODS = { inicio: ${PERIODO_REF.inicio}, fim: ${PERIODO_REF.fim} };

export const SEVERITY_CALENDAR: Record<SeverityStation, SeverityStationData> = {
${Object.entries(resultado).map(([k, v]) => `  ${k}: ${serStation(v)},`).join("\n")}
};
`;

writeFileSync(join(ROOT, "lib/severity-calendar-precomputed.ts"), ts);
console.log("✓ lib/severity-calendar-precomputed.ts");

// --- Emite JSON para fetch em runtime ---
const publicDataDir = join(ROOT, "public/data");
if (!existsSync(publicDataDir)) mkdirSync(publicDataDir, { recursive: true });
const jsonPayload = { periods: PERIODO_REF, stations: resultado };
const jsonPath = join(ROOT, "public/data/severity-calendar.json");
writeFileSync(jsonPath, JSON.stringify(jsonPayload));
console.log(`✓ ${jsonPath} (${(JSON.stringify(jsonPayload).length / 1024).toFixed(1)} KB)`);
