// Calibra o lag de propagação Caracaraí → Manaus por correlação cruzada
// entre as séries diárias de cota (2016-2025).
//
// Métricas:
//   - lag_ótimo: deslocamento (dias) que maximiza correlação Caracaraí(t) × Manaus(t+lag)
//   - corr_pico: correlação máxima
//   - lag_lento / lag_rápido: faixa P10-P90 da distribuição de tempos de propagação
//
// Saída: console (não gera TS — os valores são pequenos e podem ser hardcoded).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function lerCSV(arquivo, coluna) {
  const linhas = readFileSync(join(ROOT, "data", arquivo), "utf-8").trim().split("\n");
  const cab = linhas[0].split(",");
  const idx = cab.indexOf(coluna);
  if (idx < 0) throw new Error(`Coluna ${coluna} não encontrada em ${arquivo}`);
  const mapa = new Map();
  for (let i = 1; i < linhas.length; i++) {
    const partes = linhas[i].split(",");
    const data = partes[0];
    const v = parseFloat(partes[idx]);
    if (!data || isNaN(v)) continue;
    mapa.set(data, v);
  }
  return mapa;
}

const caracarai = lerCSV("caracarai_hidroweb.csv", "cota_m");
const manausCSV = lerCSV("4estacoes_2016_2025.csv", "MAO");

console.log(`Caracaraí: ${caracarai.size} obs (2016-09/2025)`);
console.log(`Manaus:    ${manausCSV.size} obs`);

// Interseção de datas + janela útil (precisamos das duas séries no mesmo dia)
const datasComum = [...caracarai.keys()].filter((d) => manausCSV.has(d)).sort();
console.log(`Datas em comum: ${datasComum.length}`);

// Construir vetores alinhados
function vetorAlinhado(dataInicio, dataFim) {
  const c = [], m = [];
  for (const d of datasComum) {
    if (d < dataInicio || d > dataFim) continue;
    c.push(caracarai.get(d));
    m.push(manausCSV.get(d));
  }
  return { c, m };
}

// Correlação cruzada: corr(c[t], m[t+lag])
function correlacaoCruzada(c, m, lag) {
  const n = Math.min(c.length, m.length) - Math.abs(lag);
  if (n < 30) return null;
  let cX = [], cY = [];
  if (lag >= 0) {
    cX = c.slice(0, n);
    cY = m.slice(lag, lag + n);
  } else {
    cX = c.slice(-lag, -lag + n);
    cY = m.slice(0, n);
  }
  const meanX = cX.reduce((a, b) => a + b, 0) / n;
  const meanY = cY.reduce((a, b) => a + b, 0) / n;
  let num = 0, dX = 0, dY = 0;
  for (let i = 0; i < n; i++) {
    num += (cX[i] - meanX) * (cY[i] - meanY);
    dX  += (cX[i] - meanX) ** 2;
    dY  += (cY[i] - meanY) ** 2;
  }
  return num / Math.sqrt(dX * dY);
}

// (1) Correlação cruzada global 2016-2025
console.log("\n══════ Correlação cruzada Caracaraí(t) × Manaus(t+lag) ══════");
const { c, m } = vetorAlinhado("2016-09-01", "2025-09-30");
console.log(`Vetor: ${c.length} pontos\n`);

let melhor = { lag: 0, corr: 0 };
const corrs = [];
for (let lag = 0; lag <= 60; lag++) {
  const r = correlacaoCruzada(c, m, lag);
  if (r == null) continue;
  corrs.push({ lag, corr: r });
  if (r > melhor.corr) melhor = { lag, corr: r };
}

// Mostra o perfil
console.log("Lag (d) | Correlação");
for (const { lag, corr } of corrs) {
  if (lag % 5 === 0 || lag === melhor.lag) {
    const marcador = lag === melhor.lag ? " ←" : "";
    console.log(`  ${String(lag).padStart(2)}    | ${corr.toFixed(4)}${marcador}`);
  }
}

console.log(`\n→ Lag ótimo (correlação máxima): ${melhor.lag} dias  (r=${melhor.corr.toFixed(4)})`);

// (2) Análise de eventos: identificar TODAS as subidas fortes de Caracaraí
//     (variação 7d > P85) e medir quantos dias depois Manaus atingiu o seu
//     próximo pico local. Distribuição empírica do lag entre eventos.
console.log("\n══════ Análise de eventos (subidas fortes Caracaraí > P85 da var 7d) ══════");

// Calcula variação 7d de Caracaraí
const datas = datasComum.slice();
const var7d = [];
for (let i = 7; i < datas.length; i++) {
  const v0 = caracarai.get(datas[i - 7]);
  const v1 = caracarai.get(datas[i]);
  if (v0 == null || v1 == null) continue;
  var7d.push({ data: datas[i], var_m: v1 - v0 });
}
const positivos = var7d.filter((x) => x.var_m > 0).map((x) => x.var_m).sort((a, b) => a - b);
const p85 = positivos[Math.floor(positivos.length * 0.85)];
const p95 = positivos[Math.floor(positivos.length * 0.95)];
console.log(`P85 da variação 7d positiva em Caracaraí: ${p85.toFixed(2)} m`);
console.log(`P95 (eventos extremos): ${p95.toFixed(2)} m`);

// Conta quantos eventos > P85
const eventos = var7d.filter((x) => x.var_m > p85);
console.log(`Eventos > P85: ${eventos.length}`);

// Para cada evento, mede dias até o próximo pico local de Manaus
// (pico = ponto onde Manaus cresce e depois decresce, em janela de 60d)
function encontraPicoLocalManaus(dataEvento, janela = 90) {
  const idxInicio = datasComum.indexOf(dataEvento);
  if (idxInicio < 0) return null;
  let maxV = -Infinity, maxIdx = -1;
  for (let i = idxInicio; i < Math.min(datasComum.length, idxInicio + janela); i++) {
    const v = manausCSV.get(datasComum[i]);
    if (v != null && v > maxV) { maxV = v; maxIdx = i; }
  }
  if (maxIdx < 0) return null;
  return { dias: maxIdx - idxInicio, cota: maxV };
}

const lags = [];
for (const e of eventos) {
  const r = encontraPicoLocalManaus(e.data, 90);
  if (r) lags.push(r.dias);
}
lags.sort((a, b) => a - b);
const meanLag = lags.reduce((a, b) => a + b, 0) / lags.length;
const medianLag = lags[Math.floor(lags.length / 2)];
const p10Lag = lags[Math.floor(lags.length * 0.10)];
const p90Lag = lags[Math.floor(lags.length * 0.90)];

console.log(`\nDistribuição empírica de lag para próximo pico em Manaus (90d janela):`);
console.log(`  Mediana:    ${medianLag} dias`);
console.log(`  Média:      ${meanLag.toFixed(1)} dias`);
console.log(`  P10–P90:    ${p10Lag} – ${p90Lag} dias`);
console.log(`  n eventos:  ${lags.length}`);

// (3) Recomendação final
console.log("\n══════ Sugestão de parâmetros para detector ══════");
console.log(`  LAG_DIAS_CENTRAL = ${melhor.lag}    // correlação cruzada`);
console.log(`  LAG_DIAS_MIN     = ${p10Lag}   // P10 da distribuição empírica`);
console.log(`  LAG_DIAS_MAX     = ${p90Lag}   // P90 da distribuição empírica`);
console.log(`  LIMIAR_VAR_7D_M  = ${p85.toFixed(2)}  // P85 das variações 7d positivas`);
