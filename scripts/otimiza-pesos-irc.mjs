// Otimiza os pesos do IRC contra eventos rotulados via busca em grade +
// validação por correlação Spearman e RMSE normalizado.
//
// Restrições:
//   - Pesos somam 1.0
//   - LWS, HMM, Onda, PP ≥ 0
//   - Cada peso ∈ [0.05, 0.55] (evita degenerar)
//
// Critério: maximizar Spearman(IRC, severidade_observada) entre 20 eventos.
// Saída: lib/irc-pesos-otimizados.ts (sugestão) — opcional ativar via env.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Eventos (replicação simplificada de lib/eventos-rotulados.ts) ──────────
const eventosTS = readFileSync(join(ROOT, "lib", "eventos-rotulados.ts"), "utf-8");
const matches = [...eventosTS.matchAll(/severidade_observada:\s+(\d)[\s\S]*?cotaManaus_m:\s+([\d.]+)[\s\S]*?idn:\s+([+-]?[\d.]+)[\s\S]*?severidade_onda_continua:\s+([\d.]+)[\s\S]*?var_onda_m:\s+([+-]?[\d.]+)[\s\S]*?anomalia_pp:\s+([+-]?\d)[\s\S]*?eta_dias_cruzamento:\s+([+-]?\d+)/g)];
const eventos = matches.map((m) => ({
  sev:    parseInt(m[1]),
  cota:   parseFloat(m[2]),
  idn:    parseFloat(m[3]),
  onda:   parseFloat(m[4]),
  varOnda: parseFloat(m[5]),
  pp:     parseInt(m[6]),
  eta:    parseInt(m[7]),
}));
console.log(`Eventos rotulados: ${eventos.length}`);

// ─── Componentes (replicação de lib/irc.ts) ─────────────────────────────────
function compLWS(cota, eta) {
  const TETO = 22, PISO = 17.7;
  let atual = cota >= TETO ? 0 :
              cota <= PISO ? 100 + (PISO - cota) * 15 :
              ((TETO - cota) / (TETO - PISO)) * 100;
  let proj = 0;
  if (eta != null && eta >= 0) {
    if      (eta <=  30) proj = 90;
    else if (eta <=  90) proj = 90 - ((eta - 30) / 60) * 50;
    else if (eta <= 180) proj = 40 - ((eta - 90) / 90) * 30;
    else                  proj = 10 - Math.min(10, (eta - 180) / 30);
  }
  return Math.max(atual, proj);
}

