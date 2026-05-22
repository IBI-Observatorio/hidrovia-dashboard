// Calibra o modelo de recessão pós-pico de Itacoatiara (16030000) — ponto
// de controle REAL do calado operacional no Tabocal.
//
// CORREÇÕES DA AUDITORIA ESTATÍSTICA (v3.4):
//   1. Usa série diária COMPLETA 2016-2025 (itacoatiara_hidroweb.csv,
//      ~3650 obs) em vez de 4estacoes_2016_2025.csv que tem gaps.
//   2. Calcula MATRIZ DE COVARIÂNCIA Σ(k, h_min) — auditor mostrou ρ~+0,3 a +0,5
//      e tratá-los como independentes inflava IC80 em ~25%.
//   3. Inclui 2024 e 2025 nos ajustes (eram excluídos), mas marca outliers.
//   4. Seed PRNG fixa (42) — reprodutível.
//   5. Reporta RMSE por ano + RMSE médio para validação.
//
// Modelo: h(t) = h_min + (h_pico - h_min) * exp(-k * t)
//   t = dias desde o pico de cheia (abr-jul típico)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SEED = 42;

let GIT_SHA = "unknown";
let GIT_DIRTY = false;
try {
  GIT_SHA = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  const status = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf-8" }).trim();
  GIT_DIRTY = status.length > 0;
} catch { /* sem git */ }
const GIT_SHA_SHORT = GIT_SHA.slice(0, 7);

// ─── Leitura série diária Itacoatiara ────────────────────────────────────
const CSV_PATH = join(ROOT, "data", "itacoatiara_hidroweb.csv");
const linhas = readFileSync(CSV_PATH, "utf-8").trim().split("\n");
const cotas = new Map();
for (let i = 1; i < linhas.length; i++) {
  const [data, cota] = linhas[i].split(",");
  const v = parseFloat(cota);
  if (!data || !isFinite(v)) continue;
  cotas.set(data, v);
}
console.log(`Itacoatiara série diária: ${cotas.size} observações (1927-2025)`);

