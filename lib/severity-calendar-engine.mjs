// Engine ÚNICO do Calendário de Severidade Hidrológica.
//
// Fonte de verdade compartilhada por:
//   • scripts/gera-severity-calendar.mjs  (job mensal — escreve JSON estático + tipos .ts)
//   • app/api/severity-calendar/route.ts   (rota on-demand — monta o JSON na hora, com cache 6h)
//
// Lê de DOIS lugares, resolvidos por parâmetro para funcionar igual em dev e produção:
//   • rootDir → CSVs históricos (data/*_hidroweb.csv) e percentis (public/data/percentis-doy.json)
//               Assets do build, imutáveis entre deploys.
//   • dataDir → feed live (ana-cotas-series.json). Em produção é o volume /data (DATA_DIR);
//               em dev é rootDir/data. Estende o calendário até o último dia disponível.
//
// pos = (cota_mediana - p10_doy) / (p90_doy - p10_doy)
//   < 0 : abaixo do P10 (estiagem)   ~0.5 : mediana   > 1 : acima do P90 (cheia)

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Ano mínimo de exibição — corta séries longas para manter o heatmap legível
const DISPLAY_ANO_MIN = 2010;
const SUAVIZACAO = 7; // deve casar com gera-percentis-doy.mjs

// Estações ativas — apenas as que têm feed live ANA (cobertura até hoje).
// SGC, Serrinha, Moura, Caracarai, Abuna desativadas (sem feed live, CSVs estáticos).
export const ESTACOES = {
  Curicuriari: "data/curicuriari_hidroweb.csv",
  PortoVelho:  "data/portovelho_hidroweb.csv",
  Humaita:     "data/humaita_hidroweb.csv",
  Manicore:    "data/manicore_hidroweb.csv",
  Borba:       "data/borba_hidroweb.csv",
  Labrea:      "data/labrea_hidroweb.csv",
  Itacoatiara: "data/itacoatiara_hidroweb.csv",
};

// ── Helpers ──
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

function lerCSV(rootDir, rel) {
  const txt = readFileSync(join(rootDir, rel), "utf-8").replace(/^﻿/, "");
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

// ── Processa uma estação ──
function processaEstacao(nome, csvRel, { rootDir, percentis, cotasRecentes, log }) {
  const perc = percentis[nome];
  if (!perc) {
    log(`  ⚠ ${nome}: sem percentis em percentis-doy.json — pulando`);
    return null;
  }
  const p10 = perc.p10;   // array [null, v1..v366]
  const p90 = perc.p90;

  const obsRaw = lerCSV(rootDir, csvRel);

  // Mescla dados recentes do feed live para dias posteriores ao último CSV
  if (cotasRecentes && cotasRecentes.length > 0) {
    const ultimaDataCSV = obsRaw.length > 0
      ? obsRaw.reduce((a, b) => (a.data > b.data ? a : b)).data
      : "1900-01-01";
    const extras = cotasRecentes
      .filter((r) => r.data > ultimaDataCSV)
      .map((r) => ({ data: r.data, cota: r.cota_m, doy: doy(r.data) }));
    if (extras.length > 0) {
      obsRaw.push(...extras);
      log(`    + ${extras.length} dias do feed live (até ${extras[extras.length - 1].data})`);
    }
  }

  const obs     = suaviza(obsRaw);
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

  log(`  ${nome}: ${todosAnos.length} anos (${anoMin}–${anoMax}), ${anosComDados.size} com dados`);

  return { anoMin, anoMax, numYears, weekly: weeklyFlat, decendial: decendialFlat };
}

/**
 * Monta o payload completo do Calendário de Severidade.
 *
 * @param {object} opts
 * @param {string} opts.rootDir   raiz do projeto (CSVs + percentis do build)
 * @param {string} [opts.dataDir] dir do feed live (volume em prod); default rootDir/data
 * @param {(msg:string)=>void} [opts.log] logger opcional (default: no-op)
 * @returns {{ periods: {inicio:number, fim:number}, stations: Record<string, object> }}
 */
export function computeSeverityCalendar({ rootDir, dataDir, log = () => {} }) {
  // 1. Percentis canônicos (asset do build)
  const percPath = join(rootDir, "public/data/percentis-doy.json");
  if (!existsSync(percPath)) {
    throw new Error(`percentis-doy.json não encontrado em ${percPath} — rode gera-percentis-doy.mjs`);
  }
  const { periodo: PERIODO_REF, estacoes: PERCENTIS } = JSON.parse(readFileSync(percPath, "utf-8"));
  log(`✓ percentis (ref ${PERIODO_REF.inicio}–${PERIODO_REF.fim})`);

  // 2. Feed live (volume em prod, data/ em dev)
  const liveDir   = dataDir ?? join(rootDir, "data");
  const anaPath   = join(liveDir, "ana-cotas-series.json");
  let liveCotas = {};
  if (existsSync(anaPath)) {
    const raw = JSON.parse(readFileSync(anaPath, "utf-8"));
    liveCotas = raw.estacoes || {};
    log(`✓ feed live ${raw.gerado_em?.slice(0, 10) ?? "?"}: ${Object.keys(liveCotas).join(", ")}`);
  } else {
    log(`⚠ ana-cotas-series.json não encontrado em ${anaPath} — usando só CSVs`);
  }

  // 3. Processa cada estação
  const stations = {};
  for (const [nome, csv] of Object.entries(ESTACOES)) {
    const r = processaEstacao(nome, csv, {
      rootDir, percentis: PERCENTIS, cotasRecentes: liveCotas[nome], log,
    });
    if (r) stations[nome] = r;
  }

  return { periods: PERIODO_REF, stations };
}
