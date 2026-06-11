// scripts/lineup/vila-do-conde.ts
// Line-up de Vila do Conde + terminais (CDP/SCAP) — pilar F do Arco Norte.
// Fonte (citar no card): CDP — SCAP Line-Up público.
//   http://scap.cdp.com.br:8047/  (consulta pública, tabela única com TODOS
//   os registros do ano: histórico + agendamentos; linhas agrupadoras
//   "PORTO:" e "BERÇO:" intercaladas).
// Janela aplicada (mesma do snapshot validado): atracados com atracação nos
// últimos 12 dias; agendados/confirmados com atracação entre −5 e +21 dias
// (mapeados p/ ao_largo ≤7d e esperado >7d). Dedupe por navio (agendamentos
// repetidos entre berços/terminais).
// Também extrai a AGENDA SEMANAL (mil t por semana, 12 semanas) usada pela
// Colisão Safra × Calado.
// Healthcheck: tabela ausente/0 graneleiros plausíveis → "indisponivel".
// Execução: npx tsx scripts/lineup/vila-do-conde.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ_SAIDA = join(RAIZ, "data", "lineup", "vila-do-conde.json");
const URL_SCAP = "http://scap.cdp.com.br:8047/";
const UA = { "User-Agent": "Mozilla/5.0 (ObservatorioIBI/1.0; +https://ibi-observatorio.org)" };
const RX_GRAO = /SOJA|MILHO|FARELO|A[ÇC]UCAR|ACUCAR|TRIGO|GR[AÃ]O|CEVADA|SORGO/i;
const STATUS_ATIVOS = ["ATRACADO", "AGENDADO", "CONFIRMADO", "FUNDEADO", "AO LARGO"];
const MAX_SNAPSHOTS = 730;

interface Navio { navio: string; dwt: number; sentido: string; mercadoria: string; eta?: string; status: string }
const limpa = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function dataBR(s: string): Date | null {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`) : null;
}

export function parseScap(html: string, hojeISO: string): { navios: Navio[]; agenda: [string, number, number][] } {
  const hoje = new Date(hojeISO + "T00:00:00Z").getTime();
  const tabela = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!tabela) throw new Error("tabela do SCAP ausente");
  const linhas = [...tabela.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) =>
    [...m[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => limpa(c[1])),
  );
  const porNavio = new Map<string, Navio>();
  const agenda = new Map<number, { n: number; pesoT: number }>();
  for (const c of linhas) {
    if (c.length < 14) continue; // pula agrupadores PORTO:/BERÇO: e cabeçalho
    const [navio, atrac] = [c[0], c[1]];
    const carga = c[10] ?? "";
    const sit = (c[13] ?? "").toUpperCase();
    if (!RX_GRAO.test(carga) || !STATUS_ATIVOS.some((s) => sit.includes(s))) continue;
    const d = dataBR(atrac);
    if (!d) continue;
    const dias = (d.getTime() - hoje) / 86_400_000;
    const peso = parseFloat((c[4] ?? "0").replace(/\./g, "").replace(",", ".")) || 0;

    let status: string | null = null;
    if (sit.includes("ATRACADO") && dias >= -12 && dias <= 1) status = "atracado";
    else if ((sit.includes("AGENDADO") || sit.includes("CONFIRMADO")) && dias >= -5 && dias <= 21)
      status = dias <= 7 ? "ao_largo" : "esperado";
    else if (sit.includes("FUNDEADO") || sit.includes("AO LARGO")) status = "ao_largo";

    if (status) {
      const atual = porNavio.get(navio);
      if (!atual || peso > atual.dwt) {
        porNavio.set(navio, {
          navio, dwt: Math.round(peso), sentido: "Exp",
          mercadoria: carga.slice(0, 30),
          eta: dias > 0 ? d.toISOString().slice(0, 10) : undefined, status,
        });
      }
    }
    if ((sit.includes("AGENDADO") || sit.includes("CONFIRMADO")) && dias >= 0 && dias <= 84) {
      const w = Math.floor(dias / 7);
      const e = agenda.get(w) ?? { n: 0, pesoT: 0 };
      e.n++; e.pesoT += peso;
      agenda.set(w, e);
    }
  }
  return {
    navios: [...porNavio.values()],
    agenda: [...agenda.entries()].sort((a, b) => a[0] - b[0])
      .map(([w, e]) => [`S${w}`, e.n, Math.round(e.pesoT / 1000)] as [string, number, number]),
  };
}

async function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  let anterior: { snapshots?: object[] } | null = null;
  try { anterior = JSON.parse(readFileSync(ARQ_SAIDA, "utf8")); } catch { /* sem cache */ }
  try {
    const r = await fetch(URL_SCAP, { headers: UA });
    if (!r.ok) throw new Error(`HTTP ${r.status} no SCAP`);
    const { navios, agenda } = parseScap(await r.text(), hoje);
    if (navios.length === 0) throw new Error("0 graneleiros na janela — layout do SCAP mudou?");
    const snapshots = ((anterior?.snapshots ?? []) as { dataColeta: string }[]).filter((s) => s.dataColeta !== hoje);
    snapshots.push({ dataColeta: hoje, navios } as never);
    while (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
    writeFileSync(ARQ_SAIDA, JSON.stringify({
      fonte: "CDP — SCAP Line-Up público (Vila do Conde + terminais Hidrovias do Brasil, Ponta da Montanha, Rio Capim Caulim, Fronteira Norte)",
      url: URL_SCAP, porto: "vila-do-conde",
      filtro: "graneleiros: soja, milho, farelo, açúcar, trigo, cevada, sorgo · janela: atracados ≤12d, agendados/confirmados −5..+21d",
      coletadoEm: hoje, status: "ok" as const,
      observacao: "Snapshot deduplica navios repetidos entre berços/terminais (agendamentos múltiplos do mesmo navio).",
      agendaSemanalMilT: agenda, snapshots,
    }, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
    console.log(`[lineup-vdc] OK — ${navios.length} graneleiros · agenda ${agenda.length} semanas`);
  } catch (e) {
    mkdirSync(dirname(ARQ_SAIDA), { recursive: true });
    writeFileSync(ARQ_SAIDA, JSON.stringify({
      ...((anterior as object) ?? { snapshots: [] }),
      url: URL_SCAP, coletadoEm: hoje, status: "indisponivel" as const, erro: (e as Error).message,
    }, null, 1) + "\n");
    console.error(`[lineup-vdc] INDISPONÍVEL — ${(e as Error).message}`);
    process.exitCode = 1;
  }
}
main();
