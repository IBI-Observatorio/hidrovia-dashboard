// Calibra a curva CMR (Calado Máximo Recomendado) com correção dos vícios
// apontados pela auditoria estatística:
//
//   1. Regressão isotônica (Pool Adjacent Violators) para eliminar as 15
//      inversões locais da curva oficial (CMR não pode cair se ITA sobe).
//   2. Slope robusto (Theil-Sen) nos últimos 10 pontos para a extrapolação
//      acima de ITA = 7,9m. Com IC80 bootstrap (n=1000).
//   3. Quantis empíricos por bin (P10/P50/P90) para banda de incerteza.
//   4. Seed PRNG fixa (42) — auditoria reprodutível.
//
// Fonte: data/cmr_itacoatiara.csv (187 obs Capitania, set/2024-dez/2025)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Git SHA do HEAD (auditor pediu — reprodutibilidade de cadeia)
let GIT_SHA = "unknown";
let GIT_DIRTY = false;
try {
  GIT_SHA = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  const status = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf-8" }).trim();
  GIT_DIRTY = status.length > 0;
} catch { /* fora de git ou git ausente */ }
const GIT_SHA_SHORT = GIT_SHA.slice(0, 7);

// ─── PRNG determinístico (Mulberry32) ─────────────────────────────────────
const SEED = 42;
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(SEED);

// ─── Leitura dos dados ────────────────────────────────────────────────────
const CSV_PATH = join(ROOT, "data", "cmr_itacoatiara.csv");
const linhas = readFileSync(CSV_PATH, "utf-8").trim().split("\n");
// cabeçalho: data,mao_m,ita_m,cmr_m
const obs = [];
for (let i = 1; i < linhas.length; i++) {
  const [_data, _mao, ita, cmr] = linhas[i].split(",");
  const itaN = parseFloat(ita);
  const cmrN = parseFloat(cmr);
  if (!isFinite(itaN) || !isFinite(cmrN)) continue;
  obs.push({ ita: itaN, cmr: cmrN });
}
obs.sort((a, b) => a.ita - b.ita);
console.log(`CMR-curva: ${obs.length} observações lidas`);

// ─── Binning ──────────────────────────────────────────────────────────────
// Bins de 0,10m em ITA, agregando por mediana, P10, P90 e n_obs.
const BIN_SIZE = 0.10;
const bins = new Map();
for (const { ita, cmr } of obs) {
  const key = Math.round(ita / BIN_SIZE) * BIN_SIZE;
  const k = +key.toFixed(2);
  if (!bins.has(k)) bins.set(k, []);
  bins.get(k).push(cmr);
}
const quantil = (arr, q) => {
  const s = [...arr].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (i - lo) * (s[hi] - s[lo]);
};

const pontosCrus = [];
for (const [ita, cmrs] of [...bins.entries()].sort((a, b) => a[0] - b[0])) {
  pontosCrus.push({
    ita,
    cmr_p50:  +quantil(cmrs, 0.50).toFixed(3),
    cmr_p10:  +quantil(cmrs, 0.10).toFixed(3),
    cmr_p90:  +quantil(cmrs, 0.90).toFixed(3),
    n_obs:    cmrs.length,
  });
}

// Contagem de inversões na curva crua (para reporte)
let inversoes = 0;
for (let i = 1; i < pontosCrus.length; i++) {
  if (pontosCrus[i].cmr_p50 < pontosCrus[i - 1].cmr_p50) inversoes++;
}
console.log(`Curva crua: ${pontosCrus.length} bins, ${inversoes} inversões`);

