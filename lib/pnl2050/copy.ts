// PNL 2050 — copy da página. Registro "banco central": factual, sem alarmismo.
// Todo número citado aqui sai do próprio relatório do PNL 2050 ou da base
// extraída dele (public/data/pnl2050/pnl2050.json).

import type { CategoriaObjetivo, Nivel, TipoEixo } from "./dados";

export const PNL_COPY = {
  meta: {
    title: "PNL 2050: do papel à obra · Observatório IBI",
    description:
      "O Plano Nacional de Logística 2050 escolheu 31 eixos de transporte para 112 objetivos. O Observatório acompanha, empreendimento por empreendimento, se eles saem do papel — e mostra os objetivos que ficaram sem eixo.",
  },
  eyebrow: "Plano Nacional de Logística 2050",
  titulo: "O PNL 2050 escolheu 31 eixos. Quantos estão saindo do papel?",
  subtitulo:
    "O plano diz o que o Estado quer até 2050. O Observatório acompanha se isso anda — intervenção por intervenção, degrau por degrau — e aponta o que o plano deixou sem resposta.",

  estado: (intervencoes: number) =>
    `Fase 1 · ${intervencoes} intervenções mapeadas no degrau 0 · degraus 1 a 6 em apuração`,

  marcos: {
    titulo: "Onde o PNL está no ciclo de planejamento",
    nota:
      "O Decreto nº 12.022/2024 encadeia os instrumentos do Planejamento Integrado de Transportes (PIT). Cada etapa seguinte precisa acolher os eixos do cenário-meta para que eles cheguem ao orçamento.",
    etapas: [
      { rotulo: "PNL 2050", detalhe: "Estratégico · publicado em agosto de 2026", feito: true },
      { rotulo: "Planos Setoriais", detalhe: "Tático · um por modo de transporte", feito: false },
      { rotulo: "Planos Gerais", detalhe: "Operacional · Parcerias e Ações Públicas", feito: false },
      { rotulo: "PPA e LOA", detalhe: "Orçamento e carteira de concessões", feito: false },
    ],
    tcu:
      "O TCU acompanha o ciclo: Acórdãos nº 1.472/2022 (inversão planejamento–investimento), nº 1.832/2026 (monitoramento do PNL) e nº 1.497/2026 (diagnóstico socioambiental).",
  },

  escada: {
    titulo: "A escada da aderência",
    texto:
      "Cada intervenção do cenário-meta sobe sete degraus até virar infraestrutura. Um degrau só é marcado com evidência pública e endereço verificável. Sem evidência, fica em cinza — o que não significa obra parada, e sim que ainda não há registro público.",
    degraus: [
      { n: 0, rotulo: "No PNL 2050", fonte: "Relatório do PNL" },
      { n: 1, rotulo: "Plano Setorial", fonte: "Planos Setoriais do PIT" },
      { n: 2, rotulo: "PPA / LOA", fonte: "PPA, LOA, SIOP" },
      { n: 3, rotulo: "Estudo", fonte: "EVTEA, projeto, PPI" },
      { n: 4, rotulo: "Licença", fonte: "Ibama / órgão estadual" },
      { n: 5, rotulo: "Contrato", fonte: "Leilão ou contrato assinado" },
      { n: 6, rotulo: "Obra", fonte: "Execução ou operação" },
    ],
  },

  eixos: {
    titulo: "Os 31 eixos do cenário-meta",
    texto:
      "Cada linha é um eixo; cada estação, um degrau. Hoje todos estão no degrau 0 — a apuração dos degraus seguintes começa pelos eixos aquaviários e do Arco Norte.",
  },

  orfaos: {
    titulo: "Os órfãos do PNL",
    texto:
      "O próprio plano reconhece que “não propõe solução completa para todos os 112 objetivos de atuação”. Cruzando as 42 fichas de eixo com a lista de objetivos, estes são os que nenhum eixo atende — nem no cenário-meta, nem no banco de projetos.",
    leitura: {
      "EXP-9": "Provável escolha deliberada (escoamento por duto e offshore), mas o plano não explicita.",
      "DOM-15": "Mesmo caso do óleo bruto para exportação.",
      "EXP-18": "Problema diagnosticado no plano e sem eixo correspondente.",
      "PEXC-2": "Nenhum eixo trata aviação regional; o único eixo com aeroportos é o da Macrometrópole de São Paulo.",
      "PEXC-3": "Idem: a integração regional aérea ficou sem eixo.",
      "ABR-4": "O plano cita o Panorama das Estradas Vicinais (CNA/ESALQ-LOG) no diagnóstico, mas não há eixo para o tema.",
      "ABR-9": "Problema institucional, fora do alcance de um eixo de infraestrutura.",
      "ABR-17": "Problema institucional; o plano trata o tema nas diretrizes socioambientais.",
    } as Record<string, string>,
    fragilTitulo: "Cobertura frágil",
    fragilTexto:
      "Objetivos atendidos por um único eixo, e apenas em nível de contribuição médio. Se esse eixo atrasar, o objetivo fica sem resposta.",
    matrizTitulo: "Matriz completa: 112 objetivos × eixos",
    matrizTexto:
      "Cada célula mostra o nível de contribuição que a ficha do eixo declara. Linhas vazias sobem para o topo.",
    toggleBanco: "Incluir banco de projetos",
  },

  metodologia: {
    titulo: "Metodologia",
    itens: [
      {
        rotulo: "Fonte única",
        texto:
          "Toda a estrutura (objetivos, eixos, intervenções e níveis de contribuição) é extraída do relatório completo do PNL 2050, 1ª edição (agosto de 2026). O arquivo processado tem hash registrado na base.",
      },
      {
        rotulo: "Checagem contra o próprio plano",
        texto:
          "A extração só é aceita se reproduz os totais que o plano declara: 112 objetivos por categoria e a quantidade de intervenções de cada ficha. Duas inconsistências do próprio documento estão registradas: o eixo R007 lista 25 intervenções e declara 24; e a ficha A004 põe dois objetivos abrangentes (acesso aos portos e custo logístico da sociobiodiversidade) sob o bloco de oportunidades — aqui contados como abrangentes.",
      },
      {
        rotulo: "Sem número inventado",
        texto:
          "O texto do PNL 2050 não traz valores de investimento em reais. O Observatório não estima custos de eixos: degraus e órfãos são contagens do que o plano e os registros públicos publicaram.",
      },
    ],
  },
};

