// Módulo B1 "Pavimento" — fonte única de dado + copy. Convenção da casa:
// nenhum número de domínio e nenhuma copy ficam hardcoded em componente ou
// registry; tudo nasce aqui e é consumido por embed-registry / página pública.
//
// Base: Pesquisa CNT de Rodovias 2025.

export const PAVIMENTO = {
  valorAnualDiesel: 7_200_000_000, // R$/ano de diesel a mais (1,2 bi L)
  sobrecustoBase: 31.2, // % medido pela CNT
  recuperacaoMalha: 101_100_000_000, // R$ p/ recuperar a malha (stat de apoio)
  litrosAno: 1_200_000_000, // stat de apoio
};

export const PAVIMENTO_COPY = {
  titulo: "O custo do pavimento ruim, em tempo real",
  intro:
    "A cada segundo, o transporte de carga brasileiro queima diesel a mais por rodar sobre um pavimento que não foi recuperado. A Pesquisa CNT de Rodovias mede esse sobrecusto uma vez por ano; aqui ele aparece em tempo real. A conta é paga por quem move a safra — não pela estrada em si, mas pela manutenção que não veio.",
  rotulo: "em diesel desperdiçado por rodar sobre pavimento ruim — acumulado hoje",
  premissaLabel: "Sobrecusto médio por condição do pavimento",
  ancoraNota: "31,2% = média medida pela CNT (2025)",
  metodologia:
    "Base: Pesquisa CNT de Rodovias 2025 — sobrecusto operacional médio de 31,2% atribuído à condição do pavimento e ~R$ 7,2 bi/ano em consumo adicional de diesel (1,2 bi de litros). O contador distribui o valor anual ao longo do tempo desde 0h de hoje. O escopo é o diesel, não o custo logístico total. Estimativa do Observatório/IBI a partir de dado CNT.",
  fonte: "Pesquisa CNT de Rodovias 2025",
};
