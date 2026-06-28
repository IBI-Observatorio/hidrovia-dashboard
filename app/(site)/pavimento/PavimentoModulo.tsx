"use client";

import CustoMeter from "@/components/CustoMeter";
import EmbedButton from "@/components/EmbedButton";
import { EMBED_REGISTRY } from "@/lib/embed-registry";
import { PAVIMENTO_COPY } from "@/lib/modulos/pavimento";

// Reusa a MESMA config do registry (/embed/pavimento) — fonte única, sem
// duplicar número nem copy. A página pública apenas insere a nota de âncora sob
// o slider (o CustoMeter não tem prop para isso) e o botão de embed.
export default function PavimentoModulo() {
  const cfg = EMBED_REGISTRY.pavimento;

  return (
    <div>
      <CustoMeter
        input={cfg.input}
        rotulo={cfg.rotulo}
        taxaLegenda={cfg.taxaLegenda}
        premissa={cfg.premissa}
        proveniencia={cfg.proveniencia}
      />
      <p className="mt-2 text-xs italic text-gray-500">{PAVIMENTO_COPY.ancoraNota}</p>
      <div className="mt-3">
        <EmbedButton modulo="pavimento" altura={cfg.alturaEmbed} />
      </div>
    </div>
  );
}