// ─── Pool Adjacent Violators (PAV) — Regressão isotônica não-decrescente ──
// Implementação O(n) clássica: faz uma passada pelos pontos, sempre que
// detecta violação, faz pool com vizinho anterior usando média ponderada
// pelo número de observações.
function pav(ys, ws) {
  const n = ys.length;
  const yhat = ys.slice();
  const w = ws.slice();
  // Cada índice mantém um "ponteiro para fim do bloco" e tamanho do bloco
  const blockEnd = Array.from({ length: n }, (_, i) => i);
  const blockSize = ws.slice();

  let i = 0;
  while (i < n - 1) {
    const j = i + 1;
    if (yhat[i] <= yhat[j]) {
      i = j;
      continue;
    }
    // Pool i com j: média ponderada
    const novoY = (yhat[i] * w[i] + yhat[j] * w[j]) / (w[i] + w[j]);
    const novoW = w[i] + w[j];
    yhat[i] = novoY;
    w[i] = novoW;
    blockSize[i] = blockSize[i] + blockSize[j];
    blockEnd[i] = blockEnd[j];
    // Retroceder para checar violação com bloco anterior
    while (i > 0 && yhat[i - 1] > yhat[i]) {
      const k = i - 1;
      const y2 = (yhat[k] * w[k] + yhat[i] * w[i]) / (w[k] + w[i]);
      const w2 = w[k] + w[i];
      yhat[k] = y2;
      w[k] = w2;
      blockSize[k] = blockSize[k] + blockSize[i];
      blockEnd[k] = blockEnd[i];
      i = k;
    }
    // Avançar pulando o "buraco" — mas como mantemos os índices originais
    // dos blocos, basta saltar para blockEnd[i] + 1
    const proximo = blockEnd[i] + 1;
    // Reaplicar yhat aos índices internos do bloco i
    for (let kk = i + 1; kk <= blockEnd[i]; kk++) yhat[kk] = yhat[i];
    i = proximo;
    if (i >= n) break;
  }
  // Último passe: propagar valores de bloco para todos os índices
  // (caso o último bloco tenha sido criado mas não propagado)
  let cur = 0;
  while (cur < n) {
    const fim = blockEnd[cur];
    for (let kk = cur + 1; kk <= fim; kk++) yhat[kk] = yhat[cur];
    cur = fim + 1;
  }
  return yhat;
}

const ys = pontosCrus.map((p) => p.cmr_p50);
const ws = pontosCrus.map((p) => p.n_obs);
const ysIso = pav(ys, ws);

// Validação: confirmar monotonia
let violacoesPos = 0;
for (let i = 1; i < ysIso.length; i++) {
  if (ysIso[i] < ysIso[i - 1] - 1e-9) violacoesPos++;
}
console.log(`Curva isotônica: ${violacoesPos} violações remanescentes (deve ser 0)`);

const pontosIso = pontosCrus.map((p, i) => ({
  ita:        p.ita,
  cmr_p50:    +ysIso[i].toFixed(3),
  cmr_p10:    p.cmr_p10,  // preservados (banda)
  cmr_p90:    p.cmr_p90,
  n_obs:      p.n_obs,
}));

// ─── Slope robusto (Theil-Sen) nos últimos N pontos ───────────────────────
function theilSen(pts) {
  const slopes = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[j][0] - pts[i][0];
      if (Math.abs(dx) < 1e-9) continue;
      slopes.push((pts[j][1] - pts[i][1]) / dx);
    }
  }
  slopes.sort((a, b) => a - b);
  return slopes[Math.floor(slopes.length / 2)];
}

const N_TOPO = 10;
const topo = pontosIso.slice(-N_TOPO).map((p) => [p.ita, p.cmr_p50]);
const slopeMediano = theilSen(topo);
console.log(`Slope Theil-Sen (últimos ${N_TOPO} pontos): ${slopeMediano.toFixed(4)} m/m`);

// Bootstrap do slope (n=1000, com reposição sobre os pares de pontos)
const N_BOOT = 1000;
const slopesBoot = [];
for (let b = 0; b < N_BOOT; b++) {
  const amostra = [];
  for (let k = 0; k < topo.length; k++) {
    amostra.push(topo[Math.floor(rng() * topo.length)]);
  }
  // remove duplicatas suficientemente (Theil-Sen ignora dx=0)
  const s = theilSen(amostra);
  if (isFinite(s)) slopesBoot.push(s);
}
slopesBoot.sort((a, b) => a - b);
const slope_p10 = slopesBoot[Math.floor(slopesBoot.length * 0.10)];
const slope_p90 = slopesBoot[Math.floor(slopesBoot.length * 0.90)];
console.log(`Slope IC80 bootstrap: [${slope_p10.toFixed(4)}, ${slope_p90.toFixed(4)}]`);

