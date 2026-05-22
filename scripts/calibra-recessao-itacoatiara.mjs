// Calibra o modelo de recessão pós-pico de Itacoatiara (16030000) — o ponto
// de controle REAL do calado operacional no Tabocal.
//
// Diferenças vs Manaus:
//   - Pico de cheia em mai-jun (não jun-jul)
//   - h_min pode ser NEGATIVO (zero da régua é referência local)
//   - Mínima histórica observada: -0.17m em 31/10/2024
//   - Range total: -0.17 a 15.20 (vs Manaus ~12-30m)
//
// Modelo: h(t) = h_min + (h_pico - h_min) * exp(-k * t)
// Janela: mai-dez de cada ano. Calibração 2016-2023 (treino).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CSV_PATH = join(ROOT, "data", "4estacoes_2016_2025.csv");
const linhas = readFileSync(CSV_PATH, "utf-8").trim().split("\n");
const cab = linhas[0].split(",");
const idxITA = cab.indexOf("ITA");
if (idxITA < 0) { console.error("ITA não encontrada"); process.exit(1); }

const cotas = new Map();
for (let i = 1; i < linhas.length; i++) {
  const partes = linhas[i].split(",");
  const v = parseFloat(partes[idxITA]);
  if (!partes[0] || isNaN(v)) continue;
  cotas.set(partes[0], v);
}
console.log(`Itacoatiara: ${cotas.size} observações`);

function diasEntre(a, b) {
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return Math.round((db - da) / 86400000);
}

function diaMaisN(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Pico em Itacoatiara: mai-jun (mais cedo que Manaus)
function encontraPico(ano) {
  let max = -Infinity, maxData = null;
  // Janela ampla: abr-jul para cobrir variação interanual
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

function ajustaExponencial(picoData, picoCota, horizonte = 215) {
  const serie = [];
  for (let t = 0; t <= horizonte; t++) {
    const iso = diaMaisN(picoData, t);
    const h = cotas.get(iso);
    if (h != null) serie.push({ t, h });
  }
  if (serie.length < 30) return null;
  const h_min = Math.min(...serie.map((s) => s.h));
  // Filtra para log finito — h precisa estar acima de h_min
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
    k:               +k.toFixed(6),
    h_min:           +h_min.toFixed(2),
    h_pico_ajustado: +h_pico_ajustado.toFixed(2),
    h_pico_observado: +picoCota.toFixed(2),
    rmse_m:          +rmse_m.toFixed(3),
    n_obs:           serie.length,
  };
}

const ANOS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
const ajustes = [];

for (const ano of ANOS) {
  const pico = encontraPico(ano);
  if (!pico) { console.log(`  ${ano}: pico não encontrado`); continue; }
  const ajuste = ajustaExponencial(pico.data, pico.cota_m);
  if (!ajuste) { console.log(`  ${ano}: ajuste falhou`); continue; }
  console.log(
    `  ${ano}: pico ${pico.data}=${pico.cota_m}m → k=${ajuste.k}` +
    `, h_min=${ajuste.h_min}m, RMSE=${ajuste.rmse_m}m (n=${ajuste.n_obs})`
  );
  ajustes.push({ ano, pico_data: pico.data, pico_cota_m: pico.cota_m, ...ajuste });
}

if (ajustes.length === 0) { console.error("Nenhum ajuste"); process.exit(1); }

const ks = ajustes.map((a) => a.k);
const hmins = ajustes.map((a) => a.h_min);
const rmses = ajustes.map((a) => a.rmse_m);
const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const std  = (arr, m) => Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);

const k_medio  = mean(ks);
const k_sigma  = std(ks, k_medio);
const h_min_medio = mean(hmins);
const rmse_medio = mean(rmses);

console.log("\n══════════════════════════════════════════════");
console.log("ITACOATIARA — Modelo de Recessão");
console.log("══════════════════════════════════════════════");
console.log(`  k médio:        ${k_medio.toFixed(6)} 1/d  (σ=${k_sigma.toFixed(6)})`);
console.log(`  h_min médio:    ${h_min_medio.toFixed(2)} m`);
console.log(`  RMSE médio:     ${rmse_medio.toFixed(3)} m`);
console.log(`  Anos:           ${ajustes.length} de ${ANOS.length}`);
console.log(`  Range k:        ${Math.min(...ks).toFixed(6)} – ${Math.max(...ks).toFixed(6)}`);
console.log(`  Range h_min:    ${Math.min(...hmins).toFixed(2)} – ${Math.max(...hmins).toFixed(2)}`);

const tsOut = `// AUTO-GERADO por scripts/calibra-recessao-itacoatiara.mjs em ${new Date().toISOString()}
// Calibração do modelo de recessão pós-pico de Itacoatiara (16030000).
// Ponto de controle REAL do calado operacional no canal Tabocal.
//
// Modelo: h(t) = h_min + (h_pico - h_min) * exp(-k * t)
//   t = dias desde o pico de cheia (abr-jul típico)
//
// Diferenças vs Manaus: pico mais cedo (mai-jun), h_min pode ser negativo
// (zero da régua é local), range total maior.
//
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
}

export const RECESSAO_ITACOATIARA_CALIBRADA = {
  k_medio:         ${k_medio.toFixed(6)},
  k_sigma:         ${k_sigma.toFixed(6)},
  h_min_medio:     ${h_min_medio.toFixed(2)},
  rmse_medio_m:    ${rmse_medio.toFixed(3)},

  anos:            [${ajustes.map((a) => a.ano).join(", ")}],
  n_anos:          ${ajustes.length},

  k_min:           ${Math.min(...ks).toFixed(6)},
  k_max:           ${Math.max(...ks).toFixed(6)},
  h_min_min:       ${Math.min(...hmins).toFixed(2)},
  h_min_max:       ${Math.max(...hmins).toFixed(2)},

  // Mínima histórica observada (referência para gatilho operacional Tabocal)
  minima_historica: { data: "2024-10-31", cota_m: -0.17 },

  ajustes_por_ano: ${JSON.stringify(ajustes, null, 2)} as AjusteRecessaoItacoatiara[],
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "recessao-itacoatiara-calibrada.ts");
writeFileSync(OUT_PATH, tsOut, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}\n`);
