// Re-rotula a severidade dos eventos âncora do IRC-Tabocal usando variáveis
// INDEPENDENTES de cota Itacoatiara (que é o input dominante do índice).
//
// CRÍTICA DA AUDITORIA: a severidade original (1-5) era função determinística
// de cota_ITA — mesma variável que entra no componente calado_tabocal.
// Calibrar pesos contra esses rótulos é tautológico. AUC=1,00 e ρ=0,85
// reportados são artefatos do desenho, não evidência de qualidade.
//
// SOLUÇÃO: rotular cada evento por percentil DOY de variáveis NÃO-ITA:
//   • Cota Manaus (parâmetro ANTAQ regulatório, série 2016-2025)
//   • Cota Humaita (afluente Madeira, série 2016-2025)
//   • Cota Curicuriari (afluente Negro alto, série 2016-2025)
//
// Severidade externa = ceil((1 − P_mediano_3estações) * 5)
//   P=0% (mínima histórica do DOY) → sev 5
//   P=20% → sev 4
//   P=40% → sev 3
//   P=60% → sev 2
//   P=80%+ (normal/cheia) → sev 1
//
// Para eventos pré-2016 (sem dado nessas 3 estações): flag severidade_externa=null,
// caem em conjunto auxiliar (não usados no treino, opcional para teste).

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

// ─── Lê séries diárias ────────────────────────────────────────────────────
function leSerie(path, idxCol = 1) {
  const linhas = readFileSync(join(ROOT, path), "utf-8")
    .trim().replace(/^﻿/, "").split("\n");
  const cab = linhas[0].split(",");
  const colIdx = typeof idxCol === "string" ? cab.indexOf(idxCol) : idxCol;
  const m = new Map();
  for (let i = 1; i < linhas.length; i++) {
    const partes = linhas[i].split(",");
    const data = partes[0];
    const v = parseFloat(partes[colIdx]);
    if (!data || !isFinite(v)) continue;
    m.set(data, v);
  }
  return m;
}

const seriesMAO = leSerie("data/4estacoes_2016_2025.csv", "MAO");
const seriesHUM = leSerie("data/humaita_hidroweb.csv", "cota_m");
const seriesCUR = leSerie("data/curicuriari_hidroweb.csv", "cota_m");

console.log(`Séries lidas: MAO=${seriesMAO.size}, HUM=${seriesHUM.size}, CUR=${seriesCUR.size}`);

// ─── Calcula percentil DOY ────────────────────────────────────────────────
// Para uma data ISO, retorna o percentil [0,1] da cota observada vs. todas
// as observações histórias para o MESMO dia-do-ano (DOY ± 5 dias para suavizar).
function dayOfYear(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
}

function percentilDOY(serie, dataAlvo, janelaDOY = 7) {
  const cotaObs = serie.get(dataAlvo);
  if (cotaObs == null) return null;
  const doyAlvo = dayOfYear(dataAlvo);
  // Coleta observações de outros anos no mesmo DOY ± janela
  const amostras = [];
  for (const [data, cota] of serie) {
    if (data === dataAlvo) continue;
    const doy = dayOfYear(data);
    const dist = Math.min(
      Math.abs(doy - doyAlvo),
      Math.abs(doy - doyAlvo + 366),
      Math.abs(doy - doyAlvo - 366),
    );
    if (dist <= janelaDOY) amostras.push(cota);
  }
  if (amostras.length < 10) return null;
  amostras.sort((a, b) => a - b);
  // Percentil empírico da cota observada
  let i = 0;
  while (i < amostras.length && amostras[i] < cotaObs) i++;
  return amostras.length > 0 ? i / amostras.length : null;
}

