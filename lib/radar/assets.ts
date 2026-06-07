// Registro ÚNICO e tipado dos ativos do Radar (antes duplicado entre a página
// índice e o deep-dive). Normaliza/valida o bloco de maturação na carga, então
// `estagioAtual` é sempre um índice válido e `gateRisk` sempre uma das opções.

import ef170 from "@/data/assets/ef-170.json";
import ficoFiol from "@/data/assets/fico-fiol.json";
import ef118 from "@/data/assets/ef-118.json";
import ef151 from "@/data/assets/ef-151-norte.json";
import type { Asset, SourceTag, RiskVector } from "@/lib/dcf/types";
import { ESTAGIOS, type MaturacaoSeed, type GateRisk } from "@/lib/radar/maturation";
import { GATES, normalizaGate } from "@/lib/radar/risk";
import { normalizaExposicao, type TabuleiroEntry } from "@/lib/radar/board";

const GATE_RISKS: GateRisk[] = ["baixo", "medio", "alto"];

export interface RadarAssetEntry {
  id: string;
  name: string;
  sub: string;
  route?: string;
  completo: boolean; // true ⇒ tem motor DCF (params); false ⇒ parcial (só maturação)
  maturacao?: MaturacaoSeed & { fonte?: SourceTag };
  risk?: RiskVector; // normalizado (gates validados)
  tabuleiro?: Record<string, TabuleiroEntry>; // normalizado (exposição validada)
  raw: Record<string, unknown>;
}

/** Normaliza/valida o vetor de risco: gates inválidos viram "na"; notes sempre objeto. */
function normalizaRisk(r: unknown): RiskVector | undefined {
  if (!r || typeof r !== "object") return undefined;
  const raw = r as Record<string, unknown>;
  const vec = { notes: {} } as RiskVector;
  for (const g of GATES) vec[g.key] = normalizaGate(raw[g.key]);
  vec.notes =
    raw.notes && typeof raw.notes === "object"
      ? (raw.notes as Record<string, string>)
      : {};
  return vec;
}

/** Normaliza/valida o tabuleiro por cliente: exposição inválida vira "nenhuma". */
function normalizaTabuleiro(
  t: unknown,
): Record<string, TabuleiroEntry> | undefined {
  if (!t || typeof t !== "object") return undefined;
  const out: Record<string, TabuleiroEntry> = {};
  for (const [cliente, v] of Object.entries(t as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const e = v as Record<string, unknown>;
    out[cliente] = {
      papel: String(e.papel ?? ""),
      moveNaMalha: String(e.moveNaMalha ?? "—"),
      exposicao: normalizaExposicao(e.exposicao),
      fonte: e.fonte as SourceTag | undefined,
    };
  }
  return Object.keys(out).length ? out : undefined;
}

/** Normaliza e VALIDA o bloco de maturação: clampa estágio e checa gateRisk. */
export function normalizaMaturacao(
  m: unknown,
): (MaturacaoSeed & { fonte?: SourceTag }) | undefined {
  if (!m || typeof m !== "object") return undefined;
  const r = m as Record<string, unknown>;
  const maxIdx = ESTAGIOS.length - 1;
  const estagioAtual = Math.min(
    maxIdx,
    Math.max(0, Math.round(Number(r.estagioAtual) || 0)),
  );
  const gateRisk = GATE_RISKS.includes(r.gateRisk as GateRisk)
    ? (r.gateRisk as GateRisk)
    : "medio";
  const leilao = r.leilaoAnunciado;
  const leilaoAnunciado =
    leilao == null || !Number.isFinite(Number(leilao)) ? null : Number(leilao);
  return {
    estagioAtual,
    leilaoAnunciado,
    gateRisk,
    drivers: Array.isArray(r.drivers) ? (r.drivers as string[]) : undefined,
    fonte: r.fonte as SourceTag | undefined,
  };
}

function entry(raw: Record<string, unknown>, completo: boolean): RadarAssetEntry {
  return {
    id: raw.id as string,
    name: raw.name as string,
    sub: raw.sub as string,
    route: raw.route as string | undefined,
    completo,
    maturacao: normalizaMaturacao(raw.maturacao),
    risk: normalizaRisk(raw.risk),
    tabuleiro: normalizaTabuleiro(raw.tabuleiro),
    raw,
  };
}

/** Ordem de exibição. Só o EF-170 tem motor DCF completo (piloto). */
export const RADAR_ASSETS: RadarAssetEntry[] = [
  entry(ef170 as unknown as Record<string, unknown>, true),
  entry(ficoFiol as unknown as Record<string, unknown>, false),
  entry(ef118 as unknown as Record<string, unknown>, false),
  entry(ef151 as unknown as Record<string, unknown>, false),
];

const BY_ID = new Map(RADAR_ASSETS.map((a) => [a.id, a]));

export function getRadarAsset(id: string): RadarAssetEntry | undefined {
  return BY_ID.get(id);
}

/** Asset tipado (com params) só quando completo; senão null — evita cast-soup. */
export function fullAsset(e: RadarAssetEntry): Asset | null {
  return e.completo ? (e.raw as unknown as Asset) : null;
}
