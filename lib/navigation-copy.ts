// navigationCopy.ts
// Navegação global do Observatório IBI — header, breadcrumbs, footer
// e metadados das páginas /, /monitor e /caso-2024.

export const navigationCopy = {
  // =====================================================================
  // HEADER GLOBAL — presente em todas as páginas
  // =====================================================================
  header: {
    // Espelha o header de https://ibi-observatorio.org — todos os links
    // apontam para o site principal (cross-domain absoluto).
    brand: {
      label: "Observatório de Infraestrutura de Transportes",
      caption: "",
      href: "https://ibi-observatorio.org/",
    },
    links: [
      { label: "Início",        href: "https://ibi-observatorio.org/#home" },
      { label: "Conceitos",     href: "https://ibi-observatorio.org/#concepts" },
      { label: "Aplicações",    href: "https://ibi-observatorio.org/#applications" },
      { label: "Implementação", href: "https://ibi-observatorio.org/#implementation" },
      { label: "Apoiadores",    href: "https://ibi-observatorio.org/#sponsors" },
      { label: "Contato",       href: "https://ibi-observatorio.org/#contact" },
      { label: "Análises",      href: "https://ibi-observatorio.org/analises" },
    ],
  },

  // =====================================================================
  // BREADCRUMBS POR PÁGINA
  // =====================================================================
  breadcrumbs: {
    home: [{ label: "Início", href: "/" }],
    monitor: [
      { label: "Início", href: "/" },
      { label: "Monitor Hidrológico", href: "/monitor" },
    ],
    caso2024: [
      { label: "Início", href: "/" },
      { label: "Estudos", href: "/caso-2024" },
      { label: "Estiagem de 2024", href: "/caso-2024" },
    ],
  },

  // =====================================================================
  // CROSS-LINKS CONTEXTUAIS
  // Aparecem dentro dos painéis quando faz sentido sugerir a outra página.
  // =====================================================================
  crossLinks: {
    // Card sutil dentro do Painel 3 do monitor (Manaus × Itacoatiara).
    monitorToCase: {
      eyebrow: "Caso documentado",
      title: "A estiagem de 2024",
      caption:
        "Em 2024, Manaus e Itacoatiara registraram suas mínimas com 22 dias de defasagem. O episódio está documentado em estudo de caso analítico.",
      cta: "Ler o estudo →",
      href: "/caso-2024",
    },
    // Footer do estudo de caso, já presente em caso2024Copy.footer.crossLink —
    // mantido aqui também para consistência caso o componente prefira
    // consumir tudo de navigationCopy.
    caseToMonitor: {
      eyebrow: "Situação atual",
      title: "Monitor Hidrológico em tempo real",
      caption:
        "Para acompanhar como as estações analisadas neste estudo estão se comportando agora, consulte o monitor.",
      cta: "Ir para o monitor →",
      href: "/monitor",
    },
  },

  // =====================================================================
  // FOOTER GLOBAL
  // =====================================================================
  footer: {
    institutional: {
      title: "Observatório de Infraestrutura de Transporte",
      description:
        "Iniciativa do Instituto Brasileiro de Infraestrutura — IBI, braço técnico da Frente Parlamentar Mista de Portos e Aeroportos (FPPA).",
    },
    columns: [
      {
        title: "Navegar",
        links: [
          { label: "Início", href: "/" },
          { label: "Monitor Hidrológico", href: "/monitor" },
          { label: "Estudos", href: "/caso-2024" },
        ],
      },
      {
        title: "Fontes",
        links: [
          { label: "ANA — HidroWeb", href: "https://www.snirh.gov.br/hidroweb/" },
          { label: "SGB/CPRM", href: "https://www.sgb.gov.br/" },
          { label: "SEMA-AM", href: "https://www.sema.am.gov.br/" },
        ],
      },
      {
        title: "Institucional",
        links: [
          { label: "Sobre o IBI", href: "https://ibi.org.br/" },
          { label: "Contato", href: "mailto:observatorio@ibi.org.br" },
        ],
      },
    ],
    legal: {
      copyright:
        "© 2026 Instituto Brasileiro de Infraestrutura — IBI. Dados públicos oficiais.",
      methodologyLabel: "Metodologia",
      methodologyHref: "/caso-2024#metodologia",
    },
  },

  // =====================================================================
  // METADADOS POR PÁGINA (head/SEO/Open Graph)
  // =====================================================================
  pageMeta: {
    home: {
      title: "Observatório IBI — Hidrologia da bacia do Amazonas",
      description:
        "Monitoramento integrado e estudos analíticos sobre os ciclos hidrológicos da bacia amazônica. Mantido pelo Instituto Brasileiro de Infraestrutura.",
      ogTitle: "Observatório IBI — Hidrologia da bacia do Amazonas",
      ogDescription:
        "Dados, indicadores e estudos sobre cheia e estiagem na bacia amazônica.",
    },
    monitor: {
      title: "Monitor Hidrológico da Bacia do Amazonas — Observatório IBI",
      description:
        "Acompanhamento em tempo real de 7 estações fluviométricas da bacia amazônica, com indicadores de dessincronização Norte–Sul e alertas automáticos.",
      ogTitle: "Monitor Hidrológico da Bacia do Amazonas 2026",
      ogDescription:
        "Cotas atuais, comparação plurianual e previsões oficiais para a bacia amazônica.",
    },
    caso2024: {
      title:
        "A estiagem de 2024 na bacia do Amazonas — Estudo de caso · Observatório IBI",
      description:
        "Documentação analítica do ciclo de estiagem mais severo já registrado na bacia amazônica, com timeline da defasagem de 22 dias entre Manaus e Itacoatiara.",
      ogTitle: "A estiagem de 2024 na bacia do Amazonas",
      ogDescription:
        "Estudo de caso do Observatório IBI sobre o ciclo de estiagem mais severo da história da bacia.",
    },
  },
} as const;

export type NavigationCopy = typeof navigationCopy;
