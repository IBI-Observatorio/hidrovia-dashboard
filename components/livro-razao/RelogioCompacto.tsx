"use client";

import { useEffect, useState } from "react";
import { acumuladoEm, type Janela } from "@/lib/custo-evitavel";

// Contador vivo compacto — para o card da grade e o embed da ficha. Mesmo engine
// e mesma âncora do CustoMeter (custo distribuído desde 00h de Brasília), sem o
// invólucro grande. Respeita prefers-reduced-motion (atualiza 1×/s).
const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export default function RelogioCompacto({
  valorAnual,
  taxaSegundo,
  janela = { tipo: "meia-noite-brasilia" },
  className = "",
}: {
  valorAnual: number;
  /** R$/segundo — exibido como legenda sob o número. */
  taxaSegundo: number;
  janela?: Janela;
  className?: string;
}) {
  const [valor, setValor] = useState(0);
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduzido(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let raf = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const input = { valorAnual, janela };
    const tick = () => setValor(acumuladoEm(input, Date.now()));
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
    // janela é objeto estável por render; valorAnual/reduzido governam o loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorAnual, reduzido]);

  return (
    <div className={className}>
      <div className="font-black tracking-tighter text-white leading-none text-3xl sm:text-4xl tabular-nums">
        {fmtBRL.format(valor)}
      </div>
      <div className="mt-1 text-xs font-semibold text-ibi-green tabular-nums">
        ≈ R$ {Math.round(taxaSegundo).toLocaleString("pt-BR")} por segundo · acumulado hoje
      </div>
    </div>
  );
}