// ─── Eventos a re-rotular ─────────────────────────────────────────────────
// Lê via execução TS — mais simples extrair manualmente para reutilizar lista
const EVENTOS = [
  // (rótulo curto, data, severidade_observada_original)
  ["mínima 2024 (31/out)",        "2024-10-31", 5],
  ["pré-mínima 2024 (13/out)",    "2024-10-13", 5],
  ["2010 vazante final (est.)",    "2010-11-15", 5],
  ["set/2024 vazante intensa",     "2024-09-25", 4],
  ["nov/2015 El Niño",             "2015-11-01", 4],
  ["out/2023 antessala",           "2023-10-31", 4],
  ["nov/2024 recuperação lenta",   "2024-11-15", 4],
  ["set/2022 vazante moderada",    "2022-09-15", 3],
  ["out/2017 La Niña fraca",       "2017-10-15", 3],
  ["nov/2014 Madeira atípico",     "2014-11-10", 3],
  ["fev/2026 Negro colapsado",     "2026-02-15", 3],
  ["ago/2024 vazante normal",      "2024-08-15", 2],
  ["mai/2026 Onda Branco",         "2026-05-19", 2],
  ["abr/2024 pré-mega-seca",       "2024-04-15", 2],
  ["jul/2023 vazante começo",      "2023-07-15", 2],
  ["dez/2024 recuperação",         "2024-12-15", 2],
  ["abr/2025 cheia saudável",      "2025-04-15", 1],
  ["jun/2021 pico recorde",        "2021-06-16", 1],
  ["mai/2020 La Niña fraca",       "2020-05-15", 1],
  ["jun/2019 pico médio",          "2019-06-22", 1],
  ["jul/2016 vazante padrão",      "2016-07-15", 1],
];

// ─── Calcula severidade externa ───────────────────────────────────────────
const resultados = [];

for (const [rotulo, data, sevObs] of EVENTOS) {
  const pMao = percentilDOY(seriesMAO, data);
  const pHum = percentilDOY(seriesHUM, data);
  const pCur = percentilDOY(seriesCUR, data);

  const ps = [pMao, pHum, pCur].filter((p) => p != null);
  let sevExt = null, pMediano = null, cobertura = ps.length;

  if (ps.length >= 2) {
    ps.sort((a, b) => a - b);
    pMediano = ps[Math.floor(ps.length / 2)];
    // Inverte: P baixo (cota baixa) = severidade alta
    sevExt = Math.min(5, Math.max(1, Math.ceil((1 - pMediano) * 5)));
  }

  resultados.push({
    rotulo,
    data,
    severidade_observada: sevObs,
    severidade_externa:   sevExt,
    p_mao:                pMao != null ? +pMao.toFixed(3) : null,
    p_hum:                pHum != null ? +pHum.toFixed(3) : null,
    p_cur:                pCur != null ? +pCur.toFixed(3) : null,
    p_mediano:            pMediano != null ? +pMediano.toFixed(3) : null,
    cobertura,
    delta_sev:            sevExt != null ? sevExt - sevObs : null,
  });
}

// ─── Reporta ──────────────────────────────────────────────────────────────
console.log("\n════════════════════════════════════════════════════════════════════════════════════════");
console.log("Re-rotulagem por variáveis NÃO-ITA (P_DOY de Manaus + Humaita + Curicuriari)");
console.log("════════════════════════════════════════════════════════════════════════════════════════");
console.log("data        |sev_obs|sev_ext|Δ |P_MAO|P_HUM|P_CUR|P_med| rótulo");
console.log("────────────┼───────┼───────┼──┼─────┼─────┼─────┼─────┼─────────");
for (const r of resultados) {
  const delta = r.delta_sev != null ? (r.delta_sev >= 0 ? `+${r.delta_sev}` : `${r.delta_sev}`) : "  ";
  console.log(
    `${r.data}  |   ${r.severidade_observada}   |   ${r.severidade_externa ?? "?"}   |${delta.padEnd(2)}|${(r.p_mao ?? "n/d").toString().padStart(5)}|${(r.p_hum ?? "n/d").toString().padStart(5)}|${(r.p_cur ?? "n/d").toString().padStart(5)}|${(r.p_mediano ?? "n/d").toString().padStart(5)}| ${r.rotulo}`
  );
}

// Estatísticas
const cobertos = resultados.filter((r) => r.severidade_externa != null);
const concordancias = cobertos.filter((r) => r.delta_sev === 0).length;
const dentro1 = cobertos.filter((r) => Math.abs(r.delta_sev) <= 1).length;
const ks = cobertos.map((r) => r.severidade_observada);
const ke = cobertos.map((r) => r.severidade_externa);

