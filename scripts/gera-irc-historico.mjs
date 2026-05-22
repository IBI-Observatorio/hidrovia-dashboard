// Gera série histórica do IRC-Tabocal v3.5 aplicando a fórmula RETROATIVAMENTE.
//
// CORREÇÃO DA AUDITORIA (problema #5 do painel de validação):
//   A versão anterior gerava IRC v2.1 (LWS Manaus + HMM, sem cota_ITA) e
//   chamava de "IRC histórico" — mas é índice DIFERENTE do v3.5 produzido pela
//   API. Comparações temporais inválidas.
//
// Esta versão usa fórmula v3.5 com 5 componentes:
//   • calado_tabocal (do CMR oficial da Capitania aplicado a cota_ITA)
//   • hmm_extremo (do IDN)
//   • onda_branco (= 0, indisponível retrospectivamente — documentado)
//   • anomalia_pp (= 0, indisponível retrospectivamente — documentado)
//   • lag_operacional (ortogonalizado, resíduo MAO~ITA)
//
// + Não-compensação (piso dominador)
// + Pesos calibrados v3.5 (hold-out temporal, rotulagem externa)

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

// ─── Carrega séries diárias 4 estações ────────────────────────────────────
const csv = readFileSync(join(ROOT, "data", "4estacoes_2016_2025.csv"), "utf-8").trim().split("\n");
const cab = csv[0].split(",");
const idxMAO = cab.indexOf("MAO");
const idxITA = cab.indexOf("ITA");

const sMAO = new Map(), sITA = new Map();
for (let i = 1; i < csv.length; i++) {
  const p = csv[i].split(",");
  const m = parseFloat(p[idxMAO]);
  const it = parseFloat(p[idxITA]);
  if (p[0] && isFinite(m)) sMAO.set(p[0], m);
  if (p[0] && isFinite(it)) sITA.set(p[0], it);
}

// IDN histórico
const idnTS = readFileSync(join(ROOT, "lib", "idn-historico-calculado.ts"), "utf-8");
function extrai(name) {
  const m = idnTS.match(new RegExp(`${name}[^=]*=\\s*(\\[[\\s\\S]*?\\]);`));
  return m ? JSON.parse(m[1]) : [];
}
const semanal = extrai("IDN_HISTORICO_CALCULADO");
const diario  = extrai("IDN_RECENTE_DIARIO");
const idnMap = new Map();
for (const p of semanal) idnMap.set(p.data, p.idn);
for (const p of diario)  idnMap.set(p.data, p.idn);

// Pesos v3.5
const pesosTS = readFileSync(join(ROOT, "lib", "irc-tabocal-pesos-calibrados-v35.ts"), "utf-8");
const pesos = {
  calado: parseFloat(pesosTS.match(/calado_tabocal:\s*([0-9.]+)/)[1]),
  hmm:    parseFloat(pesosTS.match(/hmm_extremo:\s*([0-9.]+)/)[1]),
  onda:   parseFloat(pesosTS.match(/onda_branco:\s*([0-9.]+)/)[1]),
  pp:     parseFloat(pesosTS.match(/anomalia_pp:\s*([0-9.]+)/)[1]),
  lag:    parseFloat(pesosTS.match(/lag_operacional:\s*([0-9.]+)/)[1]),
};

// Curva CMR
const cmrCurvaTS = readFileSync(join(ROOT, "lib", "cmr-itacoatiara-calibrada.ts"), "utf-8");
const cmrCurvaMatch = cmrCurvaTS.match(/CURVA_CMR_CALIBRADA[\s\S]*?=\s*(\[[\s\S]*?\]);/);
const CURVA = eval(cmrCurvaMatch[1]).map((p) => [p[0], p[1]]);
function cmrDe(c) {
  if (c <= CURVA[0][0]) return 5.63;
  const u = CURVA[CURVA.length - 1];
  if (c >= u[0]) return u[1] + (c - u[0]) * 0.80;
  for (let i = 0; i < CURVA.length - 1; i++)
    if (c >= CURVA[i][0] && c <= CURVA[i + 1][0]) {
      const t = (c - CURVA[i][0]) / (CURVA[i + 1][0] - CURVA[i][0] || 1);
      return CURVA[i][1] + t * (CURVA[i + 1][1] - CURVA[i][1]);
    }
  return 5.63;
}
function compCalado(cota, alvo = 11.0) {
  const def = Math.max(0, alvo - cmrDe(cota));
  if (def >= 5.5) return 100;
  if (def <= 2.5) return def * 20;
  return 50 + (def - 2.5) * (50 / 3);
}

const HMM_MU = [-0.4104, 0.051, 0.4982];
const HMM_SIGMA = [0.1627, 0.1237, 0.178];
const HMM_T7 = [[0.8951, 0.0997, 0.0053], [0.1047, 0.7938, 0.1016], [0.0069, 0.1269, 0.8662]];
function compHMM(idn) {
  const i = Math.max(-0.9, Math.min(0.9, idn));
  const probs = HMM_MU.map((m, k) => Math.exp(-((i - m) ** 2) / (2 * HMM_SIGMA[k] ** 2)) / (HMM_SIGMA[k] * Math.sqrt(2 * Math.PI)));
  const tot = probs.reduce((s, v) => s + v, 0);
  const norm = probs.map((p) => p / tot);
  let mx = 0, idx = 0;
  for (let k = 0; k < 3; k++) if (norm[k] > mx) { mx = norm[k]; idx = k; }
  const pc = HMM_T7[idx][0] + HMM_T7[idx][2];
  return Math.max(0, Math.min(100, 50 + ((pc - 0.67) / 0.3) * 50));
}

