// Gera percentis P10/P90 por dia-do-ano (DOY) para Curicuriari e Humaitá.
// Janela móvel de ±15 dias agrega valores históricos para suavizar amostra.
// Período de referência: 2016–2023 (exclui 2024/2025 para não enviesar baseline
// com os anos extremos que queremos diagnosticar).
//
// Uso: node scripts/gera-percentis-doy.mjs
// Saída: lib/percentis-doy.ts

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PERIODO_REF = { inicio: 2016, fim: 2023 };
const JANELA_DIAS = 15;
const SUAVIZACAO_DIAS = 7; // trailing moving average (mesmo no histórico e no runtime)

// 11 estações com séries longas (2016+) cobrindo as duas sub-bacias.
// Nomes seguem os códigos oficiais ANA.
// Itacoatiara adicionada para o painel Calendário de Severidade (série 1927–2026).
const ESTACOES = {
  // Sub-bacia Norte (Negro + Branco)
  SGC:           "data/sgc_hidroweb.csv",             // 14320001 São Gabriel da Cachoeira
  Curicuriari:   "data/curicuriari_hidroweb.csv",     // 14330000 Curicuriari
  Serrinha:      "data/serrinha_hidroweb.csv",        // 14420000
  Moura:         "data/moura_hidroweb.csv",           // 14840000 (município de Barcelos)
  Caracarai:     "data/caracarai_hidroweb.csv",       // 14710000 Rio Branco
  // Sub-bacia Sul (Madeira + Purus)
  Abuna:         "data/abuna_hidroweb.csv",           // 15320002
  PortoVelho:    "data/portovelho_hidroweb.csv",      // 15400000
  Humaita:       "data/humaita_hidroweb.csv",         // 15630000
  Manicore:      "data/manicore_hidroweb.csv",        // 15700000
  Borba:         "data/borba_hidroweb.csv",           // 15900000
  Labrea:        "data/labrea_hidroweb.csv",          // 13870000 Rio Purus
  // Calha principal — usado pelo Calendário de Severidade
  Itacoatiara:   "data/itacoatiara_hidroweb.csv",     // 16030000 Rio Amazonas
};

function diaDoAno(dataISO) {
  const [y, m, d] = dataISO.split("-").map(Number);
  const inicio = Date.UTC(y, 0, 1);
  const atual  = Date.UTC(y, m - 1, d);
  return Math.floor((atual - inicio) / 86400000) + 1; // 1..366
}

function lerCSV(caminho) {
  const txt = readFileSync(caminho, "utf-8").replace(/^﻿/, "");
  const linhas = txt.trim().split(/\r?\n/).slice(1);
  return linhas
    .map((l) => l.split(","))
    .filter((p) => p.length === 2 && p[1] && !isNaN(+p[1]))
    .map(([data, cota]) => ({ data, cota: +cota, doy: diaDoAno(data) }));
}

// Trailing moving average de N dias.
// Cada ponto t passa a ser mean(t-N+1 ... t) — usa apenas o passado, sem
// requerer dados futuros. Pontos anteriores ao N-ésimo são descartados.
// As observações precisam estar ordenadas por data e em dias contínuos
// (gaps quebram o cálculo — ignoramos pontos sem janela completa).
function suavizaTrailing(obs, dias) {
  if (dias <= 1) return obs;
  // ordena por data
  const ord = [...obs].sort((a, b) => a.data.localeCompare(b.data));
  // indexa por data para detectar gaps
  const porData = new Map(ord.map(o => [o.data, o]));

  const result = [];
  for (const o of ord) {
    const valores = [];
    const dt = new Date(`${o.data}T00:00:00Z`);
    let ok = true;
    for (let k = 0; k < dias; k++) {
      const dtPrev = new Date(dt);
      dtPrev.setUTCDate(dtPrev.getUTCDate() - k);
      const iso = dtPrev.toISOString().slice(0, 10);
      const v = porData.get(iso);
      if (!v) { ok = false; break; }
      valores.push(v.cota);
    }
    if (!ok) continue;
    const media = valores.reduce((s, x) => s + x, 0) / valores.length;
    result.push({ ...o, cota: media });
  }
  return result;
}

