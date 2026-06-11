"use client";

// PredictiveCorridorCard — card preditivo do IEE por corredor (vertical AGRO).
// Derivado do padrão PredictiveDraftCard: PREDIÇÃO PRIMEIRO.
//   topo  → IEE+3 grande (count-up) + faixa colorida + tendência vs IEE-Agora
//   meio  → gauge semicircular (padrão IRC) com faixa min–max de cenários
//   base  → IEE-Agora + sparkline 26 semanas + Insight (1 frase, agro-copy)
//
// Nenhum número é calculado aqui: tudo chega pronto de lib/agro-content.ts
// (que só chama lib/iee.ts). Copy exclusivamente de lib/agro-copy.ts.

import { motion } from "framer-motion";
import { useCountUp, buildPath } from "@/components/home/HeroStat";
import { agroCopy } from "@/lib/agro-copy";
import type { CorredorAgroData } from "@/lib/agro-content";
import type { FaixaIEE } from "@/lib/iee";

// Mapa estático token → classes (Tailwind não resolve classe dinâmica).
// Apenas tokens do globals.css — nunca inventar cor.
const FAIXA_CLASSES: Record<
  FaixaIEE["token"],
  { texto: string; borda: string; fundo: string }
> = {
  "ibi-green": { texto: "text-ibi-green", borda: "border-ibi-green/30", fundo: "bg-ibi-green/10" },
  "ibi-blue":  { texto: "text-ibi-blue",  borda: "border-ibi-blue/30",  fundo: "bg-ibi-blue/10" },
  ouro:        { texto: "text-ouro",      borda: "border-ouro/30",      fundo: "bg-ouro/10" },
  vermelho:    { texto: "text-vermelho",  borda: "border-vermelho/30",  fundo: "bg-vermelho/10" },
};

/** Gauge semicircular (padrão IRC/velocímetro do Monitor): escala 0–100,
 *  arco de fundo + arco da faixa min–max (cenários) + ponteiro no central. */
function GaugeIEE({
  central,
  min,
  max,
  hex,
}: {
  central: number;
  min: number;
  max: number;
  hex: string;
}) {
  const cx = 100, cy = 90, r = 80;
  const ang = (v: number) => Math.PI * (1 - Math.max(0, Math.min(100, v)) / 100);
  const px = (v: number) => cx + r * Math.cos(ang(v));
  const py = (v: number) => cy - r * Math.sin(ang(v));
  const arco = (de: number, ate: number) =>
    `M ${px(de).toFixed(1)} ${py(de).toFixed(1)} A ${r} ${r} 0 0 1 ${px(ate).toFixed(1)} ${py(ate).toFixed(1)}`;
  const nx = cx + (r - 14) * Math.cos(ang(central));
  const ny = cy - (r - 14) * Math.sin(ang(central));

  return (
    <svg viewBox="0 -6 200 102" className="mx-auto block w-full max-w-[210px]" aria-hidden>
      {/* arco de fundo (0–100) */}
      <path d={arco(0, 100)} fill="none" stroke="#111827" strokeWidth="12" strokeLinecap="round" />
      {/* faixa min–max de cenários */}
      {max > min && (
        <path d={arco(min, max)} fill="none" stroke={hex} strokeWidth="12" strokeLinecap="round" opacity={0.45} />
      )}
      {/* ponteiro no cenário central */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={hex} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4.5" fill={hex} />
      <text x="14" y="103" fill="#6b7280" fontSize="9">0</text>
      <text x="178" y="103" fill="#6b7280" fontSize="9">100</text>
    </svg>
  );
}

export default function PredictiveCorridorCard({ data }: { data: CorredorAgroData }) {
  const { card, corredores, insights, rotuloIlustrativo, fontesCorredor } = agroCopy;
  const meta = corredores[data.corredor];

  const mais3 = data.ieeMais3;
  const agora = data.ieeAgora;
  const cor = FAIXA_CLASSES[mais3.faixa.token];
  const corAgora = FAIXA_CLASSES[agora.faixa.token];

  const valMais3 = useCountUp(mais3.central, 1);
  const valAgora = useCountUp(agora.valor, 1);

  const delta = mais3.central - agora.valor;
  const tendencia =
    delta > 1 ? card.tendencia.sobe : delta < -1 ? card.tendencia.cai : card.tendencia.estavel;
  const seta = delta > 1 ? "▲" : delta < -1 ? "▼" : "→";

  // Sparkline 26 semanas do IEE — buildPath do HeroStat (reuso, não duplicação).
  const W = 260, H = 56, PAD = 4;
  const spark = buildPath([...data.ieeSerie], W, H, PAD);
  const gradId = `ieeSpark-${data.corredor}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-azul-medio"
    >
      {/* barra 3px gradiente no topo */}
      <div className="h-[3px] w-full bg-gradient-to-r from-ibi-green to-ibi-blue" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* cabeçalho do corredor */}
        <header>
          <h3 className="text-lg font-bold text-white">{meta.nome}</h3>
          <p className="text-xs text-gray-500">{meta.rotaResumo} · {meta.descricao}</p>
        </header>

        {/* TOPO — IEE+3 (predição vem primeiro) */}
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-widest text-gray-400">
            {card.labelMais3}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <span className={`text-5xl font-extrabold tabular-nums tracking-tight ${cor.texto}`}>
              {valMais3}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${cor.texto} ${cor.borda} ${cor.fundo}`}
            >
              {mais3.faixa.label}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            <span className={cor.texto}>{seta}</span> {tendencia}
          </p>
        </div>

        {/* MEIO — gauge semicircular com faixa min–max */}
        <div>
          <GaugeIEE central={mais3.central} min={mais3.min} max={mais3.max} hex={mais3.faixa.hex} />
          <p className="text-center text-[0.65rem] text-gray-500">
            {card.labelFaixaCenarios}: {mais3.min.toFixed(0)}–{mais3.max.toFixed(0)}
          </p>
        </div>

        {/* BASE — IEE-Agora + sparkline 26 semanas */}
        <div className="border-t border-white/10 pt-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[0.62rem] font-bold uppercase tracking-widest text-gray-400">
              {card.labelAgora}
            </p>
            <span className={`text-2xl font-extrabold tabular-nums ${corAgora.texto}`}>
              {valAgora}
            </span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-1.5 block h-12 w-full" aria-hidden>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00A652" />
                <stop offset="100%" stopColor="#0099D8" />
              </linearGradient>
            </defs>
            <path d={spark.d} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={spark.lastX} cy={spark.lastY} r="4" fill="#0099D8" stroke="#111827" strokeWidth="2" />
          </svg>
          <p className="text-[0.62rem] text-gray-500">{card.labelSparkline}</p>
        </div>

        {/* INSIGHT — 1 frase, de agro-copy */}
        <div className="rounded-lg bg-black/25 p-3">
          <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ibi-blue">
            {card.labelInsight}
          </p>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-gray-300">
            {insights[data.corredor]}
          </p>
        </div>

        {/* rótulo obrigatório: fontes e natureza do dado por pilar */}
        <p className="mt-auto border-t border-white/10 pt-2.5 text-[0.66rem] leading-relaxed text-gray-500">
          {data.ilustrativo
            ? rotuloIlustrativo
            : `${(fontesCorredor as Partial<Record<typeof data.corredor, string>>)[data.corredor] ?? ""} · pilares: ${data.rotuloPilares}`}
        </p>
      </div>
    </motion.article>
  );
}