const lagCalibTS = readFileSync(join(ROOT, "lib", "lag-ortogonal-calibrado.ts"), "utf-8");
const LAG_A = parseFloat(lagCalibTS.match(/a:\s*(-?[0-9.]+),/)[1]);
const LAG_B = parseFloat(lagCalibTS.match(/b:\s*(-?[0-9.]+),/)[1]);
function compLag(mao, ita) {
  const esp = LAG_A + LAG_B * mao;
  const a = -(ita - esp);
  return Math.max(0, Math.min(100, 30 + (a / 3) * 70));
}

// Faixas calibradas
const faixasTS = readFileSync(join(ROOT, "lib", "irc-faixas-calibradas.ts"), "utf-8");
const F_VA = parseInt(faixasTS.match(/verde_amarelo:\s*([0-9]+)/)[1]);
const F_AL = parseInt(faixasTS.match(/amarelo_laranja:\s*([0-9]+)/)[1]);
const F_LV = parseInt(faixasTS.match(/laranja_vermelho:\s*([0-9]+)/)[1]);

function calculaIRC(cotaMAO, cotaITA, idn) {
  const cC = compCalado(cotaITA);
  const cH = compHMM(idn);
  const cO = 0;     // onda: indisponível retrospectivamente
  const cP = 0;     // pp: indisponível retrospectivamente
  const cL = compLag(cotaMAO, cotaITA);
  const linear = pesos.calado * cC + pesos.hmm * cH + pesos.onda * cO + pesos.pp * cP + pesos.lag * cL;
  const piso = cC >= 80 ? cC * 0.75 : 0;
  return Math.max(0, Math.min(100, Math.max(linear, piso)));
}

function faixa(irc) {
  if (irc < F_VA) return "verde";
  if (irc < F_AL) return "amarelo";
  if (irc < F_LV) return "laranja";
  return "vermelho";
}

// ─── Gera série ───────────────────────────────────────────────────────────
const serie = [];
const datasComum = [...sITA.keys()].filter((d) => sMAO.has(d) && idnMap.has(d)).sort();
console.log(`Dias com cota MAO + ITA + IDN: ${datasComum.length}`);

let acertos2024 = 0;
for (const data of datasComum) {
  const cotaMAO = sMAO.get(data);
  const cotaITA = sITA.get(data);
  const idn = idnMap.get(data);
  const irc = +calculaIRC(cotaMAO, cotaITA, idn).toFixed(1);
  serie.push({
    data, irc, faixa: faixa(irc), idn: +idn.toFixed(3),
    cota_manaus_m: cotaMAO, cota_ita_m: cotaITA,
  });
  if (data >= "2024-09-01" && data <= "2024-10-31" && irc >= 70) acertos2024++;
}

const ircs = serie.map((p) => p.irc);
const dist = { verde: 0, amarelo: 0, laranja: 0, vermelho: 0 };
for (const p of serie) dist[p.faixa]++;

console.log(`Série IRC v3.5 gerada: ${serie.length} pontos`);
console.log(`Mega-seca 2024 (set-out) com IRC ≥ 70: ${acertos2024}`);
console.log(`Min/Max/Médio: ${Math.min(...ircs)} / ${Math.max(...ircs)} / ${(ircs.reduce((s,v)=>s+v,0)/ircs.length).toFixed(1)}`);
console.log(`Distribuição: ${JSON.stringify(dist)}`);

const ts = `// AUTO-GERADO por scripts/gera-irc-historico.mjs em ${new Date().toISOString()}
// GIT: ${GIT_SHA.slice(0, 7)}${GIT_DIRTY ? " (dirty)" : ""}
//
// Série histórica do IRC-Tabocal v3.5 calculada RETROATIVAMENTE.
//
// CORREÇÃO DA AUDITORIA (v3.5 vs v3.3): esta série agora usa a MESMA fórmula
// do produto v3.5 (calculaIRCTabocal com 5 componentes + não-compensação).
// A versão anterior usava IRC v2.1 (LWS+HMM apenas) e era INCONSISTENTE com
// o número exibido na API.
//
// Limitações honestas:
//   • onda_branco fixado em 0 (série Caracaraí diária histórica não consolidada)
//   • anomalia_pp fixado em 0 (parser SGB não retrocede a 2016)
//   • Esses componentes contribuem apenas no IRC ATUAL (não retrospectivo).
//   • IRC retroativo ≈ pesos_calado·c_calado + pesos_hmm·c_hmm + pesos_lag·c_lag
//     (onda e pp pesam 0 efetivamente nesta série, mas SOMA dos pesos ainda é 1).

export interface PontoIRC {
  data:           string;
  irc:            number;
  faixa:          "verde" | "amarelo" | "laranja" | "vermelho";
  idn:            number;
  cota_manaus_m:  number;
  cota_ita_m:     number;
}

export const IRC_HISTORICO_CALCULADO: PontoIRC[] = ${JSON.stringify(serie, null, 2)};

export const IRC_HISTORICO_RESUMO = {
  n_pontos:        ${serie.length},
  irc_min:         ${Math.min(...ircs)},
  irc_max:         ${Math.max(...ircs)},
  irc_medio:       ${(ircs.reduce((s,v)=>s+v,0)/ircs.length).toFixed(2)},
  distribuicao:    ${JSON.stringify(dist)},
  versao_irc:      "v3.5",
  componentes_zerados_retrospectivamente: ["onda_branco", "anomalia_pp"],
  gerado_em:       "${new Date().toISOString()}",
  git_sha:         "${GIT_SHA}",
  git_dirty:       ${GIT_DIRTY},
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "irc-historico-calculado.ts");
writeFileSync(OUT_PATH, ts, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
