// Converte os dados estáticos TypeScript para data/ana-idn-series.json.
// Lê IDN_HISTORICO_CALCULADO (semanal, 2016–out/2025),
//     IDN_RECENTE_DIARIO (diário, últimos 180d até out/2025),
//     IDN_HISTORICO de dados-historicos.ts (boletim, 2024–2026 sparse).
// Faz merge com deduplicação e escrita ordenada por data.
//
// Rodar: node scripts/seed-idn-series.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Extrai um array TypeScript de um arquivo TS dado o nome da constante.
// Usa eval() em contexto isolado para lidar com:
//   - comentários de linha (// ...)
//   - trailing commas
//   - chaves sem aspas (TS object literal syntax)
// Os arquivos alvo são auto-gerados e não contêm código arbitrário — eval é seguro aqui.
function extrairArray(src, nomeConstante) {
  const re = new RegExp(`${nomeConstante}[^=]*=\\s*(\\[[\\s\\S]*?\\]);`);
  const m = src.match(re);
  if (!m) throw new Error(`Constante ${nomeConstante} não encontrada`);
  // Avalia como expressão JavaScript (que é superset de JSON e aceita TS object literals)
  // eslint-disable-next-line no-eval
  return eval(`(${m[1]})`);
}

// --- Lê os arquivos TypeScript ---
const srcHistorico = readFileSync(join(ROOT, "lib/idn-historico-calculado.ts"), "utf-8");
const srcDadosHist = readFileSync(join(ROOT, "lib/dados-historicos.ts"), "utf-8");

const historico  = extrairArray(srcHistorico, "IDN_HISTORICO_CALCULADO"); // semanal 2016–2025
const recente    = extrairArray(srcHistorico, "IDN_RECENTE_DIARIO");      // diário últimos 180d
const boletim    = extrairArray(srcDadosHist, "IDN_HISTORICO");           // boletim sparse

console.log(`IDN_HISTORICO_CALCULADO: ${historico.length} pontos`);
console.log(`IDN_RECENTE_DIARIO: ${recente.length} pontos`);
console.log(`IDN_HISTORICO (boletim): ${boletim.length} pontos`);

// --- Merge com deduplicação ---
// Prioridade: boletim > diário/recente > semanal/historico
// Para cada data mantemos apenas 1 ponto com a fonte mais confiável.

/** @type {Map<string, { data: string; idn: number; fonte: string }>} */
const mapa = new Map();

// 1. Semanal (mais baixa prioridade)
for (const p of historico) {
  mapa.set(p.data, { data: p.data, idn: p.idn, fonte: "hidroweb" });
}

// 2. Diário recente (substitui se já existir como semanal — mesma fonte, mas resolução maior)
for (const p of recente) {
  const existente = mapa.get(p.data);
  if (!existente || existente.fonte === "hidroweb") {
    mapa.set(p.data, { data: p.data, idn: p.idn, fonte: "hidroweb" });
  }
}

// 3. Boletim (sobrescreve sempre — fonte editorial, maior confiança)
for (const p of boletim) {
  mapa.set(p.data, { data: p.data, idn: p.idn, fonte: "boletim" });
}

// --- Ordena e escreve ---
const serie = Array.from(mapa.values()).sort((a, b) => a.data.localeCompare(b.data));

const saida = {
  gerado_em: new Date().toISOString(),
  serie,
};

mkdirSync(join(ROOT, "data"), { recursive: true });
writeFileSync(join(ROOT, "data/ana-idn-series.json"), JSON.stringify(saida, null, 2), "utf-8");

const countFontes = serie.reduce((acc, p) => {
  acc[p.fonte] = (acc[p.fonte] ?? 0) + 1;
  return acc;
}, {});

console.log(`\nEscrito: data/ana-idn-series.json`);
console.log(`Total: ${serie.length} pontos`);
console.log(`Por fonte:`, countFontes);
console.log(`Primeiro: ${serie.at(0)?.data}  Último: ${serie.at(-1)?.data}`);
