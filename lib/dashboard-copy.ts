// dashboardCopy.ts
// Textos da página /monitor — Monitoramento Hidrológico em tempo real.
// Mantido pelo Observatório de Infraestrutura de Transporte do IBI.

export const dashboardCopy = {
  // =====================================================================
  // CABEÇALHO DA PÁGINA
  // =====================================================================
  pageHeader: {
    eyebrow: "Monitor",
    title: "Monitor Hidrológico da Bacia do Amazonas 2026",
    subtitle:
      "Acompanhamento integrado de 7 estações fluviométricas para apoiar a navegação, a regulação e a gestão de risco hidrológico.",
    lead:
      "A bacia amazônica tem dois regimes de chuva — equatorial ao Norte e tropical ao Sul — que produzem ciclos de cheia e estiagem em momentos diferentes do ano. Em anos de El Niño ou La Niña, esses ciclos podem se distanciar ainda mais. Este painel monitora a evolução dessas curvas em tempo quase real, permitindo identificar antecipadamente situações atípicas que demandem atenção operacional.",
    lastUpdated: {
      label: "Última atualização",
    },
  },

  // =====================================================================
  // BLOCO "COMO LER ESTE PAINEL"
  // =====================================================================
  howToRead: {
    title: "Como ler este painel",
    items: [
      {
        marker: "🔵",
        label: "Norte da bacia",
        stations: "Curicuriari, Manaus",
        description:
          "Rios alimentados por chuva equatorial. Sobem primeiro no ciclo anual.",
      },
      {
        marker: "🟠",
        label: "Sul da bacia",
        stations: "Humaitá, Porto Velho",
        description:
          "Rios alimentados por chuva amazônica e do cerrado. Sobem depois.",
      },
      {
        marker: "⚖️",
        label: "Trecho central de navegação",
        stations: "Manacapuru, Itacoatiara, Borba",
        description:
          "Refletem a confluência dos dois regimes e as condições efetivas do canal.",
      },
    ],
  },

  // =====================================================================
  // PAINEL 1 — RÉGUAS ATUAIS
  // =====================================================================
  panel1: {
    anchorId: "reguas-atuais",
    title: "Como estão os rios agora",
    subtitle:
      "Cota atual das 7 estações de referência, comparada à média histórica e aos anos de 2024 e 2025.",
    cardLabels: {
      currentLevel: "Cota atual",
      relativePosition: "Onde está hoje em relação aos últimos 30 anos",
      relativeLegend: ["abaixo do normal", "normal", "acima do normal"],
      trend24h: "Tendência nas últimas 24 horas",
      trendLabels: {
        rising: "subindo",
        stable: "estável",
        falling: "descendo",
      },
      vs2025: "Em relação a 2025 nesta data",
      vs2024: "Em relação a 2024 nesta data",
    },
    tooltips: {
      relativePosition:
        "Posição da cota atual dentro da faixa histórica de variação observada para esta data (entre o percentil 10 e o percentil 90 da série 1995–2023).",
      semaphore:
        "Verde: cota dentro da faixa histórica esperada. Amarelo: próximo aos limites históricos. Vermelho: fora da faixa histórica observada para esta data.",
    },
    snapshotCard: {
      title: "Snapshot analítico — 17 de março de 2026",
      description:
        "Pico observado de dessincronização Norte–Sul no ciclo de 2026. Mantido como referência analítica.",
    },
    sources: "Fontes: ANA (telemetria e HidroWeb), SEMA-AM (boletins).",
  },

  // =====================================================================
  // PAINEL 2 — MONITOR DE DESSINCRONIZAÇÃO
  // =====================================================================
  panel2: {
    anchorId: "indice-dessincronizacao",
    title: "Índice de Dessincronização Norte–Sul",
    subtitle:
      "Mede a defasagem entre os ciclos hidrológicos do Norte e do Sul da bacia. Valores próximos de zero indicam bacia em fase; valores extremos indicam regimes desencontrados.",
    formula:
      "IDN = posição relativa de Curicuriari − posição relativa de Humaitá. Varia entre −1 e +1.",
    zones: [
      {
        range: "−1,0 a −0,3",
        label: "Sul adiantado em relação ao Norte",
        tone: "neutral",
      },
      {
        range: "−0,3 a +0,3",
        label: "Bacia em fase",
        tone: "normal",
      },
      {
        range: "+0,3 a +1,0",
        label: "Norte adiantado em relação ao Sul",
        tone: "neutral",
        note: "Regime atual (2026)",
      },
    ],
    currentRegime: {
      label: "Regime atual",
      description:
        "O Norte segue o padrão de 2026. O Sul ainda reflete a hidrologia herdada de 2024.",
    },
    interpretation:
      "Quando o índice se afasta de zero, as estações de referência do Norte e do Sul estão em pontos distintos de seus respectivos ciclos anuais — informação útil para planejamento operacional e leitura conjunta das demais estações.",
  },

  // =====================================================================
  // PAINEL 3 — MANAUS × ITACOATIARA (LEITURA COMPLEMENTAR)
  // =====================================================================
  panel3: {
    anchorId: "manaus-itacoatiara",
    title: "Manaus e Itacoatiara: leitura complementar",
    subtitle:
      "Manaus é a estação de referência histórica do Rio Negro. Itacoatiara, 200 km a jusante, reflete a confluência com o Solimões e as condições do canal de navegação para a foz. Acompanhar as duas em conjunto oferece uma leitura mais completa da navegabilidade no trecho.",
    metrics: {
      manausCurrent: "Cota atual em Manaus",
      itacoatiaraCurrent: "Cota atual em Itacoatiara",
      manausVsHistoric:
        "17,7 m em Manaus é um marco historicamente associado ao início do período de baixas águas.",
      itacoatiaraDelta: "Variação de Itacoatiara em relação a 2025 nesta data",
    },
    semaphore: {
      label: "Status de alinhamento entre as duas estações",
      levels: [
        {
          color: "green",
          label: "Leituras alinhadas",
          description:
            "Manaus e Itacoatiara variam em fase. Leitura conjunta consistente.",
        },
        {
          color: "yellow",
          label: "Divergência moderada",
          description:
            "As duas estações começam a se distanciar. Recomenda-se acompanhamento mais frequente.",
        },
        {
          color: "red",
          label: "Divergência acentuada",
          description:
            "Recomenda-se análise integrada das duas estações antes de decisões operacionais sensíveis ao calado.",
        },
      ],
    },
  },

  // =====================================================================
  // PAINEL 4 — COTAGRAMAS HISTÓRICOS
  // =====================================================================
  panel4: {
    anchorId: "cotagramas",
    title: "Comparação plurianual: como 2026 se compara a 2024 e 2025",
    subtitle:
      "A faixa cinza mostra a variação histórica esperada para cada dia do ano (1995–2023). Linhas fora dessa faixa indicam anos atípicos.",
    selector: {
      label: "Selecione a estação ou par de comparação",
      options: [
        {
          value: "curicuriari-humaita",
          label: "Curicuriari × Humaitá",
          caption: "Comparação Norte–Sul: dois extremos da bacia",
          isDefault: true,
        },
        {
          value: "manaus-itacoatiara",
          label: "Manaus × Itacoatiara",
          caption:
            "Trecho de navegação: leitura conjunta a montante e a jusante",
        },
        {
          value: "individual",
          label: "Estação individual",
          caption: "Visualizar uma estação isoladamente",
        },
      ],
    },
    legend: {
      band: "Faixa histórica esperada (P10–P90, 1995–2023)",
      year2024: "2024",
      year2025: "2025",
      year2026: "2026 (em curso)",
    },
  },

  // =====================================================================
  // PAINEL 5 — PREVISÃO E ALERTAS DO DIA
  // =====================================================================
  panel5: {
    anchorId: "previsao-alertas",
    forecast: {
      title: "Previsão para 2026 (SGB/CPRM)",
      subtitle:
        "Projeções oficiais do Serviço Geológico do Brasil para o ciclo hidrológico de 2026.",
      items: [
        {
          label: "Cheia esperada em Manaus",
          value: "28,23 m",
          context: "Pico previsto para o ciclo de 2026.",
        },
        {
          label: "Estiagem esperada em Itacoatiara",
          value: "entre 4,10 m e 5,15 m",
          context:
            "Faixa de mínima projetada — abaixo do limite operacional típico para comboios graneleiros de maior calado.",
        },
      ],
      source: "Fonte: SGB/CPRM — Boletins de Monitoramento Hidrológico.",
    },
    alerts: {
      title: "Alertas do dia",
      subtitle:
        "Síntese automática gerada a partir das leituras das últimas 24 horas.",
      emptyState:
        "Nenhum alerta no momento — leituras dentro da faixa esperada.",
      templates: {
        belowP10:
          "{station} está em mínimas históricas para esta data — apenas {percent}% dos anos desde 1995 tiveram valores tão baixos.",
        aboveP90:
          "{station} está em máximas históricas para esta data — apenas {percent}% dos anos desde 1995 tiveram valores tão altos.",
        growingDivergence:
          "Divergência entre {stationA} e {stationB} em crescimento nas últimas 72 horas. Recomenda-se acompanhamento.",
        rapidChange:
          "{station} apresentou variação de {delta} cm nas últimas 24 horas — acima do padrão típico para esta época do ano.",
      },
    },
  },

  // =====================================================================
  // PERGUNTAS FREQUENTES
  // =====================================================================
  faq: {
    anchorId: "faq",
    title: "Perguntas frequentes",
    items: [
      {
        q: "O que é o Índice de Dessincronização Norte–Sul (IDN)?",
        a: "É uma métrica desenvolvida pelo Observatório IBI que mede o quanto os ciclos hidrológicos das estações de referência do Norte (Curicuriari) e do Sul (Humaitá) da bacia estão em fase. Varia de −1 a +1. Próximo de zero, a bacia opera em fase; valores extremos indicam regimes desencontrados.",
      },
      {
        q: "Por que monitorar Manaus e Itacoatiara em conjunto?",
        a: "Manaus é a estação de referência histórica do Rio Negro, com a série temporal mais longa e consolidada do país. Itacoatiara está 200 km a jusante e reflete a confluência com o Solimões e as condições efetivas do canal de navegação rumo à foz. As duas estações fornecem informações complementares sobre o trecho.",
      },
      {
        q: "De onde vêm os dados deste painel?",
        a: "Telemetria e séries históricas da Agência Nacional de Águas (ANA), via plataforma HidroWeb e API SOAP; boletins fluviométricos da Secretaria de Estado de Meio Ambiente do Amazonas (SEMA-AM); e previsões hidrológicas do Serviço Geológico do Brasil (SGB/CPRM).",
      },
      {
        q: "Com que frequência os dados são atualizados?",
        a: "As cotas atuais são atualizadas conforme a periodicidade da telemetria das estações (em geral, intervalos horários ou de 4 horas). Os boletins SEMA são incorporados diariamente. As previsões SGB/CPRM seguem o calendário oficial de publicação.",
      },
      {
        q: "O fenômeno de dessincronização é novo?",
        a: "Não. A defasagem entre os regimes Norte e Sul é uma característica conhecida da hidrologia amazônica. O que se observa nos últimos anos é uma maior frequência e intensidade desses descasamentos, associados a eventos climáticos extremos como as estiagens severas de 2023 e 2024.",
      },
    ],
  },

  // =====================================================================
  // GLOSSÁRIO
  // =====================================================================
  glossary: {
    anchorId: "glossario",
    title: "Glossário",
    items: [
      {
        term: "Cota",
        definition:
          "Altura do nível da água em uma estação fluviométrica, medida em metros a partir de um marco de referência local (zero da régua).",
      },
      {
        term: "Faixa histórica esperada (P10–P90)",
        definition:
          "Intervalo dentro do qual se concentram 80% das observações históricas para um determinado dia do ano, com base na série de 1995–2023. Valores fora dessa faixa indicam condições atípicas.",
      },
      {
        term: "Estação fluviométrica",
        definition:
          "Ponto de medição contínua do nível e, em alguns casos, da vazão de um curso d'água.",
      },
      {
        term: "Dessincronização Norte–Sul",
        definition:
          "Situação em que os ciclos hidrológicos do Norte e do Sul da bacia amazônica estão em pontos distintos de suas curvas anuais — por exemplo, com o Norte enchendo enquanto o Sul ainda drena.",
      },
      {
        term: "Recessão e ascensão",
        definition:
          "Recessão é o período de queda do nível do rio após o pico de cheia. Ascensão é o período de subida após a mínima de estiagem.",
      },
      {
        term: "Calado",
        definition:
          "Profundidade que uma embarcação ocupa abaixo da linha d'água. Define o nível mínimo de cota necessário para navegação segura em determinado trecho.",
      },
    ],
  },
} as const;

export type DashboardCopy = typeof dashboardCopy;
