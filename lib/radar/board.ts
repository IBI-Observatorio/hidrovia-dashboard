// Módulo 4 — Tabuleiro Estratégico (Build Brief §3, §10).
//
// O CLIENTE é configurável (guardrail §10): nada hardcoded que vaze posição de
// terceiros. O conteúdo por ativo é FATO PÚBLICO (notícia/órgão), keyed pelo
// cliente configurado. Se o cliente não tiver papel mapeado num ativo, devolve
// um fallback neutro — nunca inventa posição.

import type { SourceTag } from "@/lib/dcf/types";
import type { RadarAssetEntry } from "@/lib/radar/assets";

/** Cliente configurado do tabuleiro (default). Trocável sem hardcode no componente. */
export const CLIENTE_PADRAO = "Vale";

export type Exposicao = "alta" | "media" | "baixa" | "nenhuma";

const EXPOSICAO_SET = new Set<Exposicao>(["alta", "media", "baixa", "nenhuma"]);

/** Valida exposição vinda de seed (typo/acento "média" → "nenhuma", sem crash). */
export function normalizaExposicao(v: unknown): Exposicao {
  return EXPOSICAO_SET.has(v as Exposicao) ? (v as Exposicao) : "nenhuma";
}

export interface TabuleiroEntry {
  papel: string;        // papel público do cliente neste ativo
  moveNaMalha: string;  // o que este leilão move na malha do cliente
  exposicao: Exposicao; // grau de exposição do cliente
  fonte?: SourceTag;
}

export const EXPOSICAO_INFO: Record<Exposicao, { label: string; txt: string; bg: string }> = {
  alta: { label: "Exposição alta", txt: "text-vermelho", bg: "bg-vermelho/10 border-vermelho/30" },
  media: { label: "Exposição média", txt: "text-ouro", bg: "bg-ouro/10 border-ouro/30" },
  baixa: { label: "Exposição baixa", txt: "text-ibi-blue", bg: "bg-ibi-blue/10 border-ibi-blue/30" },
  nenhuma: { label: "Sem papel mapeado", txt: "text-gray-400", bg: "bg-white/5 border-white/10" },
};

const FALLBACK: TabuleiroEntry = {
  papel: "Sem papel direto do cliente mapeado em fonte pública para este ativo.",
  moveNaMalha: "—",
  exposicao: "nenhuma",
};

/**
 * Papel do cliente configurado neste ativo. Lê o bloco `tabuleiro[cliente]` do
 * seed (fatos públicos). Fallback neutro se o cliente não estiver mapeado.
 */
export function getTabuleiro(
  entry: RadarAssetEntry,
  cliente: string = CLIENTE_PADRAO,
): { cliente: string; entry: TabuleiroEntry; mapeado: boolean } {
  const bloco = entry.tabuleiro?.[cliente];
  return { cliente, entry: bloco ?? FALLBACK, mapeado: !!bloco };
}
