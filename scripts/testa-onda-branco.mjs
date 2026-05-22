// Testa o detector Onda Branco em 3 cenários:
//   1. Cenário sintético reproduzindo 19/05/2026 (Caracaraí +2.5m em 7d) → ALTA
//   2. Subida normal (variação 7d ~ 0.5m, típica do ciclo de cheia) → NENHUMA
//   3. Evento histórico de 2024 (mega-seca → subida invernal forte abr-mai/2024)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Reimplementação local do detector (não importa TS via mjs)
const LIMIAR_VAR_7D_M = 1.40;
const LIMIAR_VAR_7D_P95_M = 2.09;
const LAG_HEURISTICO = 30;

function diferencaDias(de, ate) {
  return Math.round((new Date(ate + "T00:00:00Z") - new Date(de + "T00:00:00Z")) / 86400000);
}

function detecta(serie, janela = 7) {
  if (!serie || serie.length < janela + 1) return { disparado: false, severidade: "nenhuma" };
  const ultima = serie[serie.length - 1];
  const datasOrdenadas = serie.map((s) => s.data).sort();
  // Pega o ponto janela dias atrás
  const idxAlvo = Math.max(0, serie.length - 1 - janela);
  const primeira = serie[idxAlvo];
  const diasReais = diferencaDias(primeira.data, ultima.data);
  if (diasReais < 1) return { disparado: false, severidade: "nenhuma" };
  const var_total = ultima.cota_m - primeira.cota_m;
  const taxa = (var_total * 100) / diasReais;
  let sev = "nenhuma";
  if (var_total >= LIMIAR_VAR_7D_P95_M) sev = "extrema";
  else if (var_total >= LIMIAR_VAR_7D_M) sev = "alta";
  else if (var_total >= LIMIAR_VAR_7D_M * 0.7) sev = "moderada";
  const dt = new Date(ultima.data + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + LAG_HEURISTICO);
  return {
    disparado: sev === "alta" || sev === "extrema",
    severidade: sev,
    var_total_m: +var_total.toFixed(2),
    taxa_cm_dia: +taxa.toFixed(1),
    eta_manaus_data: dt.toISOString().slice(0, 10),
    primeira: primeira.data,
    ultima: ultima.data,
    motivo: var_total >= LIMIAR_VAR_7D_M
      ? `Subida ${var_total.toFixed(2)}m em ${diasReais}d (P85=${LIMIAR_VAR_7D_M}m)`
      : `Variação ${var_total.toFixed(2)}m em ${diasReais}d (abaixo P85)`,
  };
}

// ─── Carrega série Caracaraí real ───────────────────────────────────────────
const linhas = readFileSync(join(ROOT, "data", "caracarai_hidroweb.csv"), "utf-8").trim().split("\n");
const serie = linhas.slice(1).map((l) => {
  const [data, cota] = l.split(",");
  return { data, cota_m: parseFloat(cota) };
}).filter((s) => !isNaN(s.cota_m));

console.log(`Série Caracaraí carregada: ${serie.length} obs`);

function janelaAteData(serie, dataLimite, dias = 8) {
  const idx = serie.findIndex((s) => s.data === dataLimite);
  if (idx < 0) return [];
  return serie.slice(Math.max(0, idx - dias), idx + 1);
}

// ─── Cenário 1: sintético "boletim 20° SGB" (+2.5m em 7d) ───────────────────
console.log("\n══════ Cenário 1: sintético +2.5m em 7d (Caracaraí, boletim 20°) ══════");
const sintetico = [
  { data: "2026-05-12", cota_m: 2.50 },
  { data: "2026-05-13", cota_m: 2.85 },
  { data: "2026-05-14", cota_m: 3.20 },
  { data: "2026-05-15", cota_m: 3.55 },
  { data: "2026-05-16", cota_m: 3.90 },
  { data: "2026-05-17", cota_m: 4.30 },
  { data: "2026-05-18", cota_m: 4.70 },
  { data: "2026-05-19", cota_m: 5.00 },
];
const r1 = detecta(sintetico, 7);
console.log(`  Disparado: ${r1.disparado}`);
console.log(`  Severidade: ${r1.severidade}`);
console.log(`  Var total: ${r1.var_total_m} m | Taxa: ${r1.taxa_cm_dia} cm/dia`);
console.log(`  Motivo: ${r1.motivo}`);
console.log(`  ETA Manaus: ${r1.eta_manaus_data}`);
console.log(`  ESPERADO: disparado=true, severidade=alta ou extrema`);

// ─── Cenário 2: subida normal em janeiro (ciclo de cheia típico) ────────────
console.log("\n══════ Cenário 2: janela típica do ciclo de cheia (jan/2024) ══════");
const j2024 = janelaAteData(serie, "2024-01-15", 8);
console.log(`  ${j2024.length} obs encontradas`);
const r2 = detecta(j2024, 7);
console.log(`  Disparado: ${r2.disparado}`);
console.log(`  Severidade: ${r2.severidade}`);
console.log(`  Var total: ${r2.var_total_m} m | Taxa: ${r2.taxa_cm_dia} cm/dia`);
console.log(`  Motivo: ${r2.motivo}`);

// ─── Cenário 3: subida histórica forte (procura no histórico) ───────────────
console.log("\n══════ Cenário 3: maior subida 7d na série histórica ══════");
let melhor = { var: 0, data: null, janela: null };
for (let i = 7; i < serie.length; i++) {
  const v = serie[i].cota_m - serie[i - 7].cota_m;
  if (v > melhor.var) {
    melhor = { var: v, data: serie[i].data, janela: serie.slice(i - 7, i + 1) };
  }
}
console.log(`  Maior subida 7d na história: ${melhor.var.toFixed(2)}m terminando em ${melhor.data}`);
const r3 = detecta(melhor.janela, 7);
console.log(`  Disparado: ${r3.disparado}`);
console.log(`  Severidade: ${r3.severidade}`);
console.log(`  Var total: ${r3.var_total_m} m | Taxa: ${r3.taxa_cm_dia} cm/dia`);
console.log(`  ESPERADO: disparado=true, severidade=extrema`);
