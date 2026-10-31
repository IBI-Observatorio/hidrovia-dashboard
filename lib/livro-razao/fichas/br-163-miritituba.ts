import type { FichaProjeto } from "../schema";

// BR-163 — trecho até Miritituba (PA), acesso ao Arco Norte.
export const br163Miritituba: FichaProjeto = {
  slug: "br-163-miritituba",
  nome: "BR-163 — acesso a Miritituba",
  modal: "rodovia",
  uf: ["MT", "PA"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Manutenção e duplicação de trechos críticos da BR-163 entre o norte de Mato Grosso e o terminal de transbordo de Miritituba (PA), espinha rodoviária do escoamento de grãos pelo Arco Norte antes do embarque no Tapajós.",
  fontes: [
    // TODO(URL): concessão/estudos da BR-163 trecho PA.
    { titulo: "BR-163 (trecho PA) — concessão e estudos", orgao: "ANTT / DNIT", ano: 2021, url: null },
    { titulo: "Corredor BR-163 / Miritituba — logística do Arco Norte", orgao: "Infra S.A.", ano: 2022, url: null },
  ],
};
