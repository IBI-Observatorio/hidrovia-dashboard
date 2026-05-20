// Pré-computa o Calendário de Severidade Hidrológica.
//
// Para cada estação (Itacoatiara, Lábrea, Manicoré), divide cada ano da série
// histórica em 52 semanas e 36 decêndios, calcula a cota mediana de cada
// período e sua posição relativa (pos) na climatologia 2016–2023:
//
//   pos = (cota_mediana - p10_doy) / (p90_doy - p10_doy)
//
// pos < 0  → abaixo do P10 histórico (estiagem extrema)
// pos ~0.5 → próximo à mediana
// pos > 1  → acima do P90 (cheia excepcional)
//
// Os buckets de cor no componente mapeiam pos para 8 faixas (<0.08 … ≥0.85).
//
// Uso: node scripts/gera-severity-calendar.mjs
// Saída: lib/severity-calendar-precomputed.ts

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// --- Configuração ---
const PERIODO_REF  = { inicio: 2016, fim: 2023 };
const JANELA_DIAS  = 15;
const SUAVIZACAO   = 7; // trailing MA

// Ano mínimo de exibição — corta séries longas para manter o heatmap legível
const DISPLAY_ANO_MIN = 2010;

const ESTACOES = {
  Itacoatiara: "data/itacoatiara_hidroweb.csv",
  Labrea:      "data/labrea_hidroweb.csv",
  Manicore:    "data/manicore_hidroweb.csv",
  Curicuriari: "data/curicuriari_hidroweb.csv",
  Humaita:     "data/humaita_hidroweb.csv",
  PortoVelho:  "data/portovelho_hidroweb.csv",
  Borba:       "data/borba_hidroweb.csv",
  Caracarai:   "data/caracarai_hidroweb.csv",
  Moura:       "data/moura_hidroweb.csv",
  Serrinha:    "data/serrinha_hidroweb.csv",
  Abuna:       "data/abuna_hidroweb.csv",
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
  if (SUAVIZACAO <= 1) return obs;
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

function percentil(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  const i = (p / 100) * (s.length - 1);
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}

function calculaPercentisDOY(obs) {
  const ref = obs.filter((o) => {
    const y = +o.data.slice(0, 4);
    return y >= PERIODO_REF.inicio && y <= PERIODO_REF.fim;
  });
  const porDOY = new Map();
  for (const o of ref) {
    if (!porDOY.has(o.doy)) porDOY.set(o.doy, []);
    porDOY.get(o.doy).push(o.cota);
  }
  const p10 = new Array(367).fill(null);
  const p90 = new Array(367).fill(null);
  const med = new Array(367).fill(null);
  for (let d = 1; d <= 366; d++) {
    const amostra = [];
    for (let off = -JANELA_DIAS; off <= JANELA_DIAS; off++) {
      let alvo = d + off;
      if (alvo < 1) alvo += 366;
      if (alvo > 366) alvo -= 366;
      const v = porDOY.get(alvo);
      if (v) amostra.push(...v);
    }
    if (amostra.length >= 30) {
      p10[d] = +percentil(amostra, 10).toFixed(3);
      p90[d] = +percentil(amostra, 90).toFixed(3);
      med[d] = +percentil(amostra, 50).toFixed(3);
    }
  }
  return { p10, p90, med };
}

// --- Períodos ---
// Semanas fixas: 52 períodos de 7 dias cada (DOY 1-7, 8-14, ..., 358-366)
// Semana 52 absorve o excedente (DOY 357-366 = 10 dias em anos normais/bissextos)
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

// Decêndios: 36 períodos de 10 dias (DOY 1-10, 11-20, ..., 351-366)
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

// --- Processa cada estação ---
function processaEstacao(nome, csvRel) {
  const obsRaw = lerCSV(csvRel);
  const obs    = suaviza(obsRaw);
  const { p10, p90 } = calculaPercentisDOY(obs);

  // Indexa obs por data para lookup rápido
  const porData = new Map(obs.map((o) => [o.data, o.cota]));

  // Range completo de anos (inclui anos sem dados como linhas nulas no heatmap)
  const anosComDados = new Set(obs.map((o) => +o.data.slice(0, 4)));
  const anoMinSerie = Math.min(...anosComDados);
  const anoMax      = Math.max(...anosComDados);
  // Aplica corte de exibição: séries longas começam em DISPLAY_ANO_MIN
  const anoMin      = Math.max(anoMinSerie, DISPLAY_ANO_MIN);
  const todosAnos   = Array.from({ length: anoMax - anoMin + 1 }, (_, i) => anoMin + i);

  const weekly    = [];
  const decendial = [];

  for (const ano of todosAnos) {
    for (const seg of semanas(ano)) {
      const vals = [];
      for (let d = seg.doyStart; d <= seg.doyEnd; d++) {
        const iso = isoDataDeDOY(ano, d);
        const v   = porData.get(iso);
        if (v !== undefined) vals.push(v);
      }
      const med  = mediana(vals);
      const p10v = p10[seg.doyMid];
      const p90v = p90[seg.doyMid];
      const pos  = (med !== null && p10v !== null && p90v !== null && p90v !== p10v)
        ? +((med - p10v) / (p90v - p10v)).toFixed(4)
        : null;
      weekly.push({
        year:      ano,
        week:      seg.periodo,
        doy_mid:   seg.doyMid,
        cota_m:    med !== null ? +med.toFixed(3) : null,
        pos,
      });
    }

    for (const seg of decendios(ano)) {
      const vals = [];
      for (let d = seg.doyStart; d <= seg.doyEnd; d++) {
        const iso = isoDataDeDOY(ano, d);
        const v   = porData.get(iso);
        if (v !== undefined) vals.push(v);
      }
      const med  = mediana(vals);
      const p10v = p10[seg.doyMid];
      const p90v = p90[seg.doyMid];
      const pos  = (med !== null && p10v !== null && p90v !== null && p90v !== p10v)
        ? +((med - p10v) / (p90v - p10v)).toFixed(4)
        : null;
      decendial.push({
        year:    ano,
        decend:  seg.periodo,
        doy_mid: seg.doyMid,
        cota_m:  med !== null ? +med.toFixed(3) : null,
        pos,
      });
    }
  }

  console.log(`${nome}: ${todosAnos.length} anos (${anoMin}–${anoMax}), ${anosComDados.size} com dados, ${weekly.length} células semanais`);

  // Sanity: 2024 set-nov para a estação, deve ter pos < 0.3
  if (nome === "Itacoatiara" || nome === "Labrea") {
    const setNov2024 = weekly.filter(
      (c) => c.year === 2024 && c.doy_mid >= 244 && c.doy_mid <= 335 && c.pos !== null
    );
    if (setNov2024.length) {
      const minPos = Math.min(...setNov2024.map((c) => c.pos));
      console.log(`  ${nome} 2024 set-nov: min pos = ${minPos.toFixed(3)} ${minPos < 0.18 ? "✓ drought bucket" : "⚠ verifique"}`);
    }
  }

  // Compact output: per station, flat arrays indexed by [yearIdx * nPeriods + periodIdx]
  // weekly:    [pos | null, cota_m | null] interleaved — length = numYears * 52 * 2
  // decendial: [pos | null, cota_m | null] interleaved — length = numYears * 36 * 2
  const numYears = anoMax - anoMin + 1;
  const weeklyFlat    = new Array(numYears * 52 * 2).fill(null);
  const decendialFlat = new Array(numYears * 36 * 2).fill(null);

  for (const c of weekly) {
    const yi = c.year - anoMin;
    const wi = c.week - 1;
    weeklyFlat[(yi * 52 + wi) * 2]     = c.pos;
    weeklyFlat[(yi * 52 + wi) * 2 + 1] = c.cota_m;
  }
  for (const c of decendial) {
    const yi = c.year - anoMin;
    const di = c.decend - 1;
    decendialFlat[(yi * 36 + di) * 2]     = c.pos;
    decendialFlat[(yi * 36 + di) * 2 + 1] = c.cota_m;
  }

  return { anoMin, anoMax, numYears, weekly: weeklyFlat, decendial: decendialFlat };
}

// --- Gera TS ---
const resultado = {};
for (const [nome, csv] of Object.entries(ESTACOES)) {
  resultado[nome] = processaEstacao(nome, csv);
}

// Serializa como arrays compactos (sem chaves por objeto)
function serStation(s) {
  return `{
    anoMin: ${s.anoMin}, anoMax: ${s.anoMax}, numYears: ${s.numYears},
    weekly: [${s.weekly.join(",")}],
    decendial: [${s.decendial.join(",")}]
  }`;
}

const ts = `// AUTO-GERADO por scripts/gera-severity-calendar.mjs — NÃO EDITAR À MÃO.
// Percentis calculados com a MESMA lógica de percentis-doy.ts:
//   MA-${SUAVIZACAO}d trailing, janela ±${JANELA_DIAS} dias, referência ${PERIODO_REF.inicio}–${PERIODO_REF.fim}.
//
// pos = (cota_mediana - p10_doy) / (p90_doy - p10_doy)
//   < 0  : abaixo do P10 (estiagem extrema)
//   ~0.5 : próximo à mediana
//   > 1  : acima do P90 (cheia excepcional)
//
// Formato compacto: arrays flat interleaved [pos, cota_m, pos, cota_m, ...]
//   índice célula (year, period): i = (yearIdx * nPeriods + periodIdx) * 2
//   pos = arr[i], cota_m = arr[i+1]  (null = sem dados)
//
// weekly:    52 semanas de 7 dias  (semana 52 absorve dias extras)
// decendial: 36 decêndios de 10 dias (decêndio 36 absorve dias extras)

export type SeverityStation = "Itacoatiara" | "Labrea" | "Manicore" | "Curicuriari" | "Humaita" | "PortoVelho" | "Borba" | "Caracarai" | "Moura" | "Serrinha" | "Abuna";

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

const outPath = join(ROOT, "lib/severity-calendar-precomputed.ts");
writeFileSync(outPath, ts, "utf-8");
console.log(`✓ ${outPath}`);

// Also emit JSON for public/ (fetched at runtime to avoid bundling 233KB of arrays)
import { mkdirSync, existsSync } from "node:fs";
const publicDataDir = join(ROOT, "public/data");
if (!existsSync(publicDataDir)) mkdirSync(publicDataDir, { recursive: true });
const jsonPayload = {
  periods: PERIODO_REF,
  stations: resultado,
};
const jsonPath = join(ROOT, "public/data/severity-calendar.json");
writeFileSync(jsonPath, JSON.stringify(jsonPayload), "utf-8");
console.log(`✓ ${jsonPath} (${(JSON.stringify(jsonPayload).length / 1024).toFixed(1)} KB)`);
