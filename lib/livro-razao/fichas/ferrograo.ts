import type { FichaProjeto } from "../schema";

// FERROGRÃO (EF-170) — Sinop (MT) ↔ Miritituba (PA).
//
// Nasce 'em_validacao' como TODAS as fichas. Os valores econômicos desta ficha
// serão inseridos pelo Bruno num passo posterior, a partir do modelo do RADAR
// FERROVIÁRIO — NÃO devem ser inventados aqui.
//
// A estrutura para ativar a ficha está pronta e comentada abaixo. Para ativar:
//   1. Preencher `capex` e `custoInacaoDiario` (piso ≤ teto, com fonte + URL).
//   2. Trocar status para 'ativa'.
//   3. A validação de build (validarFicha) e o Relógio fazem o resto.
//
// /* ── BLOCO A PREENCHER (Bruno, Radar Ferroviário) ────────────────────────
//   status: "ativa",
//   capex: {
//     valor: /* PREENCHER: Bruno, Radar Ferroviário */ 0,
//     ano_base: /* PREENCHER: Bruno, Radar Ferroviário */ 0,
//     fonte: {
//       titulo: "/* PREENCHER: Bruno, Radar Ferroviário */",
//       orgao: "/* PREENCHER: Bruno, Radar Ferroviário */",
//       ano: /* PREENCHER: Bruno, Radar Ferroviário */ 0,
//       url: "/* PREENCHER: Bruno, Radar Ferroviário — URL pública */",
//     },
//   },
//   custoInacaoDiario: {
//     piso: /* PREENCHER: Bruno, Radar Ferroviário — R$/dia */ 0,
//     teto: /* PREENCHER: Bruno, Radar Ferroviário — R$/dia */ 0,
//     ano_base: /* PREENCHER: Bruno, Radar Ferroviário */ 0,
//     fonte: {
//       titulo: "/* PREENCHER: Bruno, Radar Ferroviário */",
//       orgao: "/* PREENCHER: Bruno, Radar Ferroviário */",
//       ano: /* PREENCHER: Bruno, Radar Ferroviário */ 0,
//       url: "/* PREENCHER: Bruno, Radar Ferroviário — URL pública */",
//     },
//     memoria: "/* PREENCHER: Bruno, Radar Ferroviário — a conta por extenso */",
//   },
// ─────────────────────────────────────────────────────────────────────── */

export const ferrograo: FichaProjeto = {
  slug: "ferrograo",
  nome: "Ferrogrão (EF-170)",
  modal: "ferrovia",
  uf: ["MT", "PA"],
  status: "em_validacao",
  capex: null,
  custoInacaoDiario: null,
  contexto:
    "Ferrovia de aproximadamente 933 km ligando Sinop (MT) ao terminal de Miritituba (PA), no rio Tapajós, para escoar a produção de grãos do médio-norte de Mato Grosso pelo Arco Norte, aliviando a dependência do corredor rodoviário até os portos do Sudeste.",
  fontes: [
    // TODO(URL): link público do EVTEA/estudo de viabilidade da EF-170.
    { titulo: "Estudos de viabilidade da EF-170 (Ferrogrão)", orgao: "EPL / Infra S.A.", ano: 2020, url: null },
    // TODO(URL): processo de acompanhamento do TCU.
    { titulo: "Acompanhamento do projeto EF-170", orgao: "TCU", ano: 2021, url: null },
    // TODO(URL): ficha do projeto no Programa de Parcerias de Investimentos.
    { titulo: "Ferrogrão — carteira de concessões ferroviárias", orgao: "PPI / Ministério dos Transportes", ano: 2023, url: null },
  ],
};
