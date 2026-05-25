"use client";

import { useEffect, useState } from "react";

// Contagem 0→alvo com easeOutCubic. Re-dispara quando `target` muda
// (essencial para os cards dinâmicos ao trocar de modo).
export function useCountUp(target: number, decimals = 0, duration = 1100) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      let p = Math.min((t - t0) / duration, 1);
      p = 1 - Math.pow(1 - p, 3);
      setVal(target * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val.toFixed(decimals).replace(".", ",");
}

// Catmull-Rom→Bézier simplificado, mesma matemática do HeroStat original.
export function buildSparkPath(data: number[], w: number, h: number, pad: number) {
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

// Defs compartilhados de gradiente (mesmos ids do HeroStat).
// Use uma única vez por SVG: dois cards diferentes podem usar ids únicos
// passando `idPrefix`.
export function SparkGradients({ idPrefix = "hero" }: { idPrefix?: string }) {
  return (
    <defs>
      <linearGradient id={`${idPrefix}Fill`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0099D8" stopOpacity="0.42" />
        <stop offset="100%" stopColor="#0099D8" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${idPrefix}Stroke`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#00A652" />
        <stop offset="100%" stopColor="#0099D8" />
      </linearGradient>
    </defs>
  );
}
