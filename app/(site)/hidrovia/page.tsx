import type { Metadata } from "next";
import Link from "next/link";
import { homeCopy } from "@/lib/home-copy";
import { navigationCopy } from "@/lib/navigation-copy";

export const metadata: Metadata = {
  title: navigationCopy.pageMeta.home.title,
  description: navigationCopy.pageMeta.home.description,
  openGraph: {
    title: navigationCopy.pageMeta.home.ogTitle,
    description: navigationCopy.pageMeta.home.ogDescription,
  },
};

export default function HomePage() {
  const { hero, navigationCards, about, dataSources, contact } = homeCopy;

  return (
    <main>

      {/* ── HERO ── */}
      <section className="bg-azul-medio/50 border-b border-white/5 py-16 px-4">
        <div className="max-w-screen-lg mx-auto">
          <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-3">
            {hero.eyebrow}
          </p>
          <h1 className="text-white text-4xl font-extrabold leading-tight mb-4 max-w-2xl">
            {hero.title}
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mb-2">
            {hero.subtitle}
          </p>
          <p className="text-gray-500 text-sm">{hero.description}</p>
        </div>
      </section>

      {/* ── NAVIGATION CARDS ── */}
      <section className="max-w-screen-lg mx-auto px-4 py-12">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-6">
          {navigationCards.title}
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          {navigationCards.cards.map((card) => (
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

      {/* ── SOBRE O OBSERVATÓRIO ── */}
      <section className="bg-azul-medio/30 border-y border-white/5 py-12 px-4">
        <div className="max-w-screen-lg mx-auto grid sm:grid-cols-2 gap-10">
          <div>
            <h2 className="text-white text-xl font-bold mb-4">{about.title}</h2>
            <div className="space-y-4">
              {about.paragraphs.map((p, i) => (
                <p key={i} className="text-gray-400 text-sm leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="bg-azul-medio rounded-lg p-5 border border-white/10 self-start">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">
              {about.institutional.label}
            </p>
            <p className="text-white font-bold text-sm mb-1">
              {about.institutional.name}
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              {about.institutional.description}
            </p>
          </div>
        </div>
      </section>

      {/* ── FONTES DE DADOS ── */}
      <section className="max-w-screen-lg mx-auto px-4 py-12">
        <h2 className="text-white text-xl font-bold mb-2">{dataSources.title}</h2>
        <p className="text-gray-400 text-sm mb-6">{dataSources.description}</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {dataSources.items.map((src) => (
            <div key={src.acronym} className="bg-azul-medio rounded-lg p-4 border border-white/5">
              <p className="text-verde font-bold text-sm mb-1">{src.acronym}</p>
              <p className="text-white text-xs font-semibold mb-1">{src.name}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{src.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTATO ── */}
      <section className="bg-azul-medio/30 border-t border-white/5 py-10 px-4">
        <div className="max-w-screen-lg mx-auto">
          <h2 className="text-white text-lg font-bold mb-2">{contact.title}</h2>
          <p className="text-gray-400 text-sm mb-3">{contact.description}</p>
          <p className="text-gray-500 text-xs">
            {contact.emailLabel}:{" "}
            <a
              href={`mailto:${contact.email}`}
              className="text-verde hover:underline"
            >
              {contact.email}
            </a>
          </p>
        </div>
      </section>

    </main>
  );
}
