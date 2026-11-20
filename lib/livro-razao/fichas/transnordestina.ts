import type { FichaProjeto } from "../schema";

// TRANSNORDESTINA (EF-232).
export const transnordestina: FichaProjeto = {
  slug: "transnordestina",
  nome: "Transnordestina (EF-232)",
  modal: "ferrovia",
  uf: ["PI", "CE", "PE"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Ferrovia ligando Eliseu Martins (PI) aos portos de Pecém (CE) e Suape (PE), voltada a escoar grãos, minério e derivados do interior do Nordeste e do sul do Piauí para o litoral.",
  fontes: [
    // TODO(URL): acompanhamento e estudos da Transnordestina.
    { titulo: "Transnordestina (EF-232) — situação da obra", orgao: "TCU", ano: 2022, url: null },
    { titulo: "Transnordestina — repactuação e cronograma", orgao: "Ministério dos Transportes", ano: 2023, url: null },
  ],
};
