// Calibra coeficientes da regressão ITA = a + b·MAO em série diária 2016-2025
// para uso como base do componente lag_operacional ORTOGONALIZADO.
//
// Endereça crítica da auditoria: lag_operacional original = (MAO − ITA) − climatologia
// compartilha cota_ITA com componente calado_tabocal → multicolinearidade VIF > 5.
//
// O RESÍDUO da regressão é independente de cota_ITA absoluta por construção
// (correlação resíduo ⊥ ITA = 0 em séries OLS).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let GIT_SHA = "unknown", GIT_DIRTY = false;
try {
  GIT_SHA = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  GIT_DIRTY = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf-8" }).trim().length > 0;
} catch {}

// Lê série diária pareada MAO/ITA
const linhas = readFileSync(join(ROOT, "data", "4estacoes_2016_2025.csv"), "utf-8").trim().split("\n");
const cab = linhas[0].split(",");
const iMAO = cab.indexOf("MAO");
const iITA = cab.indexOf("ITA");

const pares = [];
for (let i = 1; i < linhas.length; i++) {
  const partes = linhas[i].split(",");
  const mao = parseFloat(partes[iMAO]);
  const ita = parseFloat(partes[iITA]);
  if (isFinite(mao) && isFinite(ita)) pares.push({ mao, ita });
}
console.log(`Pares MAO/ITA: ${pares.length}`);

// OLS: ITA = a + b·MAO
const n = pares.length;
const meanMAO = pares.reduce((s, p) => s + p.mao, 0) / n;
const meanITA = pares.reduce((s, p) => s + p.ita, 0) / n;
let num = 0, den = 0;
for (const p of pares) {
  num += (p.mao - meanMAO) * (p.ita - meanITA);
  den += (p.mao - meanMAO) ** 2;
}
const b = num / den;
const a = meanITA - b * meanMAO;

// R² e RMSE
let ssRes = 0, ssTot = 0;
for (const p of pares) {
  const previsto = a + b * p.mao;
  ssRes += (p.ita - previsto) ** 2;
  ssTot += (p.ita - meanITA) ** 2;
}
const r2 = 1 - ssRes / ssTot;
const rmse = Math.sqrt(ssRes / n);

// Resíduos
const residuos = pares.map((p) => p.ita - (a + b * p.mao));
const meanRes = residuos.reduce((s, v) => s + v, 0) / n;
const sdRes = Math.sqrt(residuos.reduce((s, v) => s + (v - meanRes) ** 2, 0) / n);

// Correlação resíduo vs cota_ITA absoluta (deveria ser ~0 por construção OLS)
const itas = pares.map((p) => p.ita);
const meanITA2 = itas.reduce((s, v) => s + v, 0) / n;
let cov = 0, varITA = 0;
for (let i = 0; i < n; i++) {
  cov += (residuos[i] - meanRes) * (itas[i] - meanITA2);
  varITA += (itas[i] - meanITA2) ** 2;
}
const corResIta = cov / Math.sqrt(varITA * sdRes * sdRes * n);

// Quantis dos resíduos
residuos.sort((a, b) => a - b);
const q05 = residuos[Math.floor(n * 0.05)];
const q50 = residuos[Math.floor(n * 0.50)];
const q95 = residuos[Math.floor(n * 0.95)];

console.log("\n══════════════════════════════════════════════════════");
console.log("Regressão ITA = a + b·MAO (calibração lag ortogonal)");
console.log("══════════════════════════════════════════════════════");
console.log(`  n:                 ${n}`);
console.log(`  a (intercepto):    ${a.toFixed(4)}`);
console.log(`  b (coef. MAO):     ${b.toFixed(4)}`);
console.log(`  R²:                ${r2.toFixed(4)}`);
console.log(`  RMSE resíduos:     ${rmse.toFixed(3)} m`);
console.log(`  Média resíduos:    ${meanRes.toExponential(3)} (deve ser ~0)`);
console.log(`  SD resíduos:       ${sdRes.toFixed(3)} m`);
console.log(`  cor(resíduo, ITA): ${corResIta.toExponential(3)} (deve ser ~0)`);
console.log(`  Quantis resíduos:`);
console.log(`    P5:              ${q05.toFixed(2)} m`);
console.log(`    P50:             ${q50.toFixed(2)} m`);
console.log(`    P95:             ${q95.toFixed(2)} m`);
console.log("══════════════════════════════════════════════════════");

const out = `// AUTO-GERADO por scripts/calibra-lag-ortogonal.mjs em ${new Date().toISOString()}
// GIT: ${GIT_SHA.slice(0, 7)}${GIT_DIRTY ? " (dirty)" : ""}
//
// Calibração da regressão ITA = a + b·MAO usada para ORTOGONALIZAR o componente
// lag_operacional do IRC-Tabocal. O resíduo da regressão é, por construção OLS,
// ortogonal à cota MAO — e empiricamente próximo de ortogonal à cota ITA também
// (cor=${corResIta.toExponential(2)}).

export const LAG_ORTOGONAL_CALIBRADO = {
  // ITA_esperada = a + b·MAO
  a:                ${a.toFixed(4)},
  b:                ${b.toFixed(4)},
  r2:               ${r2.toFixed(4)},
  rmse_m:           ${rmse.toFixed(3)},
  sd_residuos_m:    ${sdRes.toFixed(3)},
  cor_residuo_ita:  ${corResIta.toExponential(3)},
  q05_residuo:      ${q05.toFixed(2)},
  q50_residuo:      ${q50.toFixed(2)},
  q95_residuo:      ${q95.toFixed(2)},
  n_pares:          ${n},
  gerado_em:        "${new Date().toISOString()}",
  git_sha:          "${GIT_SHA}",
  git_dirty:        ${GIT_DIRTY},
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "lag-ortogonal-calibrado.ts");
writeFileSync(OUT_PATH, out, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
