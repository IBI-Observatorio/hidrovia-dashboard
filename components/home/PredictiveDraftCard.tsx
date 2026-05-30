"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCountUp } from "./metric-utils";

interface PredictiveDraftCardProps {
  tag: string;
  periodo: string;
  limiarM: number;
  diasParaLimiar: number;
  dataLimiar?: string | null;
  janelaIC80: string;
  caladoAtualM: number;
  irc: number;
  ircFaixa: string;
  gaugePct: number;
  insight: string;
  href: string;
  ilustrativo?: boolean;
}

function formatarDataExtenso(iso: string): string {
  const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const [, m, d] = iso.split("-");
  return `${parseInt(d)} ${MESES[parseInt(m) - 1]}`;
}

export default function PredictiveDraftCard({
  tag,
  periodo,
  limiarM,
  diasParaLimiar,
  dataLimiar,
  janelaIC80,
  caladoAtualM,
  irc,
  ircFaixa,
  gaugePct,
  insight,
  href,
  ilustrativo = true,
}: PredictiveDraftCardProps) {
  const diasFmt = useCountUp(diasParaLimiar, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-azul-medio p-7 transition-all hover:-translate-y-1 hover:border-white/20"
    >
      <span className="absolute inset-x-0 top-0 h-[3px] bg-ouro" />

      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-ouro" />
          <span className="text-sm font-bold uppercase tracking-[0.1em]">{tag}</span>
        </div>
        <div className="text-right text-[0.66rem] uppercase leading-[1.4] tracking-[0.04em] text-gray-500">
          {periodo.split(" · ").map((p, i, arr) => (
            <span key={i}>
              {p}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>

      <div className="text-[0.78rem] text-gray-400">
        Calado operacional projetado a cair a {limiarM} m (início das restrições) em
      </div>
      <div className="mt-2 flex items-baseline gap-2.5 flex-wrap">
        <span className="text-[clamp(2.4rem,5vw,3.3rem)] font-extrabold leading-[0.9] tracking-tighter text-ouro">
          {diasFmt}
        </span>
        <span className="text-sm text-gray-400">dias</span>
        {dataLimiar && (
          <span className="text-[0.95rem] font-semibold text-white leading-none">
            · {formatarDataExtenso(dataLimiar)}
          </span>
        )}
      </div>

      <div className="mt-2.5 text-[0.78rem] text-gray-400">
        janela IC80: <b className="text-white">{janelaIC80}</b> · calado disponível hoje{" "}
        <b className="text-white">{caladoAtualM.toString().replace(".", ",")} m</b> ↓
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded bg-white/[0.07]">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${gaugePct}%` }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }}
          className="h-full rounded bg-gradient-to-r from-ibi-blue to-ouro"
        />
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-[0.74rem] text-gray-300">
        IRC (Índice de Risco de Calado): <b className="text-ouro">{irc} / 100 ↑</b> · faixa{" "}
        {ircFaixa}
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/10 bg-ouro/[0.06] p-4">
        <span className="mt-0.5 shrink-0 rounded border border-ouro/[0.35] px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.1em] text-ouro">
          Insight
        </span>
        <p
          className="text-[0.84rem] leading-[1.45] text-[#cdd3da] [&_b]:font-semibold [&_b]:text-white"
          dangerouslySetInnerHTML={{ __html: insight }}
        />
      </div>

      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 text-[0.82rem] font-bold text-white transition-all hover:text-ibi-blue"
      >
        Clique aqui para mais análises e informações →
      </Link>

      {ilustrativo && (
        <div className="mt-3 border-t border-white/10 pt-2.5 text-[0.7rem] text-gray-500">
          ⚠ Valores ilustrativos — a ligar à engine real (lib/recessao-modelo.ts + lib/irc.ts).
        </div>
      )}
    </motion.div>
  );
}
