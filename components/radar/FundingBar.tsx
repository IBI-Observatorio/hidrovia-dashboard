// Visual compartilhado do furo de funding (TCU) — antes duplicado em StressDCF e
// Board. Barra cobertura cruzada × déficit; expõe o gap relevante ao cliente.

import { Landmark } from "lucide-react";
import type { Num } from "@/lib/dcf/types";
import { numVal } from "@/lib/dcf/types";
import { num } from "@/lib/radar/format";

export interface Funding {
  aporteNecessario: Num;
  coberturaCruzada: { fonte: string; valor: Num }[];
  deficit: Num;
}

export default function FundingBar({
  funding,
  cliente = "VLI",
}: {
  funding: Funding;
  cliente?: string;
}) {
  const nec = numVal(funding.aporteNecessario);
  const cob = (funding.coberturaCruzada ?? []).reduce((s, c) => s + numVal(c.valor), 0);
  const def = numVal(funding.deficit);
  if (!(nec > 0)) return null; // sem aporte → nada a mostrar (evita divisão por zero)

  const cobPct = Math.max(0, Math.min(100, (cob / nec) * 100));
  const defPct = Math.max(0, Math.min(100 - cobPct, (def / nec) * 100));

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-azul-medio to-gray-900 p-5">
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-ouro" />
        <h4 className="text-sm font-semibold text-white">Furo de funding (TCU)</h4>
      </div>
      <div className="mt-4 space-y-2">
        <div className="relative h-8 w-full overflow-hidden rounded-lg bg-white/5">
          <div className="absolute inset-y-0 left-0 bg-ibi-blue/40" style={{ width: `${cobPct}%` }} />
          <div className="absolute inset-y-0 bg-vermelho/50" style={{ left: `${cobPct}%`, width: `${defPct}%` }} />
          <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] font-medium text-white">
            <span>Cobertura cruzada {num(cob, 2)} R$ bi</span>
            <span>déficit {num(def, 1)} R$ bi</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-500">
          Aporte necessário <strong className="text-gray-300">{num(nec, 2)} R$ bi</strong> ·
          cobertura {funding.coberturaCruzada.map((c) => c.fonte).join(" + ")}. Exposição da{" "}
          <strong className="text-ouro">{cliente}</strong> ao gap acima.
        </p>
      </div>
    </section>
  );
}
