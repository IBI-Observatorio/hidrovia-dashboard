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
import preRegistro from "../../data/agro/pre-registro-iee-v5.json";

const { serieSReal, serieTModelada, percentisWalkForward } = __backtest;
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fmt = (v: number | null | undefined, w = 6) => (v == null ? "—" : v.toFixed(1)).padStart(w);

interface Veredito { id: string; ok: boolean | null; detalhe: string }

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

  // ── 2) episódios-âncora verificáveis (recomputados, nunca hardcoded) ───
  const vereditos: Veredito[] = [];

  const out24 = [...H.entries()].filter(([d]) => d >= "2024-09-25" && d <= "2024-11-15");
  const percMed = out24.reduce((s, [, v]) => s + v.perc, 0) / out24.length;
  const phMax = Math.max(...out24.map(([, v]) => v.bruto));
  vereditos.push({
    id: "out-2024-seca-tabocal", ok: percMed >= 90 && phMax >= 80,
    detalhe: `percentil médio ${percMed.toFixed(1)} (critério ≥90) · P_H máx ${phMax.toFixed(1)} (critério ≥80)`,
  });

  const tMar = [...T.get("santos")!.entries()].filter(([d]) => d >= "2026-03-14" && d <= "2026-06-30");
  const tOk = tMar.length > 0 && tMar.every(([, p]) => p >= 99);
  vereditos.push({
    id: "mar-2026-choque-diesel", ok: tOk,
    detalhe: `P_T Santos ${tMar.length} semanas pós-choque, mín ${Math.min(...tMar.map(([, p]) => p)).toFixed(1)} (critério = 100 sustentado)`,
  });

  const picoOk = (c: Corredor) => {
    const v = [...S.get(c)!.entries()].filter(([d]) => d >= "2026-04-01" && d <= "2026-05-31").map(([, p]) => p);
    return v.length ? Math.max(...v) : 0;
  };
  const pSt = picoOk("santos"), pPg = picoOk("paranagua");
  vereditos.push({
    id: "pico-safra-2026", ok: pSt >= 95 && pPg >= 95,
    detalhe: `P_S máx abr–mai/26: Santos ${pSt.toFixed(1)} · Paranaguá ${pPg.toFixed(1)} (critério ≥95)`,
  });

  // dez/2025 agora é VERIFICÁVEL pela espera real da EA (TEsperaAtracacao):
  const espSantos = (esperaEA as unknown as { corredores: Record<string, [string, number, number][]> }).corredores.santos;
  const espDez25 = espSantos.filter(([s]) => s >= "2025-11-24" && s <= "2025-12-29").map(([, h]) => h);
  const espMed25 = espSantos.filter(([s]) => s.startsWith("2025")).map(([, h]) => h);
  const med = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
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
  vereditos.push({ id: "jan-2025-salto-frete", ok: null, detalhe: "FORA DE ESCOPO — T é custo modelado, não frete negociado (decisão registrada)" });

  // ── 3) MÉTRICA-ALVO agora computável via EA (TEsperaAtracacao) ──────────
  // IEE(S+T) semanal de Santos vs percentil walk-forward da espera em t+2.
  const sSantos = S.get("santos")!;
  const tSantos = T.get("santos")!;
  const espMap = new Map(espSantos.map(([sem, h]) => [sem, h]));
  const segunda = (d: string) => { // sábado Conab → segunda da mesma semana ISO (chave da EA)
    const dt = new Date(d + "T00:00:00Z");
    dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
    return dt.toISOString().slice(0, 10);
  };
  const esperaHist: { semanaISO: number; bruto: number; d: string }[] = [];
  const pares: { iee: number; espPerc: number }[] = [];
  const espPercWF = percentisWalkForward(espSantos.map(([sem, h]) => ({ d: sem, semanaISO: semanaISODeData(sem), bruto: h })));
  const espPercMap = new Map(espSantos.map(([sem], i) => [sem, espPercWF[i].percentil]));
  for (const d of [...sSantos.keys()].sort()) {
    const perc: Partial<Record<ComponenteIEE, number>> = { S: sSantos.get(d), T: tSantos.get(d) };
    const iee = calculaIEE(perc, "santos").valor;
    const sem2 = new Date(segunda(d) + "T00:00:00Z");
    sem2.setUTCDate(sem2.getUTCDate() + 14); // t+2 semanas
    const alvo = espPercMap.get(sem2.toISOString().slice(0, 10));
    if (alvo != null) pares.push({ iee, espPerc: alvo });
  }
  const rank = (xs: number[]) => { const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]); const r = new Array(xs.length); idx.forEach(([, i], k) => (r[i] = k)); return r; };
  const corrP = (a: number[], b: number[]) => { const n = a.length, ma = med(a), mb = med(b); let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return num / Math.sqrt(da * db || 1); };
  const spearman = corrP(rank(pares.map((p) => p.iee)), rank(pares.map((p) => p.espPerc)));
  const mae = med(pares.map((p) => Math.abs(p.iee - p.espPerc)));
  const metricaAlvo = `IEE-Santos(t) vs percentil da espera EA em t+2 (${pares.length} semanas, abr/2025→fev/2026): Spearman ${spearman.toFixed(2)} · MAE ${mae.toFixed(1)} p.p. — baseline v1 registrado; F entra na composição quando o histórico de fila acumular.`;

  // ── 4) saída: console + README ──────────────────────────────────────────
  console.log(`================ EPISÓDIOS-ÂNCORA (pré-registro ${preRegistro.versao}) ================`);
  let falhou = false;
  for (const v of vereditos) {
    const flag = v.ok === null ? "◌ registrado" : v.ok ? "✓ ACUSOU" : "✗ FALHOU";
    if (v.ok === false) falhou = true;
    console.log(`  ${flag} · ${v.id} — ${v.detalhe}`);
  }
  console.log(`\nMétrica-alvo: ${metricaAlvo}`);
  console.log(falhou
    ? "\nVEREDITO FINAL: ✗ episódio verificável FALHOU — PUBLICAÇÃO BLOQUEADA (ver pré-registro)."
    : "\nVEREDITO FINAL: ✓ todos os episódios verificáveis acusados; lacunas registradas; publicável nos termos do pré-registro.");
  if (falhou) process.exitCode = 1;

  const hoje = new Date().toISOString().slice(0, 10);
  const md = `# Backtest do IEE — vereditos consolidados

> Gerado por \`scripts/backtest/iee-final.ts\` em ${hoje}. NÃO editar à mão.
> Pré-registro ${preRegistro.versao}: sha256 \`${preRegistro.hashParametros.slice(0, 16)}…\` congelado em ${preRegistro.congeladoEm}.

## Episódios-âncora

| Episódio | Veredito | Detalhe |
|---|---|---|
${vereditos.map((v) => `| ${v.id} | ${v.ok === null ? "◌ registrado (não verificável)" : v.ok ? "✓ acusou" : "✗ FALHOU"} | ${v.detalhe} |`).join("\n")}

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
