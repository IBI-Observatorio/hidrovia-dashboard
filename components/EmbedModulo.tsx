"use client";

import CustoMeter from "@/components/CustoMeter";
import EmbedButton from "@/components/EmbedButton";
import { EMBED_REGISTRY } from "@/lib/embed-registry";

// Wrapper client: lê o registry e monta o CustoMeter. Precisa ser client porque
// a config carrega funções (premissa.formatar/calcular) que não atravessam a
// fronteira server→client. A page (server) só valida o slug e delega.
export default function EmbedModulo({ modulo }: { modulo: string }) {
  const cfg = EMBED_REGISTRY[modulo];
  if (!cfg) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <CustoMeter
        input={cfg.input}
        rotulo={cfg.rotulo}
        taxaLegenda={cfg.taxaLegenda}
        premissa={cfg.premissa}
        proveniencia={cfg.proveniencia}
      />
      <div className="mt-3">
        <EmbedButton modulo={modulo} altura={cfg.alturaEmbed} />
      </div>
    </div>
  );
}
