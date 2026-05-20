// Valida os pesos das sub-bacias do IDN comparando-os contra o 1º componente
// principal (PC1) das 11 séries históricas. Se PC1 separar naturalmente Norte
// de Sul com sinais opostos, valida a estrutura; os loadings absolutos podem
// servir de comparação para os pesos chutados.
//
// PCA padrão (correlação) sobre matriz 11 × N (anomalias normalizadas):
//   - Cada linha = estação
//   - Cada coluna = um dia onde TODAS as 11 estações têm dado
//   - Cota - média / std da estação no período de referência
//
// Saída: relatório textual + lib/pca-validacao.ts com loadings.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const ARQUIVOS = {
  // Norte
  SGC: 'sgc_hidroweb.csv', Curicuriari: 'curicuriari_hidroweb.csv',
  Serrinha: 'serrinha_hidroweb.csv', Moura: 'moura_hidroweb.csv',
  Caracarai: 'caracarai_hidroweb.csv',
  // Sul
  Abuna: 'abuna_hidroweb.csv', PortoVelho: 'portovelho_hidroweb.csv',
  Humaita: 'humaita_hidroweb.csv', Manicore: 'manicore_hidroweb.csv',
  Borba: 'borba_hidroweb.csv', Labrea: 'labrea_hidroweb.csv',
};
const ESTACOES = Object.keys(ARQUIVOS);
const SUB_BACIA = {
  SGC: "N", Curicuriari: "N", Serrinha: "N", Moura: "N", Caracarai: "N",
  Abuna: "S", PortoVelho: "S", Humaita: "S", Manicore: "S", Borba: "S", Labrea: "S",
};
const PESOS_ATUAIS = {
  SGC: 0.30, Curicuriari: 0.20, Serrinha: 0.20, Moura: 0.05, Caracarai: 0.25,
  Abuna: 0.15, PortoVelho: 0.20, Humaita: 0.15, Manicore: 0.10, Borba: 0.15, Labrea: 0.25,
};

// ---------------------------------------------------------------------------
// Carrega séries
// ---------------------------------------------------------------------------
function carrega(arq) {
  const txt = readFileSync(join(ROOT, "data", arq), "utf-8").replace(/^﻿/, "");
  const m = new Map();
  for (const l of txt.trim().split(/\r?\n/).slice(1)) {
    const [d, c] = l.split(",");
    if (d && c) m.set(d, +c);
  }
  return m;
}
const series = {};
for (const [est, arq] of Object.entries(ARQUIVOS)) series[est] = carrega(arq);

// Datas comuns no período 2016-2023 (todas as 11 estações com dado)
const datasComuns = [];
const inicio = new Date("2016-01-01T00:00:00Z");
const fim    = new Date("2023-12-31T00:00:00Z");
for (let dt = new Date(inicio); dt <= fim; dt.setUTCDate(dt.getUTCDate() + 1)) {
  const iso = dt.toISOString().slice(0, 10);
  if (ESTACOES.every((e) => series[e].has(iso))) datasComuns.push(iso);
}
console.log(`Datas com dado em todas as 11 estações: ${datasComuns.length}`);

// Matriz: linhas = estação (11), colunas = data (N)
const N = datasComuns.length;
const X = ESTACOES.map((e) => datasComuns.map((d) => series[e].get(d)));

// Normaliza por estação (z-score)
const Xnorm = X.map((linha) => {
  const m = linha.reduce((s, x) => s + x, 0) / linha.length;
  const sd = Math.sqrt(linha.reduce((s, x) => s + (x - m) ** 2, 0) / linha.length);
  return linha.map((x) => (x - m) / sd);
});

// ---------------------------------------------------------------------------
// PCA via power iteration (1º e 2º componentes principais)
// ---------------------------------------------------------------------------
// Matriz de covariância 11×11 (correlação, pois normalizamos)
const k = ESTACOES.length;
const cov = Array.from({ length: k }, () => new Array(k).fill(0));
for (let i = 0; i < k; i++) {
  for (let j = 0; j < k; j++) {
    let s = 0;
    for (let t = 0; t < N; t++) s += Xnorm[i][t] * Xnorm[j][t];
    cov[i][j] = s / (N - 1);
  }
}

