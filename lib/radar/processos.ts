// Módulo de acompanhamento processual (SEI/TCU) do Radar.
//
// Dado SOURÇADO de andamento oficial, capturado via MonitoraSEI e gravado como
// snapshot curado (data/processos/<id>.json). NÃO é live: o MCP roda na sessão do
// analista, não no app — então a atualização é manual (re-puxar e regravar o seed).
// Cada movimento carrega data + unidade + a procedência (nº do processo no órgão).

import ef170 from "@/data/processos/ef-170.json";
import type { SourceTag } from "@/lib/dcf/types";

export interface MovimentoProcesso {
  data: string;        // YYYY-MM-DD
  unidade?: string;    // unidade do órgão (ex.: SUCON, GEFER)
  descricao: string;   // descrição factual do andamento (condensada do SEI)
}

export interface ProcessoSeed {
  orgao: string;                      // ANTT, TCU, ...
  numero: string;                     // número SEI/TCU
  tipo?: string;
  papel?: string;                     // o que é esse processo (factual)
  unidadeAtual?: string;
  totalMovimentacoes?: number | null; // total no órgão (informativo)
  movimentos: MovimentoProcesso[];    // recorte curado, mais recente primeiro
  obs?: string;                       // nota honesta (ex.: andamentos não ingeridos)
  url?: string;
  fonte?: SourceTag;
}

export interface ProcessosAtivo {
  asset: string;
  capturadoEm: string;   // data do snapshot (YYYY-MM-DD)
  fonteGeral?: string;
  processos: ProcessoSeed[];
}

const REGISTRO: Record<string, ProcessosAtivo> = {
  "ef-170": ef170 as ProcessosAtivo,
};

/** Acompanhamento processual de um ativo, ou null se não houver snapshot. */
export function processosDoAtivo(assetId: string): ProcessosAtivo | null {
  return REGISTRO[assetId] ?? null;
}
