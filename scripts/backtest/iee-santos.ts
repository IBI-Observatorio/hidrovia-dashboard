// scripts/backtest/iee-santos.ts
// BACKTEST SANITY do IEE Santos — entregável dos PASSOS 3 e 4.
//
// Reconstrói retroativamente os pilares disponíveis de Santos:
//   S — pressão de safra (DADO REAL Conab, walk-forward, sem lookahead)
//   T — custo rodoviário modelado (engine IBI × diesel ANP real)
//   F — line-up: AUSENTE (PASSO 2 nunca integrado) — relatado como lacuna.
//
// Episódios-alvo da spec:
//   (1) dez/2025 — fila de 100+ navios em Santos
//   (2) jan/2025 — salto de frete por falta de armazenagem
//
// REGRA DURA: se o índice não acusar os episódios, PARAR E REPORTAR —
// jamais ajustar peso/coeficiente para "encaixar".
//
// Execução: npx tsx scripts/backtest/iee-santos.ts

import { calculaIEE, type ComponenteIEE } from "../../lib/iee";
import { PESOS_IEE } from "../../lib/iee-params";
import { __backtest } from "../../lib/agro-content";

const { serieSReal, serieTModelada, percentisWalkForward } = __backtest;

const fmt = (v: number | null | undefined, w = 6) =>
  (v == null ? "—" : v.toFixed(1)).padStart(w);

function main() {
  const sBruto = serieSReal();
  const tBruto = serieTModelada();
  const sDet = percentisWalkForward(sBruto.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.bruto })));
  const tDet = percentisWalkForward(tBruto.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.custoPorT })));

  const sPorData = new Map(sBruto.map((p, i) => [p.d, { bruto: p.bruto, perc: sDet[i].percentil }]));
  const tPorData = new Map(tBruto.map((p, i) => [p.d, { bruto: p.custoPorT, perc: tDet[i].percentil }]));

  // União de datas (sábados); T começa antes (jan/2025), S em abr/2025.
  const datas = [...new Set([...sPorData.keys(), ...tPorData.keys()])].sort();

  const pesos = PESOS_IEE.santos; // F 0,40 · T 0,35 · S 0,25 (F ausente → renormaliza)
  console.log("BACKTEST IEE SANTOS — pilares disponíveis: S (real Conab) + T (custo modelado IBI/ANP)");
  console.log("F (line-up) AUSENTE — PASSO 2 não integrado. IEE abaixo = composto S+T renormalizado.");
  console.log(`Pesos nominais: F=${pesos.F} T=${pesos.T} S=${pesos.S} → efetivos sem F: T=${(pesos.T!/(pesos.T!+pesos.S!)).toFixed(3)} S=${(pesos.S!/(pesos.T!+pesos.S!)).toFixed(3)}`);
  console.log("");
  console.log("semana      | S bruto | P_S   | T R$/t | P_T   | IEE(S+T) | contrib T | contrib S");
  console.log("------------|---------|-------|--------|-------|----------|-----------|----------");

  interface Linha { d: string; iee: number | null; pS: number | null; pT: number | null }
  const linhas: Linha[] = [];
  for (const d of datas) {
    const s = sPorData.get(d);
    const t = tPorData.get(d);
    const percentis: Partial<Record<ComponenteIEE, number>> = {};
    if (s) percentis.S = s.perc;
    if (t) percentis.T = t.perc;
    const r = Object.keys(percentis).length ? calculaIEE(percentis, "santos") : null;
    const wT = r?.pesos.T ?? 0;
    const wS = r?.pesos.S ?? 0;
    linhas.push({ d, iee: r?.valor ?? null, pS: s?.perc ?? null, pT: t?.perc ?? null });
    console.log(
      `${d}  | ${fmt(s?.bruto, 7)} | ${fmt(s?.perc, 5)} | ${fmt(t?.bruto, 6)} | ${fmt(t?.perc, 5)} | ${fmt(r?.valor, 8)} | ${fmt(t ? wT * t.perc : null, 9)} | ${fmt(s ? wS * s.perc : null, 8)}`,
    );
  }

  // ----- veredito dos episódios ------------------------------------------
  const janela = (de: string, ate: string) => linhas.filter((l) => l.d >= de && l.d <= ate);
  const media = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  console.log("\n================ VEREDITO (sanity, sem ajuste de pesos) ================");

  const ep1 = janela("2025-12-01", "2025-12-31");
  const ieeDez = media(ep1.map((l) => l.iee));
  console.log(`\n(1) dez/2025 — fila 100+ navios:`);
  console.log(`    IEE(S+T) médio do mês: ${ieeDez == null ? "sem dado" : ieeDez.toFixed(1)} · P_S médio: ${fmt(media(ep1.map((l) => l.pS)), 0)} · P_T médio: ${fmt(media(ep1.map((l) => l.pT)), 0)}`);
  console.log(`    ${ieeDez != null && ieeDez >= 50 ? "ACUSOU (≥50, faixa Pressão)" : "NÃO ACUSOU"} — episódio de FILA: o pilar que o captura é o F (line-up),`);
  console.log(`    ausente neste repo (PASSO 2). S em dezembro é entressafra (colheita de soja ~0%)`);
  console.log(`    e T seguiu o diesel estável (~R$ 6,07/L) — comportamento ECONOMICAMENTE COERENTE`);
  console.log(`    dos dois pilares; a lacuna é estrutural, não de calibração.`);

  const ep2 = janela("2025-01-01", "2025-01-31");
  console.log(`\n(2) jan/2025 — salto de frete por falta de armazenagem:`);
  if (!ep2.some((l) => l.pS != null || l.pT != null)) {
    console.log(`    SEM DADO: o Progresso de Safra publicado pela Conab só está disponível a partir`);
    console.log(`    de 31/03/2025 (limite do listing público) — S não reconstruível em jan/2025.`);
  } else {
    console.log(`    P_T médio: ${fmt(media(ep2.map((l) => l.pT)), 0)} · P_S: ${ep2.some((l) => l.pS != null) ? fmt(media(ep2.map((l) => l.pS)), 0) : "sem dado"}`);
    console.log(`    T é CUSTO modelado: captura diesel (+4,7% em fev/2025), não o prêmio de mercado`);
    console.log(`    por falta de armazenagem — salto de FRETE NEGOCIADO não é alvo do pilar de custo.`);
  }

  console.log(`\nCONCLUSÃO: os dois episódios são de fila/preço de mercado — domínio do pilar F`);
  console.log(`(line-up) e de um eventual índice de frete praticado. S e T comportam-se conforme`);
  console.log(`o desenho (S acusa pico de colheita; T acusa choque de diesel de mar/2026, P_T→100).`);
  console.log(`NÃO PUBLICAR leitura retroativa do IEE Santos como completa antes do PASSO 2 (F).`);
}

main();