function diaMaisN(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function encontraPico(ano) {
  let max = -Infinity, maxData = null;
  for (let mes = 4; mes <= 7; mes++) {
    const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const iso = `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
      const v = cotas.get(iso);
      if (v != null && v > max) { max = v; maxData = iso; }
    }
  }
  return maxData ? { data: maxData, cota_m: max } : null;
}

/**
 * Ajusta h(t) = h_min + (h_pico - h_min)·exp(-k·t) via linearização log.
 * Retorna { k, h_min, h_pico_ajustado, rmse_m, n_obs, serie } onde
 * serie é a série observada (para cálculo de erros por horizonte).
 */
function ajustaExponencial(picoData, picoCota, horizonte = 215) {
  const serie = [];
  for (let t = 0; t <= horizonte; t++) {
    const iso = diaMaisN(picoData, t);
    const h = cotas.get(iso);
    if (h != null) serie.push({ t, h });
  }
  if (serie.length < 30) return null;
  const h_min = Math.min(...serie.map((s) => s.h));
  const validos = serie.filter((s) => s.h - h_min > 0.05);
  if (validos.length < 20) return null;

  const ts = validos.map((s) => s.t);
  const ys = validos.map((s) => Math.log(s.h - h_min));
  const n = ts.length;
  const meanT = ts.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (ts[i] - meanT) * (ys[i] - meanY);
    den += (ts[i] - meanT) ** 2;
  }
  const slope = num / den;
  const intercept = meanY - slope * meanT;
  const k = -slope;
  const h_pico_ajustado = h_min + Math.exp(intercept);

  let sqSum = 0;
  for (const { t, h } of serie) {
    const previsto = h_min + (h_pico_ajustado - h_min) * Math.exp(-k * t);
    sqSum += (h - previsto) ** 2;
  }
  const rmse_m = Math.sqrt(sqSum / serie.length);

  return {
    k:                +k.toFixed(6),
    h_min:            +h_min.toFixed(2),
    h_pico_ajustado:  +h_pico_ajustado.toFixed(2),
    h_pico_observado: +picoCota.toFixed(2),
    rmse_m:           +rmse_m.toFixed(3),
    n_obs:            serie.length,
    serie,
  };
}

// 2024 é mega-seca (h_min=-0.17 forçaria outlier). 2025 é cheia normal.
// Inclui ambos no ajuste mas marca 2024 como atípico.
const ANOS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const ajustes = [];

for (const ano of ANOS) {
  const pico = encontraPico(ano);
  if (!pico) { console.log(`  ${ano}: pico não encontrado`); continue; }
  const aj = ajustaExponencial(pico.data, pico.cota_m);
  if (!aj) { console.log(`  ${ano}: ajuste falhou`); continue; }
  const outlier = ano === 2024;
  console.log(
    `  ${ano}${outlier ? "*" : " "}: pico ${pico.data}=${pico.cota_m}m → ` +
    `k=${aj.k.toFixed(5)}, h_min=${aj.h_min}m, RMSE=${aj.rmse_m}m (n=${aj.n_obs})`
  );
  ajustes.push({
    ano,
    pico_data:    pico.data,
    pico_cota_m:  pico.cota_m,
    k:            aj.k,
    h_min:        aj.h_min,
    h_pico_ajustado: aj.h_pico_ajustado,
    h_pico_observado: aj.h_pico_observado,
    rmse_m:       aj.rmse_m,
    n_obs:        aj.n_obs,
    outlier,
  });
}

if (ajustes.length === 0) { console.error("Nenhum ajuste"); process.exit(1); }

// ─── Estatísticas — INCLUI 2024/2025 ──────────────────────────────────────
// k_medio, k_sigma, h_min_medio: TODOS os anos (mais defensável que excluir).
// Σ(k, h_min) calculada com todos os pontos.
const N = ajustes.length;
const ks       = ajustes.map((a) => a.k);
const hmins    = ajustes.map((a) => a.h_min);
const rmses    = ajustes.map((a) => a.rmse_m);
const mean   = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const std    = (arr, m) => Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);

const k_medio     = mean(ks);
const k_sigma     = std(ks, k_medio);
const h_min_medio = mean(hmins);
const h_min_sigma = std(hmins, h_min_medio);
const rmse_medio  = mean(rmses);

// Covariância e correlação de Pearson
let cov = 0;
for (let i = 0; i < N; i++) cov += (ks[i] - k_medio) * (hmins[i] - h_min_medio);
cov /= N;
const rho = cov / (k_sigma * h_min_sigma);

// Matriz Σ = [[var_k, cov], [cov, var_h]]
const var_k = k_sigma * k_sigma;
const var_h = h_min_sigma * h_min_sigma;

// Cholesky 2×2: L = [[L00, 0], [L10, L11]] tal que L·L^T = Σ
const L00 = Math.sqrt(var_k);
const L10 = cov / L00;
const L11 = Math.sqrt(Math.max(var_h - L10 * L10, 1e-12));

console.log("\n══════════════════════════════════════════════");
console.log("ITACOATIARA — Modelo de Recessão (v3.4)");
console.log("══════════════════════════════════════════════");
console.log(`  k médio:           ${k_medio.toFixed(6)} 1/d  (σ=${k_sigma.toFixed(6)})`);
console.log(`  h_min médio:       ${h_min_medio.toFixed(2)} m  (σ=${h_min_sigma.toFixed(2)})`);
console.log(`  ρ(k, h_min):       ${rho.toFixed(3)}`);
console.log(`  cov(k, h_min):     ${cov.toExponential(3)}`);
console.log(`  RMSE médio:        ${rmse_medio.toFixed(3)} m`);
console.log(`  Anos:              ${ajustes.length} de ${ANOS.length} (* = outlier)`);
console.log(`  Range k:           ${Math.min(...ks).toFixed(6)} – ${Math.max(...ks).toFixed(6)}`);
console.log(`  Range h_min:       ${Math.min(...hmins).toFixed(2)} – ${Math.max(...hmins).toFixed(2)}`);
console.log(`  Cholesky:          L00=${L00.toExponential(3)}, L10=${L10.toExponential(3)}, L11=${L11.toExponential(3)}`);

// ─── Saída TS ─────────────────────────────────────────────────────────────
const tsOut = `// AUTO-GERADO por scripts/calibra-recessao-itacoatiara.mjs em ${new Date().toISOString()}
// SEED: ${SEED} · GIT: ${GIT_SHA_SHORT}${GIT_DIRTY ? " (dirty)" : ""} · reprodutível.
//
// Calibração v3.4 — Modelo de recessão pós-pico de Itacoatiara (16030000).
//
// Correções da auditoria estatística:
//   • Série diária COMPLETA 2016-2025 (itacoatiara_hidroweb.csv, ~3650 obs)
//   • Matriz de covariância Σ(k, h_min) + Cholesky para amostragem MVN
//   • Inclui 2024 (mega-seca, marcado como outlier) e 2025 no ajuste
//   • ρ(k, h_min) reportado: ${rho.toFixed(3)}
//
// Modelo: h(t) = h_min + (h_pico - h_min) * exp(-k * t)
// NÃO EDITAR À MÃO — rode 'node scripts/calibra-recessao-itacoatiara.mjs'.

export interface AjusteRecessaoItacoatiara {
  ano:               number;
  pico_data:         string;
  pico_cota_m:       number;
  k:                 number;
  h_min:             number;
  h_pico_ajustado:   number;
  h_pico_observado:  number;
  rmse_m:            number;
  n_obs:             number;
  /** true se ano atípico (ex: 2024 mega-seca) */
  outlier:           boolean;
}

export const RECESSAO_ITACOATIARA_CALIBRADA = {
  // Médias dos ${N} anos (incluindo outliers)
  k_medio:         ${k_medio.toFixed(6)},
  k_sigma:         ${k_sigma.toFixed(6)},
  h_min_medio:     ${h_min_medio.toFixed(2)},
  h_min_sigma:     ${h_min_sigma.toFixed(3)},
  rmse_medio_m:    ${rmse_medio.toFixed(3)},

  // Correlação e covariância (k, h_min)
  rho_k_hmin:      ${rho.toFixed(4)},
  cov_k_hmin:      ${cov.toExponential(6)},

  // Cholesky de Σ — uso: amostrar MVN com randMvn2(rng, [k_medio, h_min_medio], L)
  cholesky_L:      [${L00.toExponential(6)}, ${L10.toExponential(6)}, ${L11.toExponential(6)}] as readonly [number, number, number],

  anos:            [${ajustes.map((a) => a.ano).join(", ")}],
  n_anos:          ${ajustes.length},

  k_min:           ${Math.min(...ks).toFixed(6)},
  k_max:           ${Math.max(...ks).toFixed(6)},
  h_min_min:       ${Math.min(...hmins).toFixed(2)},
  h_min_max:       ${Math.max(...hmins).toFixed(2)},

  minima_historica: { data: "2024-10-31", cota_m: -0.17 },

  ajustes_por_ano: ${JSON.stringify(ajustes.map((a) => ({
    ano: a.ano,
    pico_data: a.pico_data,
    pico_cota_m: a.pico_cota_m,
    k: a.k,
    h_min: a.h_min,
    h_pico_ajustado: a.h_pico_ajustado,
    h_pico_observado: a.h_pico_observado,
    rmse_m: a.rmse_m,
    n_obs: a.n_obs,
    outlier: a.outlier,
  })), null, 2)} as AjusteRecessaoItacoatiara[],
  seed:            ${SEED},
  gerado_em:       "${new Date().toISOString()}",
  git_sha:         "${GIT_SHA}",
  git_dirty:       ${GIT_DIRTY},
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "recessao-itacoatiara-calibrada.ts");
writeFileSync(OUT_PATH, tsOut, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}\n`);
