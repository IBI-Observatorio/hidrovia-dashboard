// caso2024Copy.ts
// Textos da página /caso-2024 — Estudo de caso analítico autônomo.
// Peça citável independente do monitor em tempo real.

export const caso2024Copy = {
  // =====================================================================
  // CABEÇALHO DA PÁGINA
  // =====================================================================
  pageHeader: {
    eyebrow: "Estudo de caso · Observatório IBI",
    title: "A estiagem de 2024 na bacia do Amazonas",
    subtitle:
      "Documentação analítica de um episódio de divergência acentuada entre as estações de Manaus e Itacoatiara.",
    metadata: {
      authorLabel: "Autoria",
      author: "Observatório de Infraestrutura de Transporte — IBI",
      publicationLabel: "Publicado em",
      publicationDate: "Maio de 2026",
      versionLabel: "Versão",
      version: "1.0",
    },
    abstract:
      "A estiagem de 2024 foi a mais severa já registrada em séries históricas modernas da bacia amazônica. Entre outubro e novembro daquele ano, as estações de Manaus e Itacoatiara — separadas por 200 km no eixo do Rio Negro/Solimões — registraram suas mínimas em datas distintas, com 22 dias de defasagem. Este estudo documenta o episódio com base nas séries oficiais da ANA e dos boletins SEMA-AM, e oferece subsídios técnicos para o planejamento operacional em ciclos hidrológicos semelhantes.",
    keyFacts: [
      { label: "Mínima em Manaus", value: "12,11 m em 9/out/2024" },
      { label: "Mínima em Itacoatiara", value: "0,33 m em 31/out/2024" },
      { label: "Defasagem temporal", value: "22 dias" },
      { label: "Severidade", value: "Mínima histórica em ambas as estações" },
    ],
    methodologicalNote:
      "Os valores absolutos referem-se aos zeros das réguas locais e não são comparáveis diretamente entre estações. A análise foca na defasagem temporal entre os pontos de inflexão e na posição relativa de cada estação dentro de sua própria série histórica.",
    actions: {
      downloadPdf: "Baixar versão em PDF",
      copyCitation: "Copiar citação",
      share: "Compartilhar",
    },
  },

  // =====================================================================
  // SUMÁRIO DO ESTUDO
  // =====================================================================
  toc: {
    title: "Sumário",
    items: [
      { id: "contexto", label: "1. Contexto climatológico" },
      { id: "timeline", label: "2. A defasagem dos 22 dias" },
      { id: "historico", label: "3. 2024 no contexto da série histórica" },
      { id: "operacional", label: "4. Implicações para o planejamento operacional" },
      { id: "metodologia", label: "5. Metodologia e fontes" },
    ],
  },

  // =====================================================================
  // BLOCO 1 — CONTEXTO CLIMATOLÓGICO
  // =====================================================================
  context: {
    anchorId: "contexto",
    sectionNumber: "1",
    title: "Contexto climatológico",
    subtitle:
      "O ciclo de 2023–2024 foi marcado por El Niño de intensidade forte e por anomalias térmicas no Atlântico Norte tropical.",
    paragraphs: [
      "O ciclo hidrológico de 2023–2024 ocorreu sob influência simultânea de dois fenômenos climáticos: El Niño no Pacífico equatorial, classificado como de intensidade forte, e aquecimento anômalo do Atlântico Norte tropical. A combinação reduziu de forma significativa a precipitação sobre a bacia amazônica, especialmente no setor norte e central.",
      "Como consequência, a recarga dos rios formadores do Negro e do Solimões durante o período de chuvas de 2023–2024 ficou abaixo da média histórica. A estiagem subsequente, observada entre julho e novembro de 2024, registrou mínimas inéditas em diversas estações da bacia.",
      "Em Manaus, a cota mínima de 12,11 m superou — para baixo — o recorde anterior, de 13,59 m, registrado em 2010. Em Itacoatiara, a mínima também foi a mais baixa da série histórica.",
    ],
    sources:
      "Fontes: SGB/CPRM, INPE, NOAA Climate Prediction Center, Boletim Hidrológico da Bacia Amazônica (ANA, 2024).",
  },

  // =====================================================================
  // BLOCO 2 — TIMELINE DOS 22 DIAS
  // =====================================================================
  timeline: {
    anchorId: "timeline",
    sectionNumber: "2",
    title: "A defasagem dos 22 dias",
    subtitle:
      "Cronologia comparada das duas estações entre setembro e novembro de 2024.",
    introduction:
      "O gráfico abaixo sobrepõe as cotas diárias de Manaus e Itacoatiara entre 1º de setembro e 30 de novembro de 2024. A linha de Manaus atinge seu ponto mínimo em 9 de outubro e inicia recuperação. A linha de Itacoatiara segue em recessão por mais 22 dias, atingindo a mínima apenas em 31 de outubro.",
    annotations: [
      {
        date: "9 de outubro de 2024",
        station: "Manaus",
        event: "Mínima histórica registrada — 12,11 m",
        note: "A partir deste ponto, Manaus inicia ascensão.",
      },
      {
        date: "10 a 30 de outubro de 2024",
        station: "Período de divergência",
        event: "Manaus em ascensão, Itacoatiara em recessão",
        note: "Durante 22 dias, as duas estações operam em fases opostas do ciclo.",
      },
      {
        date: "31 de outubro de 2024",
        station: "Itacoatiara",
        event: "Mínima histórica registrada — 0,33 m",
        note: "A partir deste ponto, Itacoatiara inicia ascensão.",
      },
    ],
    interpretation:
      "Esse intervalo é uma característica observada em anos de estiagem severa: estações a montante recuperam-se antes que a onda de recessão se propague rio abaixo. Em condições hidrológicas normais, essa defasagem é menor e menos perceptível operacionalmente.",
  },

  // =====================================================================
  // BLOCO 3 — ANÁLISE COMPARADA COM SÉRIE HISTÓRICA
  // =====================================================================
  historicalComparison: {
    anchorId: "historico",
    sectionNumber: "3",
    title: "2024 no contexto da série histórica",
    subtitle:
      "Como o episódio de 2024 se posiciona em relação a estiagens anteriores documentadas na bacia.",
    introduction:
      "A série histórica das estações de Manaus e Itacoatiara permite contextualizar 2024 em relação a outros eventos extremos. O quadro abaixo lista os anos de mínimas mais severas registradas na estação de Manaus desde 1903 (início da série).",
    table: {
      caption: "Mínimas históricas em Manaus — 5 menores cotas registradas",
      headers: ["Ano", "Cota mínima (m)", "Data da mínima", "Contexto climático"],
      rows: [
        ["2024", "12,11", "9 de outubro", "El Niño forte + Atlântico Norte aquecido"],
        ["2023", "12,70", "26 de outubro", "El Niño em desenvolvimento"],
        ["2010", "13,63", "24 de outubro", "El Niño moderado"],
        ["1963", "13,64", "13 de outubro", "Sem evento significativo"],
        ["2005", "14,75", "26 de outubro", "Atlântico Norte aquecido"],
      ],
      note: "Os anos de 2023 e 2024 representam, respectivamente, a segunda e a primeira mínima da série de mais de 120 anos.",
    },
    interpretation:
      "A frequência de eventos extremos nos últimos vinte anos — com três das cinco menores cotas históricas registradas após 2005 — é compatível com projeções de maior variabilidade hidrológica na bacia em cenários de mudança climática.",
  },

  // =====================================================================
  // BLOCO 4 — IMPLICAÇÕES OPERACIONAIS
  // =====================================================================
  operationalImplications: {
    anchorId: "operacional",
    sectionNumber: "4",
    title: "Implicações para o planejamento operacional",
    subtitle:
      "Aprendizados extraídos do episódio que podem informar a tomada de decisão em ciclos futuros.",
    items: [
      {
        title: "Defasagem temporal entre estações",
        description:
          "Em ciclos de estiagem severa, a mínima em estações a jusante pode ocorrer com defasagem significativa em relação a estações a montante. O monitoramento conjunto de Manaus e Itacoatiara oferece leitura mais completa do trecho.",
      },
      {
        title: "Janelas operacionais",
        description:
          "Durante a defasagem, embarcações com calado próximo ao limite operacional podem encontrar condições distintas em diferentes pontos do trecho. O planejamento de viagem se beneficia da consulta integrada às duas estações.",
      },
      {
        title: "Previsibilidade",
        description:
          "Eventos como El Niño são previstos com meses de antecedência por modelos climáticos consolidados. Essa antecedência permite preparar planos de contingência operacional para ciclos de estiagem potencialmente severos.",
      },
      {
        title: "Limites do monitoramento pontual",
        description:
          "A análise integrada de múltiplas estações fornece informação complementar à leitura individual. Cada estação, isoladamente, reflete apenas as condições locais do trecho monitorado.",
      },
    ],
  },

  // =====================================================================
  // BLOCO 5 — METODOLOGIA E FONTES
  // =====================================================================
  methodology: {
    anchorId: "metodologia",
    sectionNumber: "5",
    title: "Metodologia e fontes",
    subtitle: "Critérios de seleção, tratamento dos dados e referências.",
    dataSources: {
      title: "Fontes de dados",
      items: [
        {
          source: "Agência Nacional de Águas (ANA)",
          description:
            "Séries históricas de cota das estações de Manaus (código 14990000) e Itacoatiara (código 16030000), via plataforma HidroWeb e API SOAP de telemetria.",
        },
        {
          source: "SEMA-AM",
          description:
            "Boletins fluviométricos diários publicados pela Secretaria de Estado de Meio Ambiente do Amazonas, utilizados como validação cruzada das leituras telemétricas.",
        },
        {
          source: "SGB/CPRM",
          description:
            "Boletins de Monitoramento Hidrológico da Bacia Amazônica e relatórios de previsão de cheia e estiagem.",
        },
        {
          source: "INPE e NOAA CPC",
          description:
            "Dados de anomalia de temperatura da superfície do mar e índices de El Niño/La Niña (ONI).",
        },
      ],
    },
    methods: {
      title: "Tratamento dos dados",
      items: [
        "Séries históricas consolidadas em base diária, com preenchimento de falhas pontuais por interpolação linear quando o intervalo era inferior a 3 dias.",
        "Identificação dos pontos de inflexão (mínimas e máximas) por detecção de mudança de sinal na primeira derivada da série suavizada por média móvel de 5 dias.",
        "Cálculo da posição relativa P10–P90 com base em janelas móveis de 11 dias centradas na data corrente, ao longo da série 1995–2023.",
      ],
    },
    limitations: {
      title: "Limitações",
      items: [
        "As cotas são medidas em relação ao zero da régua local, não a um datum absoluto comum. Valores absolutos não são comparáveis diretamente entre estações.",
        "A telemetria pode apresentar falhas pontuais, especialmente em períodos de manutenção de equipamentos. Essas falhas são sinalizadas nas séries originais da ANA.",
        "As correlações com fenômenos climáticos (El Niño, Atlântico Norte) são associativas e baseadas em literatura consolidada. Atribuição causal rigorosa exige modelagem específica.",
      ],
    },
  },

  // =====================================================================
  // RODAPÉ — CITAÇÃO E LINK PARA O MONITOR
  // =====================================================================
  footer: {
    citation: {
      title: "Como citar este estudo",
      text: "Observatório de Infraestrutura de Transporte do IBI. A estiagem de 2024 na bacia do Amazonas: estudo de caso. Brasília: IBI, 2026. Disponível em: [URL].",
    },
    crossLink: {
      eyebrow: "Situação atual",
      title: "Acompanhe as condições hidrológicas em tempo real",
      caption:
        "O Monitor Hidrológico exibe as leituras atuais das estações analisadas neste estudo, comparadas à faixa histórica e aos ciclos recentes.",
      cta: "Ir para o Monitor Hidrológico →",
      href: "/monitor",
    },
  },
} as const;

export type Caso2024Copy = typeof caso2024Copy;
