import type { FichaProjeto } from "../schema";

// CANAL DE PARANAGUÁ — aprofundamento/dragagem do canal de acesso.
export const canalParanagua: FichaProjeto = {
  slug: "canal-paranagua",
  nome: "Canal de Paranaguá",
  modal: "porto",
  uf: ["PR"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Aprofundamento e alargamento do canal de acesso ao Porto de Paranaguá, para receber navios de maior calado (graneleiros de exportação) e reduzir restrições de janela de maré, ampliando a competitividade do segundo maior porto de granéis do país.",
  fontes: [
    // TODO(URL): projeto de dragagem/aprofundamento do canal de Paranaguá.
    { titulo: "Canal de Paranaguá — projeto de aprofundamento", orgao: "Portos do Paraná (APPA)", ano: 2022, url: null },
    { titulo: "Dragagem do canal de acesso de Paranaguá", orgao: "ANTAQ", ano: 2023, url: null },
  ],
};