function matVec(M, v) {
  return M.map((linha) => linha.reduce((s, x, j) => s + x * v[j], 0));
}
function norm(v) { return Math.sqrt(v.reduce((s, x) => s + x*x, 0)); }
function normalize(v) { const n = norm(v); return v.map(x => x / (n || 1)); }
function deflaciona(M, lambda, v) {
  return M.map((linha, i) => linha.map((x, j) => x - lambda * v[i] * v[j]));
}
function powerIter(M, iter = 1000, tol = 1e-9) {
  let v = normalize(M.map(() => Math.random()));
  let lambda = 0;
  for (let it = 0; it < iter; it++) {
    const u = matVec(M, v);
    const novoLambda = u.reduce((s, x, i) => s + x * v[i], 0);
    const novoV = normalize(u);
    if (Math.abs(novoLambda - lambda) < tol) { lambda = novoLambda; v = novoV; break; }
    lambda = novoLambda;
    v = novoV;
  }
  return { lambda, v };
}

const pc1 = powerIter(cov);
const covDeflated = deflaciona(cov, pc1.lambda, pc1.v);
const pc2 = powerIter(covDeflated);

// Garante orientação consistente: Norte tem loadings positivos
// (multiplica por -1 se a soma dos loadings de Norte for negativa)
function orienta(loadings) {
  const somaN = ESTACOES.reduce((s, e, i) => SUB_BACIA[e] === "N" ? s + loadings[i] : s, 0);
  return somaN < 0 ? loadings.map(x => -x) : loadings;
}
const pc1Loadings = orienta(pc1.v);
const pc2Loadings = orienta(pc2.v);

const totalVar = cov.reduce((s, l, i) => s + l[i], 0);
console.log(`\nVariância total = ${totalVar.toFixed(2)}`);
console.log(`PC1: λ = ${pc1.lambda.toFixed(2)} (${(100*pc1.lambda/totalVar).toFixed(1)}% var)`);
console.log(`PC2: λ = ${pc2.lambda.toFixed(2)} (${(100*pc2.lambda/totalVar).toFixed(1)}% var)`);

// ---------------------------------------------------------------------------
// Análise: PC1 separa Norte/Sul?
// ---------------------------------------------------------------------------
console.log(`\n=== Loadings PC1 (variância comum) ===`);
console.log("  Estação      | sub | loading PC1 | peso atual");
console.log("  -------------|-----|-------------|------------");
for (let i = 0; i < k; i++) {
  const e = ESTACOES[i];
  const sub = SUB_BACIA[e];
  const sinal = pc1Loadings[i] > 0 ? "+" : "";
  console.log(`  ${e.padEnd(13)}|  ${sub}  | ${sinal}${pc1Loadings[i].toFixed(3).padStart(6)}     | ${PESOS_ATUAIS[e].toFixed(2)} (${sub === "N" ? "N" : "S"})`);
}

console.log(`\n=== Loadings PC2 (eixo Norte-Sul) ===`);
console.log("  Estação      | sub | loading PC2");
console.log("  -------------|-----|------------");
for (let i = 0; i < k; i++) {
  const e = ESTACOES[i];
  const sinal = pc2Loadings[i] > 0 ? "+" : "";
  console.log(`  ${e.padEnd(13)}|  ${SUB_BACIA[e]}  | ${sinal}${pc2Loadings[i].toFixed(3)}`);
}

