// Gera lib/itacoatiara-historico-diario.ts — série diária Itacoatiara 2016-2025
// indexada por ano. Usado pelo forecasting por análogos.
//
// Estrutura:
//   export const ITACOATIARA_HISTORICO_DIARIO: Record<number, Record<string, number>>
//   { 2016: { "2016-01-01": 4.52, ... }, 2017: {...}, ..., 2025: {...} }

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

const linhas = readFileSync(join(ROOT, "data", "itacoatiara_hidroweb.csv"), "utf-8")
  .trim().split("\n");

const porAno = {};  // { 2016: { "2016-01-01": 4.52, ... } }

for (let i = 1; i < linhas.length; i++) {
  const [data, cota] = linhas[i].split(",");
  const v = parseFloat(cota);
  if (!data || !isFinite(v)) continue;
  const ano = parseInt(data.slice(0, 4), 10);
  if (ano < 2016 || ano > 2026) continue;  // inclui 2026 (série corrente)
  if (!porAno[ano]) porAno[ano] = {};
  porAno[ano][data] = +v.toFixed(2);
}

const anos = Object.keys(porAno).map(Number).sort();
console.log("Cobertura por ano:");
for (const a of anos) {
  console.log(`  ${a}: ${Object.keys(porAno[a]).length} obs`);
}

const out = `// AUTO-GERADO por scripts/gera-itacoatiara-historico-diario.mjs em ${new Date().toISOString()}
// GIT: ${GIT_SHA.slice(0, 7)}${GIT_DIRTY ? " (dirty)" : ""}
//
// Série diária Itacoatiara (16030000) ${anos[0]}-${anos[anos.length-1]}.
// Fonte: HidroWeb/ANA — data/itacoatiara_hidroweb.csv
// Uso: forecasting por análogos (lib/recessao-analogos.ts)

export const ITACOATIARA_HISTORICO_DIARIO: Record<number, Record<string, number>> = ${JSON.stringify(porAno, null, 2)};

export const ITACOATIARA_HISTORICO_DIARIO_META = {
  anos:        [${anos.join(", ")}],
  n_anos:      ${anos.length},
  n_obs_total: ${anos.reduce((s, a) => s + Object.keys(porAno[a]).length, 0)},
  fonte:       "HidroWeb/ANA — estação 16030000",
  gerado_em:   "${new Date().toISOString()}",
  git_sha:     "${GIT_SHA}",
  git_dirty:   ${GIT_DIRTY},
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "itacoatiara-historico-diario.ts");
writeFileSync(OUT_PATH, out, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
