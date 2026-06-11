// scripts/lineup/paranagua.ts
// Scraper do LINE-UP do Porto de Paranaguá (APPA) — componente F do IEE.
//
// Fonte (citar no card): Porto de Paranaguá (APPA) — Relatório Line-Up.
//   https://www.appaweb.appa.pr.gov.br/appaweb/pesquisa.aspx?WCI=relLineUpRetroativo
//   HTML com tabelas por seção: ATRACADOS / PROGRAMADOS / AO LARGO /
//   ESPERADOS / DESPACHADOS; colunas mapeadas pelo cabeçalho (a ordem
//   varia entre seções — ATRACADOS tem colunas extras).
//
// Filtro: graneleiros de grão/derivados (soja, milho, farelo, óleos,
// açúcar, trigo, cevada, sorgo).
//
// Saída: data/lineup/paranagua.json — snapshots ACUMULAM histórico
// (1/coleta/dia, máx. 730) para construir a série semanal de F.
// Schema do navio: { navio, dwt, sentido, mercadoria, eta?, status }.
//
// HEALTHCHECK isolado: se o HTML mudar (seções/colunas ausentes) ou o
// endpoint cair, marca status "indisponivel" SEM apagar snapshots — o
// card F cai para o estado honesto (padrão dos demais scrapers).
//
// Agregação NÃO acontece aqui: quem converte snapshot → score é
// calculaComponenteF de lib/iee.ts (única engine, Santos e Paranaguá
// compartilham as mesmas funções).
//
// Execução: npx tsx scripts/lineup/paranagua.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "lineup", "paranagua.json");

const URL_LINEUP =
  "https://www.appaweb.appa.pr.gov.br/appaweb/pesquisa.aspx?WCI=relLineUpRetroativo";
const UA = { "User-Agent": "Mozilla/5.0 (ObservatorioIBI/1.0; +https://ibi-observatorio.org)" };

const RX_GRAO = /SOJA|MILHO|FARELO|A[ÇC]UCAR|ACUCAR|TRIGO|GR[AÃ]O|CEVADA|SORGO/i;
const SECOES: Record<string, string> = {
  ATRACADOS: "atracado",
  PROGRAMADOS: "programado",
  "AO LARGO": "ao_largo",
  ESPERADOS: "esperado",
};
const MAX_SNAPSHOTS = 730;

interface Navio { navio: string; dwt: number; sentido: string; mercadoria: string; eta?: string; status: string }

const limpa = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const numBR = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

function dataETA(s: string): string | undefined {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

/** Extrai os graneleiros do HTML do relatório (tabelas por seção). */
export function parseLineupAppa(html: string): Navio[] {
  const out: Navio[] = [];
  const tabelas = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  for (const tabela of tabelas) {
    const linhas = [...tabela.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) =>
      [...m[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => limpa(c[1])),
    );
    if (!linhas.length) continue;
    const titulo = (linhas[0][0] ?? "").toUpperCase();
    const status = Object.entries(SECOES).find(([k]) => titulo.startsWith(k))?.[1];
    if (!status) continue;
    const hi = linhas.findIndex((l) => l.some((c) => /Embarca/i.test(c)));
    if (hi < 0) continue;
    const hdr = linhas[hi];
    const col = (n: string) => hdr.findIndex((h) => h.toLowerCase().startsWith(n));
    const iN = col("embarca"), iD = col("dwt"), iS = col("sentido"), iM = col("mercadoria"), iE = col("eta");
    if (iN < 0 || iD < 0 || iM < 0) continue;
    for (const c of linhas.slice(hi + 1)) {
      if (c.length < hdr.length - 2) continue;
      const merc = c[iM] ?? "";
      if (!RX_GRAO.test(merc)) continue;
      out.push({
        navio: c[iN], dwt: Math.round(numBR(c[iD])), sentido: c[iS] ?? "",
        mercadoria: merc.slice(0, 30), eta: iE >= 0 ? dataETA(c[iE] ?? "") : undefined, status,
      });
    }
  }
  return out;
}

async function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  let anterior: { snapshots?: { dataColeta: string; navios: Navio[] }[] } | null = null;
  try { anterior = JSON.parse(readFileSync(ARQ_SAIDA, "utf8")); } catch { /* sem cache */ }

  try {
    const r = await fetch(URL_LINEUP, { headers: UA });
    if (!r.ok) throw new Error(`HTTP ${r.status} no relatório line-up APPA`);
    const navios = parseLineupAppa(await r.text());

    // HEALTHCHECK: relatório de Paranaguá sem nenhum graneleiro de grão é
    // implausível em qualquer época do ano — tratar como mudança de layout.
    if (navios.length === 0) throw new Error("0 graneleiros parseados — layout do appaweb mudou?");

    const snapshots = (anterior?.snapshots ?? []).filter((s) => s.dataColeta !== hoje);
    snapshots.push({ dataColeta: hoje, navios });
    while (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();

    const cache = {
      fonte: "Porto de Paranaguá (APPA) — Relatório Line-Up (appaweb)",
      url: URL_LINEUP,
      porto: "paranagua",
      filtro: "graneleiros: soja, milho, farelo, óleo de soja/milho, açúcar, trigo, cevada, sorgo",
      coletadoEm: hoje,
      status: "ok" as const,
      observacao: "snapshots acumulam histórico a cada coleta; a série de F nasce curta e fica rotulada 'calibração em construção' até cobrir 3 safras.",
      snapshots,
    };
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify(cache, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
    console.log(`[lineup-paranagua] OK — ${navios.length} graneleiros · ${snapshots.length} snapshots no histórico`);
  } catch (e) {
    const cache = {
      ...((anterior as object) ?? { snapshots: [] }),
      url: URL_LINEUP,
      coletadoEm: hoje,
      status: "indisponivel" as const,
      erro: (e as Error).message,
    };
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify(cache, null, 1) + "\n");
    console.error(`[lineup-paranagua] INDISPONÍVEL — ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

main();