// PC2 deve separar Norte (positivo) de Sul (negativo) — ou vice-versa
const mediaN_pc2 = ESTACOES.reduce((s, e, i) => SUB_BACIA[e] === "N" ? s + pc2Loadings[i] : s, 0) / 5;
const mediaS_pc2 = ESTACOES.reduce((s, e, i) => SUB_BACIA[e] === "S" ? s + pc2Loadings[i] : s, 0) / 6;
console.log(`\nMédia loading PC2 — Norte: ${mediaN_pc2.toFixed(3)}, Sul: ${mediaS_pc2.toFixed(3)}`);
console.log(`Separação Norte-Sul no PC2: ${(mediaN_pc2 - mediaS_pc2).toFixed(3)}`);

// ---------------------------------------------------------------------------
// Comparação: pesos PCA-derivados vs pesos atuais
// ---------------------------------------------------------------------------
// Para cada sub-bacia, normaliza |loading PC2| para criar pesos PCA
function pesosPCA(estacoesSub) {
  const abs = estacoesSub.map((e) => Math.abs(pc2Loadings[ESTACOES.indexOf(e)]));
  const tot = abs.reduce((s, x) => s + x, 0);
  return Object.fromEntries(estacoesSub.map((e, i) => [e, abs[i] / tot]));
}
const norte = ESTACOES.filter((e) => SUB_BACIA[e] === "N");
const sul   = ESTACOES.filter((e) => SUB_BACIA[e] === "S");
const pesosPCA_N = pesosPCA(norte);
const pesosPCA_S = pesosPCA(sul);

console.log(`\n=== Comparação: pesos atuais (chutados) vs pesos PCA (empíricos) ===`);
console.log("  Sub-bacia Norte:");
for (const e of norte) {
  const atu = PESOS_ATUAIS[e];
  const pca = pesosPCA_N[e];
  console.log(`    ${e.padEnd(13)} atual=${atu.toFixed(2)}  PCA=${pca.toFixed(2)}  Δ=${(pca-atu>=0?"+":"")}${(pca-atu).toFixed(2)}`);
}
console.log("  Sub-bacia Sul:");
for (const e of sul) {
  const atu = PESOS_ATUAIS[e];
  const pca = pesosPCA_S[e];
  console.log(`    ${e.padEnd(13)} atual=${atu.toFixed(2)}  PCA=${pca.toFixed(2)}  Δ=${(pca-atu>=0?"+":"")}${(pca-atu).toFixed(2)}`);
}

// Salva resultado
const ts = `// AUTO-GERADO por scripts/pca-validacao-pesos.mjs — NÃO EDITAR À MÃO.
// Validação dos pesos das sub-bacias contra loadings empíricos PC2.

export interface PCAValidacao {
  variancia_explicada_pc1: number;
  variancia_explicada_pc2: number;
  separacao_norte_sul_pc2: number;
  loadings_pc1: Record<string, number>;
  loadings_pc2: Record<string, number>;
  pesos_atuais: Record<string, number>;
  pesos_pca_norte: Record<string, number>;
  pesos_pca_sul: Record<string, number>;
}

export const PCA_VALIDACAO: PCAValidacao = ${JSON.stringify({
  variancia_explicada_pc1: +(100*pc1.lambda/totalVar).toFixed(1),
  variancia_explicada_pc2: +(100*pc2.lambda/totalVar).toFixed(1),
  separacao_norte_sul_pc2: +(mediaN_pc2 - mediaS_pc2).toFixed(3),
  loadings_pc1: Object.fromEntries(ESTACOES.map((e, i) => [e, +pc1Loadings[i].toFixed(3)])),
  loadings_pc2: Object.fromEntries(ESTACOES.map((e, i) => [e, +pc2Loadings[i].toFixed(3)])),
  pesos_atuais: PESOS_ATUAIS,
  pesos_pca_norte: Object.fromEntries(Object.entries(pesosPCA_N).map(([k,v]) => [k, +v.toFixed(3)])),
  pesos_pca_sul: Object.fromEntries(Object.entries(pesosPCA_S).map(([k,v]) => [k, +v.toFixed(3)])),
}, null, 2)};
`;
writeFileSync(join(ROOT, "lib/pca-validacao.ts"), ts);
console.log("\n✓ lib/pca-validacao.ts gerado");
