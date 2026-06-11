// Módulo 6 — Alertas. Mudanças de regime/estágio/gate, datadas e SOURÇADAS.
// (O disparo por push/e-mail é scaffolding nesta fase — só a lista existe.)

import type { SourceTag } from "@/lib/dcf/types";

export type AlertKind = "regime" | "estagio" | "gate";

export interface Alert {
  date: string; // YYYY-MM(-DD) — precisão conforme a fonte
  asset: string;
  kind: AlertKind;
  text: string;
  fonte?: SourceTag;
}

export const ALERT_KIND_INFO: Record<AlertKind, { label: string; txt: string; bg: string }> = {
  gate: { label: "Gate", txt: "text-vermelho", bg: "bg-vermelho/10 border-vermelho/30" },
  estagio: { label: "Estágio", txt: "text-ouro", bg: "bg-ouro/10 border-ouro/30" },
  regime: { label: "Regime", txt: "text-ibi-blue", bg: "bg-ibi-blue/10 border-ibi-blue/30" },
};

/** Eventos institucionais reais (curadoria manual, fonte pública em cada um). */
export const ALERTAS: Alert[] = [
  {
    date: "2026-05-21",
    asset: "ef-170",
    kind: "gate",
    text: "STF manteve a redução do Parque Nacional do Jamanxim (6 votos pela constitucionalidade da Lei 13.452/2017).",
    fonte: { label: "STF / Combate Racismo Ambiental", date: "2026-05" },
  },
  {
    date: "2026-03-30",
    asset: "ef-170",
    kind: "gate",
    text: "TCU atendeu o MPF e manteve suspensa a análise da concessão (falta de maturidade + furo de funding).",
    fonte: { label: "TCU / MPF", url: "https://www.mpf.mp.br/o-mpf/unidades/pr-pa/noticias/ferrograo-tcu-atende-a-pedido-do-mpf-e-mantem-suspensa-a-analise-da-concessao-do-projeto", date: "2026-03" },
  },
  {
    date: "2025-11",
    asset: "ef-118",
    kind: "gate",
    text: "Vale desistiu de construir o trecho ES→RJ; obra passa ao futuro concessionário após o impasse na renovação de EFVM/EFC.",
    fonte: { label: "A Gazeta", url: "https://www.agazeta.com.br/es/economia/ef-118-vale-nao-vai-mais-fazer-trecho-de-ferrovia-do-es-ao-rj-1125", date: "2025-11" },
  },
  {
    date: "2026-06-05",
    asset: "ef-170",
    kind: "estagio",
    text: "Leilão da Ferrogrão reagendado de setembro para dezembro de 2026 na revisão do cronograma ferroviário do Ministério dos Transportes (uma das fontes já projeta escorregamento para 2027).",
    fonte: { label: "Jornal de Brasília / Diário do Comércio", url: "https://diariodocomercio.com.br/economia/concessoes-de-ferrovias-atrasam/", date: "2026-06" },
  },
  {
    date: "2026-06-05",
    asset: "ef-118",
    kind: "estagio",
    text: "Leilão do Anel Ferroviário Sudeste (EF-118, fase obrigatória de 245,95 km entre Santa Leopoldina/ES e São João da Barra/RJ) adiado de junho para setembro de 2026.",
    fonte: { label: "É Hoje / Diário do Comércio", url: "https://eshoje.com.br/economia/2026/06/leiloes-ferrovias-adiados-2027-ef118-es-2026/", date: "2026-06" },
  },
  {
    date: "2026-04",
    asset: "fico-fiol",
    kind: "estagio",
    text: "Leilão do Corredor Leste-Oeste reagendado de agosto para dezembro de 2026.",
    fonte: { label: "Agência iNFRA / Diário do Comércio", date: "2026" },
  },
  {
    date: "2026-04",
    asset: "ef-151-norte",
    kind: "estagio",
    text: "Leilão do trecho Açailândia–Barcarena adiado de março para outubro de 2027.",
    fonte: { label: "Diário do Comércio", date: "2026" },
  },
];

/** Alertas de um ativo, mais recente primeiro. */
export function alertasDoAtivo(assetId: string): Alert[] {
  return ALERTAS.filter((a) => a.asset === assetId).sort((a, b) => (a.date < b.date ? 1 : -1));
}