// ─── Saída ────────────────────────────────────────────────────────────────
const cmrMin = Math.min(...pontosIso.map((p) => p.cmr_p50));
const cmrMax = Math.max(...pontosIso.map((p) => p.cmr_p50));
const itaMin = pontosIso[0].ita;
const itaMax = pontosIso[pontosIso.length - 1].ita;

const pontosTs = pontosIso
  .map((p) => `  [${p.ita.toFixed(2).padStart(5)}, ${p.cmr_p50.toFixed(3).padStart(6)}, ${p.cmr_p10.toFixed(3).padStart(6)}, ${p.cmr_p90.toFixed(3).padStart(6)}, ${String(p.n_obs).padStart(3)}],`)
  .join("\n");

const out = `// AUTO-GERADO por scripts/calibra-cmr-curva.mjs em ${new Date().toISOString()}
// SEED: ${SEED} · GIT: ${GIT_SHA_SHORT}${GIT_DIRTY ? " (dirty)" : ""} · reprodutível.
//
// Calibração da curva CMR (Calado Máximo Recomendado) — Capitania dos Portos.
//
// Diferenças vs versão anterior (hardcoded em lib/cmr-itacoatiara.ts):
//   • PAV (Pool Adjacent Violators): elimina ${inversoes} inversões locais
//   • Bandas P10/P90 por bin (auditor pediu reporte de dispersão)
//   • Slope extrapolação via Theil-Sen + IC80 bootstrap (n=${N_BOOT})
//
// Estatísticas:
//   • n_obs original:        ${obs.length}
//   • bins:                  ${pontosIso.length}
//   • inversões PAV-corrigidas: ${inversoes}
//   • slope topo (mediano):  ${slopeMediano.toFixed(4)} m CMR / m ITA
//   • slope IC80:            [${slope_p10.toFixed(4)}, ${slope_p90.toFixed(4)}]

export interface PontoCurvaCMR {
  /** Cota ITA em metros */
  ita:     number;
  /** CMR mediano (isotônico) em metros */
  cmr_p50: number;
  /** CMR P10 da observação (banda inferior) */
  cmr_p10: number;
  /** CMR P90 da observação (banda superior) */
  cmr_p90: number;
  /** Número de observações da Capitania no bin */
  n_obs:   number;
}

/** Curva CMR oficial — isotônica (não-decrescente em ITA). */
export const CURVA_CMR_CALIBRADA: ReadonlyArray<readonly [number, number, number, number, number]> = [
${pontosTs}
];

export const CMR_CURVA_META = {
  // Slope para extrapolar acima de ita_max observado
  slope_topo:        ${slopeMediano.toFixed(4)},
  slope_topo_p10:    ${slope_p10.toFixed(4)},
  slope_topo_p90:    ${slope_p90.toFixed(4)},
  n_topo_pontos:     ${N_TOPO},
  n_bootstrap:       ${N_BOOT},
  seed:              ${SEED},

  // Limites observados
  cmr_min:           ${cmrMin.toFixed(2)},
  cmr_max:           ${cmrMax.toFixed(2)},
  ita_min:           ${itaMin.toFixed(2)},
  ita_max:           ${itaMax.toFixed(2)},

  n_observacoes:     ${obs.length},
  n_bins:            ${pontosIso.length},
  inversoes_corrigidas: ${inversoes},
  fonte:             "Capitania dos Portos da Amazônia Ocidental — publicações diárias",
  periodo:           { inicio: "2024-09-08", fim: "2025-12-15" },
  gerado_em:         "${new Date().toISOString()}",
  git_sha:           "${GIT_SHA}",
  git_dirty:         ${GIT_DIRTY},
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "cmr-itacoatiara-calibrada.ts");
writeFileSync(OUT_PATH, out, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
