// /agro — Radar do Escoamento (vertical AGRO).
// Server Component: monta os dados (determinísticos, ilustrativos) em
// lib/agro-content.ts e entrega props serializáveis aos Client Components.
// Predição vem primeiro: IEE+3 no topo de cada card.

import type { Metadata } from "next";
import Link from "next/link";
import PredictiveCorridorCard from "@/components/agro/PredictiveCorridorCard";
import ComponentBreakdown from "@/components/agro/ComponentBreakdown";
import DemurrageClock from "@/components/agro/DemurrageClock";
import CollisionChart from "@/components/agro/CollisionChart";
import SubscribeForm from "@/components/home/SubscribeForm";
import { getAgroData } from "@/lib/agro-content";
import { agroCopy } from "@/lib/agro-copy";

export const metadata: Metadata = {
  title: agroCopy.pageMeta.agro.title,
  description: agroCopy.pageMeta.agro.description,
  openGraph: {
    title: agroCopy.pageMeta.agro.ogTitle,
    description: agroCopy.pageMeta.agro.ogDescription,
  },
};

const CORREDORES = ["santos", "paranagua", "arco-norte"] as const;

export default function AgroPage() {
  const data = getAgroData();
  const { hero, rodape } = agroCopy;

  return (
    <main className="flex-1 bg-azul-marinho">
      <div className="container mx-auto px-6 py-12 sm:py-16">
        {/* ============ BLOCO 1 — HERO + 3 cards preditivos ============ */}
        <section>
          <div className="flex flex-wrap gap-2">
            {hero.eyebrow.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-ibi-blue/35 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-widest text-ibi-blue"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
            {hero.titulo}
          </h1>
          <p className="mt-2 bg-gradient-to-r from-ibi-green to-ibi-blue bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
            {hero.subtitulo}
          </p>
          <p className="mt-4 max-w-[680px] text-base leading-relaxed text-gray-400">
            {hero.descricao}
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {CORREDORES.map((c) => (
              <PredictiveCorridorCard key={c} data={data.corredores[c]} />
            ))}
          </div>
        </section>

        {/* ============ BLOCO 2 — tabs + decomposição ============ */}
        <section className="mt-14">
          <ComponentBreakdown corredores={data.corredores} />
        </section>

        {/* ============ BLOCO 3 — relógio de demurrage ============ */}
        <section className="mt-14">
          <DemurrageClock demurrage={data.demurrage} />
        </section>

        {/* ============ BLOCO 4 — colisão Arco Norte ============ */}
        <section className="mt-14">
          <CollisionChart colisao={data.colisao} />
        </section>

        {/* ============ BLOCO 5 — metodologia + captura ============ */}
        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col justify-center overflow-hidden rounded-2xl border border-white/10 bg-azul-medio p-6 sm:p-8">
            <Link
              href={rodape.metodologiaHref}
              className="group inline-flex items-center gap-2 text-lg font-bold text-white"
            >
              <span className="relative">
                {rodape.metodologiaCta}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gradient-to-r from-ibi-green to-ibi-blue transition-all duration-300 group-hover:w-full" />
              </span>
              <span className="text-ibi-blue transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{rodape.metodologiaCaption}</p>
          </div>

          <div id="receber" className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-azul-medio to-gray-900 p-6 text-center sm:p-8">
            <h2 className="text-lg font-bold text-white">{rodape.capturaTitulo}</h2>
            <p className="mx-auto mt-1.5 mb-5 max-w-[420px] text-sm leading-relaxed text-gray-400">
              {rodape.capturaCaption}
            </p>
            <SubscribeForm />
          </div>
        </section>
      </div>
    </main>
  );
}
