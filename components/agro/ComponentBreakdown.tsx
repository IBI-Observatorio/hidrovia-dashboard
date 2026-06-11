"use client";

// ComponentBreakdown — decomposição do IEE no padrão DynamicMetricCard:
// rotaciona automaticamente entre os componentes F/T/S/(H) do corredor
// selecionado (CorridorTabs), com percentil (count-up), valor bruto e
// pílula de delta semanal.
//
// Nenhum número é calculado aqui — percentis e deltas chegam prontos de
// lib/agro-content.ts. Copy de lib/agro-copy.ts.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCountUp } from "@/components/home/HeroStat";
import CorridorTabs from "./CorridorTabs";
import { agroCopy } from "@/lib/agro-copy";
import type { CorredorAgroData, SerieComponenteAgro, StatusPilar } from "@/lib/agro-content";
import type { Corredor } from "@/lib/iee";

const ROTACAO_MS = 6000;

// Classes estáticas por status (Tailwind não resolve classe dinâmica).
const STATUS_CLASSES: Record<StatusPilar, string> = {
  real: "border-ibi-green/30 bg-ibi-green/10 text-ibi-green",
  modelado: "border-ibi-blue/30 bg-ibi-blue/10 text-ibi-blue",
  ilustrativo: "border-white/15 bg-white/5 text-gray-400",
  indisponivel: "border-vermelho/30 bg-vermelho/10 text-vermelho",
};

function StatusBadge({ status }: { status: StatusPilar }) {
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[0.62rem] font-semibold ${STATUS_CLASSES[status]}`}>
      {agroCopy.breakdown.statusPilar[status]}
    </span>
  );
}

function DeltaPill({ serie }: { serie: SerieComponenteAgro }) {
  const d = serie.deltaSemanal;
  const sobe = d > 0;
  const estavel = d === 0;
  const txt = `${sobe ? "+" : ""}${String(d).replace(".", ",")} ${agroCopy.breakdown.componentes[serie.componente].unidade}`;
  if (estavel) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-gray-400">
        → {agroCopy.breakdown.labelEstavel} {agroCopy.breakdown.labelDelta}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
        sobe
          ? "border-ibi-green/30 bg-ibi-green/10 text-ibi-green"
          : "border-vermelho/30 bg-vermelho/10 text-vermelho"
      }`}
    >
      {sobe ? "▲" : "▼"} {txt} {agroCopy.breakdown.labelDelta}
    </span>
  );
}

function MetricFace({ serie }: { serie: SerieComponenteAgro }) {
  const copy = agroCopy.breakdown;
  const comp = copy.componentes[serie.componente];
  const percentil = useCountUp(serie.percentilAtual, 0);
  const bruto = useCountUp(
    serie.valorAtual,
    Number.isInteger(serie.valorAtual) ? 0 : 1,
  );

  return (
    <motion.div
      key={`${serie.corredor}-${serie.componente}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center"
    >
      <div>
        <p className="text-[0.62rem] font-bold uppercase tracking-widest text-gray-400">
          {comp.nome} · {copy.labelPercentil}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-6xl font-extrabold tabular-nums tracking-tight text-white">
            {percentil}
          </span>
          <span className="text-sm text-gray-500">/100</span>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-sm text-gray-300">
          <span className="font-bold text-white">
            {bruto} {comp.unidade}
          </span>{" "}
          · {copy.labelValorBruto}
        </p>
        <div className="mt-2">
          <DeltaPill serie={serie} />
        </div>
        <p className="mt-2.5 text-[0.8rem] leading-relaxed text-gray-400">{comp.leitura}</p>

        {serie.decomposicaoCusto && (
          <div className="mt-3 rounded-lg bg-black/25 p-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-widest text-gray-400">
              {copy.decomposicaoT.titulo}
            </p>
            <ul className="mt-1.5 space-y-1">
              {(["combustivel", "variavel", "fixo", "pedagio"] as const).map((k) => (
                <li key={k} className="flex items-center justify-between gap-3 text-[0.75rem]">
                  <span className="text-gray-400">{copy.decomposicaoT[k]}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-1 rounded-full bg-gradient-to-r from-ibi-green to-ibi-blue"
                      style={{ width: `${Math.max(6, (serie.decomposicaoCusto![k] / serie.valorAtual) * 130)}px` }}
                    />
                    <span className="w-12 text-right font-bold tabular-nums text-gray-300">
                      {serie.decomposicaoCusto![k].toFixed(0)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={serie.status} />
          {serie.calibracaoEmConstrucao && (
            <span className="rounded-md border border-ouro/30 bg-ouro/10 px-2 py-0.5 text-[0.62rem] font-semibold text-ouro">
              {copy.labelCalibracao}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[0.66rem] text-gray-500">
          {serie.status === "ilustrativo"
            ? `${agroCopy.rotuloIlustrativo} · TODO: ${serie.fonteAlvo}`
            : serie.fonte}
        </p>
      </div>
    </motion.div>
  );
}

export default function ComponentBreakdown({
  corredores,
}: {
  corredores: Record<Corredor, CorredorAgroData>;
}) {
  const [corredor, setCorredor] = useState<Corredor>("santos");
  const [idx, setIdx] = useState(0);

  const comps = corredores[corredor].componentes;
  const serie = comps[idx % comps.length];

  // Rotação automática F → T → S → (H); seleção manual reinicia o ciclo.
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % comps.length), ROTACAO_MS);
    return () => clearInterval(t);
  }, [comps.length, corredor]);

  const trocaCorredor = (c: Corredor) => {
    setCorredor(c);
    setIdx(0);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-azul-medio"
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-ibi-green to-ibi-blue" />
      <div className="p-6">
        <h2 className="text-xl font-bold text-white">{agroCopy.breakdown.titulo}</h2>
        <p className="mt-1 max-w-[640px] text-sm leading-relaxed text-gray-400">
          {agroCopy.breakdown.subtitulo}
        </p>

        <div className="mt-5">
          <CorridorTabs value={corredor} onChange={trocaCorredor} />
        </div>

        <div className="mt-6 min-h-[150px]">
          <MetricFace serie={serie} />
        </div>

        {/* dots de rotação — também selecionam o componente */}
        <div className="mt-4 flex gap-2">
          {comps.map((c, i) => (
            <button
              key={c.componente}
              aria-label={agroCopy.breakdown.componentes[c.componente].nome}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx % comps.length ? "w-6 bg-ibi-blue" : "w-2.5 bg-white/15 hover:bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
