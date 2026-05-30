"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCountUp, buildSparkPath, SparkGradients } from "./metric-utils";
import type { Modo } from "@/lib/home-content";

interface DynamicMetricCardProps {
  tag: string;
  acento: "green" | "blue";
  periodo: string;
  unidade: string;
  modos: Modo[];
  insight: string;
  href: string;
  hrefDados?: string;
  intervaloMs?: number;
  ilustrativo?: boolean;
}

export default function DynamicMetricCard({
  tag,
  acento,
  periodo,
  unidade,
  modos,
  insight,
  href,
  hrefDados,
  intervaloMs = 4200,
  ilustrativo = true,
}: DynamicMetricCardProps) {
  const [idx, setIdx] = useState(0);
  const [tickKey, setTickKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sparkId = useId().replace(/:/g, "");

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % modos.length);
      setTickKey((k) => k + 1);
    }, intervaloMs);
  }, [intervaloMs, modos.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const handleClick = (i: number) => {
    setIdx(i);
    setTickKey((k) => k + 1);
    startTimer();
  };

  const m = modos[idx];
  const valorFmt = useCountUp(m.valor, m.decimais);

  const acentoDot = acento === "green" ? "bg-ibi-green" : "bg-ibi-blue";
  const topbarCls = acento === "green" ? "bg-ibi-green" : "bg-ibi-blue";
  const insightBg = acento === "green" ? "bg-ibi-green/[0.05]" : "bg-ibi-blue/[0.06]";
  const insightLab =
    acento === "green"
      ? "text-ibi-green border-ibi-green/30"
      : "text-ibi-blue border-ibi-blue/35";
  const ctaHover = acento === "green" ? "hover:text-ibi-green" : "hover:text-ibi-blue";

  const fiveCols = modos.length >= 5;
  const W = 520;
  const H = 120;
  const PAD = 10;
  const { d, lastX, lastY } = m.serie
    ? buildSparkPath(m.serie, W, H, PAD)
    : { d: "", lastX: 0, lastY: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-azul-medio p-7 transition-all hover:-translate-y-1 hover:border-white/20"
    >
      <span className={`absolute inset-x-0 top-0 h-[3px] ${topbarCls}`} />

      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-[3px] ${acentoDot}`} />
          <span className="text-sm font-bold uppercase tracking-[0.1em]">{tag}</span>
        </div>
        <div className="text-right text-[0.66rem] uppercase leading-[1.4] tracking-[0.04em] text-gray-500">
          {periodo.split(" · ").map((p, i, arr) =>
            i === 0 ? (
              <span key={i}>{p}{i < arr.length - 1 && <br />}</span>
            ) : (
              <span key={i}>{p}{i < arr.length - 1 && " · "}</span>
            )
          )}
        </div>
      </div>

      <motion.div
        key={tickKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="min-h-[92px]"
      >
        <div className="mb-1.5 text-sm text-gray-400">{m.label}</div>
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-[clamp(2.4rem,5vw,3.3rem)] font-extrabold leading-[0.9] tracking-tighter text-white">
            {valorFmt}
          </span>
          <span className="pb-1.5 text-sm font-medium text-gray-400">{unidade}</span>
          <span
            className={`mb-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold ${
              m.tendencia === "up"
                ? "border-ibi-green/30 bg-ibi-green/10 text-ibi-green"
                : "border-vermelho/40 bg-vermelho/15 text-[#e86b6b]"
            }`}
          >
            {m.delta}
            <span className="ml-1 text-[0.7rem] font-normal text-gray-500">a/a</span>
          </span>
        </div>
        <div className="mt-2.5 text-[0.78rem] text-gray-500">{m.share}</div>

        {m.serie && (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="mt-4 block h-auto w-full"
            aria-hidden
          >
            <SparkGradients idPrefix={`dyn${sparkId}`} />
            <line x1="0" y1="40" x2={W} y2="40" stroke="rgba(255,255,255,.05)" />
            <line x1="0" y1="80" x2={W} y2="80" stroke="rgba(255,255,255,.05)" />
            <path
              d={`${d} L${lastX} ${H} L${PAD} ${H} Z`}
              fill={`url(#dyn${sparkId}Fill)`}
            />
            <path
              d={d}
              fill="none"
              stroke={`url(#dyn${sparkId}Stroke)`}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={lastX} cy={lastY} r="5" fill="#0099D8" stroke="#111827" strokeWidth="2.5" />
          </svg>
        )}
      </motion.div>

      <div
        className={`mt-4 flex flex-wrap gap-1.5 ${
          fiveCols ? "[&>button]:text-[0.62rem] [&>button]:tracking-[0.01em] [&>button]:px-1" : ""
        }`}
      >
        {modos.map((mo, i) => (
          <button
            key={mo.label}
            onClick={() => handleClick(i)}
            className={`min-w-0 flex-1 cursor-pointer whitespace-nowrap rounded-lg border px-2 py-1.5 text-center text-[0.7rem] tracking-[0.04em] transition-all ${
              i === idx
                ? "border-ibi-blue bg-ibi-blue/15 text-white"
                : "border-white/10 text-gray-500 hover:text-gray-300"
            }`}
          >
            {mo.label}
          </button>
        ))}
      </div>

      <div
        className={`mt-5 flex items-start gap-2.5 rounded-xl border border-white/10 p-4 ${insightBg}`}
      >
        <span
          className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.1em] ${insightLab}`}
        >
          Insight
        </span>
        <p
          className="text-[0.84rem] leading-[1.45] text-[#cdd3da] [&_b]:font-semibold [&_b]:text-white"
          dangerouslySetInnerHTML={{ __html: m.insight ?? insight }}
        />
      </div>

      {hrefDados ? (
        <div className="mt-4 flex items-center justify-between">
          <Link
            href={hrefDados}
            className="text-[0.82rem] font-semibold text-gray-400 transition-colors hover:text-white"
          >
            ← Tabela de movimentação
          </Link>
          <Link
            href={href}
            className={`text-[0.82rem] font-bold text-white transition-all ${ctaHover}`}
          >
            Tendência de cargas →
          </Link>
        </div>
      ) : (
        <Link
          href={href}
          className={`mt-4 inline-flex items-center gap-2 text-[0.82rem] font-bold text-white transition-all ${ctaHover}`}
        >
          Clique aqui para mais análises e informações →
        </Link>
      )}

      {ilustrativo && (
        <div className="mt-3 border-t border-white/10 pt-2.5 text-[0.7rem] text-gray-500">
          ⚠ Série ilustrativa — a ligar à base oficial da ANTAQ.
        </div>
      )}
    </motion.div>
  );
}
