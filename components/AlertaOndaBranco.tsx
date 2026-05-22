// Banner discreto no /monitor quando o detector Onda Branco dispara.
// Renderiza nada se severidade for "nenhuma" ou "moderada".
//
// Reuso visual: padrão de BannerDefasagem.

import { detectaOndaBranco } from "@/lib/onda-branco";
import { Waves } from "lucide-react";

interface Props {
  serieCaracarai: { data: string; cota_m: number }[];
}

const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function fmt(iso: string | null): string {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${d}/${meses[parseInt(m, 10) - 1] ?? "?"}`;
}

export default function AlertaOndaBranco({ serieCaracarai }: Props) {
  if (!serieCaracarai || serieCaracarai.length < 8) return null;
  const r = detectaOndaBranco(serieCaracarai, 7);
  if (!r.disparado) return null;

  const corClasse = r.severidade === "extrema"
    ? "border-vermelho/40 bg-vermelho/10 text-vermelho"
    : "border-ouro/40 bg-ouro/10 text-ouro";

  return (
    <div className={`rounded p-3 border ${corClasse} flex items-start gap-3`}>
      <Waves size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider mb-0.5">
          Onda Branco · severidade {r.severidade}
        </p>
        <p className="text-sm leading-relaxed">
          Caracaraí subiu <strong>{r.var_total_m.toFixed(2)} m em {r.janela_dias} dias</strong>{" "}
          (taxa {r.taxa_cm_dia} cm/dia, P{r.severidade === "extrema" ? "95" : "85"} histórico).
          Onda deve chegar em Manaus em ~{r.eta_manaus_dias} dias{" "}
          (ETA <strong>{fmt(r.eta_manaus_data)}</strong>) — pode superar o pico previsto pelo SGB.
        </p>
        <p className="text-[11px] opacity-70 mt-1">
          <a href="/briefing-semanal" className="hover:underline">Ver briefing completo →</a>
        </p>
      </div>
    </div>
  );
}
