// Registry de módulos de embed: módulo (slug) → config do CustoMeter.
//
// Para adicionar um módulo real (ex.: 'pavimento'), basta uma nova entrada aqui —
// a rota /embed/[modulo] e o EmbedModulo resolvem o resto automaticamente.
// Por enquanto só 'teste' (placeholders) para validar a rota.

import { taxaPorSegundo, type CustoInput, type Premissa, type Proveniencia } from "./custo-evitavel";
import { PAVIMENTO, PAVIMENTO_COPY } from "./modulos/pavimento";

/**
 * Declaração de um módulo para o RELÓGIO DA INFRAESTRUTURA (lib/relogio.ts) —
 * o agregador nacional. Módulo que declara `relogio` entra na soma nacional
 * automaticamente; módulo sem a declaração fica FORA da soma, sem exceção.
 * Vale para placeholders ('teste') e para módulos de antecipação (aquaviário),
 * que medem risco à frente, não custo corrente.
 */
export type ModuloCusto = {
  /** Nome curto do componente no card de decomposição do Relógio. */
  nome: string;
  /** Página de profundidade do módulo (ex.: "/pavimento"). */
  rota: string;
  /** Taxa própria em R$/segundo — sempre derivada do dado do módulo, nunca hardcoded. */
  taxaPorSegundo: () => number;
  fonte: string;
  metodologia: string;
};

export type ModuloEmbedConfig = {
  titulo: string;
  rotulo: string;
  taxaLegenda?: string;
  input: CustoInput;
  premissa?: Premissa;
  proveniencia: Proveniencia;
  /** Altura sugerida do iframe (px) para o EmbedButton. */
  alturaEmbed?: number;
  /** Adesão ao Relógio da Infraestrutura — ver ModuloCusto. */
  relogio?: ModuloCusto;
};

// Input base do módulo Pavimento — valor anual de diesel distribuído desde 0h de hoje.
const pavimentoInputBase: CustoInput = {
  valorAnual: PAVIMENTO.valorAnualDiesel,
  janela: { tipo: "meia-noite" },
};

export const EMBED_REGISTRY: Record<string, ModuloEmbedConfig> = {
  pavimento: {
    titulo: PAVIMENTO_COPY.titulo,
    rotulo: PAVIMENTO_COPY.rotulo,
    // Sem taxaLegenda fixa: o CustoMeter deriva a legenda ao vivo a partir da
    // taxa do input ativo, então ela acompanha o slider (≈ R$ 228/s na base).
    input: pavimentoInputBase,
    premissa: {
      label: PAVIMENTO_COPY.premissaLabel,
      min: 10,
      max: 50,
      step: 0.1,
      base: PAVIMENTO.sobrecustoBase,
      formatar: (v) => v.toFixed(1).replace(".", ",") + "%",
      // O sobrecusto medido (31,2%) gera o valor anual de diesel; mover o slider
      // reescala linearmente esse valor anual e, com ele, a taxa por segundo.
      calcular: (v) => ({
        valorAnual: PAVIMENTO.valorAnualDiesel * (v / PAVIMENTO.sobrecustoBase),
        janela: { tipo: "meia-noite" },
      }),
    },
    proveniencia: { tipo: "estimativa-ibi", fonte: PAVIMENTO_COPY.fonte },
    alturaEmbed: 560,
    // Adesão ao Relógio da Infraestrutura: a taxa nasce do MESMO input base do
    // módulo (7,2 bi/ano ÷ segundos do ano) — nada recalculado, nada duplicado.
    relogio: {
      nome: PAVIMENTO_COPY.nomeRelogio,
      rota: "/pavimento",
      taxaPorSegundo: () => taxaPorSegundo(pavimentoInputBase),
      fonte: PAVIMENTO_COPY.fonte,
      metodologia: PAVIMENTO_COPY.metodologia,
    },
  },
  // Sem `relogio`: módulo de validação nunca entra na soma nacional.
  teste: {
    titulo: "Módulo de teste",
    rotulo: "Contador de validação do Bloco A — números placeholder, sem significado de domínio.",
    input: { valorAnual: 1_000_000_000, janela: { tipo: "inicio-ano" } },
    premissa: {
      label: "Diferencial unitário (placeholder)",
      min: 10,
      max: 100,
      step: 1,
      base: 50,
      formatar: (v) => `R$ ${v.toFixed(0)}/t`,
      calcular: (v) => ({
        volumeAnual: 20_000_000,
        diferencialUnitario: v,
        janela: { tipo: "inicio-ano" },
      }),
    },
    proveniencia: { tipo: "estimativa-ibi", fonte: "Placeholder — módulo de teste do Bloco A" },
    alturaEmbed: 460,
  },
};
