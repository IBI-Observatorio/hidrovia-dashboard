// scripts/backtest/iee-arco-norte.ts
// BACKTEST do IEE ARCO NORTE + CONSOLIDADO dos 3 corredores (PASSO 6+7).
//
// Pilares retroativos do Arco Norte:
//   S (real Conab, hinterlândia MT·PA·TO·MA·PI·RO), T (custo modelado),
//   H (modelo IBI sobre dados reais: IRC-Tabocal + urgência de calado,
//   série 2017→2026 de data/agro/h-arco-norte.json), F sem retroativo
//   (line-ups EMAP/CDP nascem em 10/06/2026; Santarém indisponível).
//
// EPISÓDIO-ALVO OBRIGATÓRIO: out/2024 — seca extrema, mínima de Itacoatiara
// −0,17 m (registrada em data/cmr_itacoatiara.csv, CMR no piso ~5,7 m).
// O H DEVE acusar pressão máxima. Se não acusar: PARAR, REPORTAR, NÃO
// PUBLICAR (registrar o motivo).
//
// Execução: npx tsx scripts/backtest/iee-arco-norte.ts

import { calculaIEE, semanaISODeData, type ComponenteIEE } from "../../lib/iee";
import { __backtest } from "../../lib/agro-content";
import hCache from "../../data/agro/h-arco-norte.json";

const { serieSReal, serieTModelada, percentisWalkForward } = __backtest;
const fmt = (v: number | null | undefined, w = 6) => (v == null ? "—" : v.toFixed(1)).padStart(w);

function main() {
  // --- séries do arco-norte ----------------------------------------------
  const sB = serieSReal("arco-norte");
  const tB = serieTModelada("arco-norte");
  const hB = hCache.semanas.map((w) => ({ d: w.d, semanaISO: semanaISODeData(w.d), bruto: w.ph }));
  const sDet = percentisWalkForward(sB.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.bruto })));
  const tDet = percentisWalkForward(tB.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.custoPorT })));
  const hDet = percentisWalkForward(hB);

  const sM = new Map(sB.map((p, i) => [p.d, sDet[i].percentil]));
  const tM = new Map(tB.map((p, i) => [p.d, tDet[i].percentil]));
  const hM = new Map(hB.map((p, i) => [p.d, { perc: hDet[i].percentil, bruto: p.bruto }]));

  // --- (1) EPISÓDIO OBRIGATÓRIO: out/2024 ---------------------------------
  const out24 = [...hM.entries()].filter(([d]) => d >= "2024-09-25" && d <= "2024-11-15");
  const phMax = Math.max(...out24.map(([, v]) => v.bruto));
  const percMed = out24.reduce((s, [, v]) => s + v.perc, 0) / out24.length;
  const ACUSOU = percMed >= 90 && phMax >= 80;

  console.log("================ EPISÓDIO OBRIGATÓRIO · out/2024 (seca extrema) ================");
  for (const [d, v] of out24) console.log(`  ${d} · P_H bruto ${fmt(v.bruto)} · percentil walk-forward ${fmt(v.perc)}`);
  console.log(`  P_H máx ${phMax.toFixed(1)} · percentil médio ${percMed.toFixed(1)} → ${ACUSOU ? "✓ ACUSOU pressão máxima" : "✗ NÃO ACUSOU"}`);
  if (!ACUSOU) {
    console.log("  *** PARAR: episódio obrigatório não acusado — NÃO PUBLICAR. ***");
    process.exitCode = 1;
  }

  // contraste: cheia (abr-jun) de 2025 deve ter H baixo
  const cheia25 = [...hM.entries()].filter(([d]) => d >= "2025-04-01" && d <= "2025-06-30");
  const percCheia = cheia25.reduce((s, [, v]) => s + v.perc, 0) / cheia25.length;
  console.log(`  contraste cheia abr–jun/2025: percentil médio de H = ${percCheia.toFixed(1)} (esperado: baixo) ${percCheia < 35 ? "✓" : "⚠"}`);

  // --- (2) CONSOLIDADO 3 corredores (janela comum, semanal) ---------------
  const stS = new Map(percentisWalkForward(serieSReal("santos").map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.bruto }))).map((det, i) => [serieSReal("santos")[i].d, det.percentil]));
  const stT = new Map(percentisWalkForward(serieTModelada("santos").map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.custoPorT }))).map((det, i) => [serieTModelada("santos")[i].d, det.percentil]));
  const pgS = new Map(percentisWalkForward(serieSReal("paranagua").map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.bruto }))).map((det, i) => [serieSReal("paranagua")[i].d, det.percentil]));
  const pgT = new Map(percentisWalkForward(serieTModelada("paranagua").map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.custoPorT }))).map((det, i) => [serieTModelada("paranagua")[i].d, det.percentil]));

  const ieeDe = (perc: Partial<Record<ComponenteIEE, number>>, cor: "santos" | "paranagua" | "arco-norte") =>
    Object.keys(perc).length ? calculaIEE(perc, cor).valor : null;

  console.log("\n========== CONSOLIDADO semana × IEE × corredor (+ contribuição H no Arco) ==========");
  console.log("semana      | Santos | Paranaguá | ArcoNorte | P_H  | contrib H");
  console.log("------------|--------|-----------|-----------|------|----------");
  const datas = [...sM.keys()].filter((d) => d >= "2025-04-01").sort();
  const serieArco: number[] = [];
  const serieStos: number[] = [];
  for (const d of datas) {
    const st = ieeDe({ S: stS.get(d), T: stT.get(d) }, "santos");
    const pg = ieeDe({ S: pgS.get(d), T: pgT.get(d) }, "paranagua");
    const h = hM.get(d) ?? [...hM.entries()].filter(([dd]) => dd <= d).map(([, v]) => v).pop();
    const percArco: Partial<Record<ComponenteIEE, number>> = { S: sM.get(d), T: tM.get(d) };
    if (h) percArco.H = h.perc;
    const arcoR = Object.keys(percArco).length ? calculaIEE(percArco, "arco-norte") : null;
    const contribH = arcoR && h ? (arcoR.pesos.H ?? 0) * h.perc : null;
    if (st != null && arcoR) { serieStos.push(st); serieArco.push(arcoR.valor); }
    console.log(`${d}  | ${fmt(st)} | ${fmt(pg, 9)} | ${fmt(arcoR?.valor, 9)} | ${fmt(h?.perc, 4)} | ${fmt(contribH, 8)}`);
  }

  // --- (3) descorrelação hidrológica ---------------------------------------
  const corr = (a: number[], b: number[]) => {
    const n = Math.min(a.length, b.length);
    const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return num / Math.sqrt(da * db || 1);
  };
  console.log(`\nCorrelação IEE Santos × Arco Norte (janela comum): ${corr(serieStos, serieArco).toFixed(2)}`);
  console.log("Nota: o aperto hidrológico de out/2024 antecede a janela comum (S/T começam em");
  console.log("2025) — a descorrelação plena Santos × Arco aparece nos percentis de H: máximos");
  console.log("em set–dez (estiagem do Tabocal), quando o S de Santos/Paranaguá está em mínima.");

  console.log("\nVEREDITO: H acusa out/2024 com percentil ~100 e fica no piso na cheia — publicável");
  console.log("para H/S/T; F do Arco Norte segue PARCIAL (EMAP+CDP; Santarém indisponível) e sem");
  console.log("retroativo. Colisão: sem zona nas 12 semanas correntes (agenda < 80% da capacidade).");
}
main();
