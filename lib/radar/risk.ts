// Módulo 3 — Risco Institucional (Build Brief §3). Vetores STF/TCU/Ambiental/
// Concessionária/Modelagem. A matriz é sourced no seed (`risk`); aqui ficam a
// ordem, os rótulos, as cores por status e a leitura agregada da postura.

import type { RiskVector, GateStatus } from "@/lib/dcf/types";

export const GATES: { key: keyof Omit<RiskVector, "notes">; label: string }[] = [
  { key: "stf", label: "STF" },
  { key: "tcu", label: "TCU" },
  { key: "ambiental", label: "Ambiental" },
  { key: "concessionaria", label: "Concessionária" },
  { key: "modelagem", label: "Modelagem" },
];

const GATE_SET = new Set<GateStatus>(["na", "resolvido", "em-curso", "atencao", "risco"]);

/** Valida um status de gate vindo de seed (typo/acento → "na", em vez de crashar). */
export function normalizaGate(v: unknown): GateStatus {
  return GATE_SET.has(v as GateStatus) ? (v as GateStatus) : "na";
}

export const GATE_INFO: Record<
  GateStatus,
  { label: string; txt: string; bg: string; dot: string }
> = {
  resolvido: { label: "Resolvido", txt: "text-ibi-green", bg: "bg-ibi-green/10 border-ibi-green/30", dot: "#00a652" },
  "em-curso": { label: "Em curso", txt: "text-ibi-blue", bg: "bg-ibi-blue/10 border-ibi-blue/30", dot: "#0099d8" },
  atencao: { label: "Atenção", txt: "text-ouro", bg: "bg-ouro/10 border-ouro/30", dot: "#D4922A" },
  risco: { label: "Risco", txt: "text-vermelho", bg: "bg-vermelho/10 border-vermelho/30", dot: "#A0153E" },
  na: { label: "N/A", txt: "text-gray-400", bg: "bg-white/5 border-white/10", dot: "#4b5563" },
};

/** Peso de severidade por status (p/ a leitura agregada). */
export const GATE_PESO: Record<GateStatus, number> = {
  na: 0,
  resolvido: 0,
  "em-curso": 1,
  atencao: 2,
  risco: 3,
};

export type Postura = "alto" | "medio" | "baixo";

/** Leitura agregada da postura de risco a partir do vetor. */
export function posturaRisco(risk: RiskVector): Postura {
  const score = GATES.reduce((s, g) => s + (GATE_PESO[risk[g.key]] ?? 0), 0);
  if (score >= 6) return "alto";
  if (score >= 3) return "medio";
  return "baixo";
}

export const POSTURA_INFO: Record<Postura, { label: string; txt: string; bg: string }> = {
  alto: { label: "Risco institucional alto", txt: "text-vermelho", bg: "bg-vermelho/10 border-vermelho/30" },
  medio: { label: "Risco institucional médio", txt: "text-ouro", bg: "bg-ouro/10 border-ouro/30" },
  baixo: { label: "Risco institucional baixo", txt: "text-ibi-green", bg: "bg-ibi-green/10 border-ibi-green/30" },
};
