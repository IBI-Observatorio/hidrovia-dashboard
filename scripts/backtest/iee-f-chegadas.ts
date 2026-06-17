// scripts/backtest/iee-f-chegadas.ts
// EXPLORATÓRIO — o pilar F tem sinal na ANTAQ?
//
// O line-up (APS/DIOPE) que alimenta o F hoje nasceu em jun/2026: quase sem
// histórico, então o F mal pesa. A pergunta: a ANTAQ — que já temos 2016→2026
// em espera-semanal.json — carrega um sinal de FILA utilizável para o F?
//
// O espera-semanal.json traz, por semana de CHEGADA: [semana, espera_h, n],
// onde n = nº de graneleiros de grão que CHEGARAM. n é PRESSÃO DE CHEGADAS —
// inflow do porto — e NÃO usa a espera (o alvo). Logo, testar n(t) → espera(t+2)
// é honesto (sem leakage). Medimos:
//   - n cru (percentil sazonal walk-forward)
//   - n suavizado (soma móvel 3 e 4 sem — "backlog se formando")
//   - lags 0..4 (estrutura de antecedência)
// Comparação: o T-custo sozinho dá Spearman 0,33 vs espera t+2 (régua a bater).
//
//   npx tsx scripts/backtest/iee-f-chegadas.ts

import { semanaISODeData } from "../../lib/iee";
import { __backtest as bt } from "../../lib/agro-content";
import esperaEA from "../../data/antaq/espera-semanal.json";

const CORR = "santos";
const MS_SEM = 7 * 86400000;

function segunda(iso: string): string {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}
function rank(a: number[]): number[] {
  const idx = a.map((v, i) => [v, i] as [number, number]).sort((p, q) => p[0] - q[0]);
  const r = new Array<number>(a.length);
  idx.forEach(([, i], k) => (r[i] = k + 1));
  return r;
}
function spearman(x: number[], y: number[]): number {
  const rx = rank(x), ry = rank(y), n = x.length, m = (n + 1) / 2;
  let s = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = rx[i] - m, b = ry[i] - m; s += a * b; dx += a * a; dy += b * b; }
  return dx && dy ? s / Math.sqrt(dx * dy) : 0;
}

type Linha = [string, number, number]; // [semana, espera_h, n]

function corredor(CORR: string) {
  const serie = (esperaEA.corredores as unknown as Record<string, Linha[]>)[CORR].slice();
  serie.sort((a, b) => (a[0] < b[0] ? -1 : 1));

  // alvo: percentil sazonal walk-forward da espera (mesmo do pré-registro)
  const detE = bt.percentisWalkForward(
    serie.map(([d, h]) => ({ d, semanaISO: semanaISODeData(d), bruto: h })),
  );
  const alvo = new Map(serie.map(([d], i) => [segunda(d), detE[i].percentil]));

  // sinais de chegada — n cru e somas móveis (preenchendo só onde há janela cheia)
  const nser = serie.map(([, , n]) => n);
  function movel(k: number): (number | null)[] {
    return nser.map((_, i) => {
      if (i + 1 < k) return null;
      let s = 0;
      for (let j = i - k + 1; j <= i; j++) s += nser[j];
      return s;
    });
  }
  const sinais: Record<string, (number | null)[]> = {
    "n cru": nser,
    "n soma-3sem": movel(3),
    "n soma-4sem": movel(4),
  };

  console.log(`=== Pilar F a partir da ANTAQ — pressão de chegadas → espera t+lag · ${CORR} ===`);
  console.log(`semanas na série: ${serie.length} (${serie[0][0]} → ${serie.at(-1)![0]})`);
  console.log("régua: T-custo sozinho = Spearman 0,33 vs espera t+2\n");
  console.log("sinal          lag |  Spearman   pares");

  for (const [nome, raw] of Object.entries(sinais)) {
    // percentil sazonal walk-forward do sinal (só pontos definidos)
    const pts = serie
      .map(([d], i) => ({ d, semanaISO: semanaISODeData(d), bruto: raw[i] }))
      .filter((p) => p.bruto != null) as { d: string; semanaISO: number; bruto: number }[];
    const detS = bt.percentisWalkForward(pts);
    const pctl = new Map(pts.map((p, i) => [segunda(p.d), detS[i].percentil]));

    for (const lag of [0, 1, 2, 3, 4]) {
      const X: number[] = [], Y: number[] = [];
      for (const [k, px] of pctl) {
        const kL = new Date(new Date(k + "T00:00:00Z").getTime() + lag * MS_SEM)
          .toISOString().slice(0, 10);
        const y = alvo.get(kL);
        if (y != null) { X.push(px); Y.push(y); }
      }
      const s = spearman(X, Y);
      const marca = lag === 2 ? "  ← horizonte do pré-registro" : "";
      console.log(`${nome.padEnd(14)} t+${lag} |  ${s.toFixed(2).padStart(5)}    ${X.length}${marca}`);
    }
    console.log("");
  }
}

function main() {
  for (const c of [CORR, "paranagua", "arco-norte"]) corredor(c);
}
main();
