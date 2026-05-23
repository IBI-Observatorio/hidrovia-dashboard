"use client";

import { useEffect, useRef, useState } from "react";
import { heroCopy } from "@/lib/home-content";

// Animação de contagem (0 → alvo) com easing.
function useCountUp(target: number, decimals = 0, duration = 1100) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      let p = Math.min((t - t0) / duration, 1);
      p = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(target * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val.toFixed(decimals).replace(".", ",");
}

// Sparkline de área com curva suave (Catmull-Rom → Bézier simplificado).
function buildPath(data: number[], w: number, h: number, pad: number) {
  const min = Math.min(...data) - 6;
  const max = Math.max(...data) + 6;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (data.length - 1);
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
  let d = `M${x(0)} ${y(data[0])}`;
  for (let i = 1; i < data.length; i++) {
    const xc = (x(i - 1) + x(i)) / 2;
    d += ` C${xc} ${y(data[i - 1])} ${xc} ${y(data[i])} ${x(i)} ${y(data[i])}`;
  }
  return { d, lastX: x(data.length - 1), lastY: y(data[data.length - 1]) };
}

export default function HeroStat() {
  const valor = useCountUp(heroCopy.valor, 0);
  const delta = useCountUp(heroCopy.delta, 2);
  const W = 520, H = 230, PAD = 14;
  const { d, lastX, lastY } = buildPath([...heroCopy.serie], W, H, PAD);
  const areaRef = useRef<SVGPathElement>(null);

  return (
    <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-center">
      {/* Número */}
      <div>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="font-black tracking-tighter text-white leading-[0.86] text-[clamp(5rem,15vw,11rem)]">
            {valor}
          </span>
          <span className="font-semibold text-gray-400 text-[clamp(1.1rem,2.4vw,1.5rem)] max-w-[160px] leading-tight">
            {heroCopy.unidade}
          </span>
        </div>

        <div className="mt-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-ibi-green/30 bg-ibi-green/10 px-3.5 py-2 text-base font-bold text-ibi-green">
            ▲ {delta}% vs fev 2025
          </span>
        </div>

        <p className="mt-6 max-w-[480px] text-lg leading-relaxed text-gray-400">
          {heroCopy.subtitulo}
        </p>
      </div>

      {/* Gráfico */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-azul-medio to-gray-900 p-5 pb-3 shadow-2xl">
        <div className="flex items-start justify-between mb-1.5">
          <div>
            <div className="text-sm font-bold text-white">Toneladas movimentadas / mês</div>
            <div className="text-xs text-gray-500 mt-0.5">Brasil · milhões de t · jan 2025 – fev 2026</div>
          </div>
          <span className="rounded-md border border-ibi-blue/35 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-widest text-ibi-blue">
            Mensal
          </span>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full h-auto" aria-hidden>
          <defs>
            <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0099D8" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#0099D8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="heroStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00A652" />
              <stop offset="100%" stopColor="#0099D8" />
            </linearGradient>
          </defs>
          <line x1="0" y1="52" x2={W} y2="52" stroke="rgba(255,255,255,.05)" />
          <line x1="0" y1="115" x2={W} y2="115" stroke="rgba(255,255,255,.05)" />
          <line x1="0" y1="178" x2={W} y2="178" stroke="rgba(255,255,255,.05)" />
          <path ref={areaRef} d={`${d} L${lastX} ${H} L${PAD} ${H} Z`} fill="url(#heroFill)" />
          <path d={d} fill="none" stroke="url(#heroStroke)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={lastX} cy={lastY} r="5.5" fill="#0099D8" stroke="#111827" strokeWidth="2.5" />
        </svg>

        <div className="flex justify-between px-0.5 pt-0.5 text-[0.66rem] tracking-wide text-gray-500">
          <span>JAN 25</span><span>JUL 25</span><span>FEV 26</span>
        </div>
        <div className="mt-2 border-t border-white/10 pt-2.5 text-[0.7rem] text-gray-500">
          ⚠ Série ilustrativa — a ligar à base oficial da ANTAQ.
        </div>
      </div>
    </div>
  );
}
