// Registry de módulos de embed: módulo (slug) → config do CustoMeter.
//
// Para adicionar um módulo real (ex.: 'pavimento'), basta uma nova entrada aqui —
// a rota /embed/[modulo] e o EmbedModulo resolvem o resto automaticamente.
// Por enquanto só 'teste' (placeholders) para validar a rota.

import type { CustoInput, Premissa, Proveniencia } from "./custo-evitavel";
import { PAVIMENTO, PAVIMENTO_COPY } from "./modulos/pavimento";

export type ModuloEmbedConfig = {
  titulo: string;
  rotulo: string;
  taxaLegenda?: string;
  input: CustoInput;
  premissa?: Premissa;
  proveniencia: Proveniencia;
  /** Altura sugerida do iframe (px) para o EmbedButton. */
  alturaEmbed?: number;
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
  },
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
