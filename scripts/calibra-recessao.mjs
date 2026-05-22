// Calibra o modelo de recessão pós-pico de Manaus a partir da série histórica
// de cotas diárias (data/4estacoes_2016_2025.csv, coluna MAO).
//
// Modelo:  h(t) = (h_pico - h_min) * exp(-k * t) + h_min
//   onde:  h_pico = cota no dia do pico
//          t      = dias desde o pico
//          k      = constante de recessão (1/d)
//          h_min  = assíntota (cota mínima da estiagem)
//
// Estratégia por ano (2016-2023):
//   1. Encontra o dia do PICO no intervalo abr-jul
//   2. Captura a série a partir do pico até 31/dez (até 184 dias)
//   3. Calcula h_min observado nesse intervalo
//   4. Ajusta k por mínimos quadrados em escala log: log(h - h_min) = log(h_pico - h_min) - k*t
//   5. Mede RMSE em metros
//
// Saída: lib/recessao-calibrada.ts com parâmetros agregados (média, sigma, range
// observado) e os ajustes por ano para inspeção.
//
// Uso: node scripts/calibra-recessao.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Leitura dos dados ───────────────────────────────────────────────────────
const CSV_PATH = join(ROOT, "data", "4estacoes_2016_2025.csv");
const linhas = readFileSync(CSV_PATH, "utf-8").trim().split("\n");
const cabecalho = linhas[0].split(",");
const idxMAO = cabecalho.indexOf("MAO");
if (idxMAO < 0) {
  console.error("Coluna MAO não encontrada em", CSV_PATH);
  process.exit(1);
}

// Mapa data ISO → cota_m
const cotas = new Map();
for (let i = 1; i < linhas.length; i++) {
  const partes = linhas[i].split(",");
  const data = partes[0];
  const valor = parseFloat(partes[idxMAO]);
  if (!data || isNaN(valor)) continue;
  cotas.set(data, valor);
}
console.log(`Carregado: ${cotas.size} observações Manaus (2016-2025)`);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function diasEntre(a, b) {
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function todasDatasNoIntervalo(de, ate) {
  const out = [];
  let cur = new Date(de + "T00:00:00Z");
  const fim = new Date(ate + "T00:00:00Z");
  while (cur <= fim) {
    out.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86400000);
  }
  return out;
}

// Encontra o pico em um intervalo [inicio, fim]
function encontraPico(ano) {
  const datas = todasDatasNoIntervalo(`${ano}-04-01`, `${ano}-07-31`);
  let max = -Infinity, maxData = null;
  for (const d of datas) {
    const v = cotas.get(d);
    if (v != null && v > max) { max = v; maxData = d; }
  }
  return maxData ? { data: maxData, cota_m: max } : null;
}

