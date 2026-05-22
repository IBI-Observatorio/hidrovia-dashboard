// Gera série histórica do IRC aplicando a fórmula retroativamente a cada dia
// da série de IDN consolidada (IDN_RECENTE_DIARIO + IDN_HISTORICO_CALCULADO).
//
// Limitações desta v1:
//   - Série Caracaraí não está disponível por dia em 2016-2023 → severidade_onda
//     = "nenhuma" para todos os pontos. v2 reidrata via histórico ANA.
//   - Anomalia de precipitação não está cacheada por dia → anomalia_pp = 0.
//   - ETA cruzamento 17,7m é estimado por simulação de recessão a partir do
//     pico mais recente (não é retroativo perfeito, mas dá uma referência).
//
// Saída: lib/irc-historico-calculado.ts com pontos { data, irc, faixa }.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Lê IDN históricos (semanal + diário recente)
const idnTS = readFileSync(join(ROOT, "lib", "idn-historico-calculado.ts"), "utf-8");
function extrai(name) {
  const m = idnTS.match(new RegExp(`${name}[^=]*=\\s*(\\[[\\s\\S]*?\\]);`));
  return m ? JSON.parse(m[1]) : [];
}
const semanal = extrai("IDN_HISTORICO_CALCULADO");
const diario  = extrai("IDN_RECENTE_DIARIO");

// Combina (diário sobrescreve semanal)
const mapa = new Map();
for (const p of semanal) mapa.set(p.data, p.idn);
for (const p of diario) mapa.set(p.data, p.idn);
const pontos = [...mapa.entries()]
  .map(([data, idn]) => ({ data, idn }))
  .sort((a, b) => a.data.localeCompare(b.data));
console.log(`Pontos combinados: ${pontos.length}`);

// Lê coluna MAO do CSV histórico
const csv = readFileSync(join(ROOT, "data", "4estacoes_2016_2025.csv"), "utf-8").trim().split("\n");
const cab = csv[0].split(",");
const idxMAO = cab.indexOf("MAO");
const cotaManaus = new Map();
for (let i = 1; i < csv.length; i++) {
  const partes = csv[i].split(",");
  const v = parseFloat(partes[idxMAO]);
  if (!isNaN(v)) cotaManaus.set(partes[0], v);
}
console.log(`Cotas Manaus carregadas: ${cotaManaus.size}`);

// ─── Componentes do IRC (espelho da lib/irc.ts) ────────────────────────────
function compLWS(cota) {
  const TETO = 22.0, PISO = 17.7;
  if (cota >= TETO) return 0;
  if (cota <= PISO) return 100 + (PISO - cota) * 15;
  return +(((TETO - cota) / (TETO - PISO)) * 100).toFixed(1);
}

// Mini-HMM: replicação da matriz 7d para componente HMM extremo
const HMM_T7 = [
  [0.8951, 0.0997, 0.0053],   // Sul
  [0.1047, 0.7938, 0.1016],   // Sinc
  [0.0069, 0.1269, 0.8662],   // Norte
];
const HMM_MU = [-0.4104, 0.051, 0.4982];
const HMM_SIGMA = [0.1627, 0.1237, 0.178];

function estado(idn) {
  const probs = HMM_MU.map((mu, i) => {
    const s = HMM_SIGMA[i];
    return Math.exp(-((idn - mu) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
  });
  const tot = probs.reduce((a, b) => a + b, 0) || 1;
  const norm = probs.map((p) => p / tot);
  let max = 0, idx = 0;
  for (let i = 0; i < 3; i++) if (norm[i] > max) { max = norm[i]; idx = i; }
  return idx;
}

function compHMM(idn) {
  const e = estado(idn);
  const t7 = HMM_T7[e];
  return +((t7[0] + t7[2]) * 100).toFixed(1);
}

// Pesos v2.1 calibrados em scripts/otimiza-pesos-irc.mjs
function calculaIRC(cotaManaus, idn) {
  const lws = compLWS(cotaManaus);
  const hmm = compHMM(idn);
  const onda = 0;       // sem série Caracaraí retroativa
  const ap   = 0;       // sem anomalia precipitação retroativa
  // Componentes ausentes (onda, ap) → renormaliza: peso ausente = 0.45
  // Pesos efetivos: lws*(1/0.55), hmm*(1/0.55) — só dois ativos
  const fator = 1 / (0.40 + 0.15);   // 1/0.55 ≈ 1.818
  const irc = 0.40 * fator * lws + 0.15 * fator * hmm;
  return Math.max(0, Math.min(100, +irc.toFixed(1)));
}

function faixa(irc) {
  if (irc < 25)  return "verde";
  if (irc < 50)  return "amarelo";
  if (irc < 75)  return "laranja";
  return "vermelho";
}

// ─── Gera série ────────────────────────────────────────────────────────────
const serie = [];
let acertosPicos = 0, acertos2024 = 0;

for (const p of pontos) {
  const cota = cotaManaus.get(p.data);
  if (cota == null) continue;  // sem dado de cota no dia
  const irc = calculaIRC(cota, p.idn);
  serie.push({ data: p.data, irc, faixa: faixa(irc), idn: +p.idn.toFixed(3), cota_m: cota });

  // Sanity checks (eventos âncora)
  if (p.data >= "2024-09-01" && p.data <= "2024-10-31" && irc >= 70) acertos2024++;
}

console.log(`Série IRC gerada: ${serie.length} pontos`);
console.log(`Dias da mega-seca 2024 (set-out) com IRC ≥ 70: ${acertos2024}`);

// Min/Max
const ircs = serie.map((p) => p.irc);
console.log(`IRC min: ${Math.min(...ircs)} | max: ${Math.max(...ircs)} | médio: ${(ircs.reduce((a,b)=>a+b,0)/ircs.length).toFixed(1)}`);

// Distribuição por faixa
const dist = { verde: 0, amarelo: 0, laranja: 0, vermelho: 0 };
for (const p of serie) dist[p.faixa]++;
console.log(`Distribuição: ${JSON.stringify(dist)}`);

// ─── Saída TS ──────────────────────────────────────────────────────────────
const ts = `// AUTO-GERADO por scripts/gera-irc-historico.mjs em ${new Date().toISOString()}
// Série histórica do IRC (Índice de Risco de Calado) calculada retroativamente.
// Componentes Onda Branco e Anomalia Precipitação fixados em 0 nesta v1 por
// falta de dados retroativos consolidados — pontos refletem só LWS + HMM.

export interface PontoIRC {
  data:    string;     // YYYY-MM-DD
  irc:     number;     // 0..100
  faixa:   "verde" | "amarelo" | "laranja" | "vermelho";
  idn:     number;     // IDN do dia (para cross-ref com outros gráficos)
  cota_m:  number;     // cota Manaus do dia
}

export const IRC_HISTORICO_CALCULADO: PontoIRC[] = ${JSON.stringify(serie, null, 2)};

export const IRC_HISTORICO_RESUMO = {
  n_pontos:      ${serie.length},
  irc_min:       ${Math.min(...ircs)},
  irc_max:       ${Math.max(...ircs)},
  irc_medio:     ${+(ircs.reduce((a,b)=>a+b,0)/ircs.length).toFixed(1)},
  distribuicao:  ${JSON.stringify(dist)},
} as const;
`;

const OUT = join(ROOT, "lib", "irc-historico-calculado.ts");
writeFileSync(OUT, ts, "utf-8");
console.log(`\n✓ Gerado: ${OUT}`);
