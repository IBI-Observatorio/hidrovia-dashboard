// scripts/lineup/santos.ts — PASSO 2
// Line-up do Porto de Santos (APS/DIOPE) — pilar F do corredor Santos.
//
// Fonte (citar no card): Porto de Santos — Navios Esperados · Carga (DIOPE).
//   A lista é renderizada server-side em <tbody><tr>, mas o backend DIOPE
//   monta a página em ~20 s e FALHA INTERMITENTEMENTE (volta vazia) —
//   por isso: timeout longo + até 3 tentativas com pausa.
//   Navio pode ter MÚLTIPLAS cargas no mesmo <td>, separadas por <br>
//   (mercadoria/operação/peso pareados por posição) — soma só os pares
//   de grão com operação EMB.
//
// dwt = PESO DA CARGA programada (proxy declarado; mais fiel à fila de
// grão que o porte bruto). Fundeados/atracados ficam fora do F v0: a APS
// não expõe a mercadoria deles (a espera completa já entra pela métrica
// ANTAQ TEsperaAtracacao).
//
// Healthcheck: < 10 graneleiros parseados ⇒ "indisponivel" (estado honesto,
// snapshots preservados). Agregação fila→score: calculaComponenteF (lib/iee).
//
// Execução: npx tsx scripts/lineup/santos.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "lineup", "santos.json");
const URL_PAGINA =
  "https://www.portodesantos.com.br/informacoes-operacionais/operacoes-portuarias/navegacao-e-movimento-de-navios/navios-esperados-carga/";
const UA = { "User-Agent": "Mozilla/5.0 (ObservatorioIBI/1.0; +https://ibi-observatorio.org)" };
const RX_GRAO = /SOJA|MILHO|A[ÇC]UCAR|ACUCAR|FARELO|TRIGO|CEVADA|SORGO/i;
const MAX_SNAPSHOTS = 730;
const TENTATIVAS = 3;

interface Navio { navio: string; dwt: number; sentido: string; mercadoria: string; eta?: string; status: string }

const semTags = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
/** divide um <td> por <br> em sub-valores pareáveis */
const porBR = (html: string) =>
  html.split(/<br\s*\/?>/i).map((x) => semTags(x)).filter(Boolean);

export function parseSantos(html: string): Navio[] {
  const out: Navio[] = [];
  for (const tr of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const tds = [...tr[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tds.length < 15) continue;
    const navio = semTags(tds[0]);
    const cheg = semTags(tds[4]).slice(0, 10); // dd/mm/aaaa
    const ops = porBR(tds[7]);
    const mercs = porBR(tds[8]);
    const pesos = porBR(tds[9]);
    let pesoGrao = 0;
    let mercGrao = "";
    for (let i = 0; i < mercs.length; i++) {
      const op = ops[i] ?? ops[0] ?? "";
      if (!RX_GRAO.test(mercs[i]) || /CONTEINER/i.test(mercs[i]) || !/EMB/.test(op)) continue;
      pesoGrao += +(pesos[i] ?? "0").replace(/\D/g, "");
      if (!mercGrao) mercGrao = mercs[i].slice(0, 30);
    }
    if (pesoGrao <= 0 || !navio) continue;
    const [d, m, a] = cheg.split("/");
    out.push({
      navio, dwt: pesoGrao, sentido: "Exp", mercadoria: mercGrao,
      eta: a && m && d ? `${a}-${m}-${d}` : undefined, status: "esperado",
    });
  }
  return out;
}

async function buscaComRetry(): Promise<string> {
  let ultimoErro = "";
  for (let t = 1; t <= TENTATIVAS; t++) {
    try {
      const r = await fetch(URL_PAGINA, { headers: UA, signal: AbortSignal.timeout(90_000) });
      if (!r.ok) { ultimoErro = `HTTP ${r.status}`; continue; }
      const html = await r.text();
      // página "vazia" intermitente: legenda presente mas sem linhas de navio
      if ((html.match(/<tr/gi) ?? []).length > 30) return html;
      ultimoErro = "lista vazia (backend DIOPE intermitente)";
    } catch (e) { ultimoErro = (e as Error).message; }
    await new Promise((res) => setTimeout(res, 20_000));
  }
  throw new Error(`${TENTATIVAS} tentativas falharam — ${ultimoErro}`);
}

async function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  let anterior: { snapshots?: { dataColeta: string; navios: Navio[] }[] } | null = null;
  try { anterior = JSON.parse(readFileSync(ARQ_SAIDA, "utf8")); } catch { /* sem cache */ }
  try {
    const navios = parseSantos(await buscaComRetry());
    // HEALTHCHECK: Santos sem 10 graneleiros de grão esperados é implausível.
    if (navios.length < 10) throw new Error(`só ${navios.length} graneleiros parseados — layout mudou?`);
    const snapshots = (anterior?.snapshots ?? []).filter((s) => s.dataColeta !== hoje);
    snapshots.push({ dataColeta: hoje, navios });
    while (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify({
      fonte: "Porto de Santos (APS/DIOPE) — Navios Esperados · Carga",
      url: URL_PAGINA, porto: "santos",
      filtro: "graneleiros EMB: soja, milho, açúcar, farelo, trigo, cevada, sorgo · campo dwt = PESO DA CARGA programada (proxy declarado, melhor que porte bruto)",
      coletadoEm: hoje, status: "ok" as const,
      observacao: "Fundeados/atracados da APS não expõem mercadoria — fila v0 usa só os esperados de carga (documentado). Servidor da APS monta a lista em ~20 s e falha intermitentemente: o scraper usa retry.",
      snapshots,
    }, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
    console.log(`[lineup-santos] OK — ${navios.length} graneleiros · ${Math.round(navios.reduce((s, n) => s + n.dwt, 0) / 1000)} mil t · ${snapshots.length} snapshots`);
  } catch (e) {
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify({
      ...((anterior as object) ?? { snapshots: [] }),
      url: URL_PAGINA, coletadoEm: hoje, status: "indisponivel" as const, erro: (e as Error).message,
    }, null, 1) + "\n");
    console.error(`[lineup-santos] INDISPONÍVEL — ${(e as Error).message}`);
    process.exitCode = 1;
  }
}
main();