export const CATEGORIA_CURTA: Record<CategoriaObjetivo, string> = {
  EXP: "Exportação",
  DOM: "Mercado doméstico",
  ABA: "Abastecimento",
  PSAT: "Passageiros · saturação",
  PEXC: "Passageiros · acesso",
  ABR: "Abrangente",
  DEM: "Demanda emergente",
  OPP: "Oportunidade · produção",
  OPR: "Oportunidade · regional",
};

export const TIPO_EIXO_LABEL: Record<TipoEixo, string> = {
  aquaviario: "Aquaviário",
  ferroviario: "Ferroviário",
  rodoviario: "Rodoviário",
  intermodal: "Intermodal",
  banco: "Banco de projetos",
};

export const MODAL_LABEL: Record<string, string> = {
  rodovia: "Rodovia",
  ferrovia: "Ferrovia",
  hidrovia: "Hidrovia",
  porto: "Porto",
  aeroporto: "Aeroporto",
  misto: "Misto",
};

/** Classe de fundo por nível de contribuição (tokens do design system). */
export const NIVEL_CLASSE: Record<Nivel, string> = {
  "Muito alto": "bg-ibi-green",
  Alto: "bg-ibi-green/60",
  Médio: "bg-ibi-green/30",
  Baixo: "bg-ibi-green/15",
};
