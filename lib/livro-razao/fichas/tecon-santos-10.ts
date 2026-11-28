import type { FichaProjeto } from "../schema";

// TECON SANTOS 10 (STS10) — terminal de contêineres do Porto de Santos.
export const teconSantos10: FichaProjeto = {
  slug: "tecon-santos-10",
  nome: "Tecon Santos 10 (STS10)",
  modal: "porto",
  uf: ["SP"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Novo terminal de contêineres na margem esquerda do Porto de Santos, projetado para ampliar substancialmente a capacidade de movimentação do maior porto da América Latina, hoje próximo da saturação no pico da safra.",
  fontes: [
    // TODO(URL): edital/estudos do terminal STS10.
    { titulo: "Terminal STS10 — estudos e leilão", orgao: "Autoridade Portuária de Santos (APS) / ANTAQ", ano: 2023, url: null },
    { titulo: "STS10 — estruturação do arrendamento", orgao: "PPI / Ministério de Portos e Aeroportos", ano: 2024, url: null },
  ],
};
