// scripts/agro/gera-h-arco-norte.ts
// Reconstrói a série semanal HISTÓRICA do componente H (Arco Norte) a partir
// dos dados já versionados em data/ e grava data/agro/h-arco-norte.json —
// o cache que lib/agro-content.ts e o backtest consomem.
//
// TODO O CÁLCULO flui por lib/iee.ts (calculaComponenteH) e pelas libs
// hidrológicas existentes (calculaIRCTabocal, projetaCruzamentoCalado,
// calculaIDNFallback) — este script só MONTA OS INSUMOS semana a semana.
//
// Insumos e janelas:
//   - cota Itacoatiara: data/itacoatiara_hidroweb.csv (1927 → 2026-05-08)
//   - cota Manaus: 4estacoes_2016_2025.csv → manaus_gap_2025.csv →
//     manaus_porto_nov2025_abr2026.csv (costura); faltando, aproxima por
//     ITA + delta mediano (só afeta o componente lag, peso pequeno)
//   - IDN: fallback SGC × Humaitá (calculaIDNFallback); após o fim das
//     séries (out-dez/2025), carrega o último IDN conhecido (conservador)
//   - pico p/ urgência de calado: máximo móvel de 182 dias (26 semanas) de
//     ITA — captura o pico do CICLO CORRENTE (meia-onda de subida/descida);
//     janela de 365d pegaria o pico da safra anterior, cujo cruzamento já
//     ocorreu, e saturaria a urgência indevidamente na cheia (bug corrigido
//     no PASSO 6). Walk-forward: nenhum dado futuro entra na semana.
//   - onda branca: "nenhuma"/0 (CONSERVADOR: subestima o IRC fora do calado;
//     o componente dominante — calado, com piso dominador — não é afetado)
//
// Execução: npx tsx scripts/agro/gera-h-arco-norte.ts

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { calculaComponenteH, semanaISODeData } from "../../lib/iee";
import { calculaIDNFallback } from "../../lib/calcula-idn";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "agro", "h-arco-norte.json");

function carregaCSV(nome: string, colData = 0, colValor = 1): Map<string, number> {
  const m = new Map<string, number>();
  const linhas = readFileSync(join(RAIZ, "data", nome), "utf8").trim().split("\n");
  for (const ln of linhas.slice(1)) {
    const c = ln.split(",");
    const v = parseFloat(c[colValor]);
    if (c[colData]?.match(/^\d{4}-\d{2}-\d{2}/) && Number.isFinite(v)) m.set(c[colData], v);
  }
  return m;
}

const ISO = (d: Date) => d.toISOString().slice(0, 10);
const addDias = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return ISO(d);
};

/** último valor ≤ data, com tolerância máxima em dias */
function ultimoAte(serie: Map<string, number>, dataISO: string, tolDias: number): number | null {
  for (let k = 0; k <= tolDias; k++) {
    const v = serie.get(addDias(dataISO, -k));
    if (v != null) return v;
  }
  return null;
}

function main() {
  const ita = carregaCSV("itacoatiara_hidroweb.csv");
  const estacoes4 = readFileSync(join(RAIZ, "data", "4estacoes_2016_2025.csv"), "utf8").trim().split("\n");
  const mao = new Map<string, number>();
  for (const ln of estacoes4.slice(1)) {
    const c = ln.split(",");
    if (Number.isFinite(parseFloat(c[1]))) mao.set(c[0], parseFloat(c[1]));
  }
  for (const [d, v] of carregaCSV("manaus_gap_2025.csv")) mao.set(d, v);
  for (const [d, v] of carregaCSV("manaus_porto_nov2025_abr2026.csv")) mao.set(d, v);
  const sgc = carregaCSV("sgc_hidroweb.csv");
  const hum = carregaCSV("humaita_hidroweb.csv");

  // delta mediano MAO−ITA (p/ aproximar Manaus onde faltar)
  const deltas: number[] = [];
  for (const [d, v] of mao) { const i = ita.get(d); if (i != null) deltas.push(v - i); }
  deltas.sort((a, b) => a - b);
  const deltaMed = deltas[deltas.length >> 1] ?? 11;

  // grade semanal: sábados de 2017-01-07 até a última data de ITA
  const datasIta = [...ita.keys()].sort();
  const fim = datasIta[datasIta.length - 1];
  const semanas: {
    d: string; ph: number; irc: number; urgencia: number;
    dias: number | null; cotaIta: number; idn: number;
  }[] = [];
  let idnAtual = 0;

  for (let d = "2017-01-07"; d <= fim; d = addDias(d, 7)) {
    const cotaIta = ultimoAte(ita, d, 14);
    if (cotaIta == null) continue;
    const cotaMao = ultimoAte(mao, d, 14) ?? cotaIta + deltaMed;
    const s = ultimoAte(sgc, d, 30);
    const h = ultimoAte(hum, d, 30);
    if (s != null && h != null) idnAtual = calculaIDNFallback(s, h);

    // pico móvel 182d / 26 semanas (walk-forward) — pico do ciclo corrente
    let picoCota = -Infinity, picoData = d;
    for (let k = 0; k <= 182; k += 1) {
      const v = ita.get(addDias(d, -k));
      if (v != null && v > picoCota) { picoCota = v; picoData = addDias(d, -k); }
    }
    if (!Number.isFinite(picoCota)) continue;

    const r = calculaComponenteH(
      {
        cotaItacoatiara_m: cotaIta, cotaManaus_m: cotaMao, idn: idnAtual,
        severidade_onda: "nenhuma", var_onda_m: 0,
      },
      "arco-norte",
      { cota_m: picoCota, dataISO: picoData },
      [], semanaISODeData(d), d,
    );
    if (!r) continue;
    semanas.push({
      d, ph: r.phBruto, irc: r.ircTabocal, urgencia: r.urgenciaCalado,
      dias: r.diasAteCaladoCritico, cotaIta, idn: +idnAtual.toFixed(3),
    });
  }

  writeFileSync(ARQ_SAIDA, JSON.stringify({
    fonte: "IBI — componente H reconstruído de data/ (ITA HidroWeb, 4 estações, SGC/Humaitá) via lib/iee.ts + libs hidrológicas",
    metodo: "P_H = 0,60·IRC-Tabocal(v3.6) + 0,40·urgência de calado (CMR<11 m via recessão Itacoatiara + curva CMR Capitania). Onda branca conservadora (nenhuma); IDN por fallback SGC×Humaitá.",
    geradoEm: new Date().toISOString().slice(0, 10),
    status: "ok",
    semanas,
  }, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
  console.log(`[h-arco-norte] ${semanas.length} semanas (${semanas[0].d} → ${semanas[semanas.length - 1].d})`);

  // espiar o episódio-alvo out/2024
  const out24 = semanas.filter((w) => w.d >= "2024-09-15" && w.d <= "2024-11-15");
  console.log("out/2024:", out24.map((w) => `${w.d} ita=${w.cotaIta} ph=${w.ph} irc=${w.irc} urg=${w.urgencia}`).join("\n          "));
}
main();
