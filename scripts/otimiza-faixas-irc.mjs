// Otimiza os pontos de corte das faixas verde/amarelo/laranja/vermelho do IRC.
//
// Crítica da auditoria: cortes em 25/50/75 são "coerência visual" — sem base
// estatística. Esta versão calcula limiares ótimos via Youden J multi-classe
// contra severidade externa, usando o dataset expandido (n=112).

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

// Carrega dataset expandido
const expTS = readFileSync(join(ROOT, "lib", "eventos-tabocal-expandidos.ts"), "utf-8");
const expMatch = expTS.match(/EVENTOS_TABOCAL_EXPANDIDOS: EventoTabocalExpandido\[\] = (\[[\s\S]*?\]);/);
const eventos = JSON.parse(expMatch[1]);

// Carrega pesos v3.5
const pesosTS = readFileSync(join(ROOT, "lib", "irc-tabocal-pesos-calibrados-v35.ts"), "utf-8");
const pesos = {
  calado: parseFloat(pesosTS.match(/calado_tabocal:\s*([0-9.]+)/)[1]),
  hmm:    parseFloat(pesosTS.match(/hmm_extremo:\s*([0-9.]+)/)[1]),
  onda:   parseFloat(pesosTS.match(/onda_branco:\s*([0-9.]+)/)[1]),
  pp:     parseFloat(pesosTS.match(/anomalia_pp:\s*([0-9.]+)/)[1]),
  lag:    parseFloat(pesosTS.match(/lag_operacional:\s*([0-9.]+)/)[1]),
};
console.log("Pesos v3.5:", pesos);

// Reproduz cálculo do IRC (com não-compensação)
const cmrCurvaTS = readFileSync(join(ROOT, "lib", "cmr-itacoatiara-calibrada.ts"), "utf-8");
const cmrCurvaMatch = cmrCurvaTS.match(/CURVA_CMR_CALIBRADA[\s\S]*?=\s*(\[[\s\S]*?\]);/);
const CURVA = eval(cmrCurvaMatch[1]).map((p) => [p[0], p[1]]);
function cmrDe(c) {
  if (c <= CURVA[0][0]) return 5.63;
  const u = CURVA[CURVA.length - 1];
  if (c >= u[0]) return u[1] + (c - u[0]) * 0.80;
  for (let i = 0; i < CURVA.length - 1; i++) {
    if (c >= CURVA[i][0] && c <= CURVA[i + 1][0]) {
      const t = (c - CURVA[i][0]) / (CURVA[i + 1][0] - CURVA[i][0] || 1);
      return CURVA[i][1] + t * (CURVA[i + 1][1] - CURVA[i][1]);
    }
  }
  return 5.63;
}
function compCalado(c, eta = null, alvo = 11.0) {
  const def = Math.max(0, alvo - cmrDe(c));
  let a = 0;
  if (def >= 5.5) a = 100;
  else if (def <= 2.5) a = def * 20;
  else a = 50 + (def - 2.5) * (50 / 3);
  let p = 0;
  if (eta != null && eta >= 0) {
    if (eta <= 30) p = 95;
    else if (eta <= 90) p = 95 - ((eta - 30) / 60) * 55;
    else if (eta <= 180) p = 40 - ((eta - 90) / 90) * 30;
    else p = 10 - Math.min(10, (eta - 180) / 30);
  }
  return Math.max(a, p);
}
function compHMM(idn) {
  const MU = [-0.4104, 0.051, 0.4982], SIG = [0.1627, 0.1237, 0.178];
  const T7 = [[0.8951, 0.0997, 0.0053], [0.1047, 0.7938, 0.1016], [0.0069, 0.1269, 0.8662]];
  const i = Math.max(-0.9, Math.min(0.9, idn));
  const probs = MU.map((m, k) => Math.exp(-((i - m) ** 2) / (2 * SIG[k] ** 2)) / (SIG[k] * Math.sqrt(2 * Math.PI)));
  const tot = probs.reduce((s, v) => s + v, 0);
  const norm = probs.map((p) => p / tot);
  let mx = 0, idx = 0;
  for (let k = 0; k < 3; k++) if (norm[k] > mx) { mx = norm[k]; idx = k; }
  const pc = T7[idx][0] + T7[idx][2];
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

function calculaIRC(e) {
  const cC = compCalado(e.ita, e.eta);
  const cH = compHMM(e.idn);
  const cO = e.onda;
  const cP = isNaN(e.pp) ? 0 : Math.min(3, Math.abs(e.pp)) / 3 * 100;
  const cL = compLag(e.mao, e.ita);
  const linear = pesos.calado * cC + pesos.hmm * cH + pesos.onda * cO + pesos.pp * cP + pesos.lag * cL;
  const piso = cC >= 80 ? cC * 0.75 : 0;
  return Math.max(linear, piso);
}

// Calcula IRC para todos eventos
const ircsPorSev = { 1: [], 2: [], 3: [], 4: [], 5: [] };
for (const e of eventos) {
  ircsPorSev[e.sevExt].push(calculaIRC(e));
}

console.log("\nDistribuição IRC por severidade externa:");
for (let s = 1; s <= 5; s++) {
  const arr = ircsPorSev[s].sort((a, b) => a - b);
  if (arr.length === 0) continue;
  const med = arr[Math.floor(arr.length / 2)];
  const q25 = arr[Math.floor(arr.length * 0.25)];
  const q75 = arr[Math.floor(arr.length * 0.75)];
  console.log(`  sev=${s} (n=${arr.length}): IRC mediano=${med.toFixed(1)}, IQR=[${q25.toFixed(1)}, ${q75.toFixed(1)}]`);
}

// Otimização por Youden J multi-classe:
// Para CADA limiar candidato, calcula sensibilidade (sev≥k correto) e especificidade
// (sev<k correto). Otimiza J = sens + esp − 1.
function youdenJ(limiar, sevsBaixo, sevsAlto, ircs, sevs) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < ircs.length; i++) {
    const positivo = ircs[i] >= limiar;
    const eAlto = sevs[i] >= sevsAlto;
    if (positivo && eAlto) tp++;
    else if (positivo && !eAlto) fp++;
    else if (!positivo && eAlto) fn++;
    else tn++;
  }
  const sens = tp + fn > 0 ? tp / (tp + fn) : 0;
  const esp  = tn + fp > 0 ? tn / (tn + fp) : 0;
  return sens + esp - 1;
}

