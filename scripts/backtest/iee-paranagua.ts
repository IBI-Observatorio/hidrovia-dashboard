// scripts/backtest/iee-paranagua.ts
// BACKTEST SANITY do IEE PARANAGUÁ — entregável do PASSO 5.
//
// Reconstrói retroativamente os pilares disponíveis do corredor:
//   S — pressão de safra (REAL Conab; hinterlândia PR+SC, MS-sul excluído v0)
//   T — custo rodoviário modelado (engine IBI × diesel ANP; rotas do PR)
//   F — line-up APPA: histórico nasce HOJE (1 snapshot) — sem retroativo.
//       O pico de fev/2025 NÃO é verificável sem line-up histórico; a APPA
//       não publica série retroativa aberta do line-up → relatado como lacuna.
//
// Compara também o PERFIL SAZONAL Santos × Paranaguá (S bruto normalizado):
// os picos devem ser correlacionados mas NÃO idênticos — a 2ª safra de
// milho do PR colhe mais tarde que GO/MT (safrinha puxa Paranaguá depois).
//
// REGRA DURA: sem ajuste de pesos para "encaixar" episódios.
//
// Execução: npx tsx scripts/backtest/iee-paranagua.ts

import { calculaIEE, type ComponenteIEE } from "../../lib/iee";
import { PESOS_IEE } from "../../lib/iee-params";
import { __backtest } from "../../lib/agro-content";

const { serieSReal, serieTModelada, percentisWalkForward } = __backtest;

const fmt = (v: number | null | undefined, w = 6) =>
  (v == null ? "—" : v.toFixed(1)).padStart(w);

function main() {
  // --- Paranaguá: S + T retroativos -------------------------------------
  const sB = serieSReal("paranagua");
  const tB = serieTModelada("paranagua");
  const sDet = percentisWalkForward(sB.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.bruto })));
  const tDet = percentisWalkForward(tB.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.custoPorT })));
  const sPorData = new Map(sB.map((p, i) => [p.d, { bruto: p.bruto, perc: sDet[i].percentil }]));
  const tPorData = new Map(tB.map((p, i) => [p.d, { bruto: p.custoPorT, perc: tDet[i].percentil }]));
  const datas = [...new Set([...sPorData.keys(), ...tPorData.keys()])].sort();

  const pesos = PESOS_IEE.paranagua;
  console.log("BACKTEST IEE PARANAGUÁ — pilares retroativos: S (real Conab, PR+SC) + T (custo modelado IBI/ANP)");
  console.log("F (line-up APPA): histórico inicia em 10/06/2026 (1 snapshot) — retroativo INDISPONÍVEL;");
  console.log("o pico de fev/2025 do corredor não é verificável sem série de line-up — lacuna relatada.");
  console.log(`Pesos nominais: F=${pesos.F} T=${pesos.T} S=${pesos.S} → efetivos sem F: T=${(pesos.T!/(pesos.T!+pesos.S!)).toFixed(3)} S=${(pesos.S!/(pesos.T!+pesos.S!)).toFixed(3)}`);
  console.log("");
  console.log("semana      | S bruto | P_S   | T R$/t | P_T   | IEE(S+T) | contrib T | contrib S");
  console.log("------------|---------|-------|--------|-------|----------|-----------|----------");

  const linhas: { d: string; iee: number | null }[] = [];
  for (const d of datas) {
    const s = sPorData.get(d);
    const t = tPorData.get(d);
    const percentis: Partial<Record<ComponenteIEE, number>> = {};
    if (s) percentis.S = s.perc;
    if (t) percentis.T = t.perc;
    const r = Object.keys(percentis).length ? calculaIEE(percentis, "paranagua") : null;
    linhas.push({ d, iee: r?.valor ?? null });
    console.log(
      `${d}  | ${fmt(s?.bruto, 7)} | ${fmt(s?.perc, 5)} | ${fmt(t?.bruto, 6)} | ${fmt(t?.perc, 5)} | ${fmt(r?.valor, 8)} | ${fmt(t && r ? (r.pesos.T ?? 0) * t.perc : null, 9)} | ${fmt(s && r ? (r.pesos.S ?? 0) * s.perc : null, 8)}`,
    );
  }

  // --- Comparação sazonal Santos × Paranaguá (S bruto normalizado) ------
  const sSantos = serieSReal("santos");
  const maxStos = Math.max(...sSantos.map((p) => p.bruto)) || 1;
  const maxPgua = Math.max(...sB.map((p) => p.bruto)) || 1;
  const pguaPorData = new Map(sB.map((p) => [p.d, p.bruto]));

  console.log("\n========== PERFIL SAZONAL — S bruto normalizado (0–100% do pico) ==========");
  console.log("mês      | Santos | Paranaguá | leitura");
  console.log("---------|--------|-----------|---------------------------------");
  const porMes = new Map<string, { st: number[]; pg: number[] }>();
  for (const p of sSantos) {
    const mes = p.d.slice(0, 7);
    const e = porMes.get(mes) ?? { st: [], pg: [] };
    e.st.push(p.bruto / maxStos);
    const pg = pguaPorData.get(p.d);
    if (pg != null) e.pg.push(pg / maxPgua);
    porMes.set(mes, e);
  }
  const med = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  let defasagens: string[] = [];
  for (const [mes, e] of [...porMes.entries()].sort()) {
    const st = med(e.st); const pg = med(e.pg);
    const leitura =
      st != null && pg != null
        ? pg - st > 0.08 ? "Paranaguá mais pressionado" : st - pg > 0.08 ? "Santos mais pressionado" : "equilibrado"
        : "—";
    if (st != null && pg != null && pg - st > 0.08) defasagens.push(mes);
    console.log(`${mes}  | ${fmt(st != null ? st * 100 : null)} | ${fmt(pg != null ? pg * 100 : null, 9)} | ${leitura}`);
  }

  console.log("\n================ VEREDITO (sanity, sem ajuste de pesos) ================");
  console.log(`Correlação esperada com defasagem: a 2ª safra de milho do PR colhe ~6–8 semanas`);
  console.log(`depois de MT/GO — meses em que Paranaguá segue pressionado após o pico de Santos: ${defasagens.join(", ") || "nenhum"}.`);
  console.log(`F retroativo: INDISPONÍVEL (histórico do line-up APPA nasce em 10/06/2026).`);
  console.log(`NÃO PUBLICAR leitura retroativa do IEE Paranaguá como completa antes do histórico`);
  console.log(`de F acumular e do denominador ANTAQ substituir a capacidade declarada.`);
}

main();
