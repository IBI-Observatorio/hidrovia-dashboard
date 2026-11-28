import type { FichaProjeto } from "../schema";

// TÚNEL SANTOS–GUARUJÁ — ligação seca sob o canal do Porto de Santos.
export const tunelSantosGuaruja: FichaProjeto = {
  slug: "tunel-santos-guaruja",
  nome: "Túnel Santos–Guarujá",
  modal: "porto",
  uf: ["SP"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Ligação seca (túnel imerso) sob o canal do estuário entre Santos e Guarujá, substituindo a travessia por balsas e integrando as duas margens do complexo portuário — acesso viário e ferroviário ao terminal da margem esquerda.",
  fontes: [
    // TODO(URL): estudos e modelagem do Túnel Santos-Guarujá.
    { titulo: "Túnel Santos–Guarujá — estudos de viabilidade", orgao: "Governo do Estado de São Paulo", ano: 2023, url: null },
    { titulo: "Ligação seca Santos–Guarujá — modelagem", orgao: "Ministério de Portos e Aeroportos", ano: 2024, url: null },
  ],
};
