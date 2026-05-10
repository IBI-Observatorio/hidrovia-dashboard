import type { Metadata } from "next";
import Link from "next/link";
import { navigationCopy } from "@/lib/navigation-copy";
import { caso2024Copy } from "@/lib/caso-2024-copy";
import LagTimeline2024 from "@/components/LagTimeline2024";

export const metadata: Metadata = {
  title: navigationCopy.pageMeta.caso2024.title,
  description: navigationCopy.pageMeta.caso2024.description,
  openGraph: {
    title: navigationCopy.pageMeta.caso2024.ogTitle,
    description: navigationCopy.pageMeta.caso2024.ogDescription,
  },
};

export default function Caso2024Page() {
  const c = caso2024Copy;

  return (
    <main className="max-w-screen-lg mx-auto px-4 py-10 flex flex-col gap-14">

      {/* ── PAGE HEADER ── */}
      <header>
        <p className="text-ouro text-[11px] font-bold uppercase tracking-widest mb-2">
          {c.pageHeader.eyebrow}
        </p>
        <h1 className="text-white text-4xl font-extrabold leading-tight mb-3 max-w-3xl">
          {c.pageHeader.title}
        </h1>
        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl mb-1">
          {c.pageHeader.subtitle}
        </p>
        <p className="text-gray-500 text-xs mb-6">
          {c.pageHeader.metadata.authorLabel}: {c.pageHeader.metadata.author}
          {" · "}
          {c.pageHeader.metadata.publicationLabel}: {c.pageHeader.metadata.publicationDate}
        </p>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mb-6">
          {c.pageHeader.abstract}
        </p>

        {/* Key facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {c.pageHeader.keyFacts.map((f) => (
            <div key={f.label} className="bg-azul-medio rounded-lg p-3 border border-white/5">
              <p className="text-gray-400 text-xs mb-1">{f.label}</p>
              <p className="text-white font-bold text-sm leading-snug">{f.value}</p>
            </div>
          ))}
        </div>

        <p className="text-gray-600 text-xs italic max-w-2xl">
          {c.pageHeader.methodologicalNote}
        </p>
      </header>

      {/* ── SEÇÃO 1 — CONTEXTO CLIMATOLÓGICO ── */}
      <section id={c.context.anchorId} className="scroll-mt-20">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-1">
          {c.context.sectionNumber}
        </p>
        <h2 className="text-white font-bold text-2xl mb-1">{c.context.title}</h2>
        <p className="text-gray-400 text-sm mb-4 max-w-2xl">{c.context.subtitle}</p>
        <div className="space-y-4">
          {c.context.paragraphs.map((p, i) => (
            <p key={i} className="text-gray-300 text-sm leading-relaxed max-w-3xl">{p}</p>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-4">{c.context.sources}</p>
      </section>

      {/* ── SEÇÃO 2 — TIMELINE DOS 22 DIAS ── */}
      <section id={c.timeline.anchorId} className="scroll-mt-20">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-1">
          {c.timeline.sectionNumber}
        </p>
        <h2 className="text-white font-bold text-2xl mb-1">{c.timeline.title}</h2>
        <p className="text-gray-400 text-sm mb-1 max-w-2xl">{c.timeline.subtitle}</p>
        <p className="text-gray-500 text-xs mb-5 max-w-3xl leading-relaxed">
          {c.timeline.introduction}
        </p>

        <LagTimeline2024 />

        <div className="mt-6 space-y-3">
          {c.timeline.annotations.map((a, i) => (
            <div
              key={i}
              className="flex gap-4 bg-azul-medio/60 rounded-lg p-4 border border-white/5"
            >
              <div className="shrink-0 w-1 rounded-full bg-ouro/40 self-stretch" />
              <div>
                <p className="text-ouro text-xs font-semibold">{a.date}</p>
                <p className="text-gray-400 text-xs font-medium mt-0.5">{a.station}</p>
                <p className="text-white text-sm mt-1">{a.event}</p>
                <p className="text-gray-500 text-xs mt-0.5 italic">{a.note}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-gray-500 text-xs mt-4 max-w-3xl leading-relaxed italic">
          {c.timeline.interpretation}
        </p>
      </section>

      {/* ── SEÇÃO 3 — COMPARAÇÃO HISTÓRICA ── */}
      <section id={c.historicalComparison.anchorId} className="scroll-mt-20">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-1">
          {c.historicalComparison.sectionNumber}
        </p>
        <h2 className="text-white font-bold text-2xl mb-1">{c.historicalComparison.title}</h2>
        <p className="text-gray-400 text-sm mb-1 max-w-2xl">{c.historicalComparison.subtitle}</p>
        <p className="text-gray-500 text-xs mb-5 max-w-3xl leading-relaxed">
          {c.historicalComparison.introduction}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <caption className="text-gray-500 text-xs text-left mb-2">
              {c.historicalComparison.table.caption}
            </caption>
            <thead>
              <tr className="border-b border-white/10">
                {c.historicalComparison.table.headers.map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 px-3 text-gray-400 text-xs font-semibold uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.historicalComparison.table.rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-white/5 ${
                    row[0] === "2024"
                      ? "bg-vermelho/10"
                      : i % 2 === 0
                      ? "bg-azul-medio/30"
                      : ""
                  }`}
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`py-2.5 px-3 text-xs ${
                        j === 0
                          ? "text-white font-bold"
                          : j === 1
                          ? "text-ouro font-semibold tabular-nums"
                          : "text-gray-300"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 text-xs mt-2 italic">
          {c.historicalComparison.table.note}
        </p>
        <p className="text-gray-500 text-xs mt-4 max-w-3xl leading-relaxed">
          {c.historicalComparison.interpretation}
        </p>
      </section>

      {/* ── SEÇÃO 4 — IMPLICAÇÕES OPERACIONAIS ── */}
      <section id={c.operationalImplications.anchorId} className="scroll-mt-20">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-1">
          {c.operationalImplications.sectionNumber}
        </p>
        <h2 className="text-white font-bold text-2xl mb-1">
          {c.operationalImplications.title}
        </h2>
        <p className="text-gray-400 text-sm mb-5 max-w-2xl">
          {c.operationalImplications.subtitle}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {c.operationalImplications.items.map((item) => (
            <div key={item.title} className="bg-azul-medio rounded-lg p-5 border border-white/5">
              <p className="text-white font-semibold text-sm mb-2">{item.title}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SEÇÃO 5 — METODOLOGIA E FONTES ── */}
      <section id={c.methodology.anchorId} className="scroll-mt-20">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-1">
          {c.methodology.sectionNumber}
        </p>
        <h2 className="text-white font-bold text-2xl mb-1">{c.methodology.title}</h2>
        <p className="text-gray-400 text-sm mb-6 max-w-2xl">{c.methodology.subtitle}</p>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Fontes */}
          <div>
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-widest mb-3">
              {c.methodology.dataSources.title}
            </p>
            <div className="space-y-3">
              {c.methodology.dataSources.items.map((s) => (
                <div key={s.source} className="flex gap-3">
                  <div className="shrink-0 w-1 bg-verde/30 rounded-full self-stretch" />
                  <div>
                    <p className="text-white text-xs font-semibold">{s.source}</p>
                    <p className="text-gray-500 text-xs leading-relaxed mt-0.5">
                      {s.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Métodos + Limitações */}
          <div className="space-y-5">
            <div>
              <p className="text-gray-300 text-xs font-semibold uppercase tracking-widest mb-3">
                {c.methodology.methods.title}
              </p>
              <ul className="space-y-2">
                {c.methodology.methods.items.map((m, i) => (
                  <li key={i} className="text-gray-500 text-xs leading-relaxed flex gap-2">
                    <span className="text-verde shrink-0">·</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-gray-300 text-xs font-semibold uppercase tracking-widest mb-3">
                {c.methodology.limitations.title}
              </p>
              <ul className="space-y-2">
                {c.methodology.limitations.items.map((l, i) => (
                  <li key={i} className="text-gray-500 text-xs leading-relaxed flex gap-2">
                    <span className="text-ouro shrink-0">·</span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── RODAPÉ DO ESTUDO ── */}
      <footer className="flex flex-col gap-5">
        {/* Citação */}
        <div className="bg-azul-medio rounded-lg p-5 border border-white/5">
          <p className="text-gray-300 text-xs font-semibold uppercase tracking-widest mb-2">
            {c.footer.citation.title}
          </p>
          <p className="text-gray-400 text-xs leading-relaxed italic">
            {c.footer.citation.text}
          </p>
        </div>

        {/* Cross-link → /monitor */}
        <div className="bg-azul-medio/50 border border-white/10 rounded-lg px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-gray-400 text-xs font-semibold">
              {c.footer.crossLink.eyebrow}
            </p>
            <p className="text-white text-sm font-bold mt-0.5">
              {c.footer.crossLink.title}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">{c.footer.crossLink.caption}</p>
          </div>
          <Link
            href={c.footer.crossLink.href}
            className="text-verde text-sm font-semibold whitespace-nowrap hover:underline"
          >
            {c.footer.crossLink.cta}
          </Link>
        </div>
      </footer>

    </main>
  );
}
