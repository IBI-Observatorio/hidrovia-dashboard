import type { FichaProjeto } from "../schema";

// HIDROVIA PARAGUAI-PARANÁ.
export const hidroviaParaguaiParana: FichaProjeto = {
  slug: "hidrovia-paraguai-parana",
  nome: "Hidrovia Paraguai-Paraná",
  modal: "hidrovia",
  uf: ["MS", "MT"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Melhorias de navegabilidade no eixo Paraguai-Paraná, ligando o polo de mineração e grãos de Mato Grosso do Sul e Mato Grosso aos portos do Cone Sul, com potencial de reduzir o custo logístico do minério de ferro e da soja da região.",
  fontes: [
    // TODO(URL): estudos e acordo internacional da hidrovia Paraguai-Paraná.
    { titulo: "Hidrovia Paraguai-Paraná — estudos de navegabilidade", orgao: "DNIT / ANTAQ", ano: 2021, url: null },
    { titulo: "Programa da Hidrovia Paraguai-Paraná", orgao: "Ministério dos Transportes", ano: 2022, url: null },
  ],
};
