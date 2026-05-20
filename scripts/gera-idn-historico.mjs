// Reconstrói a série diária do IDN para 2016–2026 usando o pipeline ATUAL
// (cotas MA-7d, percentis DOY 2016-2023, 11 estações, pesos corrigidos).
// Substitui o IDN_HISTORICO hardcoded em dados-historicos.ts, que vinha do
// método antigo (baseline anual chutado + 2 estações).
//
// Saída: lib/idn-historico-calculado.ts

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

function carregaSuavizada(arq) {
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
for (const [est, arq] of Object.entries(ARQUIVOS)) series[est] = carregaSuavizada(arq);

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

// 2016 → 2026 (até última data possível em cada série)
const serie = [];
const dt = new Date(Date.UTC(2016, 0, 1));
const fim = new Date(Date.UTC(2026, 11, 31));
while (dt <= fim) {
  const iso = dt.toISOString().slice(0, 10);
  const v = idnDia(iso);
  if (!isNaN(v)) serie.push({ data: iso, idn: +v.toFixed(3), ano: +iso.slice(0, 4) });
  dt.setUTCDate(dt.getUTCDate() + 1);
}
console.log(`Série IDN reconstruída: ${serie.length} valores (${serie[0].data} → ${serie.at(-1).data})`);

// Estatísticas por ano
console.log("\nEstatísticas anuais (IDN médio):");
const porAno = new Map();
for (const o of serie) {
  if (!porAno.has(o.ano)) porAno.set(o.ano, []);
  porAno.get(o.ano).push(o.idn);
}
for (const [ano, vs] of [...porAno.entries()].sort()) {
  const m = vs.reduce((s,x) => s+x, 0) / vs.length;
  const min = Math.min(...vs), max = Math.max(...vs);
  console.log(`  ${ano}: n=${vs.length.toString().padStart(3)}  média=${m.toFixed(2).padStart(6)}  range=[${min.toFixed(2)}, ${max.toFixed(2)}]`);
}

// Decimação para o gráfico longo (1 ponto a cada 7 dias) e
// últimos 180 dias diários para o gráfico curto (90 dias visíveis com margem).
const decimada = serie.filter((_, i) => i % 7 === 0);
const recentes = serie.slice(-180); // últimos 180 dias diários
console.log(`\nSérie decimada (semanal) para gráfico longo: ${decimada.length} pontos`);
console.log(`Série diária recente (últimos 180d) para gráfico curto: ${recentes.length} pontos`);

const ts = `// AUTO-GERADO por scripts/gera-idn-historico.mjs — NÃO EDITAR À MÃO.
// Série IDN calculada com pipeline atual (MA-7d + percentis DOY + 11 estações + pesos corrigidos).
// Fonte: ${serie.length} valores diários originais (${serie[0].data} → ${serie.at(-1).data}).

export interface PontoIDN {
  data: string;
  idn: number;
  ano: number;
}

// Série completa decimada (1 ponto/semana) — para gráfico 10 anos
export const IDN_HISTORICO_CALCULADO: PontoIDN[] = ${JSON.stringify(decimada, null, 2)};

// Últimos 180 dias diários — para gráfico recente (90 dias visíveis com margem)
export const IDN_RECENTE_DIARIO: PontoIDN[] = ${JSON.stringify(recentes, null, 2)};
`;

writeFileSync(join(ROOT, "lib/idn-historico-calculado.ts"), ts);
console.log("\n✓ lib/idn-historico-calculado.ts gerado");
