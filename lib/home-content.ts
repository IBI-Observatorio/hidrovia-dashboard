// home-content.ts
// Conteúdo da HOME data-first do Observatório IBI.
// Segue o padrão de "copy em lib" do repo (cf. navigation-copy.ts / home-copy.ts).
// Os dados-herói (101 Mt, +3,78%) e os 3 achados são reais (fonte: ANTAQ / IBI).

import type { LucideIcon } from "lucide-react";
import { Ship, BarChart3, Waves, FileText, Plane, Map } from "lucide-react";

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
    href: "/hidrovia", // FASE 2: hoje a landing da hidrologia ainda está em "/"; aponta p/ /monitor enquanto não for movida
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
