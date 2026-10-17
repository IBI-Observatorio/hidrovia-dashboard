// Módulo 7 — Backtest. Previsões DATADAS vs realizado → track record auditável.
//
// Honestidade (lição do projeto): o produto é novo, então NÃO há histórico de
// acertos do modelo a exibir. O que existe e é auditável:
//   • Previsões OFICIAIS de leilão (ANTT/governo) que já se resolveram — o
//     histórico de deslizamento que calibra o ceticismo do Radar.
//   • Calls do OBSERVATÓRIO, registrados agora, com `realizado` em aberto.
// Cada previsão carrega `autor` e `fonte` — nunca se atribui ao modelo um acerto
// que ele não fez.

import type { SourceTag } from "@/lib/dcf/types";

export type Autor = "Observatório" | "Oficial";
export type Veredito = "acerto" | "erro" | "parcial";
export type StatusPrev = "pendente" | Veredito;

export interface Previsao {
  date: string;          // quando a previsão foi feita
  asset: string;
  metric: "pleilao" | "tir" | "janela" | "gate";
  texto: string;
  autor: Autor;
  realizado?: string;    // descrição do que ocorreu (se resolvido)
  realizadoDate?: string;
  veredito?: Veredito;   // preenchido só quando resolvido
  fonte?: SourceTag;
}

export const VEREDITO_INFO: Record<StatusPrev, { label: string; txt: string; bg: string }> = {
  acerto: { label: "Acerto", txt: "text-ibi-green", bg: "bg-ibi-green/10 border-ibi-green/30" },
  parcial: { label: "Parcial", txt: "text-ouro", bg: "bg-ouro/10 border-ouro/30" },
  erro: { label: "Erro", txt: "text-vermelho", bg: "bg-vermelho/10 border-vermelho/30" },
  pendente: { label: "Em aberto", txt: "text-gray-400", bg: "bg-white/5 border-white/10" },
};

export const PREVISOES: Previsao[] = [
  // ── Previsões OFICIAIS de leilão já resolvidas (histórico de deslizamento) ──
  {
    date: "2020", asset: "ef-170", metric: "pleilao", autor: "Oficial",
    texto: "Leilão da Ferrogrão ainda na primeira metade da década.",
    realizado: "Empurrado para além de 2026 (projeto parado ~12 anos).",
    realizadoDate: "2026", veredito: "erro",
    fonte: { label: "ANTT / Neofeed", date: "2026" },
  },
  {
    date: "2026-02", asset: "fico-fiol", metric: "pleilao", autor: "Oficial",
    texto: "Leilão do Corredor Leste-Oeste em agosto de 2026.",
    realizado: "Reagendado para dezembro de 2026.",
    realizadoDate: "2026-04", veredito: "erro",
    fonte: { label: "Agência iNFRA", date: "2026" },
  },
  {
    date: "2025", asset: "ef-118", metric: "pleilao", autor: "Oficial",
    texto: "Leilão da EF-118 no 1º trimestre de 2026.",
    realizado: "Remarcado para junho de 2026.",
    realizadoDate: "2026", veredito: "parcial",
    fonte: { label: "Tribuna Online", date: "2025" },
  },
  {
    date: "2026", asset: "ef-151-norte", metric: "pleilao", autor: "Oficial",
    texto: "Leilão do trecho Açailândia–Barcarena em março de 2027.",
    realizado: "Adiado para outubro de 2027.",
    realizadoDate: "2026-04", veredito: "erro",
    fonte: { label: "Diário do Comércio", date: "2026" },
  },
  {
    date: "2026-06-05", asset: "ef-170", metric: "pleilao", autor: "Oficial",
    texto: "Leilão da Ferrogrão em dezembro de 2026.",
    realizado: "Estudos reenviados ao TCU em set/2026, com leilão projetado para 2027.",
    realizadoDate: "2026-09-11", veredito: "erro",
    fonte: { label: "Agência iNFRA", url: "https://agenciainfra.com/blog/ferrograo-volta-ao-tcu-sem-aporte-e-com-ajuste-em-material-rodante/", date: "2026-09-11" },
  },
  {
    date: "2026-06-05", asset: "fico-fiol", metric: "pleilao", autor: "Oficial",
    texto: "Leilão do Corredor Leste-Oeste em dezembro de 2026.",
    realizado: "Ministro Santoro: leilão só em 2027.",
    realizadoDate: "2026-08-27", veredito: "erro",
    fonte: { label: "Poder360", url: "https://www.poder360.com.br/poder-governo/governo-avanca-para-integrar-leste-oeste-e-quer-8-chamamentos-de-ferrovias/", date: "2026-08-27" },
  },
  {
    date: "2026-06-05", asset: "ef-118", metric: "pleilao", autor: "Oficial",
    texto: "Leilão da EF-118 em setembro de 2026.",
    realizado: "ANTT passou a projetar a 1ª quinzena de dezembro de 2026.",
    realizadoDate: "2026-08-05", veredito: "erro",
    fonte: { label: "SouBrasília", url: "https://soubrasilia.com/leilao-ferrovias-ef-118-centro-atlantica-dezembro-2026-antt/", date: "2026-08-05" },
  },
  {
    date: "2026-08-05", asset: "ef-118", metric: "pleilao", autor: "Oficial",
    texto: "Leilão da EF-118 na 1ª quinzena de dezembro de 2026.",
    realizado: "Empurrado para o 1º trimestre de 2027 (edital até dez/2026).",
    realizadoDate: "2026-09-18", veredito: "erro",
    fonte: { label: "CNN Brasil", url: "https://www.cnnbrasil.com.br/infra/apos-atrasos-governo-quer-leiloar-ferrovia-no-sudeste-em-2027/", date: "2026-09-18" },
  },
  // ── Calls do OBSERVATÓRIO (registrados agora, em aberto) ──
  {
    date: "2026-06-06", asset: "ef-170", metric: "tir", autor: "Observatório",
    texto: "A TIR realista (1,6%) segue muito abaixo do WACC; o leilão não fica atrativo sem reestruturação do aporte.",
  },
  {
    date: "2026-06-06", asset: "ef-118", metric: "pleilao", autor: "Observatório",
    texto: "A EF-118 será o primeiro ativo do pipeline a efetivamente ir a leilão.",
  },
];

export function statusPrevisao(p: Previsao): StatusPrev {
  return p.veredito ?? "pendente";
}

export function previsoesDoAtivo(assetId: string): Previsao[] {
  return PREVISOES.filter((p) => p.asset === assetId).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface TaxaAcerto {
  resolvidas: number;
  acertos: number;
  parciais: number;
  erros: number;
  pendentes: number;
  taxa: number | null; // (acerto + 0,5·parcial) / resolvidas; null se nada resolvido
}

/** Taxa de acerto sobre as previsões RESOLVIDAS (parcial conta meio ponto). */
export function taxaAcerto(ps: Previsao[]): TaxaAcerto {
  const resolvidas = ps.filter((p) => p.veredito);
  const acertos = resolvidas.filter((p) => p.veredito === "acerto").length;
  const parciais = resolvidas.filter((p) => p.veredito === "parcial").length;
  const erros = resolvidas.filter((p) => p.veredito === "erro").length;
  return {
    resolvidas: resolvidas.length,
    acertos,
    parciais,
    erros,
    pendentes: ps.length - resolvidas.length,
    taxa: resolvidas.length ? (acertos + 0.5 * parciais) / resolvidas.length : null,
  };
}
