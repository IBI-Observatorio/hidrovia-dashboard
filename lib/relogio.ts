// RELÓGIO DA INFRAESTRUTURA — agregador nacional de custo evitável.
//
// Soma, num único número vivo, a taxa (R$/segundo) de TODOS os módulos que
// declararam adesão via `relogio: ModuloCusto` no EMBED_REGISTRY. É 100%
// registry-driven: módulo novo que declarar taxa entra na soma sem tocar aqui.
//
// Regras duras:
//   • NENHUM número de domínio nasce neste arquivo — tudo deriva dos módulos.
//   • Módulo sem taxa declarada (aquaviário, 'teste') fica FORA da soma, sem
//     exceção e sem estimativa inventada. Antecipação não é custo corrente.
//   • Client-safe: importa só o engine puro e o EMBED_REGISTRY (as funções de
//     premissa já atravessam para client no caminho de custo existente). NÃO
//     importar aqui o registry hidro (server/async) — quebraria o bundle client.

import { SEGUNDOS_ANO, type CustoInput, type Proveniencia } from "./custo-evitavel";
import { EMBED_REGISTRY, type ModuloCusto } from "./embed-registry";
// Livro-Razão: registry puro/client-safe (sem server/async) — pode entrar aqui.
import { componenteLivroRazao, taxaLivroRazao } from "./livro-razao/registry";

const SEGUNDOS_DIA = 86_400;

/** Um componente da decomposição do Relógio ("de onde vem cada real"). */
export type ComponenteRelogio = {
  /** Slug do módulo no registry (ex.: "pavimento"). */
  modulo: string;
  nome: string;
  /** Página de profundidade do módulo. */
  rota: string;
  /** Taxa própria, R$/segundo. */
  taxa: number;
  /** Participação na soma nacional, em % (0–100). */
  participacao: number;
  fonte: string;
  metodologia: string;
  /** Tipo de proveniência do módulo (herdado do registry) — para o selo. */
  tipoProveniencia: Proveniencia["tipo"];
};

/** Módulos que aderiram ao Relógio (declararam `relogio` no registry). */
export function modulosElegiveis(): Array<{ slug: string; tipoProveniencia: Proveniencia["tipo"] } & ModuloCusto> {
  return Object.entries(EMBED_REGISTRY)
    .filter(([, cfg]) => cfg.relogio != null)
    .map(([slug, cfg]) => ({
      slug,
      tipoProveniencia: cfg.proveniencia.tipo,
      ...(cfg.relogio as ModuloCusto),
    }));
}

/**
 * Soma nacional: R$/segundo dos módulos elegíveis do registry + fichas ativas do
 * Livro-Razão (pelo PISO). Com 0 fichas ativas, taxaLivroRazao() = 0 → o Relógio
 * segue exatamente igual (só pavimento), sem exceção.
 */
export function taxaNacional(): number {
  const modulos = modulosElegiveis().reduce((soma, m) => soma + m.taxaPorSegundo(), 0);
  return modulos + taxaLivroRazao();
}

/** Equivalente diário da soma nacional: taxa × 86.400 s. */
export function equivalenteDiario(): number {
  return taxaNacional() * SEGUNDOS_DIA;
}

/**
 * Decomposição por componente — o "clique e veja de onde vem cada real".
 * Os módulos do registry entram um a um; o Livro-Razão entra como UMA linha
 * agregada ("N projetos ativos"), ocultada quando não há ficha ativa.
 */
export function decomposicao(): ComponenteRelogio[] {
  const mods = modulosElegiveis();
  const componentes: ComponenteRelogio[] = mods.map((m) => ({
    modulo: m.slug,
    nome: m.nome,
    rota: m.rota,
    taxa: m.taxaPorSegundo(),
    participacao: 0, // preenchido abaixo, contra o total já com Livro-Razão
    fonte: m.fonte,
    metodologia: m.metodologia,
    tipoProveniencia: m.tipoProveniencia,
  }));

  const livroRazao = componenteLivroRazao();
  if (livroRazao) componentes.push({ ...livroRazao, participacao: 0 });

  const total = componentes.reduce((soma, c) => soma + c.taxa, 0);
  return componentes.map((c) => ({
    ...c,
    participacao: total > 0 ? (c.taxa / total) * 100 : 0,
  }));
}