const todosIrcs = eventos.map(calculaIRC);
const todosSev  = eventos.map((e) => e.sevExt);

// Encontra limiar ótimo para cada transição
const transicoes = [
  { nome: "verde→amarelo",   sevAlto: 2 },
  { nome: "amarelo→laranja", sevAlto: 3 },
  { nome: "laranja→vermelho",sevAlto: 4 },
];

const limiaresOtimos = {};
for (const t of transicoes) {
  let melhor = { limiar: 50, j: -Infinity };
  for (let lim = 10; lim <= 90; lim += 1) {
    const j = youdenJ(lim, 0, t.sevAlto, todosIrcs, todosSev);
    if (j > melhor.j) melhor = { limiar: lim, j };
  }
  limiaresOtimos[t.nome] = melhor;
  console.log(`${t.nome.padEnd(25)} limiar ótimo: ${melhor.limiar}  J=${melhor.j.toFixed(3)}`);
}

const verdeAmarelo  = limiaresOtimos["verde→amarelo"].limiar;
const amareloLaranja = limiaresOtimos["amarelo→laranja"].limiar;
const laranjaVermelho = limiaresOtimos["laranja→vermelho"].limiar;

console.log(`\nFaixas otimizadas: < ${verdeAmarelo} verde · < ${amareloLaranja} amarelo · < ${laranjaVermelho} laranja · ≥ ${laranjaVermelho} vermelho`);
console.log(`(vs v3.3 cosméticas: 25 / 50 / 75)`);

const out = `// AUTO-GERADO por scripts/otimiza-faixas-irc.mjs em ${new Date().toISOString()}
// GIT: ${GIT_SHA.slice(0, 7)}${GIT_DIRTY ? " (dirty)" : ""}
//
// Faixas otimizadas via Youden J multi-classe contra severidade externa (n=112).
// Pesos v3.5 usados na otimização. Não mais "coerência visual" — agora têm
// fundamentação estatística (maximiza sens+esp na separação por severidade).

export const FAIXAS_IRC_CALIBRADAS = {
  verde_amarelo:    ${verdeAmarelo},
  amarelo_laranja:  ${amareloLaranja},
  laranja_vermelho: ${laranjaVermelho},
  // Métricas de qualidade dos limiares (Youden J = sens+esp-1, max=1)
  youden_j: {
    verde_amarelo:    ${limiaresOtimos["verde→amarelo"].j.toFixed(4)},
    amarelo_laranja:  ${limiaresOtimos["amarelo→laranja"].j.toFixed(4)},
    laranja_vermelho: ${limiaresOtimos["laranja→vermelho"].j.toFixed(4)},
  },
  metodologia:  "Youden J otimizado em dataset expandido (n=112) contra severidade externa",
  n_eventos:    ${eventos.length},
  gerado_em:    "${new Date().toISOString()}",
  git_sha:      "${GIT_SHA}",
  git_dirty:    ${GIT_DIRTY},
} as const;
`;

const OUT_PATH = join(ROOT, "lib", "irc-faixas-calibradas.ts");
writeFileSync(OUT_PATH, out, "utf-8");
console.log(`\n✓ Gerado: ${OUT_PATH}`);
