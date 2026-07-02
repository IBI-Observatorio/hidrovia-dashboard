import type { FichaProjeto } from "../schema";

// EF-118 — Ferrovia Rio de Janeiro ↔ Vitória.
export const ef118: FichaProjeto = {
  slug: "ef-118",
  nome: "EF-118 — Ferrovia Rio–Vitória",
  modal: "ferrovia",
  uf: ["RJ", "ES"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Ligação ferroviária entre a Região Metropolitana do Rio de Janeiro e o complexo portuário de Vitória (ES), integrando o sistema de carga do Sudeste e desafogando o corredor rodoviário BR-101 no litoral.",
  fontes: [
    // TODO(URL): estudos e leilão da EF-118.
    { titulo: "EF-118 (Rio–Vitória) — estudos de viabilidade", orgao: "Infra S.A. / ANTT", ano: 2021, url: null },
    { titulo: "Concessão da EF-118", orgao: "ANTT", ano: 2022, url: null },
  ],
};
