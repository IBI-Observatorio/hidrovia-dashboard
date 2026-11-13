import type { FichaProjeto } from "../schema";

// FICO — Ferrovia de Integração Centro-Oeste (EF-354).
export const fico: FichaProjeto = {
  slug: "fico",
  nome: "FICO — Ferrovia de Integração Centro-Oeste (EF-354)",
  modal: "ferrovia",
  uf: ["MT", "GO"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Ligação ferroviária entre Mara Rosa (GO) e Água Boa (MT), conectando a produção agrícola do leste de Mato Grosso à Ferrovia Norte-Sul e, por ela, aos portos do Arco Norte e do Sudeste.",
  fontes: [
    // TODO(URL): estudos e contrato da EF-354.
    { titulo: "Ferrovia de Integração Centro-Oeste (EF-354) — estudos", orgao: "Infra S.A. / VALEC", ano: 2021, url: null },
    { titulo: "Autorização e cronograma da FICO", orgao: "Ministério dos Transportes", ano: 2022, url: null },
  ],
};
