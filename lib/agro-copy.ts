// agro-copy.ts
// TODA a copy da vertical AGRO (/agro e /agro/metodologia) vive aqui.
// Nada de string editorial hardcoded em componente — padrão do repo
// (cf. home-copy.ts / navigation-copy.ts / dashboard-copy.ts).
//
// Tom: boletim Conab — autoridade serena, zero alarmismo. "Crítico" é
// faixa de leitura, nunca manchete.

import type { ComponenteIEE, Corredor } from "./iee-params";

export const agroCopy = {
  // ===================================================================
  // METADADOS (head/SEO)
  // ===================================================================
  pageMeta: {
    agro: {
      title: "Radar do Escoamento — IEE por corredor de exportação · Observatório IBI",
      description:
        "O IEE — Índice de Estresse de Escoamento — antecipa em três semanas a pressão logística da safra nos corredores de Santos, Paranaguá e Arco Norte.",
      ogTitle: "Radar do Escoamento — a pressão logística da safra, três semanas antes",
      ogDescription:
        "IEE+3 por corredor de exportação: frete, fila e janela de embarque sintetizados em um score 0–100 semanal.",
    },
    metodologia: {
      title: "Como o IEE é calculado — metodologia · Observatório IBI",
      description:
        "Definição formal do IEE, normalização por percentil sazonal, pesos v0 declarados como julgamento e plano de calibração pré-registrado.",
      ogTitle: "Metodologia do IEE — Índice de Estresse de Escoamento",
      ogDescription:
        "IEE = Σ w·P: percentis sazonais ponderados por corredor, com faixa de cenários a três semanas.",
    },
  },

  // ===================================================================
  // BLOCO 1 — HERO
  // ===================================================================
  hero: {
    eyebrow: ["Vertical Agro", "IEE · semanal", "Corredores de exportação"],
    titulo: "Radar do Escoamento",
    subtitulo: "a pressão logística da safra, três semanas antes",
    descricao:
      "O IEE — Índice de Estresse de Escoamento — sintetiza fila de navios, custo rodoviário e pressão de safra em um score 0–100 por corredor. A projeção vem primeiro: o IEE+3 lê onde a pressão estará daqui a três semanas.",
  },

  // ===================================================================
  // CARDS PREDITIVOS (Bloco 1)
  // ===================================================================
  card: {
    labelMais3: "IEE+3 · projeção 3 semanas",
    labelAgora: "IEE agora",
    labelFaixaCenarios: "faixa de cenários",
    labelSparkline: "últimas 26 semanas",
    labelInsight: "Insight",
    tendencia: {
      sobe: "pressão em elevação vs hoje",
      cai: "pressão em alívio vs hoje",
      estavel: "pressão estável vs hoje",
    },
  },

  corredores: {
    santos: {
      nome: "Santos",
      rotaResumo: "Sorriso (MT) → Santos (SP)",
      descricao: "Maior porta de saída do grão brasileiro.",
    },
    paranagua: {
      nome: "Paranaguá",
      rotaResumo: "Cascavel (PR) → Paranaguá (PR)",
      descricao: "Corredor Sul — soja e farelo do Paraná e de MS.",
    },
    "arco-norte": {
      nome: "Arco Norte",
      rotaResumo: "Sorriso (MT) → Miritituba (PA)",
      descricao: "Rota de barcaças da calha — sensível ao calado.",
    },
  } satisfies Record<Corredor, { nome: string; rotaResumo: string; descricao: string }>,

  // Insight de 1 frase por corredor — leitura serena. Santos: S real + T modelado.
  insights: {
    santos: "A fila de grão da APS abre o histórico do indicador com 64 graneleiros esperados (~2,5 semanas da capacidade ANTAQ); com a colheita encerrada, o excedente de campo escoa — pressão alta, em dissipação gradual.",
    paranagua: "A fila de graneleiros da APPA inaugura o histórico do indicador nesta semana; com a colheita encerrada no Paraná, a pressão de safra se dissipa — leitura inicial, em calibração.",
    "arco-norte": "Com a calha cheia, o risco hidrológico do Tabocal está no piso e a fila de soja domina a leitura; a contagem regressiva do calado volta a comandar o corredor na descida do rio.",
  } satisfies Record<Corredor, string>,

  // ===================================================================
  // BLOCO 2 — DECOMPOSIÇÃO POR COMPONENTE
  // ===================================================================
  breakdown: {
    titulo: "O que compõe o estresse",
    subtitulo: "Cada componente vira um percentil contra as mesmas semanas das safras anteriores. O IEE é a média ponderada desses percentis.",
    labelPercentil: "percentil sazonal",
    labelValorBruto: "valor da semana",
    labelDelta: "vs semana anterior",
    labelEstavel: "estável",
    unidadeDeltaSaturacao: "p.p.",
    labelCalibracao: "calibração em construção",
    // faixa exibida no lugar de "Crítico" enquanto o histórico tem <3 safras
    // (percentil frágil — topo de amostra pequena, não alarme estatístico)
    labelLeituraInicial: "leitura inicial",
    // barra de faixa (substitui o numerão 100/100)
    labelBarraPercentil: "percentil",
    // tooltip e expand
    labelInfo: "o que este pilar mede",
    labelVerDecomposicao: "ver decomposição",
    labelOcultarDecomposicao: "ocultar decomposição",
    statusPilar: {
      real: "dado real",
      modelado: "modelado IBI",
      ilustrativo: "série ilustrativa",
      indisponivel: "fonte indisponível",
    },
    decomposicaoT: {
      titulo: "Decomposição do custo da rota (R$/t)",
      combustivel: "Combustível (diesel ANP)",
      variavel: "Variável (pneus, manutenção)",
      fixo: "Fixo (depreciação, motorista)",
      pedagio: "Pedágio",
    },
    componentes: {
      F: {
        nome: "Fila no porto",
        unidade: "semanas de fila",
        // valor bruto em destaque: ex. "2,5 sem"
        valorPrefixo: "",
        valorSufixo: "sem",
        valorDescricao: "semanas de fila",
        deltaPrefixo: "",
        deltaSufixo: " sem",
        // uma linha de interpretação
        leituraCurta: "navio parado, custo correndo",
        // texto longo → tooltip (hover/tap)
        leitura: "DWT graneleiro aguardando ao largo, esperado ou programado no line-up, medido em semanas de capacidade de embarque do porto. Subir = navio parado, custo correndo.",
      },
      T: {
        nome: "Custo da rota",
        unidade: "R$/t",
        valorPrefixo: "R$ ",
        valorSufixo: "/t",
        valorDescricao: "custo operacional",
        deltaPrefixo: "R$ ",
        deltaSufixo: "/t",
        leituraCurta: "combustível domina o custo da rota",
        leitura: "Custo operacional modelado de rodar a rota (engine IBI; insumo diesel ANP). NÃO é frete de mercado: é a componente de custo do aperto logístico.",
      },
      S: {
        nome: "Pressão de safra",
        unidade: "semanas de capacidade",
        valorPrefixo: "",
        valorSufixo: "sem",
        valorDescricao: "semanas de excedente",
        deltaPrefixo: "",
        deltaSufixo: " sem",
        leituraCurta: "excedente de campo ainda no aguardo de embarque",
        leitura: "Excedente de campo: o que já foi colhido na hinterlândia e ainda não embarcou, medido em semanas de capacidade do porto. É o pilar forward do IEE.",
      },
      H: {
        nome: "Risco de calado",
        unidade: "índice 0–100",
        valorPrefixo: "",
        valorSufixo: "dias",
        valorDescricao: "até CMR < 11 m",
        deltaPrefixo: "",
        deltaSufixo: " pts",
        // duas leituras: calha cheia (urgência baixa) × contagem ativa (urgência alta)
        leituraCurta: "calha cheia, risco no piso",
        leituraCurtaContagem: "contagem regressiva do calado ativa",
        // estado exibido quando o CMR já cruzou 11 m (dias = 0)
        valorEstadoCritico: "abaixo de 11 m",
        leitura: "Risco hidrológico do canal Tabocal: 60% IRC-Tabocal (v3.6, risco direto) + 40% urgência de calado (dias até o CMR cair abaixo de 11 m). Alto = pior.",
      },
    },
  },

  // ===================================================================
  // BLOCO 3 — RELÓGIO DE DEMURRAGE
  // ===================================================================
  demurrage: {
    titulo: "O custo do navio parado",
    labelValor: "em demurrage estimado, por dia",
    labelNavios: "navios em espera nos três corredores",
    // RÓTULO FIXO E OBRIGATÓRIO — sem ele o card não existe.
    rotuloFixo: "estimativa IBI a partir dos line-ups públicos · parâmetro US$ 35 mil/navio/dia",
  },

  // ===================================================================
  // BLOCO 4 — COLISÃO ARCO NORTE
  // ===================================================================
  colisao: {
    eyebrow: "Arco Norte",
    titulo: "Quando a safra encontra o rio",
    subtitulo: "Embarque programado nos line-ups contra a contagem regressiva do CMR de 11 m no canal Tabocal. A faixa destacada é onde as duas curvas se pressionam.",
    serieEmbarque: "Embarque programado (mil t/sem)",
    serieCalado: "Dias até CMR < 11 m",
    labelZona: "zona de colisão",
    labelZonaFlutuante: "pico de embarque encontra restrição de calado",
    semColisao: "sem interseção nas próximas 12 semanas",
    notaAgenda: "Agenda de embarque publicada cobre {n} semana(s) à frente (CDP/SCAP); semanas sem ponto não têm programação divulgada — lacuna honesta, não zero.",
    rodapeFontes: "embarque: line-ups EMAP/CDP · calado: modelo IBI (recessão Tabocal) · limiar: CMR 11 m canal Tabocal · curva CMR: Capitania dos Portos/AM (187 obs)",
    indisponivel: "Sem dados suficientes para a colisão (line-up ou série hidrológica indisponível) — estado honesto, nada interpolado.",
  },

  // ===================================================================
  // BLOCO 5 — METODOLOGIA + CAPTURA
  // ===================================================================
  rodape: {
    metodologiaCta: "Como o IEE é calculado",
    metodologiaHref: "/agro/metodologia",
    metodologiaCaption: "Definição formal, pesos declarados e plano de calibração pré-registrado.",
    capturaTitulo: "Receba o IEE no fechamento semanal",
    capturaCaption: "O boletim do Radar do Escoamento sai toda sexta, antes da semana operacional.",
  },

  // ===================================================================
  // FONTES POR CORREDOR (rodapé do card preditivo)
  // ===================================================================
  fontesCorredor: {
    santos: "line-up: Porto de Santos (APS/DIOPE) · safra: Conab · custo rodoviário: modelo IBI · diesel: ANP · capacidade: ANTAQ EA",
    paranagua: "line-up: Porto de Paranaguá (APPA) · safra: Conab · custo rodoviário: modelo IBI · diesel: ANP",
    "arco-norte": "line-up: EMAP · CDP (Miritituba/Santarém: indisponível — parcial) · safra: Conab · custo: modelo IBI · diesel: ANP · hidrologia: modelo IBI · CMR: Capitania dos Portos/AM",
  } satisfies Partial<Record<Corredor, string>>,

  // ===================================================================
  // RÓTULO DE DADO ILUSTRATIVO (obrigatório em todo card com série fake)
  // ===================================================================
  rotuloIlustrativo: "⚠ série ilustrativa — a ligar ao line-up oficial",

  // ===================================================================
  // PÁGINA /agro/metodologia
  // ===================================================================
  metodologia: {
    eyebrow: "Metodologia · IEE v0",
    titulo: "Como o IEE é calculado",
    intro:
      "O IEE — Índice de Estresse de Escoamento — é um score semanal de 0 a 100 por corredor de exportação. Esta página documenta a definição formal, as escolhas de normalização, os pesos declarados e o plano de calibração pré-registrado.",
    secoes: {
      definicao: {
        titulo: "Definição formal",
        formula: "IEE = Σ wₖ · Pₖ",
        texto:
          "Cada componente k (frete spot, fila no porto, janela de embarque e, no Arco Norte, hidrologia) é convertido em um percentil sazonal Pₖ de 0 a 100. O IEE do corredor é a média ponderada desses percentis, com pesos wₖ ≥ 0 e Σwₖ = 1. Componentes em que subir significa aliviar (dias até o calado de 11 m) entram com sinal invertido, de modo que percentil alto sempre significa mais estresse.",
      },
      normalizacao: {
        titulo: "Normalização por percentil sazonal",
        texto:
          "O valor corrente de cada componente é comparado apenas com as mesmas semanas do calendário nas safras anteriores — janela de ±2 semanas em torno da semana corrente, com mínimo de 3 safras (15 observações). O percentil empírico usa midrank: P = 100·(n_abaixo + 0,5·n_iguais)/n. Isso remove a sazonalidade da safra: um frete alto em março só conta como estresse se for alto para um março.",
        fallback:
          "Onde o histórico ainda é curto, o índice cai para um z robusto (mediana/MAD, com fator de consistência 1,4826) mapeado para 0–100 via Φ(z) — e o componente é rotulado \"calibração em construção\" até completar 3 safras.",
      },
      pesos: {
        titulo: "Pesos v0 — declarados como julgamento",
        texto:
          "Os pesos abaixo NÃO são calibrados: são julgamento do Observatório sobre a importância relativa de cada sinal em cada corredor, declarados para escrutínio público. Eles permanecem fixos até que o plano de calibração abaixo produza algo comprovadamente melhor.",
        nota: "Σ = 1 por corredor. No Arco Norte, a hidrologia entra porque a janela de calado condiciona a logística de barcaças da calha.",
        colCorredor: "Corredor",
      },
      faixas: {
        titulo: "Faixas de leitura",
      },
      calibracao: {
        titulo: "Plano de calibração — pré-registrado",
        itens: [
          "Alvo: o IEE da semana t deve prever o tempo médio de espera no line-up em t+2.",
          "Restrições: pesos wₖ ≥ 0 com Σwₖ = 1 (sem short em componente).",
          "Critério de substituição: os pesos calibrados só substituem os v0 se reduzirem o MAE out-of-sample em validação walk-forward (treina no passado, testa no futuro, janela deslizante).",
          "Sem critério atingido, os pesos v0 declarados permanecem — transparência acima de sofisticação.",
        ],
      },
      cenarios: {
        titulo: "IEE+3 — faixa de cenários, não intervalo de confiança",
        texto:
          "A projeção de três semanas propaga a tendência recente dos percentis de cada componente (drift das últimas 4 semanas) e abre uma faixa min–max a partir da volatilidade observada. É uma leitura de cenários — \"se o frete acelerar, se a fila ceder\" — e não um intervalo de confiança estatístico. A banda responde à pergunta operacional: entre quais leituras o corredor deve transitar?",
      },
      componenteS: {
        titulo: "Componente S — pressão de safra (dado real)",
        texto:
          "S mede o excedente de campo da hinterlândia de Santos (SP, MG, GO, MS e MT — MT inteiro como aproximação do MT-sul, declarada): volume colhido de soja e milho (Conab, Progresso de Safra semanal × produção por UF do Acompanhamento da Safra) menos o já embarcado, normalizado pela capacidade semanal de embarque do porto. O resultado é lido em \"semanas de capacidade\" e convertido em percentil sazonal.",
        proxy:
          "Enquanto o embarcado acumulado real da ANTAQ não entra (PASSO 2), o já embarcado usa um proxy declarado: capacidade semanal × semanas desde o início do escoamento × fator de utilização (0,7). O denominador de capacidade é ÚNICO para F e S: a média móvel de 12 meses do granel sólido vegetal embarcado em cada corredor, agregada da Estatística Aquaviária da ANTAQ (espelho parquet do IBI); na ausência do cache, vale o parâmetro declarado — nunca duas verdades.",
        fonte:
          "Fonte: Conab — Progresso de Safra / Acompanhamento da Safra (licença CC Atribuição-SemDerivações 3.0; uso sem fins lucrativos com citação). Onde o histórico tem menos de 3 safras, o percentil cai para z robusto (mediana/MAD) rotulado \"calibração em construção\".",
      },
      componenteT: {
        titulo: "Componente T — custo rodoviário modelado (não é frete de mercado)",
        texto:
          "T é o CUSTO operacional de rodar a rota (R$/t), calculado pela engine própria do Observatório com a estrutura clássica das metodologias públicas de custeio rodoviário de carga (custos fixos rateados por km, variáveis por km, combustível, pedágio por eixo, capacidade do veículo — cf. referenciais ANTT/literatura de custeio do TRC). T NÃO é o frete negociado no mercado: a premissa do IEE é que, no pico da safra, o custo sobe (diesel, distância, perfil de veículo) e o frete acompanha — T captura a componente de custo desse aperto.",
        coeficientes:
          "Todos os coeficientes (consumo, pneus, manutenção, custo fixo mensal, km/mês, pedágio por eixo, retorno vazio) são premissas IBI declaradas e versionadas em lib/iee-params.ts — nenhum deriva de série proprietária. Único insumo externo: preço do diesel S10 (ANP, Levantamento de Preços de Combustíveis, série semanal Brasil), citado no card com a data do dado. Decisão registrada: o diesel NÃO é deflacionado — aqui T é custo e o diesel é insumo legítimo dele.",
        validacao:
          "Quando houver convênio de dados de frete praticado, T poderá ser cruzado e validado contra série de mercado — até lá, permanece rotulado como custo modelado.",
      },
      componenteH: {
        titulo: "Componente H — risco hidrológico do canal Tabocal (Arco Norte)",
        texto:
          "H combina dois sinais DIRETOS (alto = pior): 60% do IRC-Tabocal v3.6 — o score operacional de risco de calado do canal (0–100), com pesos calibrados contra 20 eventos rotulados (Spearman 0,62) e piso dominador quando o déficit de calado é severo — e 40% de urgência de calado: a contagem de dias até o CMR cair abaixo de 11 m, saturando em 90 dias.",
        engine:
          "A contagem de dias usa a recessão exponencial de Itacoatiara calibrada em 2016–2023 (RMSE ~2,6 m na cota, suficiente porque o objetivo é a DATA de cruzamento, não a cota ponto a ponto), convertida em calado pela curva CMR isotônica calibrada com 187 observações da Capitania dos Portos/AM (extrapolação Theil-Sen 0,80 m de CMR por m de cota). Nada disso é recalculado na vertical: tudo importa das libs hidrológicas do Monitor.",
        pesos:
          "Os pesos internos 60/40 do H são julgamento v0 declarado (iee-params), na mesma régua dos demais pilares: ficam fixos até a calibração pré-registrada indicar algo comprovadamente melhor. Onde a série tem menos de 3 safras, vale o z robusto rotulado \"calibração em construção\".",
      },
      dados: {
        titulo: "Estado dos dados",
        texto:
          "Santos: F real (line-up APS/DIOPE), S real (Conab) e T modelado — corredor completo desde o PASSO 2. Paranaguá: F real (APPA), S real, T modelado. Arco Norte: F real PARCIAL (EMAP + CDP; Miritituba/Santarém sem line-up público — lacuna rotulada, nunca silenciada), S real (hinterlândia MT·PA·TO·MA·PI·RO, MT inteiro como proxy de MT-norte), T modelado e H modelado sobre dados reais (IRC-Tabocal + recessão/CMR). Pilares com histórico < 3 safras carregam \"calibração em construção\".",
      },
    },
    preRegistro: {
      titulo: "Pré-registro v0 — compromissos públicos",
      intro:
        "Os parâmetros do IEE estão congelados em um pré-registro versionado (data/agro/pre-registro-iee-v0.json), com hash SHA-256 do snapshot canônico. Qualquer mudança de parâmetro exige novo pré-registro com diff e justificativa — a verificação de integridade roda junto do backtest e bloqueia publicação em caso de drift.",
      labelHash: "Integridade",
      labelCongelado: "congelado em",
      compromissosTitulo: "Compromissos",
      episodiosTitulo: "Episódios-âncora e vereditos",
      lacunasTitulo: "Lacunas conhecidas (declaradas, nunca silenciadas)",
      invalidaTitulo: "O que bloqueia publicação",
      verVereditos: "Vereditos recomputados a cada execução de scripts/backtest/iee-final.ts — nunca editados à mão.",
    },
    voltarCta: "← Voltar ao Radar do Escoamento",
    voltarHref: "/agro",
  },
} as const;

export type AgroCopy = typeof agroCopy;
