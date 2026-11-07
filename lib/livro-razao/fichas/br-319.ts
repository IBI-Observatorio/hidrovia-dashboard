import type { FichaProjeto } from "../schema";

// BR-319 — Manaus (AM) ↔ Porto Velho (RO).
export const br319: FichaProjeto = {
  slug: "br-319",
  nome: "BR-319 — Manaus–Porto Velho",
  modal: "rodovia",
  uf: ["AM", "RO"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Reconstrução e pavimentação do trecho central da BR-319, única ligação rodoviária entre Manaus e o restante do país por Porto Velho, hoje intrafegável em boa parte do ano. Projeto de alta sensibilidade ambiental, com licenciamento no IBAMA.",
  fontes: [
    // TODO(URL): projeto de engenharia e licenciamento da BR-319.
    { titulo: "BR-319 — projeto de reconstrução do trecho do meio", orgao: "DNIT", ano: 2022, url: null },
    { titulo: "Licenciamento ambiental da BR-319", orgao: "IBAMA", ano: 2022, url: null },
  ],
};
