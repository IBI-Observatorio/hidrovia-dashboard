import Link from "next/link";
import type { Eixo } from "@/lib/pnl2050/dados";
import { PNL_COPY, TIPO_EIXO_LABEL } from "@/lib/pnl2050/copy";

// Um eixo como "linha de metrô": sete estações (degraus 0–6). Na fase 1 só o
// degrau 0 tem evidência (o próprio PNL); os demais ficam em cinza — "sem
// evidência pública", nunca "parado".
export default function LinhaEixo({ eixo, degrau = 0 }: { eixo: Eixo; degrau?: number }) {
  const degraus = PNL_COPY.escada.degraus;
  return (
    <Link
      href={`/pnl-2050/eixo/${eixo.codigo.toLowerCase()}`}
      className="group grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-3 sm:gap-6 rounded-xl border border-white/10 bg-azul-medio px-4 py-3 hover:border-ibi-green/40 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
          {eixo.codigo} · {TIPO_EIXO_LABEL[eixo.tipo]} · {eixo.qtd_extraida} intervenções
        </p>
        <p className="text-white text-sm font-semibold leading-snug group-hover:text-ibi-green transition-colors">
          {eixo.nome}
        </p>
      </div>
      <ol className="flex items-center" aria-label={`Degrau atual: ${degraus[degrau].rotulo}`}>
        {degraus.map((d, i) => {
          const alcancado = d.n <= degrau;
          return (
            <li key={d.n} className="flex items-center flex-1 last:flex-none">
              <span
                title={`${d.n} · ${d.rotulo}`}
                className={`block h-3 w-3 shrink-0 rounded-full border-2 ${
                  alcancado ? "border-ibi-green bg-ibi-green" : "border-white/20 bg-transparent"
                }`}
              />
              {i < degraus.length - 1 && (
                <span
                  className={`block h-0.5 flex-1 ${d.n < degrau ? "bg-ibi-green" : "bg-white/10"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </Link>
  );
}
