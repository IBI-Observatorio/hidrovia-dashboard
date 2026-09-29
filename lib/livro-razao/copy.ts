// LIVRO-RAZÃO — copy da página. Registro "banco central": autoridade serena,
// zero alarmismo. NUNCA mencionar PortGDP; não citar entidades nominalmente na
// metodologia (as fontes aparecem ficha a ficha, com selo de proveniência).

export const LIVRO_RAZAO_COPY = {
  eyebrow: "Livro-Razão da Infraestrutura",
  titulo: "Livro-Razão da Infraestrutura",
  subtitulo:
    "A carteira de projetos estruturantes do país, com o custo diário de cada um não existir. Convertemos estudos públicos em fluxo — não produzimos estimativa primária.",

  /** Barra de estado honesta (recebe N de fichas ativas). */
  estado: (ativas: number, total: number) =>
    `${ativas} de ${total} fichas ativas · demais em validação metodológica`,

  grade: {
    tooltipMultiplo:
      "Múltiplo de urgência = custo anual de inação (pelo piso) ÷ CAPEX. Quantas vezes, em um ano, o custo de não fazer o projeto equivale ao investimento para fazê-lo.",
    seloEmValidacao: "aguardando validação metodológica",
  },

  ficha: {
    faixaRotulo: "Faixa piso–teto do custo de inação",
    memoriaTitulo: "Memória de cálculo",
    capexTitulo: "CAPEX",
    multiploTitulo: "Múltiplo de urgência",
    destravaTitulo: "O que o projeto destrava",
    fontesTitulo: "Fontes",
    emValidacaoNota:
      "Esta ficha está em validação metodológica. Nenhum valor econômico é exibido enquanto a conversão dos estudos públicos em custo diário não passa pelo crivo de auditoria do Observatório. Abaixo, as fontes já apontadas.",
  },

  metodologia: {
    titulo: "Metodologia",
    itens: [
      {
        rotulo: "Critério de elegibilidade",
        texto:
          "Uma ficha só fica ativa com CAPEX e custo diário de inação auditáveis de ponta a ponta, cada um com fonte pública identificada e URL. Ficha sem dado validado permanece em validação — sem número e fora de qualquer soma.",
      },
      {
        rotulo: "Uso do piso do intervalo",
        texto:
          "O relógio de cada ficha e a soma nacional usam sempre o PISO do intervalo piso–teto — o extremo conservador. O teto aparece apenas como faixa de referência, nunca no placar.",
      },
      {
        rotulo: "O que não fazemos",
        texto:
          "Não produzimos estimativa primária, não inventamos, não aproximamos. O Livro-Razão apenas transporta para fluxo contínuo o que estudos públicos já publicaram, com a conta aberta na memória de cálculo de cada ficha.",
      },
    ],
  },

  meta: {
    title: "Livro-Razão da Infraestrutura — o custo diário de cada projeto não existir | Observatório IBI",
    description:
      "Carteira de 15 projetos estruturantes do país, cada um com o custo diário de não existir convertido em fluxo contínuo a partir de estudos públicos. Registro auditável do Observatório IBI.",
  },
} as const;
