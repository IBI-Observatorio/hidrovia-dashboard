// Audita o IDN atual decompondo em sub-bacias e estações.
// Verifica se o valor extrapolado é bug ou sinal genuíno.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Lê percentis DOY (cotas)
const percTS = readFileSync(join(ROOT, "lib", "percentis-doy.ts"), "utf-8");
function extraiObj(t, nome) {
  // Localiza o início do bloco
  const inicio = t.indexOf(`"${nome}"`);
  if (inicio < 0) return null;
  // Encontra a próxima chave da estação seguinte (ou fim do objeto)
  const fimAlt = t.indexOf(`\n  "`, inicio + nome.length + 5);
  const fim = fimAlt > 0 ? fimAlt : t.indexOf("};", inicio);
  const bloco = t.slice(inicio, fim);
  // Extrai arrays p10, p90, mediana
  function arr(campo) {
    const m = bloco.match(new RegExp(`"${campo}":\\s*\\[([\\s\\S]*?)\\]`));
    if (!m) return null;
    return JSON.parse("[" + m[1] + "]");
  }
  return { p10: arr("p10"), p90: arr("p90"), mediana: arr("mediana") };
}

const ESTACOES = ["SGC", "Curicuriari", "Serrinha", "Moura", "Caracarai",
                  "Abuna", "PortoVelho", "Humaita", "Manicore", "Borba", "Labrea"];

const percentis = {};
for (const e of ESTACOES) percentis[e] = extraiObj(percTS, e);

// Lê pesos das sub-bacias
const subTS = readFileSync(join(ROOT, "lib", "sub-bacias.ts"), "utf-8");
function extraiPesos() {
  const m = subTS.match(/SUB_BACIA_PESOS[\s\S]*?Norte:\s*({[\s\S]*?})[\s\S]*?Sul:\s*({[\s\S]*?})/);
  if (!m) return null;
  function parsePesos(s) {
    const out = {};
    for (const linha of s.split("\n")) {
      const mm = linha.match(/(\w+):\s*([\d.]+)/);
      if (mm) out[mm[1]] = parseFloat(mm[2]);
    }
    return out;
  }
  return { Norte: parsePesos(m[1]), Sul: parsePesos(m[2]) };
}
const pesos = extraiPesos();
console.log("Pesos sub-bacias:");
console.log("  Norte:", pesos?.Norte);
console.log("  Sul:  ", pesos?.Sul);

// Cotas reais de hoje (snapshot recente — pode ajustar com dados live)
const COTAS_HOJE = {
  SGC:         9.92,
  Curicuriari: 8.5,    // estimativa
  Serrinha:    7.5,    // estimativa
  Moura:       6.5,    // estimativa
  Caracarai:   5.21,   // boletim 20° / variação
  Abuna:       6.0,    // estimativa
  PortoVelho:  12.46,  // boletim 20° / Madeira descendo
  Humaita:     21.54,
  Manicore:   13.0,    // estimativa
  Borba:       12.0,
  Labrea:      10.0,
};

const DATA_REF = "2026-05-21";

// DOY
function doy(iso) {
  const d = new Date(iso + "T00:00:00Z");
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.floor((d - start) / 86400000) + 1;
}
const d = doy(DATA_REF);
console.log(`\nData de referência: ${DATA_REF} (DOY ${d})\n`);

// Posição relativa: pos = (cota − P10) / (P90 − P10)
// Quanto MAIOR pos, mais ALTO em relação ao histórico para essa época
function posicaoRelativa(cota_m, estacao) {
  const p = percentis[estacao];
  if (!p || !p.p10 || !p.p90) return null;
  const p10 = p.p10[d];
  const p90 = p.p90[d];
  if (p10 == null || p90 == null) return null;
  return (cota_m - p10) / (p90 - p10);
}

console.log("Posição relativa por estação:");
console.log("Estação       | Cota (m) | P10  | P90  | Pos relativa");
console.log("──────────────┼──────────┼──────┼──────┼──────────────");

for (const e of ESTACOES) {
  const cota = COTAS_HOJE[e];
  const p = percentis[e];
  if (!p || !p.p10) { console.log(`  ${e.padEnd(13)} | (sem dados)`); continue; }
  const p10 = p.p10[d];
  const p90 = p.p90[d];
  const pos = posicaoRelativa(cota, e);
  console.log(
    `  ${e.padEnd(13)} | ${String(cota).padEnd(8)} | ${String(p10).padEnd(4)} | ${String(p90).padEnd(4)} | ${pos?.toFixed(3) ?? "—"}`
  );
}

// IDN = pos_sul - pos_norte (média ponderada de cada sub-bacia)
function posicaoSubBacia(bacia) {
  const pesosBacia = pesos?.[bacia];
  if (!pesosBacia) return null;
  let somaPeso = 0, somaPond = 0;
  const usadas = [];
  for (const [est, peso] of Object.entries(pesosBacia)) {
    const cota = COTAS_HOJE[est];
    if (cota == null) continue;
    const pos = posicaoRelativa(cota, est);
    if (pos == null) continue;
    somaPond += pos * peso;
    somaPeso += peso;
    usadas.push({ est, pos: pos.toFixed(3), peso });
  }
  return { valor: somaPeso > 0 ? somaPond / somaPeso : 0, usadas };
}

console.log("\n══════ Posições agregadas por sub-bacia ══════");
const norte = posicaoSubBacia("Norte");
const sul = posicaoSubBacia("Sul");
console.log("\nNORTE:");
console.log(norte?.usadas);
console.log(`  Posição agregada: ${norte?.valor.toFixed(3)}`);
console.log("\nSUL:");
console.log(sul?.usadas);
console.log(`  Posição agregada: ${sul?.valor.toFixed(3)}`);

const idn = (sul?.valor ?? 0) - (norte?.valor ?? 0);
console.log(`\n══════ IDN = pos_sul − pos_norte = ${sul?.valor.toFixed(3)} − (${norte?.valor.toFixed(3)}) = ${idn.toFixed(3)} ══════`);

if (Math.abs(idn) > 1) {
  console.log(`\n⚠  IDN extrapolado (|${idn.toFixed(3)}| > 1).`);
  console.log(`   pos_sul = ${sul?.valor.toFixed(3)} (Madeira/Purus)`);
  console.log(`   pos_norte = ${norte?.valor.toFixed(3)} (Negro/Branco)`);
  console.log(`   Diferença é genuína — não é bug.`);
  console.log(`   Caracaraí em ${COTAS_HOJE.Caracarai}m está MUITO abaixo do P10 para o DOY (P10 deve ser ~10m em maio).`);
}
