// Calibra percentis DOY (dia-do-ano) do |IDN| a partir da série histórica
// calculada (decimada semanal + diária recente). Gera lib/percentis-idn-doy.ts.
//
// Por que: para o detector de dessincronização extrema precisamos comparar o
// |IDN| atual contra a distribuição histórica DO MESMO PERÍODO DO ANO — o IDN
// tem sazonalidade (Negro alto e Madeira têm ciclos defasados naturalmente).
// Sem ajuste sazonal, um IDN +0.4 em janeiro seria "comum" mas em maio seria
// "extremo".
//
// Estratégia:
//   1. Une IDN_HISTORICO_CALCULADO (semanal 2016-2025) + IDN_RECENTE_DIARIO (diário 2025)
//   2. Para cada DOY (1..366), agrupa observações em janela ±30 dias
//   3. Calcula P85 e P95 do |IDN| nesse grupo
//   4. Suaviza com média móvel ±5 dias para evitar ruído

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Extrai arrays do TS — não importa via require para evitar acoplamento
const idnTS = readFileSync(join(ROOT, "lib", "idn-historico-calculado.ts"), "utf-8");

function extraiArrayJSON(texto, nomeVar) {
  const m = texto.match(new RegExp(`${nomeVar}[^=]*=\\s*(\\[[\\s\\S]*?\\]);`));
  if (!m) throw new Error(`Não achou ${nomeVar}`);
  return JSON.parse(m[1]);
}

const semanal = extraiArrayJSON(idnTS, "IDN_HISTORICO_CALCULADO");
const diario  = extraiArrayJSON(idnTS, "IDN_RECENTE_DIARIO");
console.log(`Semanal: ${semanal.length} obs | Diário recente: ${diario.length} obs`);

// Combina (deduplica por data)
const mapa = new Map();
for (const p of semanal) mapa.set(p.data, p.idn);
for (const p of diario) mapa.set(p.data, p.idn);   // diário sobrescreve semanal
const todos = [...mapa.entries()].map(([data, idn]) => ({ data, idn }));
console.log(`Combinado (dedup): ${todos.length} obs`);

// DOY (1..366) — dia do ano
function doy(iso) {
  const d = new Date(iso + "T00:00:00Z");
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.floor((d - start) / 86400000) + 1;
}

// Agrupa por DOY com janela ±30 dias (janela maior compensa série semanal)
const JANELA = 30;
const grupos = Array.from({ length: 367 }, () => []);  // [0] não usado
for (const p of todos) {
  const d = doy(p.data);
  const absIdn = Math.abs(p.idn);
  // Adiciona à própria DOY e às vizinhas dentro da janela
  for (let off = -JANELA; off <= JANELA; off++) {
    let alvo = d + off;
    if (alvo < 1)   alvo += 366;
    if (alvo > 366) alvo -= 366;
    grupos[alvo].push(absIdn);
  }
}

function quantil(arr, q) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[idx];
}

const p85 = [null];
const p95 = [null];
for (let d = 1; d <= 366; d++) {
  const g = grupos[d];
  p85.push(g.length > 20 ? +quantil(g, 0.85).toFixed(3) : null);
  p95.push(g.length > 20 ? +quantil(g, 0.95).toFixed(3) : null);
}

// Suavização ±5 dias (média móvel circular)
function suaviza(arr) {
  const out = [arr[0]];
  for (let d = 1; d <= 366; d++) {
    const vals = [];
    for (let off = -5; off <= 5; off++) {
      let i = d + off;
      if (i < 1)   i += 366;
      if (i > 366) i -= 366;
      if (arr[i] != null) vals.push(arr[i]);
    }
    out.push(vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3) : null);
  }
  return out;
}

const p85s = suaviza(p85);
const p95s = suaviza(p95);

// Estatísticas
const todosP85 = p85s.slice(1).filter((x) => x != null);
const todosP95 = p95s.slice(1).filter((x) => x != null);
console.log(`\nP85 |IDN| range: ${Math.min(...todosP85).toFixed(3)} – ${Math.max(...todosP85).toFixed(3)}`);
console.log(`P95 |IDN| range: ${Math.min(...todosP95).toFixed(3)} – ${Math.max(...todosP95).toFixed(3)}`);
console.log(`Média P85: ${(todosP85.reduce((a,b)=>a+b,0)/todosP85.length).toFixed(3)}`);
console.log(`Média P95: ${(todosP95.reduce((a,b)=>a+b,0)/todosP95.length).toFixed(3)}`);

// Output TS
const ts = `// AUTO-GERADO por scripts/calibra-dessinc-percentis.mjs — NÃO EDITAR À MÃO.
// Percentis DOY (1..366) do |IDN| sobre IDN_HISTORICO_CALCULADO (2016-2025).
// Janela móvel ±${JANELA} dias, suavização ±5 dias.
// NULL em DOYs com observações insuficientes (< 20 pontos no grupo).
//
// Uso: detector de dessincronização extrema (lib/dessincronizacao-detector.ts).

export const PERCENTIS_IDN_DOY = {
  janela_dias: ${JANELA},
  suavizacao_dias: 5,
  p85: ${JSON.stringify(p85s)},
  p95: ${JSON.stringify(p95s)},
} as const;
`;

const OUT = join(ROOT, "lib", "percentis-idn-doy.ts");
writeFileSync(OUT, ts, "utf-8");
console.log(`\n✓ Gerado: ${OUT}`);

// Sanity check: 17/03/2026 (IDN +0.52 do snapshot) deveria estar bem acima do P85
const doy17Mar = doy("2026-03-17");
console.log(`\nValidação: DOY ${doy17Mar} (17/mar)`);
console.log(`  P85 = ${p85s[doy17Mar]} | P95 = ${p95s[doy17Mar]}`);
console.log(`  Observado em 17/03/2026: |IDN| = 0.52`);
console.log(`  → ${0.52 > p85s[doy17Mar] ? "EXCEDE P85 ✓" : "NÃO excede P85"} | ${0.52 > p95s[doy17Mar] ? "EXCEDE P95 ✓" : "NÃO excede P95"}`);
