// Validação out-of-sample do modelo de recessão de Itacoatiara via Leave-One-Out
// por ano (LOO). Auditoria estatística pediu RMSE em dias + RMSE em metros por
// horizonte. Esta era a maior lacuna da v3.3.
//
// Procedimento:
//   Para cada ano y ∈ {2016..2025}:
//     1. Calibra (k, h_min) usando os OUTROS 9 anos (média + std)
//     2. Aplica o modelo ao pico real do ano y
//     3. Mede erro nos horizontes t = 30, 60, 90, 120, 150, 180 dias
//     4. Calcula data em que o modelo previu cota=6,30m vs data real
//
// Saída: data/recessao-validacao-loo.json com tabela completa.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const linhas = readFileSync(join(ROOT, "data", "itacoatiara_hidroweb.csv"), "utf-8").trim().split("\n");
const cotas = new Map();
for (let i = 1; i < linhas.length; i++) {
  const [data, cota] = linhas[i].split(",");
  const v = parseFloat(cota);
  if (data && isFinite(v)) cotas.set(data, v);
}

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

function ajustaExp(picoData, picoCota, horizonte = 215) {
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
  const meanT = ts.reduce((a,b) => a+b, 0) / n;
  const meanY = ys.reduce((a,b) => a+b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (ts[i] - meanT) * (ys[i] - meanY);
    den += (ts[i] - meanT) ** 2;
  }
  const k = -num / den;
  return { k: +k.toFixed(6), h_min: +h_min.toFixed(3), serie };
}

const ANOS = [2016,2017,2018,2019,2020,2021,2022,2023,2024,2025];
const ajustes = {};
for (const ano of ANOS) {
  const pico = encontraPico(ano);
  if (!pico) continue;
  const aj = ajustaExp(pico.data, pico.cota_m);
  if (!aj) continue;
  ajustes[ano] = { pico, k: aj.k, h_min: aj.h_min, serie: aj.serie };
}

const HORIZONTES = [30, 60, 90, 120, 150, 180];
const COTA_ALVO = 6.30;

const resultados = [];
const erros_por_horizonte = Object.fromEntries(HORIZONTES.map((h) => [h, []]));
const erros_eta_dias = [];

for (const yTest of ANOS) {
  if (!ajustes[yTest]) continue;
  const treino = ANOS.filter((y) => y !== yTest && ajustes[y]);
  const ks_tr = treino.map((y) => ajustes[y].k);
  const hmins_tr = treino.map((y) => ajustes[y].h_min);
  const k_tr  = ks_tr.reduce((a,b) => a+b, 0) / ks_tr.length;
  const hm_tr = hmins_tr.reduce((a,b) => a+b, 0) / hmins_tr.length;

  const pico = ajustes[yTest].pico;
  const serie_real = new Map(ajustes[yTest].serie.map((s) => [s.t, s.h]));

  // Erros nos horizontes
  const erros_y = {};
  for (const h of HORIZONTES) {
    const real = serie_real.get(h);
    if (real == null) continue;
    const previsto = hm_tr + (pico.cota_m - hm_tr) * Math.exp(-k_tr * h);
    const erro = previsto - real;
    erros_y[`t${h}`] = +erro.toFixed(2);
    erros_por_horizonte[h].push(erro);
  }

  // ETA do alvo 6.30m: primeira data em que modelo prevê cota < alvo
  let eta_modelo_t = null;
  for (let t = 0; t <= 250; t++) {
    const prev = hm_tr + (pico.cota_m - hm_tr) * Math.exp(-k_tr * t);
    if (prev < COTA_ALVO) { eta_modelo_t = t; break; }
  }
  // ETA real: primeira data observada com cota < alvo
  let eta_real_t = null;
  for (let t = 0; t <= 250; t++) {
    const real = serie_real.get(t);
    if (real != null && real < COTA_ALVO) { eta_real_t = t; break; }
  }
  const eta_erro_dias = (eta_modelo_t != null && eta_real_t != null)
    ? eta_modelo_t - eta_real_t
    : null;
  if (eta_erro_dias != null) erros_eta_dias.push(eta_erro_dias);

  resultados.push({
    ano: yTest,
    pico_data: pico.data,
    pico_cota_m: pico.cota_m,
    k_treino: +k_tr.toFixed(6),
    h_min_treino: +hm_tr.toFixed(2),
    erros_horizonte_m: erros_y,
    eta_modelo_dias: eta_modelo_t,
    eta_real_dias: eta_real_t,
    eta_erro_dias,
  });
}

