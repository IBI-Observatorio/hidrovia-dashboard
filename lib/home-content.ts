// home-content.ts
// Conteúdo da HOME data-first do Observatório IBI.

import type { LucideIcon } from "lucide-react";
import {
  Ship,
  BarChart3,
  Waves,
  FileText,
  Plane,
  Map,
  TrendingUp,
  Star,
  Activity,
  Calendar,
  Building2,
  Globe,
} from "lucide-react";

export type AchadoCor = "blue" | "red" | "green";

export interface Achado {
  valor: string;
  cor: AchadoCor;
  label: string;
  texto: string;
  href: string;
}

export type PainelStatus = "novo" | "live" | "breve";

export interface Painel {
  icon: LucideIcon;
  iconCor: "blue" | "green";
  titulo: string;
  descricao: string;
  href: string;
  status: PainelStatus;
  cta: string;
}

export const heroCopy = {
  eyebrow: ["Movimentação portuária nacional", "Fevereiro 2026", "Fonte: ANTAQ"],
  valor: 101,            // milhões de toneladas (fev/2026)
  delta: 3.78,           // % vs fev/2025
  unidade: "milhões de toneladas movimentadas",
  // série mensal ILUSTRATIVA (jan/25–fev/26) — substituir pela base oficial da ANTAQ
  serie: [112, 98, 104, 109, 116, 118, 121, 114, 108, 111, 119, 123, 104, 101],
  subtitulo:
    "O número que o setor inteiro espera todo mês — aqui, em segundos. Cabotagem, longo curso e navegação interior, porto a porto, com a leitura do que ele significa.",
} as const;

export const achados: Achado[] = [
  {
    valor: "+0,77",
    cor: "blue",
    label: "correlação com o PIM-PF do IBGE, 2 meses adiantada",
    texto:
      "As toneladas que chegam aos portos hoje preveem a produção industrial de daqui a dois meses. Um antecedente do PIB construído com dado portuário.",
    href: "/portos/ineditas/portgdp",
  },
  {
    valor: "R$ 14 bi",
    cor: "red",
    label: "por ano em navio parado nos portos brasileiros",
    texto:
      "53% do tempo de estadia portuária é espera, não operação. Monetizando essas horas, o país queima cerca de R$ 14 bilhões/ano em ineficiência logística.",
    href: "/portos/eficiencia-operacional/custo-espera",
  },
  {
    valor: "35→44%",
    cor: "green",
    label: "do granel sólido migrou para o Arco Norte em 13 anos",
    texto:
      "A migração silenciosa Sul-Sudeste → Norte já redesenhou o escoamento agrícola. Itaqui multiplicou seu volume por 6× desde 2010.",
    href: "/portos/agronegocio/arco-norte",
  },
];

export const paineis: Painel[] = [
  {
    icon: Ship,
    iconCor: "green",
    titulo: "Movimentação Portuária",
    descricao:
      "Toneladas por porto, natureza de carga e sentido. Cabotagem, longo curso e interior, mês a mês.",
    href: "/portos/movimentacao",
    status: "novo",
    cta: "Abrir painel",
  },
  {
    icon: BarChart3,
    iconCor: "blue",
    titulo: "Indicadores Portuários",
    descricao:
      "Os indicadores autorais do IBI: antecedente do PIB, custo de ineficiência, sazonalidade e clusters.",
    href: "/portos",
    status: "live",
    cta: "Ver indicadores",
  },
  {
    icon: Waves,
    iconCor: "blue",
    titulo: "Hidrovia Amazônica",
    descricao:
      "Cheia e estiagem na maior bacia do mundo: monitor de 7 estações, calendário histórico 1927–2026 e o estudo da seca de 2024.",
    href: "/hidrovia",
    status: "live",
    cta: "Abrir dashboard",
  },
  {
    icon: FileText,
    iconCor: "green",
    titulo: "Análises",
    descricao:
      "Leituras editoriais sobre os dados — o porquê por trás do número, em linguagem para decisão.",
    href: "/analises",
    status: "live",
    cta: "Ler análises",
  },
  {
    icon: Plane,
    iconCor: "green",
    titulo: "Aviação",
    descricao:
      "Onde vai cada real da sua passagem, termômetro do QAV e painel SAF Brasil. Vertical em construção.",
    href: "#",
    status: "breve",
    cta: "Em breve",
  },
  {
    icon: Map,
    iconCor: "blue",
    titulo: "Mapa & Cabotagem",
    descricao:
      "Fluxos origem-destino e rotas de cabotagem em mapa interativo. Vertical portuária em expansão.",
    href: "#",
    status: "breve",
    cta: "Em breve",
  },
];

