// Job mensal: escreve o artefato ESTÁTICO do Calendário de Severidade.
//
// A lógica de cálculo vive em lib/severity-calendar-engine.mjs (fonte única,
// compartilhada com a rota on-demand app/api/severity-calendar/route.ts).
// Este script só ORQUESTRA e ESCREVE:
//   • public/data/severity-calendar.json   — fallback estático (servido se a rota cair)
//   • lib/severity-calendar-precomputed.ts  — tipos + dados pré-computados (build-time)
//
// Em produção o calendário é servido pela rota /api/severity-calendar, que recalcula
// na hora com o feed live do volume. Este artefato estático é só fallback/tipos.
//
// Uso:
//   node scripts/gera-percentis-doy.mjs         # só se percentis mudaram
//   node scripts/gera-severity-calendar.mjs      # regenera estático
//   npm run update-calendar                      # atalho

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeSeverityCalendar } from "../lib/severity-calendar-engine.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Calcula via engine único (dev: dataDir = ROOT/data por default)
const payload = computeSeverityCalendar({
  rootDir: ROOT,
  dataDir: process.env.DATA_DIR ?? undefined,
  log: (msg) => console.log(msg),
});

const { periods: PERIODO_REF, stations: resultado } = payload;

// ── Emite TypeScript (tipos + dados pré-computados) ──
const stationUnion = Object.keys(resultado).map((k) => `"${k}"`).join(" | ");

function serStation(s) {
  return `{
    anoMin: ${s.anoMin}, anoMax: ${s.anoMax}, numYears: ${s.numYears},
    weekly: [${s.weekly.join(",")}],
    decendial: [${s.decendial.join(",")}]
  }`;
}

const ts = `// AUTO-GERADO por scripts/gera-severity-calendar.mjs — NÃO EDITAR À MÃO.
// Cálculo em lib/severity-calendar-engine.mjs. Percentis de public/data/percentis-doy.json.
// Baseline: MA-7d trailing, janela ±15 dias, referência ${PERIODO_REF.inicio}–${PERIODO_REF.fim}.
//
// pos = (cota_mediana - p10_doy) / (p90_doy - p10_doy)
//   < 0  : abaixo do P10   ~0.5: mediana   > 1: acima do P90

export type SeverityStation = ${stationUnion};

export interface SeverityStationData {
  anoMin:    number;
  anoMax:    number;
  numYears:  number;
  /** flat interleaved [pos, cota_m] × numYears × 52 */
  weekly:    (number | null | undefined)[];
  /** flat interleaved [pos, cota_m] × numYears × 36 */
  decendial: (number | null | undefined)[];
}

export const SEVERITY_PERIODS = { inicio: ${PERIODO_REF.inicio}, fim: ${PERIODO_REF.fim} };

export const SEVERITY_CALENDAR: Record<SeverityStation, SeverityStationData> = {
${Object.entries(resultado).map(([k, v]) => `  ${k}: ${serStation(v)},`).join("\n")}
};
`;

writeFileSync(join(ROOT, "lib/severity-calendar-precomputed.ts"), ts);
console.log("✓ lib/severity-calendar-precomputed.ts");

// ── Emite JSON estático (fallback) ──
const publicDataDir = join(ROOT, "public/data");
if (!existsSync(publicDataDir)) mkdirSync(publicDataDir, { recursive: true });
const jsonPath = join(ROOT, "public/data/severity-calendar.json");
writeFileSync(jsonPath, JSON.stringify(payload));
console.log(`✓ ${jsonPath} (${(JSON.stringify(payload).length / 1024).toFixed(1)} KB)`);