// Ajusta k por mínimos quadrados em log(h - h_min) vs t
// Retorna { k, h_min, rmse_m, n_obs }
function ajustaExponencial(picoData, picoCota, horizonte = 184) {
  // Coleta série pós-pico
  const serie = []; // { t, h }
  for (let t = 0; t <= horizonte; t++) {
    const dt = new Date(new Date(picoData + "T00:00:00Z").getTime() + t * 86400000);
    const iso = dt.toISOString().slice(0, 10);
    const h = cotas.get(iso);
    if (h != null) serie.push({ t, h });
  }
  if (serie.length < 30) return null;

  // h_min: cota mínima observada na janela
  const h_min = Math.min(...serie.map((s) => s.h));

  // Filtra pontos onde h > h_min (para log ser finito)
  const validos = serie.filter((s) => s.h - h_min > 0.05);
  if (validos.length < 20) return null;

  // log-linear: log(h - h_min) = log(h_pico - h_min) - k*t
  // Mínimos quadrados (slope = -k)
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

  // RMSE em metros — sobre TODA a série (não só pontos com h>h_min)
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

// ─── Calibração por ano ──────────────────────────────────────────────────────
const ANOS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
const ajustes = [];

for (const ano of ANOS) {
  const pico = encontraPico(ano);
  if (!pico) { console.log(`  ${ano}: pico não encontrado`); continue; }
  const ajuste = ajustaExponencial(pico.data, pico.cota_m);
  if (!ajuste) { console.log(`  ${ano}: ajuste falhou (poucos dados)`); continue; }
  console.log(
    `  ${ano}: pico ${pico.data}=${pico.cota_m}m → k=${ajuste.k}` +
    `, h_min=${ajuste.h_min}m, RMSE=${ajuste.rmse_m}m (n=${ajuste.n_obs})`
  );
  ajustes.push({ ano, pico_data: pico.data, pico_cota_m: pico.cota_m, ...ajuste });
}

if (ajustes.length === 0) {
  console.error("Nenhum ajuste produzido — abortando.");
  process.exit(1);
}

// ─── Agregação ───────────────────────────────────────────────────────────────
const ks = ajustes.map((a) => a.k);
const hmins = ajustes.map((a) => a.h_min);
const rmses = ajustes.map((a) => a.rmse_m);

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const std = (arr, m) => Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);

const k_medio  = mean(ks);
const k_sigma  = std(ks, k_medio);
const h_min_medio = mean(hmins);
const rmse_medio = mean(rmses);

console.log("\n══════════════════════════════════════════════");
console.log("AGREGADOS:");
console.log(`  k médio:        ${k_medio.toFixed(6)} 1/d  (σ=${k_sigma.toFixed(6)})`);
console.log(`  h_min médio:    ${h_min_medio.toFixed(2)} m`);
console.log(`  RMSE médio:     ${rmse_medio.toFixed(3)} m`);
console.log(`  Anos ajustados: ${ajustes.length} de ${ANOS.length}`);
console.log("══════════════════════════════════════════════\n");

// ─── Saída TypeScript ───────────────────────────────────────────────────────
const tsOut = `// AUTO-GERADO por scripts/calibra-recessao.mjs em ${new Date().toISOString()}
// Calibração do modelo de recessão pós-pico de Manaus (14990000), baseada na
// coluna MAO de data/4estacoes_2016_2025.csv (anos 2016-2023).
//
// Modelo: h(t) = h_min + (h_pico - h_min) * exp(-k * t)
//   onde t = dias desde o pico de cheia
//
// NÃO EDITAR À MÃO — rode 'node scripts/calibra-recessao.mjs' para regenerar.

export interface AjusteRecessao {
  ano:               number;
  pico_data:         string;   // YYYY-MM-DD
  pico_cota_m:       number;
  k:                 number;
  h_min:             number;
  h_pico_ajustado:   number;
  h_pico_observado:  number;
  rmse_m:            number;
  n_obs:             number;
}

export const RECESSAO_CALIBRADA = {
  // Parâmetros agregados (uso primário pelo projetaRecessao)
  k_medio:         ${k_medio.toFixed(6)},
  k_sigma:         ${k_sigma.toFixed(6)},
  h_min_medio:     ${h_min_medio.toFixed(2)},
  rmse_medio_m:    ${rmse_medio.toFixed(3)},

  // Anos cobertos pela calibração
  anos:            [${ajustes.map(a => a.ano).join(", ")}],
  n_anos:          ${ajustes.length},

  // Range observado de k (para banda IC80 dinâmica)
  k_min:           ${Math.min(...ks).toFixed(6)},
  k_max:           ${Math.max(...ks).toFixed(6)},

  // Ajustes por ano (debug, validação visual)
  ajustes_por_ano: ${JSON.stringify(ajustes, null, 2)} as AjusteRecessao[],
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "recessao-calibrada.ts");
writeFileSync(OUT_PATH, tsOut, "utf-8");
console.log(`✓ Gerado: ${OUT_PATH}\n`);