// HMM constantes
const HMM_MU = [-0.4104, 0.051, 0.4982];
const HMM_SIGMA = [0.1627, 0.1237, 0.178];
const HMM_T7 = [
  [0.8951, 0.0997, 0.0053],
  [0.1047, 0.7938, 0.1016],
  [0.0069, 0.1269, 0.8662],
];
function estado(idn) {
  const i = Math.max(-0.9, Math.min(0.9, idn));
  const probs = HMM_MU.map((mu, k) => {
    const s = HMM_SIGMA[k];
    return Math.exp(-((i - mu) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
  });
  const tot = probs.reduce((a, b) => a + b, 0);
  const norm = probs.map((p) => p / tot);
  let max = 0, idx = 0;
  for (let k = 0; k < 3; k++) if (norm[k] > max) { max = norm[k]; idx = k; }
  return idx;
}
function compHMM(idn) {
  const e = estado(idn);
  const probCond = HMM_T7[e][0] + HMM_T7[e][2];
  const anomalia = probCond - 0.67;
  const score = 50 + (anomalia / 0.3) * 50;
  return Math.max(0, Math.min(100, score));
}

function compPP(cat) {
  return Math.min(3, Math.abs(cat)) / 3 * 100;
}

function calculaIRC(ev, pesos) {
  const lws  = compLWS(ev.cota, ev.eta);
  const hmm  = compHMM(ev.idn);
  const onda = ev.onda;
  const pp   = compPP(ev.pp);
  return pesos.lws * lws + pesos.hmm * hmm + pesos.onda * onda + pesos.pp * pp;
}

// ─── Métricas ─────────────────────────────────────────────────────────────
function spearman(arr1, arr2) {
  const n = arr1.length;
  function ranks(arr) {
    const sorted = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(n);
    sorted.forEach(([, idx], rk) => { r[idx] = rk; });
    return r;
  }
  const r1 = ranks(arr1), r2 = ranks(arr2);
  const m1 = r1.reduce((a, b) => a + b, 0) / n;
  const m2 = r2.reduce((a, b) => a + b, 0) / n;
  let num = 0, d1 = 0, d2 = 0;
  for (let i = 0; i < n; i++) {
    num += (r1[i] - m1) * (r2[i] - m2);
    d1  += (r1[i] - m1) ** 2;
    d2  += (r2[i] - m2) ** 2;
  }
  return num / Math.sqrt(d1 * d2);
}

// ─── Busca em grade ──────────────────────────────────────────────────────────
const PESOS_INICIAL = { lws: 0.40, hmm: 0.25, onda: 0.20, pp: 0.15 };

console.log("\n══════ Avaliação dos pesos atuais ══════");
const ircsAtual = eventos.map((e) => calculaIRC(e, PESOS_INICIAL));
const sevs      = eventos.map((e) => e.sev);
const rhoAtual  = spearman(ircsAtual, sevs);
console.log(`Spearman(IRC, severidade): rho = ${rhoAtual.toFixed(4)}`);

// Verificação de range
console.log(`IRC range: ${Math.min(...ircsAtual).toFixed(1)} – ${Math.max(...ircsAtual).toFixed(1)}`);

// Grid search
console.log("\n══════ Otimização por busca em grade (passo 0.05) ══════");
let melhor = { pesos: PESOS_INICIAL, rho: rhoAtual };
const passo = 0.05;
let testados = 0;
for (let lws = 0.20; lws <= 0.55; lws += passo) {
  for (let hmm = 0.10; hmm <= 0.40; hmm += passo) {
    for (let onda = 0.05; onda <= 0.40; onda += passo) {
      const pp = 1 - lws - hmm - onda;
      if (pp < 0.05 || pp > 0.40) continue;
      const pesos = { lws, hmm, onda, pp };
      const ircs = eventos.map((e) => calculaIRC(e, pesos));
      const rho  = spearman(ircs, sevs);
      testados++;
      if (rho > melhor.rho) melhor = { pesos, rho };
    }
  }
}
console.log(`Testados: ${testados} combinações`);
console.log(`Melhor: lws=${melhor.pesos.lws.toFixed(2)}, hmm=${melhor.pesos.hmm.toFixed(2)}, onda=${melhor.pesos.onda.toFixed(2)}, pp=${melhor.pesos.pp.toFixed(2)}`);
console.log(`  Spearman: ${melhor.rho.toFixed(4)} (vs ${rhoAtual.toFixed(4)} atual)`);

// ─── Bootstrap dos pesos otimizados ─────────────────────────────────────────
console.log("\n══════ Bootstrap dos pesos otimizados (n=200) ══════");
const eventosArray = eventos;
const pesosBootstrap = [];
for (let b = 0; b < 200; b++) {
  // Resample com reposição
  const amostra = Array.from({ length: eventosArray.length }, () =>
    eventosArray[Math.floor(Math.random() * eventosArray.length)]);
  let melhorBoot = { rho: -Infinity, pesos: PESOS_INICIAL };
  for (let lws = 0.20; lws <= 0.55; lws += 0.10) {
    for (let hmm = 0.10; hmm <= 0.40; hmm += 0.10) {
      for (let onda = 0.05; onda <= 0.40; onda += 0.10) {
        const pp = 1 - lws - hmm - onda;
        if (pp < 0.05 || pp > 0.40) continue;
        const pesos = { lws, hmm, onda, pp };
        const ircs = amostra.map((e) => calculaIRC(e, pesos));
        const sevsB = amostra.map((e) => e.sev);
        const rho = spearman(ircs, sevsB);
        if (rho > melhorBoot.rho) melhorBoot = { rho, pesos };
      }
    }
  }
  pesosBootstrap.push(melhorBoot.pesos);
}

function quantil(arr, q) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length * q)];
}

