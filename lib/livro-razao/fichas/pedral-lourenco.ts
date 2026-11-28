import type { FichaProjeto } from "../schema";

// PEDRAL DO LOURENÇO — derrocamento no rio Tocantins (hidrovia Araguaia-Tocantins).
export const pedralLourenco: FichaProjeto = {
  slug: "pedral-lourenco",
  nome: "Pedral do Lourenço (rio Tocantins)",
  modal: "hidrovia",
  uf: ["PA", "TO"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Derrocamento do trecho do Pedral do Lourenço, no baixo Tocantins, que remove o principal gargalo à navegação da hidrovia Araguaia-Tocantins e permite comboios o ano todo entre Marabá (PA) e o terminal de Vila do Conde.",
  fontes: [
    // TODO(URL): projeto/contrato do derrocamento do Pedral do Lourenço.
    { titulo: "Derrocamento do Pedral do Lourenço — projeto", orgao: "DNIT", ano: 2022, url: null },
    { titulo: "Hidrovia Araguaia-Tocantins — obra do Pedral", orgao: "Ministério dos Transportes", ano: 2023, url: null },
  ],
};
