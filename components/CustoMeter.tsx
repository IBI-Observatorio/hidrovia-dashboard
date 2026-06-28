"use client";

import { useEffect, useMemo, useState } from "react";
import SeloProveniencia from "@/components/SeloProveniencia";
import {
  acumuladoEm,
  taxaPorSegundo,
  type CustoInput,
  type Premissa,
  type Proveniencia,
} from "@/lib/custo-evitavel";

export type CustoMeterProps = {
  /** Estado inicial do custo (engine A1). */
  input: CustoInput;
  /** Legenda sob o número. */
  rotulo: string;
  /** Legenda da taxa (ex.: "≈ R$ 229 por segundo"). Se ausente, é derivada. */
  taxaLegenda?: string;
  /** Se presente, renderiza um slider que recalcula a taxa na hora. */
  premissa?: Premissa;
  proveniencia: Proveniencia;
};

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

// Generaliza o LiveCounter/HeroStat: contador vivo de custo evitável.
export default function CustoMeter({
  input,
  rotulo,
  taxaLegenda,
  premissa,
  proveniencia,
}: CustoMeterProps) {
  const [slider, setSlider] = useState(premissa?.base ?? 0);
  const [valor, setValor] = useState(0);
  const [reduzido, setReduzido] = useState(false);

  // Input efetivo: havendo premissa, o slider redefine o input (recalcula taxa/base).
  const ativo = useMemo<CustoInput>(
    () => (premissa ? premissa.calcular(slider) : input),
    [premissa, slider, input],
  );

  const taxa = taxaPorSegundo(ativo);

  // prefers-reduced-motion: sem rAF decorativo, atualiza 1×/s.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduzido(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Loop vivo: soma taxaPorSegundo desde a âncora. Reinicia quando 'ativo' muda
  // (slider) ou quando o modo de movimento muda.
  useEffect(() => {
    let raf = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => setValor(acumuladoEm(ativo, Date.now()));
    tick();
    if (reduzido) {
      timer = setInterval(tick, 1000);
    } else {
      const loop = () => {
        tick();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearInterval(timer);
    };
  }, [ativo, reduzido]);

  // Legenda da taxa: usa a passada, ou deriva da taxa AO VIVO (pt-BR). Reflete o
  // input ativo, então acompanha o slider na hora. (Não usa o easing de useCountUp:
  // sob o re-render contínuo do contador grande, o count-up reinicia e trava em 0.)
  const legenda =
    taxaLegenda ?? `≈ R$ ${Math.round(taxa).toLocaleString("pt-BR")} por segundo`;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-azul-medio to-gray-900 p-6 shadow-2xl">
      <div className="font-black tracking-tighter text-white leading-[0.9] text-[clamp(2.5rem,9vw,5.5rem)] tabular-nums">
        {fmtBRL.format(valor)}
      </div>
      <div className="mt-2 text-sm font-semibold text-ibi-green tabular-nums">{legenda}</div>
      <p className="mt-3 max-w-[440px] text-sm leading-relaxed text-gray-400">{rotulo}</p>

      {premissa && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-4">
            <label
              htmlFor="custo-premissa"
              className="text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              {premissa.label}
            </label>
            <span className="text-sm font-bold text-white tabular-nums">
              {premissa.formatar(slider)}
            </span>
          </div>
          <input
            id="custo-premissa"
            type="range"
            min={premissa.min}
            max={premissa.max}
            step={premissa.step}
            value={slider}
            onChange={(e) => setSlider(parseFloat(e.target.value))}
            className="mt-2 w-full accent-ibi-green"
          />
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-3">
        <SeloProveniencia tipo={proveniencia.tipo} fonte={proveniencia.fonte} />
      </div>
    </div>
  );
}
