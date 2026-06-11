// scripts/lineup/arco-norte-agregador.ts
// Agrega os line-ups do Arco Norte (Itaqui + Vila do Conde + Santarém) em
// data/lineup/arco-norte.json — entrada única do pilar F do corredor.
//
// REGRAS:
//   - Soma os navios dos portos com status "ok"; deduplica por nome de navio.
//   - Porto indisponível NUNCA é silenciado: entra em "portosIndisponiveis"
//     e a UI rotula o F como "parcial".
//   - Nenhuma agregação de SCORE aqui — quem converte fila → componente F é
//     calculaComponenteF de lib/iee.ts (engine única dos 3 corredores).
//
// Execução: npx tsx scripts/lineup/arco-norte-agregador.ts
// (rodar APÓS itaqui.ts, vila-do-conde.ts e santarem.ts)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = join(RAIZ, "data", "lineup");
const ARQ_SAIDA = join(DIR, "arco-norte.json");
const PORTOS = ["itaqui", "vila-do-conde", "santarem"];

interface Navio { navio: string; dwt: number; sentido: string; mercadoria: string; eta?: string; status: string }

function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  const disponiveis: string[] = [];
  const indisponiveis: { porto: string; motivo: string }[] = [];
  const porNavio = new Map<string, Navio & { porto: string }>();
  let agendaSemanalMilT: [string, number, number][] = [];

  for (const porto of PORTOS) {
    let cache: { status: string; erro?: string; snapshots?: { dataColeta: string; navios: Navio[] }[]; agendaSemanalMilT?: [string, number, number][] };
    try { cache = JSON.parse(readFileSync(join(DIR, `${porto}.json`), "utf8")); }
    catch { indisponiveis.push({ porto, motivo: "cache ausente" }); continue; }
    if (cache.status !== "ok" || !cache.snapshots?.length) {
      indisponiveis.push({ porto, motivo: cache.erro ?? "status " + cache.status });
      continue;
    }
    disponiveis.push(porto);
    const ultimo = cache.snapshots[cache.snapshots.length - 1];
    for (const n of ultimo.navios) {
      const atual = porNavio.get(n.navio);
      if (!atual || n.dwt > atual.dwt) porNavio.set(n.navio, { ...n, porto });
    }
    if (cache.agendaSemanalMilT?.length) agendaSemanalMilT = cache.agendaSemanalMilT;
  }

  const navios = [...porNavio.values()];
  let anterior: { snapshots?: { dataColeta: string }[] } | null = null;
  try { anterior = JSON.parse(readFileSync(ARQ_SAIDA, "utf8")); } catch { /* sem cache */ }
  const snapshots = ((anterior?.snapshots ?? []) as { dataColeta: string }[]).filter((s) => s.dataColeta !== hoje);
  snapshots.push({ dataColeta: hoje, navios } as never);
  while (snapshots.length > 730) snapshots.shift();

  mkdirSync(DIR, { recursive: true });
  writeFileSync(ARQ_SAIDA, JSON.stringify({
    fonte: "Arco Norte — agregado dos line-ups EMAP (Itaqui) + CDP/SCAP (Vila do Conde) + Santarém",
    porto: "arco-norte",
    coletadoEm: hoje,
    status: disponiveis.length > 0 ? ("ok" as const) : ("indisponivel" as const),
    parcial: indisponiveis.length > 0,
    portosDisponiveis: disponiveis,
    portosIndisponiveis: indisponiveis,
    observacao: "Dedupe por navio entre portos. Porto indisponível nunca é silenciado — a UI rotula o F como parcial.",
    agendaSemanalMilT,
    snapshots,
  }, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
  console.log(`[arco-norte] ${disponiveis.length}/${PORTOS.length} portos · ${navios.length} graneleiros · parcial=${indisponiveis.length > 0}`);
}
main();