function percentil(arr, p) {
  if (!arr.length) return NaN;
  const ordenado = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (ordenado.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return ordenado[lo];
  return ordenado[lo] + (ordenado[hi] - ordenado[lo]) * (idx - lo);
}

function calculaDOY(observacoes) {
  // Filtra ao período de referência
  const ref = observacoes.filter((o) => {
    const ano = +o.data.slice(0, 4);
    return ano >= PERIODO_REF.inicio && ano <= PERIODO_REF.fim;
  });

  // Agrupa por DOY
  const porDOY = new Map();
  for (const o of ref) {
    if (!porDOY.has(o.doy)) porDOY.set(o.doy, []);
    porDOY.get(o.doy).push(o.cota);
  }

  // Para cada DOY 1..366, agrega janela ±15 dias e calcula percentis
  const p10 = new Array(367).fill(null);
  const p90 = new Array(367).fill(null);
  const mediana = new Array(367).fill(null);

  for (let d = 1; d <= 366; d++) {
    const amostra = [];
    for (let off = -JANELA_DIAS; off <= JANELA_DIAS; off++) {
      // wrap-around (DOY circular)
      let alvo = d + off;
      if (alvo < 1) alvo += 366;
      if (alvo > 366) alvo -= 366;
      const vals = porDOY.get(alvo);
      if (vals) amostra.push(...vals);
    }
    if (amostra.length >= 30) {
      p10[d] = +percentil(amostra, 10).toFixed(3);
      p90[d] = +percentil(amostra, 90).toFixed(3);
      mediana[d] = +percentil(amostra, 50).toFixed(3);
    }
  }
  return { p10, p90, mediana, n_observacoes: ref.length };
}

const resultado = {};
for (const [estacao, caminhoRel] of Object.entries(ESTACOES)) {
  const obsRaw = lerCSV(join(ROOT, caminhoRel));
  const obs = suavizaTrailing(obsRaw, SUAVIZACAO_DIAS);
  resultado[estacao] = calculaDOY(obs);
  console.log(
    `${estacao}: ${obsRaw.length} obs raw → ${obs.length} suavizadas (MA${SUAVIZACAO_DIAS}d), ${resultado[estacao].n_observacoes} no período ${PERIODO_REF.inicio}-${PERIODO_REF.fim}`
  );
}

// Escreve TS
const ts = `// AUTO-GERADO por scripts/gera-percentis-doy.mjs — NÃO EDITAR À MÃO.
// Percentis sobre série suavizada por média móvel trailing ${SUAVIZACAO_DIAS}d.
// Período de referência: ${PERIODO_REF.inicio}–${PERIODO_REF.fim}, janela móvel ±${JANELA_DIAS} dias.
// Índice [1..366] = dia-do-ano (1 = 1/jan). Índice [0] não usado.
// Para comparações coerentes, o valor "atual" também precisa ser MA-${SUAVIZACAO_DIAS}d.

export const SUAVIZACAO_DIAS = ${SUAVIZACAO_DIAS};

export interface PercentisDOY {
  p10: (number | null)[];
  p90: (number | null)[];
  mediana: (number | null)[];
  n_observacoes: number;
}

export const PERIODO_REFERENCIA = { inicio: ${PERIODO_REF.inicio}, fim: ${PERIODO_REF.fim}, janela_dias: ${JANELA_DIAS} };

export const PERCENTIS_DOY: Record<string, PercentisDOY> = ${JSON.stringify(resultado, null, 2)};

export function diaDoAno(dataISO: string): number {
  const [y, m, d] = dataISO.split("-").map(Number);
  const inicio = Date.UTC(y, 0, 1);
  const atual  = Date.UTC(y, m - 1, d);
  return Math.floor((atual - inicio) / 86400000) + 1;
}
`;

writeFileSync(join(ROOT, "lib/percentis-doy.ts"), ts);
console.log("✓ lib/percentis-doy.ts gerado");
