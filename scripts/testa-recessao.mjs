// Smoke test do modelo de recessão:
//   1. Replicação do calibrador (não precisa importar TS)
//   2. Aplica para forecast SGB 2026 (pico 28.23m em jun) → projetar cruzamento 17.7m
//   3. Aplica retroativamente a 2024 (pico 24.07m, ano de mega-seca) → comparar
//      com data observada de cruzamento (10/09/2024)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAL = JSON.parse(
  // Trick: extrair só os números do TS gerado
  readFileSync(join(__dirname, "..", "lib", "recessao-calibrada.ts"), "utf-8")
    .match(/k_medio:\s+([\d.]+),[\s\S]*?h_min_medio:\s+([\d.]+),[\s\S]*?k_min:\s+([\d.]+),\s*\n\s+k_max:\s+([\d.]+)/)
    ? JSON.stringify({
        k_medio:  parseFloat(RegExp.$1),
        h_min_medio: parseFloat(RegExp.$2),
        k_min:    parseFloat(RegExp.$3),
        k_max:    parseFloat(RegExp.$4),
      })
    : "{}"
);
console.log("Calibração lida:", CAL);

function projeta(picoCota, kUsado = CAL.k_medio, hMinUsado = CAL.h_min_medio) {
  const pts = [];
  for (let t = 0; t <= 250; t++) {
    pts.push({ t, h: hMinUsado + (picoCota - hMinUsado) * Math.exp(-kUsado * t) });
  }
  return pts;
}

function diaCruzamento(pts, gatilho = 17.7) {
  const p = pts.find((x) => x.h < gatilho);
  return p ? p.t : null;
}

console.log("\n══════ Cenário 1: forecast SGB 2026 (pico 28.23m em 15/06/2026) ══════");
const sgb = projeta(28.23);
const tCruz = diaCruzamento(sgb, 17.7);
console.log(`  Cruzamento 17.7m (central): t=${tCruz} dias após pico`);
if (tCruz != null) {
  const dt = new Date("2026-06-15T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + tCruz);
  console.log(`  Data estimada: ${dt.toISOString().slice(0, 10)}`);
}

console.log("\n══════ Cenário 2: retroativo 2024 (pico ~24.07m em 05/06/2024) ══════");
const m24 = projeta(24.07);
const tCruz24 = diaCruzamento(m24, 17.7);
console.log(`  Cruzamento 17.7m (central): t=${tCruz24} dias após pico`);
if (tCruz24 != null) {
  const dt = new Date("2024-06-05T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + tCruz24);
  console.log(`  Data estimada: ${dt.toISOString().slice(0, 10)}`);
}
console.log("  Data observada (real): 2024-09-10 (97 dias após pico de jun)");

console.log("\n══════ Banda IC80 sobre 2026 ══════");
const lento  = projeta(28.23, CAL.k_min, CAL.h_min_medio + 1);
const rapido = projeta(28.23, CAL.k_max, CAL.h_min_medio - 1);
console.log(`  Lento  (k_min=${CAL.k_min}):  cruzamento t=${diaCruzamento(lento, 17.7)} dias`);
console.log(`  Rápido (k_max=${CAL.k_max}):  cruzamento t=${diaCruzamento(rapido, 17.7)} dias`);
