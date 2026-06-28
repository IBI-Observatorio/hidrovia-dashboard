// Registry de módulos de embed HIDROLÓGICOS — paralelo ao EMBED_REGISTRY (custo).
//
// Por que um registry SEPARADO em vez de um campo `tipo` no registry de custo:
//   • O EMBED_REGISTRY (custo) carrega FUNÇÕES (premissa.calcular/formatar) e é
//     consumido por um CLIENT component (EmbedModulo → CustoMeter).
//   • Os módulos hidro são SERVER + ASYNC (await das fontes ANA/SGB) e renderizam
//     componentes diferentes (AquaviarioEmbed reusa gauges).
//   Unir os dois forçaria o caminho de custo (que já funciona) a conviver com
//   ASYNC/server. Dois registries deixam o caminho de custo INTACTO; a rota
//   /embed só concatena as chaves dos dois.
//
// Contrato: cada módulo hidro sabe se RENDERIZAR (async, server) e dá a altura
// sugerida do iframe. A page (server) faz `await render()` e delega.

import type { ReactNode } from "react";
import AquaviarioEmbed from "@/components/AquaviarioEmbed";
import { getAquaviarioSnapshot, AQUAVIARIO_COPY } from "./modulos/aquaviario";

export interface ModuloHidroConfig {
  titulo: string;
  /** Altura sugerida do iframe (px) — tríade empilhada (IRC + IDN + ETA). */
  alturaEmbed: number;
  /** Render server-only: carrega o snapshot e devolve o componente da tríade. */
  render: () => Promise<ReactNode>;
}

export const EMBED_REGISTRY_HIDRO: Record<string, ModuloHidroConfig> = {
  aquaviario: {
    titulo: AQUAVIARIO_COPY.titulo,
    alturaEmbed: 1320,
    render: async () => {
      const snapshot = await getAquaviarioSnapshot();
      return <AquaviarioEmbed snapshot={snapshot} />;
    },
  },
};