// ─── HOME v4 ────────────────────────────────────────────────────────────────

export const heroV4 = {
  eyebrow: ["Sistema de antecipação setorial", "Fevereiro 2026", "ANTAQ · ANA · ANAC"],
  titulo: "O número que o setor espera todo mês — e o que ele",
  tituloDestaque: "vai",
  tituloFim: "mostrar antes de sair.",
  subtitulo:
    "Movimentação portuária, navegação, hidrovias e aviação lidas como sinais antecedentes. Indicadores próprios que projetam o próximo número antes da divulgação oficial.",
} as const;

export interface Antecipacao {
  tag: string;
  texto: string;
}

export const antecipacoes: Antecipacao[] = [
  {
    tag: "Minério",
    texto:
      "Complexo Minas-Rio produziu <b>6,36 Mt no 1T26</b> — 90% exportadas, mas volume cai <b><a href=\"https://investnews.com.br/negocios/venda-minerio-de-ferro-impacto-guerra/\" target=\"_blank\" rel=\"noopener noreferrer\">21% ante o trimestre anterior</a></b>.",
  },
  {
    tag: "Contêiner",
    texto:
      "<a href=\"https://br.fashionnetwork.com/news/Precos-do-frete-transcontinental-entram-em-uma-nova-fase-de-aumentos,1834600.html\" target=\"_blank\" rel=\"noopener noreferrer\">Xangai–Roterdã sobe a <b>US$ 2.773 (+37% em 12 meses)</b></a> na antecipação da alta temporada; CMA CGM eleva tarifas a partir de 1º/jun.",
  },
  {
    tag: "Soja",
    texto:
      "<a href=\"https://soudepalmas.com.br/geral/cotidiano-em-destaque/safra-brasileira-deve-crescer-em-2026-mesmo-com-queda-no-milho-arroz-e-feijao-soja-lidera-avanco-da-producao\" target=\"_blank\" rel=\"noopener noreferrer\">Safra recorde de <b>174,1 Mt</b></a> sustenta <a href=\"https://oespecialista.safra.com.br/analise/soja-mais-forte-melhora-cenario-transportes-2026/\" target=\"_blank\" rel=\"noopener noreferrer\">revisão da exportação para <b>116 Mt (+7,3%)</b></a>, com pressão altista sobre frete e escoamento ao longo de 2026.",
  },
];

export interface Modo {
  label: string;
  valor: number;
  decimais: number;
  delta: string;
  tendencia: "up" | "down";
  share: string;
  serie?: number[];
  insight?: string;
}