// Estatísticas agregadas
const rmse = (arr) => Math.sqrt(arr.reduce((a, b) => a + b*b, 0) / arr.length);
const mae  = (arr) => arr.reduce((a, b) => a + Math.abs(b), 0) / arr.length;
const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const resumo_horizonte = {};
for (const h of HORIZONTES) {
  const e = erros_por_horizonte[h];
  if (e.length === 0) continue;
  resumo_horizonte[`t${h}`] = {
    rmse_m: +rmse(e).toFixed(2),
    mae_m:  +mae(e).toFixed(2),
    bias_m: +mean(e).toFixed(2),
    n:      e.length,
  };
}

const resumo_eta = erros_eta_dias.length > 0 ? {
  rmse_dias: +rmse(erros_eta_dias).toFixed(1),
  mae_dias:  +mae(erros_eta_dias).toFixed(1),
  bias_dias: +mean(erros_eta_dias).toFixed(1),
  min_dias:  Math.min(...erros_eta_dias),
  max_dias:  Math.max(...erros_eta_dias),
  n:         erros_eta_dias.length,
} : null;

// Print
console.log("══════════════════════════════════════════════════════");
console.log("LOO — Recessão Itacoatiara (Leave-One-Year-Out)");
console.log("══════════════════════════════════════════════════════");
console.log("");
console.log("Erro por horizonte (modelo treinado nos outros 9 anos):");
console.log("  Horiz | RMSE (m) | MAE (m) | Bias (m) | n");
for (const h of HORIZONTES) {
  const r = resumo_horizonte[`t${h}`];
  if (!r) continue;
  console.log(`  t=${String(h).padStart(3)} |   ${r.rmse_m.toFixed(2).padStart(5)}  |  ${r.mae_m.toFixed(2).padStart(4)}  |  ${(r.bias_m >= 0 ? "+" : "") + r.bias_m.toFixed(2).padStart(5)}  | ${r.n}`);
}
console.log("");
console.log(`ETA do alvo ${COTA_ALVO}m (modelo vs observado):`);
if (resumo_eta) {
  console.log(`  RMSE: ${resumo_eta.rmse_dias} dias`);
  console.log(`  MAE:  ${resumo_eta.mae_dias} dias`);
  console.log(`  Bias: ${resumo_eta.bias_dias >= 0 ? "+" : ""}${resumo_eta.bias_dias} dias (modelo ${resumo_eta.bias_dias >= 0 ? "atrasado" : "adiantado"})`);
  console.log(`  Range: [${resumo_eta.min_dias}, ${resumo_eta.max_dias}] dias`);
  console.log(`  n: ${resumo_eta.n}`);
}
console.log("");
console.log("Detalhe por ano:");
console.log("  Ano  | pico   | ETA mod | ETA real | erro");
for (const r of resultados) {
  const erro_str = r.eta_erro_dias != null
    ? `${r.eta_erro_dias >= 0 ? "+" : ""}${r.eta_erro_dias}d`
    : "n/d";
  console.log(`  ${r.ano} | ${r.pico_cota_m.toFixed(2)}m | ${String(r.eta_modelo_dias ?? "-").padStart(5)}d  | ${String(r.eta_real_dias ?? "-").padStart(5)}d   | ${erro_str}`);
}

const out = {
  metodologia: "Leave-One-Year-Out: para cada ano y, calibra modelo nos outros 9 anos, projeta a partir do pico real de y, mede erro contra observação.",
  cota_alvo_m: COTA_ALVO,
  horizontes_dias: HORIZONTES,
  resumo_horizonte,
  resumo_eta,
  resultados,
  gerado_em: new Date().toISOString(),
};

const OUT_PATH = join(ROOT, "data", "recessao-validacao-loo.json");
writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
