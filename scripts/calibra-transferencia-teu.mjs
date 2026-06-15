// ---------------------------------------------------------------------------
// Calibração da função de transferência  cota mínima do Negro → cabotagem
// conteinerizada (TEU)  para a Amazônia (UF=AM, proxy de Manaus).
//
// Cruza, ano a ano, DADO REAL dos dois lados:
//   • Cota mínima anual de Manaus (estação MAO) — data/4estacoes_2016_2025.csv
//   • TEU de cabotagem conteinerizada do AM — ANTAQ (antaq-api), anual + out/nov
//
// Princípio metodológico (sênior, sem overfit em n≈8):
//   1. O efeito-seca e a tendência de demanda se confundem. Separamos:
//      - TENDÊNCIA: CAGR log-linear 2018→2025 (baseline "sem seca").
//      - EFEITO-SECA: resíduo (real/tendência − 1) vs cota mínima.
//   2. A janela out+nov é o sinal de seca mais limpo (timing). Normalizamos
//      out+nov pela média mensal do PRÓPRIO ano (remove nível e tendência).
//   3. Regimes empíricos, não regressão pontual: há um VÃO de dados entre
//      ~13 m e ~16 m. Em vez de fingir precisão, interpolamos linearmente e
//      marcamos a incerteza.
//   4. 2026 é projetado pelas mínimas do modelo de recessão calibrado
//      (otimista/central/pessimista) + cauda "repete 2023".
//
//   node scripts/calibra-transferencia-teu.mjs
//     -> data/calibracao-transferencia-teu.json  (consumido pelo relatório)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = (p) => join(ROOT, p);
const BASE = process.env.ANTAQ_API_URL ?? "https://antaq-api-production.up.railway.app";

// --- 1. Cota mínima real de Manaus por ano (CSV do projeto) ----------------
function minimasReais() {
  const linhas = readFileSync(r("data/4estacoes_2016_2025.csv"), "utf8").trim().split(/\r?\n/);
  linhas.shift(); // header: ,MAO,ITA,BOR,MNC
  const porAno = {};
  for (const l of linhas) {
    const [data, mao] = l.split(",");
    const v = parseFloat(mao);
    if (!data || Number.isNaN(v)) continue;
    const ano = data.slice(0, 4);
    if (!porAno[ano] || v < porAno[ano].min) porAno[ano] = { min: v, data };
  }
  return porAno; // {2016:{min,data},...,2024:{...}}  (2025 truncado em jul → tratado à parte)
}

// --- 2. ANTAQ: cabotagem conteinerizada AM (anual + mensal) ----------------
async function api(params) {
  const qs = new URLSearchParams(params);
  for (let t = 1; t <= 6; t++) {
    try {
      const res = await fetch(`${BASE}/api/v1/series?${qs}`, { signal: AbortSignal.timeout(40000) });
      if (res.ok) return res.json();
      if (res.status >= 500) { await new Promise((s) => setTimeout(s, 1500 * t)); continue; }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) { if (t === 6) throw e; await new Promise((s) => setTimeout(s, 1500 * t)); }
  }
}
async function carregaAntaq() {
  const F = { natureza: "Carga Conteinerizada", navegacao: "Cabotagem", uf: "AM", apenas_movimentacao: "true" };
  const ja = await api({ ...F, metrica: "teu", freq: "anual", data_inicio: "2018-01", data_fim: "2026-12" });
  const jm = await api({ ...F, metrica: "teu", freq: "mensal", suavizacao: "bruto", data_inicio: "2019-01", data_fim: "2026-04" });
  const anual = {};
  for (const x of ja.serie || []) if (x.valor != null) anual[x.data] = x.valor;
  const mensal = (jm.serie || []).filter((x) => x.valor != null);
  const outnov = {}, totalMensalAno = {}, nMes = {};
  for (const x of mensal) {
    const a = x.data.slice(0, 4), m = x.data.slice(5, 7);
    totalMensalAno[a] = (totalMensalAno[a] || 0) + x.valor; nMes[a] = (nMes[a] || 0) + 1;
    if (m === "10" || m === "11") outnov[a] = (outnov[a] || 0) + x.valor;
  }
  return { anual, outnov, totalMensalAno, nMes, ultimo_mes: mensal.at(-1)?.data, fonte: "ANTAQ Estatística Aquaviária (antaq-api) · UF=AM · cabotagem · conteinerizada · TEU" };
}