export const portoModos: Modo[] = [
  {
    label: "Total",
    valor: 101,
    decimais: 0,
    delta: "▲ 3,78%",
    tendencia: "up",
    share: "100% — todas as naturezas",
    serie: [112, 98, 104, 109, 116, 118, 121, 114, 108, 111, 119, 123, 104, 101],
    insight: "Contêineres batem <b>recorde da série</b> (≈1,12 mi TEU); o granel sólido sustenta o avanço com a antecipação da safra de soja no Arco Norte.",
  },
  {
    label: "Granel Sólido",
    valor: 57.4,
    decimais: 1,
    delta: "▲ 5,2%",
    tendencia: "up",
    share: "56,8% do total",
    serie: [60, 55, 58, 61, 64, 66, 68, 63, 59, 62, 67, 70, 59, 57.4],
    insight: "Safra recorde de soja (174,1 Mt) impulsiona o granel sólido <b>+5,2% a/a</b> via Arco Norte — Itaqui e São Luís como principais vetores de escoamento.",
  },
  {
    label: "Granel Líquido",
    valor: 25.1,
    decimais: 1,
    delta: "▲ 1,8%",
    tendencia: "up",
    share: "24,9% do total",
    serie: [26, 24, 25, 25, 27, 26, 27, 26, 24, 25, 26, 27, 25, 25.1],
    insight: "Granel líquido avança <b>+1,8% a/a</b> sustentado por derivados de petróleo — combustíveis respondem por cerca de 70% do segmento.",
  },
  {
    label: "Carga Geral",
    valor: 4.3,
    decimais: 1,
    delta: "▼ 2,1%",
    tendencia: "down",
    share: "4,3% do total",
    serie: [4.6, 4.4, 4.5, 4.7, 4.8, 4.7, 4.6, 4.5, 4.3, 4.4, 4.5, 4.6, 4.4, 4.3],
    insight: "Carga Geral recua <b>2,1% a/a</b> — único segmento negativo do mês, pressionado pela retração de veículos e carga breakbulk.",
  },
  {
    label: "Contêiner",
    valor: 14.2,
    decimais: 1,
    delta: "▲ 8,9%",
    tendencia: "up",
    share: "14,1% do total · ≈1,12 mi TEU",
    serie: [11, 10, 11, 12, 13, 13, 14, 13, 12, 13, 14, 15, 14, 14.2],
    insight: "Contêineres batem <b>recorde da série</b> (≈1,12 mi TEU), refletindo a alta temporada de importações e a antecipação de tarifas americanas.",
  },
];

export const navegacaoModos: Modo[] = [
  {
    label: "Longo curso",
    valor: 75.1,
    decimais: 1,
    delta: "▲ 3,9%",
    tendencia: "up",
    share: "74,4% do total movimentado",
    serie: [68, 72, 70, 74, 78, 80, 82, 77, 73, 76, 80, 84, 72, 75.1],
    insight: "Longo curso cresce <b>+3,9% a/a</b>, sustentado pelo minério de ferro e pela soja — Arco Norte responde por mais da metade das exportações.",
  },
  {
    label: "Cabotagem",
    valor: 22.8,
    decimais: 1,
    delta: "▲ 9,1%",
    tendencia: "up",
    share: "22,6% do total movimentado",
    serie: [19.2, 20.9, 20.1, 21.3, 22.0, 23.1, 24.0, 22.4, 21.0, 21.8, 23.2, 24.5, 22.1, 22.8],
    insight: "A <b>cabotagem cresce 9,1%</b> e puxa a navegação doméstica, enquanto a interior recua com a estiagem na bacia amazônica.",
  },
  {
    label: "Navegação interior",
    valor: 3.1,
    decimais: 1,
    delta: "▼ 10,4%",
    tendencia: "down",
    share: "3,1% do total movimentado",
    serie: [3.8, 3.5, 3.6, 3.8, 4.0, 4.2, 4.1, 3.9, 3.5, 3.3, 3.4, 3.6, 3.4, 3.1],
    insight: "Interior recua <b>10,4% a/a</b> com a estiagem amazônica restringindo calado nos afluentes; Tabocal e Itacoatiara seguem como pontos críticos de operação.",
  },
];

export const portoCard = {
  tag: "Porto",
  acento: "green" as const,
  periodo: "FEVEREIRO 2026 · vs FEV 2025 · ANTAQ",
  unidade: "milhões de t",
  insight:
    "Contêineres batem <b>recorde da série</b> (≈1,12 mi TEU); o granel sólido sustenta o avanço com a antecipação da safra de soja no Arco Norte.",
  href: "/portos/ineditas/tendencia-cargas",
  hrefDados: "/portos/movimentacao",
};

