"use client";

import CustoMeter from "@/components/CustoMeter";
import EmbedButton from "@/components/EmbedButton";
import {
  EMBED_RELOGIO,
  RELOGIO_COPY,
  inputRelogio,
  taxaLegendaRelogio,
} from "@/lib/relogio";

// O número vivo do Relógio da Infraestrutura — mesmo padrão dos módulos
// (PavimentoModulo/EmbedModulo): client wrapper fino sobre o CustoMeter, com a
// config vinda de fonte única (lib/relogio.ts, que só soma o que os módulos
// declaram). Duas variantes:
//   • "pagina": usado na /relogio — nota de âncora + botão de embed.
//   • "embed":  usado no /embed/relogio — link "ver decomposição" no lugar da nota.
export default function RelogioVivo({
  variante = "pagina",
}: {
  variante?: "pagina" | "embed";
}) {
  return (
    <div className={variante === "embed" ? "mx-auto max-w-2xl" : undefined}>
      <CustoMeter
        input={inputRelogio()}
        rotulo={RELOGIO_COPY.rotulo}
        taxaLegenda={taxaLegendaRelogio()}
        proveniencia={RELOGIO_COPY.proveniencia}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {variante === "embed" ? (
          <a
            href="/relogio"
            target="_blank"
            rel="noopener"
            className="text-xs font-semibold text-ibi-blue hover:underline underline-offset-2"
          >
            Ver a decomposição →
          </a>
        ) : (
          <p className="text-xs italic text-gray-500">{RELOGIO_COPY.notaAncora}</p>
        )}
        <EmbedButton modulo="relogio" altura={EMBED_RELOGIO.alturaEmbed} />
      </div>
    </div>
  );
}