// --- 3. Calibração ---------------------------------------------------------
function regressaoCAGR(anual) {
  // log-linear: ln(TEU) = a + b*(ano-2018). CAGR = e^b - 1.
  const pts = Object.entries(anual).filter(([a]) => +a >= 2018 && +a <= 2025).map(([a, v]) => [+a - 2018, Math.log(v)]);
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  return { a, b, cagr: Math.exp(b) - 1, trend: (ano) => Math.exp(a + b * (ano - 2018)) };
}

const round = (x) => Math.round(x);
const pct = (x) => (x * 100);

async function main() {
  const minimas = minimasReais();
  const antaq = await carregaAntaq();
  // 2025: CSV trunca em jul; mínima real ocorre out/nov. out+nov 2025 ≈ normal
  // (ver tabela) → regime normal. Usamos 18,0 m (boletins SGB/relato) como
  // referência, marcado como aproximado; NÃO entra na regressão de seca.
  const MIN_2025_APROX = 18.0;

  const reg = regressaoCAGR(antaq.anual);

  // Tabela pareada
  const tabela = [];
  for (const ano of Object.keys(antaq.anual).filter((a) => +a >= 2018 && +a <= 2025)) {
    const teu = antaq.anual[ano];
    const min = minimas[ano] ? minimas[ano].min : (ano === "2025" ? MIN_2025_APROX : null);
    const trend = reg.trend(+ano);
    const residuo = teu / trend - 1;                 // efeito-seca (anual, vs tendência)
    const on = antaq.outnov[ano] ?? null;
    const medMes = antaq.totalMensalAno[ano] ? antaq.totalMensalAno[ano] / antaq.nMes[ano] : null;
    const onRatio = on != null && medMes ? on / 2 / medMes - 1 : null; // out+nov vs média do ano
    tabela.push({ ano: +ano, min, min_aprox: ano === "2025", teu: round(teu), trend: round(trend), residuo, outnov: on != null ? round(on) : null, onRatio });
  }

  // Bandas empíricas. NORMAL = min≥16m (rio não-restritivo); SEVERO = min≤13m.
  const normais = tabela.filter((t) => t.min != null && t.min >= 16);
  const severos = tabela.filter((t) => t.min != null && t.min <= 13);
  const resNormalMed = normais.reduce((s, t) => s + t.residuo, 0) / normais.length;
  const resNormalSd = Math.sqrt(normais.reduce((s, t) => s + (t.residuo - resNormalMed) ** 2, 0) / normais.length);
  const onNormais = normais.filter((t) => t.onRatio != null);
  const onNormalMed = onNormais.reduce((s, t) => s + t.onRatio, 0) / onNormais.length;
  // Nível normal absoluto de out+nov (anos cheios sem seca: 2021, 2025)
  const onNivelNormal = [antaq.outnov["2021"], antaq.outnov["2025"]].filter(Boolean).reduce((a, b, _, x) => a + b / x.length, 0);

  // PENALIDADE DE SECA medida RELATIVA AO REGIME NORMAL (não vs. tendência, que
  // é deprimida pelos próprios anos de seca → evita confundir reversão à média
  // com efeito-seca). penalidade_ano = resíduo_ano − resíduo_médio_normal.
  const pen = (t) => t.residuo - resNormalMed;          // anual
  const penOn = (t) => t.onRatio - onNormalMed;          // out+nov
  const a2023 = tabela.find((t) => t.ano === 2023), a2024 = tabela.find((t) => t.ano === 2024);
  // Âncora "severa média" (2023+2024): captura que a adaptação/front-loading
  // suaviza o golpe anual (2024 teve a menor mínima da série e quase não perdeu).
  const ancSevMin = (a2023.min + a2024.min) / 2;
  const ancSev = { min: ancSevMin, pen: (pen(a2023) + pen(a2024)) / 2, penOn: (penOn(a2023) + penOn(a2024)) / 2 };
  const ancNorm = { min: 16.0, pen: 0, penOn: 0 };
  const interp = (min, k) => {
    if (min >= ancNorm.min) return ancNorm[k];
    if (min <= ancSev.min) return ancSev[k];
    const f = (ancNorm.min - min) / (ancNorm.min - ancSev.min);
    return ancNorm[k] + f * (ancSev[k] - ancNorm[k]);
  };

  // --- 4. Projeção 2026 -----------------------------------------------------
  // BASE = 2025 realizado (544.871). Justificativa: 2025 NÃO é spike — vs. 2021
  // (494k, último ano sem seca) é só +2,5%/ano. É nível estrutural de demanda.
  // g = crescimento de demanda 2026 (fora do modelo de rio); default 0 = "demanda
  // segura o nível de 2025". Sensibilidade reportada à parte.
  const base2025 = antaq.anual["2025"];
  const G_DEMANDA = 0.0;
  const base2026 = base2025 * (1 + G_DEMANDA);
  const trend2026 = reg.trend(2026);

  const cenarios = [
    { nome: "Otimista", desc: "cheia segura o ano / El Niño fraco", min: 19.60, prob: 0.25 },
    { nome: "Central", desc: "El Niño moderado; rio em regime normal (≥16 m)", min: 17.12, prob: 0.50 },
    { nome: "Pessimista", desc: "El Niño forte — banda IC80 baixa do modelo", min: 14.68, prob: 0.25 },
    { nome: "Cauda — repete 2023", desc: "seca extrema, além do IC80", min: 12.70, prob: null, usa2023: true },
  ].map((c) => {
    // tail "repete 2023" usa o PONTO de 2023 (sem suavização de adaptação)
    const penA = c.usa2023 ? pen(a2023) : interp(c.min, "pen");
    const penO = c.usa2023 ? penOn(a2023) : interp(c.min, "penOn");
    const teu = base2026 * (1 + penA);
    const lo = base2026 * (1 + penA - resNormalSd);
    const hi = base2026 * (1 + penA + resNormalSd);
    const onAbs = onNivelNormal * (1 + penO);
    return {
      ...c, penalidade_anual: penA, teu_central: round(teu), teu_lo: round(lo), teu_hi: round(hi),
      delta_pct_2025: teu / base2025 - 1, delta_lo: lo / base2025 - 1, delta_hi: hi / base2025 - 1,
      outnov_penalidade: penO, outnov_abs: round(onAbs),
    };
  });
  const comProb = cenarios.filter((c) => c.prob != null);
  const evDelta = comProb.reduce((s, c) => s + c.prob * c.delta_pct_2025, 0);
  const evTeu = comProb.reduce((s, c) => s + c.prob * c.teu_central, 0);

  const out = {
    gerado_em_nota: "rode scripts/calibra-transferencia-teu.mjs para regenerar",
    fonte_cota: "ANA/HidroWeb — Manaus (MAO), mínimas anuais reais de data/4estacoes_2016_2025.csv (2016–2024); 2025≈18,0 m (aprox., CSV trunca em jul)",
    fonte_teu: antaq.fonte, ultimo_mes_antaq: antaq.ultimo_mes,
    base_2025_teu: round(base2025),
    base_2026_demanda: round(base2026), g_demanda_2026: G_DEMANDA,
    nota_base: "2025 (544.871) é nível estrutural (vs 2021 = +2,5%/ano), não spike → base 2026 = 2025 × (1+g), g=0.",
    tendencia: { cagr: reg.cagr, trend_2026: round(trend2026), nota: "CAGR log-linear 2018→2025 — DEPRIMIDO pelas secas 2023/24; usado só como referência, NÃO como base." },
    regime_normal: { criterio_min_m: ">=16", n: normais.length, residuo_medio: resNormalMed, residuo_sd: resNormalSd, outnov_ratio_medio: onNormalMed, outnov_nivel_normal: round(onNivelNormal) },
    regime_severo: { criterio_min_m: "<=13", n: severos.length, anos: severos.map(s => s.ano), penalidade_anual_anc: ancSev.pen, min_anc: ancSevMin },
    vao_sem_dados_m: "13–16 (interpolado entre normal e severo; alta incerteza)",
    sensibilidade_reversao: { nota: "Se 2025 for spike e a demanda reverter à tendência deprimida (487k), subtraia ~10–12pp de todos os Δ%.", base_alt: round(trend2026), delta_alt_central: trend2026 / base2025 - 1 },
    tabela_pareada: tabela,
    cenarios_2026: cenarios,
    esperanca_ponderada: { delta_pct_2025: evDelta, teu: round(evTeu) },
  };
  writeFileSync(r("data/calibracao-transferencia-teu.json"), JSON.stringify(out, null, 2), "utf8");

  // --- 5. Relatório no console --------------------------------------------
  console.log("\n=== TABELA PAREADA (real × real) ===");
  console.log("ano | min(m) | TEU real | tendência | resíduo% | out+nov | out+nov vs méd-ano%");
  for (const t of tabela) console.log(
    `${t.ano}${t.min_aprox ? "*" : " "}| ${t.min != null ? t.min.toFixed(2) : "  ?  "} | ${t.teu.toLocaleString("pt-BR").padStart(8)} | ${t.trend.toLocaleString("pt-BR").padStart(8)} | ${pct(t.residuo).toFixed(1).padStart(6)} | ${t.outnov ? t.outnov.toLocaleString("pt-BR").padStart(7) : "   -   "} | ${t.onRatio != null ? pct(t.onRatio).toFixed(0).padStart(5) : "  -"}`);
  console.log(`\nBASE 2026 = 2025 realizado ${round(base2025).toLocaleString("pt-BR")} (g=${G_DEMANDA}) | tendência deprimida (referência): ${round(trend2026).toLocaleString("pt-BR")} | CAGR ${pct(reg.cagr).toFixed(1)}%/ano`);
  console.log(`Regime NORMAL (min≥16m, n=${normais.length}): resíduo ${pct(resNormalMed).toFixed(1)}% ±${pct(resNormalSd).toFixed(1)}pp | out+nov ${pct(onNormalMed).toFixed(0)}% vs média-ano | nível out+nov ~${round(onNivelNormal).toLocaleString("pt-BR")}`);
  console.log(`Penalidade-seca (rel. ao normal): 2023 ${pct(pen(a2023)).toFixed(0)}% / 2024 ${pct(pen(a2024)).toFixed(0)}% (adaptação!) | âncora severa @${ancSevMin.toFixed(1)}m = ${pct(ancSev.pen).toFixed(0)}% | VÃO 13–16m interpolado`);
  console.log("\n=== CENÁRIOS 2026 (mín. do modelo de recessão) ===");
  console.log("cenário | min | Δ% vs 2025 (banda) | TEU central | out+nov(mil)");
  for (const c of cenarios) console.log(
    `${c.nome.padEnd(20)} | ${c.min.toFixed(2)} | ${pct(c.delta_pct_2025).toFixed(1)}% (${pct(c.delta_lo).toFixed(0)}..${pct(c.delta_hi).toFixed(0)}) | ${c.teu_central.toLocaleString("pt-BR")} | ${c.outnov_abs != null ? round(c.outnov_abs / 1000) : "?"}`);
  console.log(`\nESPERANÇA PONDERADA (25/50/25): Δ ${pct(evDelta).toFixed(1)}% vs 2025  →  ~${round(evTeu).toLocaleString("pt-BR")} TEU`);
  console.log("\nOK -> data/calibracao-transferencia-teu.json");
}
main().catch((e) => { console.error(e); process.exit(1); });