// Spearman manual
function rank(arr) {
  const sorted = [...arr].map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(arr.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1][0] === sorted[i][0]) j++;
    const meanRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[sorted[k][1]] = meanRank;
    i = j + 1;
  }
  return r;
}
function spearman(a, b) {
  const ra = rank(a), rb = rank(b);
  const n = a.length;
  const ma = ra.reduce((s, v) => s + v, 0) / n;
  const mb = rb.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da  += (ra[i] - ma) ** 2;
    db  += (rb[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

const rhoConcord = spearman(ks, ke);

console.log("\n════════════════════════════════════════════════════════════════");
console.log(`Cobertura:               ${cobertos.length} / ${resultados.length} eventos`);
console.log(`Concordância exata:      ${concordancias} / ${cobertos.length} (${(concordancias/cobertos.length*100).toFixed(0)}%)`);
console.log(`Concordância ±1:         ${dentro1} / ${cobertos.length} (${(dentro1/cobertos.length*100).toFixed(0)}%)`);
console.log(`Spearman ρ(obs, ext):    ${rhoConcord.toFixed(3)}`);
console.log(`Distribuição sev_ext:    ${[1,2,3,4,5].map((s) => `${s}=${cobertos.filter((r) => r.severidade_externa === s).length}`).join(", ")}`);
console.log("════════════════════════════════════════════════════════════════");

// ─── Saída TS ─────────────────────────────────────────────────────────────
const tsOut = `// AUTO-GERADO por scripts/rotula-eventos-tabocal-externo.mjs em ${new Date().toISOString()}
// GIT: ${GIT_SHA.slice(0, 7)}${GIT_DIRTY ? " (dirty)" : ""}
//
// Severidade EXTERNA dos eventos âncora, derivada de percentil DOY de cotas
// Manaus + Humaita + Curicuriari — INDEPENDENTES de cota Itacoatiara que entra
// no componente calado_tabocal do IRC.
//
// Concordância exata com rotulagem subjetiva original: ${(concordancias/cobertos.length*100).toFixed(0)}%
// Concordância ±1 nível:                              ${(dentro1/cobertos.length*100).toFixed(0)}%
// Spearman ρ(obs, ext):                                ${rhoConcord.toFixed(3)}

export interface SeveridadeExternaEvento {
  /** Data ISO do evento */
  data: string;
  /** Severidade original (subjetiva, baseada em cota ITA) */
  severidade_observada: number;
  /** Severidade externa (derivada de P_DOY de MAO+HUM+CUR) */
  severidade_externa: number | null;
  /** Percentis DOY individuais */
  p_mao: number | null;
  p_hum: number | null;
  p_cur: number | null;
  /** Percentil mediano (referência) */
  p_mediano: number | null;
  /** Quantas estações cobertas (max 3) */
  cobertura: number;
}

export const SEVERIDADE_EXTERNA: SeveridadeExternaEvento[] = ${JSON.stringify(
  resultados.map((r) => ({
    data: r.data,
    severidade_observada: r.severidade_observada,
    severidade_externa: r.severidade_externa,
    p_mao: r.p_mao,
    p_hum: r.p_hum,
    p_cur: r.p_cur,
    p_mediano: r.p_mediano,
    cobertura: r.cobertura,
  })),
  null,
  2,
)};

export const SEVERIDADE_EXTERNA_META = {
  metodologia:           "Percentil DOY (janela ±7d) de cota Manaus + Humaita + Curicuriari → mediana → escala 1-5 invertida",
  n_eventos:             ${resultados.length},
  n_cobertos:            ${cobertos.length},
  concordancia_exata:    ${concordancias},
  concordancia_dentro_1: ${dentro1},
  spearman_obs_vs_ext:   ${rhoConcord.toFixed(4)},
  gerado_em:             "${new Date().toISOString()}",
  git_sha:               "${GIT_SHA}",
  git_dirty:             ${GIT_DIRTY},
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "eventos-tabocal-severidade-externa.ts");
writeFileSync(OUT_PATH, tsOut, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
