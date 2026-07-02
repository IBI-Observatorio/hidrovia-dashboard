import type { FichaProjeto } from "../schema";

// FIOL — Ferrovia de Integração Oeste-Leste (EF-334), tramos 2 e 3.
export const fiol23: FichaProjeto = {
  slug: "fiol-2-3",
  nome: "FIOL 2 e 3 — Ferrovia de Integração Oeste-Leste (EF-334)",
  modal: "ferrovia",
  uf: ["BA", "TO"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Trechos 2 (Caetité–Barreiras) e 3 (Barreiras–Figueirópolis/TO) da EF-334, que ligam o oeste da Bahia ao Porto Sul (Ilhéus) e à Ferrovia Norte-Sul, escoando grãos e mineração do MATOPIBA.",
  fontes: [
    // TODO(URL): estudos dos tramos 2 e 3 da FIOL.
    { titulo: "FIOL tramos 2 e 3 (EF-334) — estudos de viabilidade", orgao: "Infra S.A.", ano: 2021, url: null },
    { titulo: "Estruturação da concessão FIOL 2/3", orgao: "PPI / Ministério dos Transportes", ano: 2023, url: null },
  ],
};
