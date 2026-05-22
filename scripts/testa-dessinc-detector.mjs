// Smoke test do detector de dessincronização extrema.
// 4 cenários:
//   A) 17/03/2026 — IDN +0.52 (snapshot da dessinc histórica do plano)
//   B) 30/04/2026 — IDN +0.61 (pico de driver Norte 2026)
//   C) 31/10/2024 — IDN -0.52 (driver Sul, mega-seca)
//   D) hipotético — IDN +0.85 (cenário extremo)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const ts = readFileSync(join(ROOT, "lib", "percentis-idn-doy.ts"), "utf-8");
const p85 = JSON.parse(ts.match(/p85:\s*(\[[^\]]+\])/)[1]);
const p95 = JSON.parse(ts.match(/p95:\s*(\[[^\]]+\])/)[1]);

function doy(iso) {
  const d = new Date(iso + "T00:00:00Z");
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.floor((d - start) / 86400000) + 1;
}

function detecta(idn, data) {
  const d = doy(data);
  const abs = Math.abs(idn);
  const P85 = p85[d];
  const P95 = p95[d];
  let sev = "normal";
  if (P95 && abs >= P95) sev = "extrema";
  else if (P85 && abs >= P85) sev = "alta";
  else if (P85 && abs >= P85 * 0.85) sev = "elevada";
  const dir = idn > 0.05 ? "norte" : idn < -0.05 ? "sul" : "neutro";
  return { idn, abs, data, doy: d, P85, P95, sev, dir };
}

const cenarios = [
  { nome: "17/03/2026 (IDN +0.52)",  idn: +0.52, data: "2026-03-17" },
  { nome: "30/04/2026 (IDN +0.61)",  idn: +0.61, data: "2026-04-30" },
  { nome: "31/10/2024 (IDN -0.52)",  idn: -0.52, data: "2024-10-31" },
  { nome: "Hipotético (IDN +0.85)",  idn: +0.85, data: "2026-06-15" },
];

console.log("\n══════ Detector de Dessincronização Extrema ══════\n");
for (const c of cenarios) {
  const r = detecta(c.idn, c.data);
  console.log(`▸ ${c.nome}`);
  console.log(`  DOY ${r.doy} | P85=${r.P85?.toFixed(3) ?? "?"} | P95=${r.P95?.toFixed(3) ?? "?"}`);
  console.log(`  → Severidade: ${r.sev.toUpperCase()} | Direção: ${r.dir}`);
  console.log("");
}
