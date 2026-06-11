"use client";

// DemurrageClock — o custo diário estimado do navio parado, em US$.
// Multiplicação paramétrica feita em lib/agro-content.ts
// (navios × CUSTO_DEMURRAGE_DIA_USD); aqui só exibição com count-up.
//
// O RÓTULO FIXO de metodologia é obrigatório e visível — sem ele o card
// não existe (regra da vertical).

import { motion } from "framer-motion";
import { useCountUp } from "@/components/home/HeroStat";
import { agroCopy } from "@/lib/agro-copy";
import type { AgroData } from "@/lib/agro-content";

export default function DemurrageClock({ demurrage }: { demurrage: AgroData["demurrage"] }) {
  const copy = agroCopy.demurrage;

  // Count-up em milhões de US$ (2 decimais, vírgula) — reuso do useCountUp.
  const milhoes = demurrage.custoDiaUSD / 1_000_000;
  const valor = useCountUp(milhoes, 2);
  const navios = useCountUp(demurrage.naviosTotal, 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-azul-medio to-gray-900"
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-ibi-green to-ibi-blue" />
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h2 className="text-xl font-bold text-white">{copy.titulo}</h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[clamp(2.6rem,7vw,4.2rem)] font-black leading-none tracking-tighter text-ouro tabular-nums">
              US$ {valor} mi
            </span>
          </div>
          <p className="mt-1.5 text-sm text-gray-400">{copy.labelValor}</p>

          {/* RÓTULO FIXO E OBRIGATÓRIO */}
          <p className="mt-4 inline-block rounded-md border border-ouro/30 bg-ouro/10 px-3 py-1.5 text-[0.7rem] font-semibold text-ouro">
            {copy.rotuloFixo}
          </p>
          <p className="mt-2 text-[0.66rem] text-gray-500">{agroCopy.rotuloIlustrativo}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tabular-nums text-white">{navios}</span>
            <span className="text-sm text-gray-400">{copy.labelNavios}</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {demurrage.porCorredor.map((p) => (
              <li key={p.corredor} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-400">{agroCopy.corredores[p.corredor].nome}</span>
                <span className="flex items-center gap-2.5">
                  <span
                    className="h-1.5 rounded-full bg-gradient-to-r from-ibi-green to-ibi-blue"
                    style={{ width: `${Math.max(8, (p.navios / demurrage.naviosTotal) * 110)}px` }}
                  />
                  <span className="w-6 text-right font-bold tabular-nums text-white">{p.navios}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}
