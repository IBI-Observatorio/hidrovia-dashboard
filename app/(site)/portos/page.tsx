import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Portos — Observatório IBI",
  description:
    "Movimentação portuária, tendência de cargas e o índice combinado IBI×PIM-PF. Três entradas para entender os portos brasileiros.",
};

const cards = [
  {
    eyebrow: "Ranking",
    title: "Movimentação Portuária",
    description:
      "Ranking de portos e terminais por volume e crescimento — filtre por tipo de carga, ano, mês e produto (NCM SH4).",
    meta: "Base 2018–2025 · ref. fev/2026",
    cta: "Abrir o ranking →",
    href: "/portos/movimentacao",
  },
  {
    eyebrow: "Análise inédita",
    title: "Para onde vai a movimentação?",
    description:
      "Médias móveis de 12 meses por tipo de carga e projeção do contêiner para os próximos 5 meses, com banda de incerteza empírica.",
    meta: "Mensal · 2010–2026",
    cta: "Ver a tendência →",
    href: "/portos/ineditas/tendencia-cargas",
  },
  {
    eyebrow: "Análise inédita",
    title: "PIM-PF Combinado IBI",
    description:
      "Combinação AR(1) + Dynamic Factor Model sobre 35 séries portuárias da ANTAQ — previsão validada para a produção industrial em horizonte bimestral.",
    meta: "Bimestral · validado OOS",
    cta: "Ver o índice →",
    href: "/portos/ineditas/portgdp",
  },
];

export default function PortosLandingPage() {
  return (
    <main>

      {/* ── HERO ── */}
      <section className="bg-azul-medio/50 border-b border-white/5 py-10 px-4">
        <div className="max-w-screen-lg mx-auto">
          <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-3">
            Observatório IBI · Portos
          </p>
          <h1 className="text-white text-3xl sm:text-[2rem] font-extrabold leading-[1.15] mb-4 max-w-md">
            Movimentação, tendência e produção industrial nos portos brasileiros
          </h1>
          <p className="text-gray-300 text-base leading-relaxed max-w-xl mb-2">
            Três entradas analíticas construídas sobre a base estatística da ANTAQ
            (2010–2026), cruzadas com séries macroeconômicas do BCB.
          </p>
          <p className="text-gray-500 text-sm">
            Dados oficiais, atualização mensal, metodologia aberta.
          </p>
        </div>
      </section>

      {/* ── NAVIGATION CARDS ── */}
      <section className="max-w-screen-lg mx-auto px-4 py-12">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-6">
          Por onde começar
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-azul-medio rounded-xl p-6 border border-white/10 hover:border-verde/30 transition-all group"
            >
              <p className="text-verde text-[10px] font-bold uppercase tracking-widest mb-2">
                {card.eyebrow}
              </p>
              <h2 className="text-white text-xl font-bold mb-2 group-hover:text-verde transition-colors">
                {card.title}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                {card.description}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-gray-600 text-xs">{card.meta}</p>
                <span className="text-verde text-sm font-semibold">{card.cta}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}
