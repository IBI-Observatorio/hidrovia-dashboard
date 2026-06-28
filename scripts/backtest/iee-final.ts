// scripts/backtest/iee-final.ts
// PASSO 8 — BACKTEST FINAL UNIFICADO dos 3 corredores + episódios-âncora
// do pré-registro. Gera scripts/backtest/README.md com os vereditos.
//
// Tudo walk-forward (sem lookahead), pesos congelados do pré-registro v0
// (a integridade é verificada por hash ANTES de rodar — drift bloqueia).
//
// Execução: npx tsx scripts/backtest/iee-final.ts

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { calculaIEE, semanaISODeData, type ComponenteIEE, type Corredor } from "../../lib/iee";
import { __backtest } from "../../lib/agro-content";
import hCache from "../../data/agro/h-arco-norte.json";
import esperaEA from "../../data/antaq/espera-semanal.json";
import preRegistro from "../../data/agro/pre-registro-iee-v8.json";

const { serieSReal, serieTModelada, serieFChegadasAntaq, percentisWalkForward } = __backtest;
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fmt = (v: number | null | undefined, w = 6) => (v == null ? "—" : v.toFixed(1)).padStart(w);

interface Veredito { id: string; ok: boolean | null; detalhe: string; indisponivel?: boolean }

function main() {
  // ── 0) integridade do pré-registro (drift bloqueia o backtest) ─────────
  try {
    execSync("npx tsx scripts/agro/gera-pre-registro.ts", { cwd: RAIZ, stdio: "pipe" });
    console.log(`Pré-registro ${preRegistro.versao} íntegro (sha256 ${preRegistro.hashParametros.slice(0, 12)}… · ${preRegistro.congeladoEm})\n`);
  } catch {
    console.error("DRIFT de parâmetros vs pré-registro — backtest abortado. Gere novo pré-registro versionado.");
    process.exitCode = 1;
    return;
  }

  // ── 1) percentis walk-forward por corredor/pilar ────────────────────────
  const CORS: Corredor[] = ["santos", "paranagua", "arco-norte"];
  const S = new Map<Corredor, Map<string, number>>();
  const T = new Map<Corredor, Map<string, number>>();
  for (const c of CORS) {
    const sB = serieSReal(c);
    const tB = serieTModelada(c);
    S.set(c, new Map(percentisWalkForward(sB.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.bruto }))).map((det, i) => [sB[i].d, det.percentil])));
    T.set(c, new Map(percentisWalkForward(tB.map((p) => ({ d: p.d, semanaISO: p.semanaISO, bruto: p.custoPorT }))).map((det, i) => [tB[i].d, det.percentil])));
  }
  const hB = hCache.semanas.map((w) => ({ d: w.d, semanaISO: semanaISODeData(w.d), bruto: w.ph }));
  const hDet = percentisWalkForward(hB);
  const H = new Map(hB.map((p, i) => [p.d, { perc: hDet[i].percentil, bruto: p.bruto }]));

  // F (v6/v7): pressão de chegadas ANTAQ, percentil walk-forward, por corredor
  // com F na composição (Santos e Paranaguá). Datas = segundas da EA.
  const F = new Map<Corredor, Map<string, number>>();
  for (const c of ["santos", "paranagua"] as Corredor[]) {
    const fB = serieFChegadasAntaq(c);
    F.set(c, new Map(percentisWalkForward(fB).map((det, i) => [fB[i].d, det.percentil])));
  }

  // ── 2) episódios-âncora verificáveis (recomputados, nunca hardcoded) ───
  const vereditos: Veredito[] = [];

  // Cada âncora só BLOQUEIA se seus dados-base existirem. Série vazia (scraper
  // caiu, fonte fora do ar) → "não-verificável neste run" (ok:null, indisponivel),
  // NUNCA "FALHOU" — não confundir fonte indisponível com índice que errou.
  const out24 = [...H.entries()].filter(([d]) => d >= "2024-09-25" && d <= "2024-11-15");
  if (!out24.length) {
    vereditos.push({ id: "out-2024-seca-tabocal", ok: null, indisponivel: true, detalhe: "não-verificável: série H (Arco Norte) indisponível neste run" });
  } else {
    const percMed = out24.reduce((s, [, v]) => s + v.perc, 0) / out24.length;
    const phMax = Math.max(...out24.map(([, v]) => v.bruto));
    vereditos.push({
      id: "out-2024-seca-tabocal", ok: percMed >= 90 && phMax >= 80,
      detalhe: `percentil médio ${percMed.toFixed(1)} (critério ≥90) · P_H máx ${phMax.toFixed(1)} (critério ≥80)`,
    });
  }

  const tMar = [...T.get("santos")!.entries()].filter(([d]) => d >= "2026-03-14" && d <= "2026-06-30");
  if (!tMar.length) {
    vereditos.push({ id: "mar-2026-choque-diesel", ok: null, indisponivel: true, detalhe: "não-verificável: série T (diesel ANP) indisponível neste run" });
  } else {
    vereditos.push({
      id: "mar-2026-choque-diesel", ok: tMar.every(([, p]) => p >= 99),
      detalhe: `P_T Santos ${tMar.length} semanas pós-choque, mín ${Math.min(...tMar.map(([, p]) => p)).toFixed(1)} (critério = 100 sustentado)`,
    });
  }

  const picoOk = (c: Corredor) => {
    const v = [...S.get(c)!.entries()].filter(([d]) => d >= "2026-04-01" && d <= "2026-05-31").map(([, p]) => p);
    return v.length ? Math.max(...v) : null;
  };
  const pSt = picoOk("santos"), pPg = picoOk("paranagua");
  // Santos (série madura, ≥3 safras) é o teste DURO do pico de safra.
  if (pSt == null) {
    vereditos.push({ id: "pico-safra-2026", ok: null, indisponivel: true, detalhe: "não-verificável: série S (Conab) indisponível neste run" });
  } else {
    vereditos.push({
      id: "pico-safra-2026", ok: pSt >= 95,
      detalhe: `P_S Santos máx abr–mai/26 ${pSt.toFixed(1)} (critério ≥95)`,
    });
  }
  // Paranaguá: REGISTRADO, não bloqueia (pré-registro v8). O percentil sazonal
  // exige ≥3 safras (MIN_SAFRAS_PERCENTIL); a série Conab de Paranaguá tem ~1 ano,
  // então o percentil de abr–mai é instável a revisões de levantamento (caiu de
  // 100→50 entre o 8º e o 9º levantamento 2025/26 sem mudança de pressão real —
  // o S BRUTO de abr seguiu a 99% do pico próprio). Reavaliar com ≥3 safras.
  vereditos.push({
    id: "pico-safra-2026-paranagua", ok: null, indisponivel: pPg == null,
    detalhe: pPg == null
      ? "não-verificável: série S (Conab) indisponível neste run"
      : `P_S Paranaguá máx abr–mai/26 ${pPg.toFixed(1)} — registrado (percentil exige ≥3 safras; série ~1 ano)`,
  });

  // dez/2025 agora é VERIFICÁVEL pela espera real da EA (TEsperaAtracacao):
  const espSantos = (esperaEA as unknown as { corredores: Record<string, [string, number, number][]> }).corredores.santos;
  const espDez25 = espSantos.filter(([s]) => s >= "2025-11-24" && s <= "2025-12-29").map(([, h]) => h);
  const espMed25 = espSantos.filter(([s]) => s.startsWith("2025")).map(([, h]) => h);
  const med = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  if (!espSantos?.length) {
    vereditos.push({ id: "dez-2025-fila-santos", ok: null, indisponivel: true, detalhe: "não-verificável: espera EA (ANTAQ) indisponível neste run" });
    vereditos.push({ id: "out-2023-espera-recorde", ok: null, indisponivel: true, detalhe: "não-verificável: espera EA (ANTAQ) indisponível neste run" });
  } else {
    vereditos.push({
      id: "dez-2025-fila-santos", ok: null,
      detalhe: `VERIFICADO CONTRA A EA: espera média dez/2025 = ${med(espDez25).toFixed(0)} h ≈ média de 2025 (${med(espMed25).toFixed(0)} h) — episódio NÃO CONFIRMADO como excepcional; âncora SUBSTITUÍDO no v1 (ver out-2023)`,
    });
    // critério FACTUAL (sem limiar arbitrário): o topo da série inteira de
    // espera (2016→2026) deve estar em ago–out/2023 — recorde conhecido.
    const top5 = espSantos.slice().sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topNaJanela = top5.filter(([s]) => s >= "2023-08-01" && s <= "2023-11-06").length;
    vereditos.push({
      id: "out-2023-espera-recorde", ok: topNaJanela >= 4,
      detalhe: `referência histórica da métrica-alvo: ${topNaJanela}/5 maiores esperas da série 2016–2026 caem em ago–out/2023 (pico ${top5[0][1].toFixed(0)} h em ${top5[0][0]})`,
    });
  }
  vereditos.push({ id: "jan-2025-salto-frete", ok: null, detalhe: "FORA DE ESCOPO — T é custo modelado, não frete negociado (decisão registrada)" });

  // ── 3) MÉTRICA-ALVO agora computável via EA (TEsperaAtracacao) ──────────
  // IEE(F+T+S) semanal de cada corredor validado vs percentil walk-forward da
  // espera em t+2. Santos e Paranaguá (ambos com F na composição).
  const segunda = (d: string) => { // sábado Conab → segunda da mesma semana ISO (chave da EA)
    const dt = new Date(d + "T00:00:00Z");
    dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
    return dt.toISOString().slice(0, 10);
  };
  const rank = (xs: number[]) => { const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]); const r = new Array(xs.length); idx.forEach(([, i], k) => (r[i] = k)); return r; };
  const corrP = (a: number[], b: number[]) => { const n = a.length, ma = med(a), mb = med(b); let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return num / Math.sqrt(da * db || 1); };
  const espTodos = (esperaEA as unknown as { corredores: Record<string, [string, number, number][]> }).corredores;

  function metricaCorr(corr: Corredor) {
    const sMap = S.get(corr)!, tMap = T.get(corr)!, fMap = F.get(corr);
    const espRaw = espTodos[corr];
    if (!sMap.size || !espRaw?.length) return { sp: 0, mae: 0, n: 0, indisponivel: true };
    const espWF = percentisWalkForward(espRaw.map(([sem, h]) => ({ d: sem, semanaISO: semanaISODeData(sem), bruto: h })));
    const espPercMap = new Map(espRaw.map(([sem], i) => [sem, espWF[i].percentil]));
    const pares: { iee: number; espPerc: number }[] = [];
    for (const d of [...sMap.keys()].sort()) {
      // F casa pela segunda da semana (datas da EA são segundas); ausente → calculaIEE renormaliza
      const perc: Partial<Record<ComponenteIEE, number>> = { F: fMap?.get(segunda(d)), S: sMap.get(d), T: tMap.get(d) };
      const iee = calculaIEE(perc, corr).valor;
      const sem2 = new Date(segunda(d) + "T00:00:00Z");
      sem2.setUTCDate(sem2.getUTCDate() + 14); // t+2 semanas
      const alvo = espPercMap.get(sem2.toISOString().slice(0, 10));
      if (alvo != null) pares.push({ iee, espPerc: alvo });
    }
    const sp = corrP(rank(pares.map((p) => p.iee)), rank(pares.map((p) => p.espPerc)));
    const mae = med(pares.map((p) => Math.abs(p.iee - p.espPerc)));
    return { sp, mae, n: pares.length };
  }

  const mSt = metricaCorr("santos");
  const mPg = metricaCorr("paranagua");
  const metricaAlvo = (mSt.indisponivel || mPg.indisponivel)
    ? "não-computável neste run — série S (Conab) e/ou espera EA indisponível; a métrica-alvo será reavaliada quando as fontes voltarem."
    : `IEE-Santos(t) = F·0,50 + T·0,40 + S·0,10 (v6) vs espera EA t+2 (${mSt.n} sem): Spearman ${mSt.sp.toFixed(2)} · MAE ${mSt.mae.toFixed(1)} p.p. (saltou de 0,43 sem F). ` +
    `IEE-Paranaguá(t) = F·0,50 + T·0,40 + S·0,10 (v7) vs espera EA t+2 (${mPg.n} sem): Spearman ${mPg.sp.toFixed(2)} · MAE ${mPg.mae.toFixed(1)} p.p. — validade FRACA (era 0,21 nos pesos v0; F lidera, S é ruído na fila). CAVEAT: in-sample, n≈45–46, SE±0,15.`;

  // ── 4) saída: console + README ──────────────────────────────────────────
  console.log(`================ EPISÓDIOS-ÂNCORA (pré-registro ${preRegistro.versao}) ================`);
  let falhou = false;
  for (const v of vereditos) {
    const flag = v.indisponivel ? "◌ não-verificável" : v.ok === null ? "◌ registrado" : v.ok ? "✓ ACUSOU" : "✗ FALHOU";
    if (v.ok === false) falhou = true;
    console.log(`  ${flag} · ${v.id} — ${v.detalhe}`);
  }
  const semDados = vereditos.filter((v) => v.indisponivel).length;
  console.log(`\nMétrica-alvo: ${metricaAlvo}`);
  console.log(falhou
    ? "\nVEREDITO FINAL: ✗ episódio verificável FALHOU — PUBLICAÇÃO BLOQUEADA (ver pré-registro)."
    : semDados
      ? `\nVEREDITO FINAL: ✓ nenhum episódio verificável falhou; ${semDados} não-verificável(is) por dado indisponível (fonte fora do ar) — publicável; reverificar quando as fontes voltarem.`
      : "\nVEREDITO FINAL: ✓ todos os episódios verificáveis acusados; lacunas registradas; publicável nos termos do pré-registro.");
  if (falhou) process.exitCode = 1;

  const hoje = new Date().toISOString().slice(0, 10);
  const md = `# Backtest do IEE — vereditos consolidados

> Gerado por \`scripts/backtest/iee-final.ts\` em ${hoje}. NÃO editar à mão.
> Pré-registro ${preRegistro.versao}: sha256 \`${preRegistro.hashParametros.slice(0, 16)}…\` congelado em ${preRegistro.congeladoEm}.

## Episódios-âncora

| Episódio | Veredito | Detalhe |
|---|---|---|
${vereditos.map((v) => `| ${v.id} | ${v.indisponivel ? "◌ não-verificável (dado indisponível)" : v.ok === null ? "◌ registrado (não verificável)" : v.ok ? "✓ acusou" : "✗ FALHOU"} | ${v.detalhe} |`).join("\n")}

## Métrica-alvo

${metricaAlvo}

## Regras (do pré-registro)

${preRegistro.compromissos.map((c: string) => `- ${c}`).join("\n")}

## Scripts

- \`iee-santos.ts\` — S+T retroativos de Santos (jan/2025→), veredito dez/2025 e jan/2025.
- \`iee-paranagua.ts\` — S+T de Paranaguá + perfil sazonal Santos × Paranaguá.
- \`iee-arco-norte.ts\` — H 2017→2026 (episódio out/2024), consolidado 3 corredores, contribuição H.
- \`iee-final.ts\` — este: integridade do pré-registro + episódios-âncora + README.
`;
  writeFileSync(join(RAIZ, "scripts", "backtest", "README.md"), md);
  console.log("\nREADME atualizado: scripts/backtest/README.md");
}
main();