const lws_dist  = pesosBootstrap.map((p) => p.lws).sort((a, b) => a - b);
const hmm_dist  = pesosBootstrap.map((p) => p.hmm).sort((a, b) => a - b);
const onda_dist = pesosBootstrap.map((p) => p.onda).sort((a, b) => a - b);
const pp_dist   = pesosBootstrap.map((p) => p.pp).sort((a, b) => a - b);

const ic = (arr) => `${quantil(arr, 0.10).toFixed(2)}–${quantil(arr, 0.90).toFixed(2)}`;
const mediana = (arr) => quantil(arr, 0.50).toFixed(3);

console.log(`Pesos otimizados (mediana, IC80):`);
console.log(`  LWS:  ${mediana(lws_dist)} (IC80 ${ic(lws_dist)})`);
console.log(`  HMM:  ${mediana(hmm_dist)} (IC80 ${ic(hmm_dist)})`);
console.log(`  Onda: ${mediana(onda_dist)} (IC80 ${ic(onda_dist)})`);
console.log(`  PP:   ${mediana(pp_dist)} (IC80 ${ic(pp_dist)})`);

// ─── Saída TS ────────────────────────────────────────────────────────────────
const ts = `// AUTO-GERADO por scripts/otimiza-pesos-irc.mjs em ${new Date().toISOString()}
// Pesos do IRC otimizados por busca em grade contra ${eventos.length} eventos
// rotulados (lib/eventos-rotulados.ts). Critério: maximizar Spearman(IRC, severidade).
//
// Comparação:
//   Pesos heurísticos v2: lws=0.40, hmm=0.25, onda=0.20, pp=0.15 → rho=${rhoAtual.toFixed(3)}
//   Pesos otimizados v3:  lws=${melhor.pesos.lws.toFixed(2)}, hmm=${melhor.pesos.hmm.toFixed(2)}, onda=${melhor.pesos.onda.toFixed(2)}, pp=${melhor.pesos.pp.toFixed(2)} → rho=${melhor.rho.toFixed(3)}
//
// Bootstrap n=200 IC80 dos pesos otimizados:
//   LWS:  ${ic(lws_dist)}
//   HMM:  ${ic(hmm_dist)}
//   Onda: ${ic(onda_dist)}
//   PP:   ${ic(pp_dist)}

export const PESOS_IRC_OTIMIZADOS = {
  lws:         ${+melhor.pesos.lws.toFixed(3)},
  hmm_extremo: ${+melhor.pesos.hmm.toFixed(3)},
  onda_branco: ${+melhor.pesos.onda.toFixed(3)},
  anomalia_pp: ${+melhor.pesos.pp.toFixed(3)},
} as const;

export const PESOS_IRC_BOOTSTRAP = {
  n_amostras:    200,
  rho_atual:     ${+rhoAtual.toFixed(4)},
  rho_otimizado: ${+melhor.rho.toFixed(4)},
  ic80: {
    lws:         [${+quantil(lws_dist, 0.10).toFixed(3)},  ${+quantil(lws_dist, 0.90).toFixed(3)}],
    hmm_extremo: [${+quantil(hmm_dist, 0.10).toFixed(3)},  ${+quantil(hmm_dist, 0.90).toFixed(3)}],
    onda_branco: [${+quantil(onda_dist, 0.10).toFixed(3)}, ${+quantil(onda_dist, 0.90).toFixed(3)}],
    anomalia_pp: [${+quantil(pp_dist, 0.10).toFixed(3)},   ${+quantil(pp_dist, 0.90).toFixed(3)}],
  },
} as const;
`;

writeFileSync(join(ROOT, "lib", "irc-pesos-otimizados.ts"), ts, "utf-8");
console.log(`\n✓ Gerado lib/irc-pesos-otimizados.ts`);
