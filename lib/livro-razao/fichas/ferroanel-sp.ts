import type { FichaProjeto } from "../schema";

// FERROANEL DE SÃO PAULO (tramo norte).
export const ferroanelSp: FichaProjeto = {
  slug: "ferroanel-sp",
  nome: "Ferroanel de São Paulo (tramo norte)",
  modal: "ferrovia",
  uf: ["SP"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Contorno ferroviário de cargas na Região Metropolitana de São Paulo, separando o tráfego de carga do de passageiros (CPTM) e liberando capacidade no corredor de exportação rumo ao Porto de Santos.",
  fontes: [
    // TODO(URL): estudos do Ferroanel tramo norte.
    { titulo: "Ferroanel de São Paulo — tramo norte, estudos", orgao: "Infra S.A. / ANTT", ano: 2021, url: null },
    { titulo: "Ferroanel Norte — estruturação da concessão", orgao: "PPI / Ministério dos Transportes", ano: 2023, url: null },
  ],
};
