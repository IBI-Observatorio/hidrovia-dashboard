import type { FichaProjeto } from "../schema";

// HIDROVIA DO MADEIRA.
export const hidroviaMadeira: FichaProjeto = {
  slug: "hidrovia-madeira",
  nome: "Hidrovia do Madeira",
  modal: "hidrovia",
  uf: ["RO", "AM"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Melhorias de navegabilidade (dragagem, sinalização e balizamento) no rio Madeira entre Porto Velho (RO) e Itacoatiara (AM), corredor consolidado de escoamento de grãos do Centro-Oeste pelo Arco Norte, sensível à estiagem.",
  fontes: [
    // TODO(URL): estudos de navegabilidade / EVTEA da hidrovia do Madeira.
    { titulo: "Hidrovia do Madeira — estudos de navegabilidade", orgao: "DNIT", ano: 2021, url: null },
    { titulo: "Condições de calado do corredor do Madeira", orgao: "ANTAQ", ano: 2023, url: null },
  ],
};
