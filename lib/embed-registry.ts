// Registry de módulos de embed: módulo (slug) → config do CustoMeter.
//
// Para adicionar um módulo real (ex.: 'pavimento'), basta uma nova entrada aqui —
// a rota /embed/[modulo] e o EmbedModulo resolvem o resto automaticamente.
// Por enquanto só 'teste' (placeholders) para validar a rota.

import type { CustoInput, Premissa, Proveniencia } from "./custo-evitavel";

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

export const EMBED_REGISTRY: Record<string, ModuloEmbedConfig> = {
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