/** Input do CustoMeter do Relógio: valor anual = soma × segundos do ano; zera às 00h de Brasília. */
export function inputRelogio(): CustoInput {
  return {
    valorAnual: taxaNacional() * SEGUNDOS_ANO,
    janela: { tipo: "meia-noite-brasilia" },
  };
}

/** "R$ 19,7 milhões" / "R$ 1,2 bilhões" — aproximação legível para copy. */
export function formataReaisAprox(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1).replace(".", ",")} bilhões`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} milhões`;
  if (v >= 1e3) return `R$ ${Math.round(v / 1e3).toLocaleString("pt-BR")} mil`;
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

/** Legenda da taxa sob o número grande: por segundo + equivalente diário. */
export function taxaLegendaRelogio(): string {
  return `≈ R$ ${Math.round(taxaNacional()).toLocaleString("pt-BR")} por segundo · ${formataReaisAprox(equivalenteDiario())} por dia`;
}

/** Nota honesta de completude — a incompletude declarada é credibilidade. */
export function notaComponentes(n: number): string {
  const quantos = n === 1 ? "1 componente" : `${n} componentes`;
  return `O Relógio soma hoje ${quantos}. Novos módulos entram à medida que atingem o padrão metodológico de publicação.`;
}

/** Config do /embed/relogio (vitrine compacta). */
export const EMBED_RELOGIO = {
  alturaEmbed: 420,
};

// ─── COPY (registro "banco central": autoridade serena, zero alarmismo) ──────

export const RELOGIO_COPY = {
  eyebrow: "Relógio da Infraestrutura",
  titulo: "O custo da infraestrutura que não saiu do papel.",
  subtitulo:
    "Quanto o Brasil paga, por dia, pela infraestrutura que ainda não existe — medido em tempo real a partir de fontes públicas.",
  // Legenda sob o número grande (CustoMeter).
  rotulo:
    "pela infraestrutura que ainda não existe — acumulado desde as 00h de hoje (horário de Brasília)",
  notaAncora:
    "O contador zera às 00h (Brasília) e distribui o valor anual somado dos módulos ao longo do dia.",

  decomposicao: {
    titulo: "De onde vem cada real",
    descricao:
      "O Relógio não produz número próprio: apenas soma o que cada módulo publicado declara. Cada componente abaixo tem taxa, fonte e página de profundidade próprias.",
  },

  contexto: {
    titulo: "Camadas de antecipação (não somadas ao Relógio)",
    explicacao:
      "O módulo aquaviário mede risco à frente — a dessincronização entre bacias (IDN) e o prazo projetado até a restrição de calado (ETA). Antecipação não é custo corrente: enquanto o prejuízo não se materializa em despesa medida, ela contextualiza o Relógio, mas não entra no placar.",
  },

  metodologia: {
    titulo: "Metodologia",
    itens: [
      {
        rotulo: "O que entra",
        texto:
          "Custos recorrentes e evitáveis, medidos a partir de dados públicos consolidados do setor e convertidos em taxa contínua (R$/segundo). Cada componente tem página própria, com fonte e metodologia abertas.",
      },
      {
        rotulo: "O que não entra",
        texto:
          "Indicadores de antecipação e risco (probabilidades, prazos projetados) e qualquer estimativa sem base pública consolidada. Nenhum componente é criado para engordar o placar.",
      },
      {
        rotulo: "Critério de elegibilidade",
        texto:
          "Fonte pública identificada, valor anual auditável de ponta a ponta e metodologia publicada na página do módulo. Módulo que não declara taxa fica fora da soma — sem exceção.",
      },
      {
        rotulo: "Calibração",
        texto:
          "A calibração usa dados públicos consolidados do setor como ground truth. O Relógio não estima nada por conta própria: soma as taxas declaradas pelos módulos, e só.",
      },
    ],
  },

  // Mesma convenção do AQUAVIARIO_COPY: número composto pelo IBI → estimativa-ibi.
  proveniencia: {
    tipo: "estimativa-ibi" as const,
    fonte: "Observatório IBI — soma das taxas declaradas pelos módulos publicados",
  },

  meta: {
    title: "Relógio da Infraestrutura — o custo do que não saiu do papel | Observatório IBI",
    description:
      "Agregador nacional do Observatório IBI: quanto o Brasil paga, por dia, pela infraestrutura que ainda não existe — em tempo real, a partir de fontes públicas, com decomposição por módulo.",
  },
};
