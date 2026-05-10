// homeCopy.ts
// Textos da home (/) — porta de entrada neutra que apresenta o Observatório
// e direciona o visitante para o Monitor em tempo real ou para os estudos
// de caso analíticos.

export const homeCopy = {
  // =====================================================================
  // HERO
  // =====================================================================
  hero: {
    eyebrow: "Observatório de Infraestrutura de Transporte · IBI",
    title: "Monitoramento e análise da hidrologia da bacia do Amazonas",
    subtitle:
      "Dados, indicadores e estudos sobre os ciclos de cheia e estiagem que condicionam a navegação comercial na maior bacia hidrográfica do mundo.",
    description:
      "Mantido pelo Instituto Brasileiro de Infraestrutura — IBI, com dados oficiais da ANA, SEMA-AM e SGB/CPRM.",
  },

  // =====================================================================
  // CARDS DE NAVEGAÇÃO PRINCIPAIS
  // =====================================================================
  navigationCards: {
    title: "Por onde começar",
    cards: [
      {
        kind: "monitor",
        eyebrow: "Tempo real",
        title: "Monitor Hidrológico",
        description:
          "Acompanhamento integrado de 7 estações fluviométricas da bacia, com indicadores de dessincronização Norte–Sul e alertas automáticos.",
        meta: "Atualizado continuamente",
        cta: "Ver o monitor →",
        href: "/monitor",
      },
      {
        kind: "case-study",
        eyebrow: "Estudo de caso",
        title: "A estiagem de 2024",
        description:
          "Documentação analítica do ciclo de estiagem mais severo já registrado, com timeline da defasagem de 22 dias entre Manaus e Itacoatiara.",
        meta: "Publicado em maio de 2026",
        cta: "Ler o estudo →",
        href: "/caso-2024",
      },
    ],
  },

  // =====================================================================
  // SOBRE O OBSERVATÓRIO
  // =====================================================================
  about: {
    title: "Sobre o Observatório",
    paragraphs: [
      "O Observatório de Infraestrutura de Transporte do IBI reúne dados públicos, séries históricas e análises técnicas sobre a infraestrutura logística brasileira, com foco inicial na bacia amazônica.",
      "Nosso objetivo é oferecer informação organizada e metodologicamente transparente para apoiar decisões de operadores, reguladores, formuladores de política pública, parlamentares, jornalistas e pesquisadores.",
    ],
    institutional: {
      label: "Instituição mantenedora",
      name: "Instituto Brasileiro de Infraestrutura — IBI",
      description:
        "Braço técnico da Frente Parlamentar Mista de Portos e Aeroportos (FPPA).",
    },
  },

  // =====================================================================
  // FONTES DE DADOS
  // =====================================================================
  dataSources: {
    title: "Fontes de dados",
    description:
      "Todo o conteúdo do Observatório é construído sobre dados públicos oficiais.",
    items: [
      {
        acronym: "ANA",
        name: "Agência Nacional de Águas e Saneamento Básico",
        role: "Telemetria fluviométrica e séries históricas (HidroWeb).",
      },
      {
        acronym: "SEMA-AM",
        name: "Secretaria de Estado de Meio Ambiente do Amazonas",
        role: "Boletins fluviométricos diários.",
      },
      {
        acronym: "SGB/CPRM",
        name: "Serviço Geológico do Brasil",
        role: "Previsões hidrológicas e boletins de monitoramento.",
      },
    ],
  },

  // =====================================================================
  // CONTATO
  // =====================================================================
  contact: {
    title: "Contato e contribuições",
    description:
      "Sugestões metodológicas, correções de dados e propostas de novos estudos podem ser enviadas para a equipe do Observatório.",
    emailLabel: "E-mail institucional",
    email: "observatorio@ibi.org.br",
  },
} as const;

export type HomeCopy = typeof homeCopy;
