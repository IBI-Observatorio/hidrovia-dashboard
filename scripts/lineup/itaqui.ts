// scripts/lineup/itaqui.ts
// Line-up do Porto do Itaqui (EMAP) — pilar F do Arco Norte.
// Fonte (citar no card): Porto do Itaqui (EMAP) — Porto Agora.
//   https://www.portodoitaqui.com/porto-agora/navios/esperados
//   HTML com 3 tabelas NA ORDEM: Atracados, Fundeados, Esperados
//   (colunas mapeadas por cabeçalho: NAVIO / DWT / CARGA / QTD.CARGA).
// Schema do navio IDÊNTICO a Santos/Paranaguá: {navio,dwt,sentido,mercadoria,eta?,status}.
// Healthcheck isolado: 0 tabelas ou 0 linhas plausíveis → status "indisponivel",
// preservando snapshots (nunca interpolar). Agregação só em lib/iee.ts.
// Execução: npx tsx scripts/lineup/itaqui.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "lineup", "itaqui.json");
const URL_PAGINA = "https://www.portodoitaqui.com/porto-agora/navios/esperados";
const UA = { "User-Agent": "Mozilla/5.0 (ObservatorioIBI/1.0; +https://ibi-observatorio.org)" };
const RX_GRAO = /SOJA|MILHO|FARELO|A[ÇC]UCAR|ACUCAR|TRIGO|GR[AÃ]O|CEVADA|SORGO/i;
const SECOES = ["atracado", "ao_largo", "esperado"]; // ordem das tabelas na página
const MAX_SNAPSHOTS = 730;

interface Navio { navio: string; dwt: number; sentido: string; mercadoria: string; status: string }
const limpa = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const numBR = (s: string) => {
  // EMAP mistura "81.784" (milhar) e "79"/"50" (mil t truncado) — heurística:
  // valores < 1000 sem separador são mil t → ×1000.
  const v = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return !Number.isFinite(v) ? 0 : v < 1000 ? Math.round(v * 1000) : Math.round(v);
};

export function parseItaqui(html: string): Navio[] {
  const out: Navio[] = [];
  const tabelas = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  tabelas.slice(0, 3).forEach((tabela, ti) => {
    const linhas = [...tabela.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) =>
      [...m[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => limpa(c[1])),
    );
    if (linhas.length < 2) return;
    const hdr = linhas[0].map((h) => h.toUpperCase());
    const iN = hdr.findIndex((h) => h === "NAVIO");
    const iD = hdr.findIndex((h) => h.startsWith("DWT"));
    const iC = hdr.findIndex((h) => h === "CARGA");
    if (iN < 0 || iC < 0) return;
    for (const c of linhas.slice(1)) {
      if (!RX_GRAO.test(c[iC] ?? "")) continue;
      out.push({
        navio: c[iN], dwt: numBR(c[iD] ?? "0"),
        sentido: "Exp", // Itaqui: grão é corrente de exportação (premissa v0)
        mercadoria: (c[iC] ?? "").slice(0, 30), status: SECOES[ti],
      });
    }
  });
  return out;
}

async function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  let anterior: { snapshots?: { dataColeta: string; navios: Navio[] }[] } | null = null;
  try { anterior = JSON.parse(readFileSync(ARQ_SAIDA, "utf8")); } catch { /* sem cache */ }
  try {
    const r = await fetch(URL_PAGINA, { headers: UA });
    if (!r.ok) throw new Error(`HTTP ${r.status} no Porto Agora EMAP`);
    const navios = parseItaqui(await r.text());
    if (navios.length === 0) throw new Error("0 graneleiros parseados — layout do Porto Agora mudou?");
    const snapshots = (anterior?.snapshots ?? []).filter((s) => s.dataColeta !== hoje);
    snapshots.push({ dataColeta: hoje, navios });
    while (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
    writeFileSync(ARQ_SAIDA, JSON.stringify({
      fonte: "Porto do Itaqui (EMAP) — Porto Agora / Navios",
      url: URL_PAGINA, porto: "itaqui",
      filtro: "graneleiros: soja, milho, farelo, açúcar, trigo, cevada, sorgo",
      coletadoEm: hoje, status: "ok" as const,
      observacao: "Página Porto Agora renderiza Atracados/Fundeados/Esperados em HTML; DWT na coluna própria; snapshots acumulam histórico.",
      snapshots,
    }, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
    console.log(`[lineup-itaqui] OK — ${navios.length} graneleiros · ${snapshots.length} snapshots`);
  } catch (e) {
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify({
      ...((anterior as object) ?? { snapshots: [] }),
      url: URL_PAGINA, coletadoEm: hoje, status: "indisponivel" as const, erro: (e as Error).message,
    }, null, 1) + "\n");
    console.error(`[lineup-itaqui] INDISPONÍVEL — ${(e as Error).message}`);
    process.exitCode = 1;
  }
}
main();
