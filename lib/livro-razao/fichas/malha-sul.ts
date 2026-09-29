import type { FichaProjeto } from "../schema";

// MALHA SUL — renovação/reabilitação da malha ferroviária do Sul.
export const malhaSul: FichaProjeto = {
  slug: "malha-sul",
  nome: "Malha Sul — renovação ferroviária",
  modal: "ferrovia",
  uf: ["RS", "SC", "PR"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Reabilitação e requalificação da malha ferroviária do Sul do país (bitola métrica), historicamente subutilizada, para reconectar a produção agrícola do RS/SC/PR aos portos de Rio Grande, São Francisco do Sul e Paranaguá.",
  fontes: [
    // TODO(URL): estudos de renovação/nova concessão da Malha Sul.
    { titulo: "Malha Sul — estudos de renovação da concessão", orgao: "ANTT / Infra S.A.", ano: 2022, url: null },
    { titulo: "Malha Sul — diagnóstico da infraestrutura", orgao: "Ministério dos Transportes", ano: 2023, url: null },
  ],
};
