import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import SeloProveniencia from "@/components/SeloProveniencia";
import { EMBED_REGISTRY } from "@/lib/embed-registry";
import { PAVIMENTO_COPY } from "@/lib/modulos/pavimento";
import PavimentoModulo from "./PavimentoModulo";

export const metadata: Metadata = {
  title: `${PAVIMENTO_COPY.titulo} | Observatório IBI`,
  description: PAVIMENTO_COPY.intro,
  openGraph: {
    title: `${PAVIMENTO_COPY.titulo} | Observatório IBI`,
    description: PAVIMENTO_COPY.intro,
    type: "article",
  },
};

export default function PavimentoPage() {
  const cfg = EMBED_REGISTRY.pavimento;

  return (
    <main className="max-w-screen-lg mx-auto px-4 py-10 flex flex-col gap-10">
      {/* ── HEADER ── */}
      <header>
        <BackLink />
        <p className="text-ouro text-[11px] font-bold uppercase tracking-widest mb-2 mt-1">
          Bloco A · Custo evitável em tempo real
        </p>
        <h1 className="text-white text-4xl font-extrabold leading-tight mb-3 max-w-3xl">
          {PAVIMENTO_COPY.titulo}
        </h1>
        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">
          {PAVIMENTO_COPY.intro}
        </p>
      </header>

      {/* ── MÓDULO (mesmo do /embed/pavimento) ── */}
      <section className="max-w-2xl">
        <PavimentoModulo />
      </section>

      {/* ── STATS DE APOIO ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PAVIMENTO_COPY.stats.map((s) => (
          <div
            key={s}
            className="bg-azul-medio rounded-lg p-4 border border-white/5"
          >
            <p className="text-white font-bold text-sm leading-snug tabular-nums">{s}</p>
          </div>
        ))}
      </section>

      {/* ── METODOLOGIA ── */}
      <section>
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2">
          Metodologia
        </p>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mb-5">
          {PAVIMENTO_COPY.metodologia}
        </p>
        <SeloProveniencia tipo={cfg.proveniencia.tipo} fonte={cfg.proveniencia.fonte} />
      </section>
    </main>
  );
}
