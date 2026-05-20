// Converte 16030000_Cotas.csv (formato HidroWeb wide) para data/itacoatiara_hidroweb.csv
// Formato de saída: data,cota_m  (ISO 8601, metros)
//
// Regras:
//   - Prefere NC=2 (consistido) quando disponível para o mesmo mês
//   - Ignora registros horários (hora preenchida) — usa só o diário (hora vazia)
//   - Valor ausente ou status=4 (régua seca) → linha omitida
//   - Cota em cm → divide por 100 → metros
//   - Mescla com itacoatiara_historico.csv (2025-08 em diante) que já está em metros
//
// Uso: node scripts/converte-hidroweb-itacoatiara.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SRC = "C:/Users/bruno/Downloads/itacoatiara_extract/16030000_Cotas.csv";
const HISTORICO = join(ROOT, "data/itacoatiara_historico.csv");
const OUT = join(ROOT, "data/itacoatiara_hidroweb.csv");

// --- Parse HidroWeb wide format ---
const raw = readFileSync(SRC, "utf-8");
const lines = raw.split(/\r?\n/).filter((l) => l.startsWith("16030000"));

// index: { "YYYY-MM-DD" => { nc, cota_m } }
// NC=2 wins over NC=1 for same date
const byDate = new Map();

for (const line of lines) {
  const parts = line.split(";");
  // col indices:
  // 0=EstacaoCodigo, 1=NivelConsistencia, 2=Data(DD/MM/YYYY), 3=hora
  // 4=MediaDiaria, 5=TipoMedicaoCotas, ...
  // 16=Cota01 .. 46=Cota31
  // 47=Cota01Status .. 77=Cota31Status

  const hora = parts[3]?.trim();
  if (hora) continue; // skip hourly records — use daily (hora vazia)

  const nc = parseInt(parts[1], 10);
  const dataStr = parts[2]?.trim(); // DD/MM/YYYY
  if (!dataStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) continue;

  const [dd, mm, yyyy] = dataStr.split("/").map(Number);
  const diasNoMes = new Date(yyyy, mm, 0).getDate();

  for (let d = 1; d <= 31; d++) {
    if (d > diasNoMes) break;
    const cotaStr = parts[15 + d]?.trim(); // Cota01 is at index 16 → 15+d
    const statusStr = parts[46 + d]?.trim(); // Cota01Status at 47 → 46+d

    if (!cotaStr || cotaStr === "" || isNaN(+cotaStr)) continue;
    const status = parseInt(statusStr, 10);
    if (status === 4) continue; // régua seca

    const cota_cm = parseFloat(cotaStr);
    if (isNaN(cota_cm)) continue;

    const dateISO = `${yyyy}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const existing = byDate.get(dateISO);
    // NC=2 wins; within same NC keep first seen (NC=1 rows may have duplicates)
    if (!existing || nc > existing.nc) {
      byDate.set(dateISO, { nc, cota_m: +(cota_cm / 100).toFixed(4) });
    }
  }
}

// --- Merge with itacoatiara_historico.csv (already in meters, 2025-08 onward) ---
const hist = readFileSync(HISTORICO, "utf-8");
const histLines = hist.trim().split(/\r?\n/).slice(1); // skip header
for (const l of histLines) {
  const [data, cota_str] = l.split(",");
  if (!data || !cota_str) continue;
  const cota_m = parseFloat(cota_str);
  if (isNaN(cota_m)) continue;
  // historico has higher precedence (more recent fetch)
  if (!byDate.has(data)) {
    byDate.set(data, { nc: 1, cota_m: +cota_m.toFixed(4) });
  }
}

// --- Sort and write ---
const sorted = [...byDate.entries()]
  .sort(([a], [b]) => a.localeCompare(b));

const csv = ["data,cota_m", ...sorted.map(([d, v]) => `${d},${v.cota_m}`)].join("\n") + "\n";
writeFileSync(OUT, csv, "utf-8");

console.log(`✓ ${OUT}`);
console.log(`  ${sorted.length} linhas diárias`);
console.log(`  período: ${sorted[0][0]} → ${sorted[sorted.length - 1][0]}`);
// Quick sanity: check 2024-10-31 (mínima histórica ~ -17 cm = -0.17 m)
const oct31 = byDate.get("2024-10-31");
console.log(`  2024-10-31: ${oct31 ? oct31.cota_m + " m (NC=" + oct31.nc + ")" : "AUSENTE"}`);
const sep10 = byDate.get("2024-09-10");
console.log(`  2024-09-10: ${sep10 ? sep10.cota_m + " m" : "AUSENTE"}`);