export const navegacaoCard = {
  tag: "Navegação",
  acento: "blue" as const,
  periodo: "FEVEREIRO 2026 · por tipo · ANTAQ",
  unidade: "milhões de t",
  insight:
    "A <b>cabotagem cresce 9,1%</b> e puxa a navegação doméstica, enquanto a interior recua com a estiagem na bacia amazônica.",
  href: "/navegacao",
};

export const hidrologiaCard = {
  tag: "Monitor de Hidrologia",
  periodo: "PREVISÃO · modelo de recessão",
  limiarM: 11,
  diasParaLimiar: 18,
  janelaIC80: "08–11 jun 2026",
  caladoAtualM: 14.3,
  irc: 64,
  ircFaixa: "elevada",
  gaugePct: 64,
  insight:
    "Abaixo de <b>11 m de calado</b>, navios de maior porte passam a operar com restrição de carga (transbordo/lightering). O modelo de regime (HMM) aponta 30% de probabilidade de estiagem severa em 30 dias.",
  href: "/monitor",
};

export const aereoCard = {
  tag: "Setor Aéreo",
  periodo: "VERTICAL · em construção",
  titulo: "Painel da aviação em construção",
  teaser: "Passageiros · termômetro do QAV · SAF Brasil",
  insight:
    "Passageiros transportados mês a mês, o termômetro do <b>QAV</b> e o painel <b>SAF Brasil</b> — com a leitura do IBI. Em integração com a base da ANAC.",
};

export interface Estudo {
  icon: LucideIcon;
  iconCor: "blue" | "green" | "ouro";
  titulo: string;
  status: PainelStatus;
  descricao: string;
  destaque: string;
  href: string;
}

export const estudos: Estudo[] = [
  {
    icon: TrendingUp,
    iconCor: "green",
    titulo: "PortGDP",
    status: "live",
    descricao:
      "O indicador antecedente: a movimentação portuária lê a produção industrial (PIM-PF) dois meses à frente.",
    destaque: "+0,77 · 2 meses à frente",
    href: "/portos/ineditas/portgdp",
  },
  {
    icon: Star,
    iconCor: "ouro",
    titulo: "IRC",
    status: "live",
    descricao:
      "Índice de Risco de Calado (0–100): um único score que sintetiza o risco de navegabilidade da bacia.",
    destaque: "atual 64 ↑ · faixa elevada",
    href: "/monitor",
  },
  {
    icon: Activity,
    iconCor: "blue",
    titulo: "IDN",
    status: "novo",
    descricao:
      "Índice de dessincronização Norte–Sul: aponta qual sub-bacia (Negro ou Madeira) está puxando o ciclo.",
    destaque: "driver Norte (padrão 2026)",
    href: "/monitor",
  },
  {
    icon: Calendar,
    iconCor: "ouro",
    titulo: "Calendário LWS 2026",
    status: "live",
    descricao:
      "Projeção forward da descida de Manaus: a data esperada de cruzamento do gatilho regulatório de 17,7 m (ANTAQ).",
    destaque: "cruzamento estimado · jun/26",
    href: "/calendario-lws-2026",
  },
  {
    icon: Building2,
    iconCor: "green",
    titulo: "Custo de Espera",
    status: "live",
    descricao:
      "53% da estadia portuária é espera, não operação — o equivalente a R$ 14 bi/ano em navio parado.",
    destaque: "R$ 14 bi/ano",
    href: "/portos/eficiencia-operacional/custo-espera",
  },
  {
    icon: Globe,
    iconCor: "green",
    titulo: "Arco Norte",
    status: "live",
    descricao:
      "A migração silenciosa do granel sólido para o Norte: de 35% para 44% do escoamento em 13 anos.",
    destaque: "35% → 44% · Itaqui 6×",
    href: "/portos/agronegocio/arco-norte",
  },
];
