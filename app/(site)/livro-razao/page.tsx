import type { Metadata } from "next";
import Link from "next/link";
import FichaCard from "@/components/livro-razao/FichaCard";
import { FICHAS, contagemFichasAtivas, fichasOrdenadas } from "@/lib/livro-razao/registry";
import { LIVRO_RAZAO_COPY } from "@/lib/livro-razao/copy";

export const metadata: Metadata = {
  title: LIVRO_RAZAO_COPY.meta.title,
  description: LIVRO_RAZAO_COPY.meta.description,
  openGraph: {
    title: LIVRO_RAZAO_COPY.meta.title,
    description: LIVRO_RAZAO_COPY.meta.description,
    type: "article",
  },
};

export default function LivroRazaoPage() {
  const fichas = fichasOrdenadas();
  const ativas = contagemFichasAtivas();

  return (
    <main className="max-w-screen-lg mx-auto px-4 py-10 flex flex-col gap-12">
      {/* ── (A) CABEÇALHO ── */}
      <header>
        <p className="text-ouro text-[11px] font-bold uppercase tracking-widest mb-2">
          {LIVRO_RAZAO_COPY.eyebrow}
        </p>
        <h1 className="text-white text-4xl sm:text-5xl font-extrabold leading-[1.08] mb-3 max-w-3xl">
          {LIVRO_RAZAO_COPY.titulo}
        </h1>
        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">
          {LIVRO_RAZAO_COPY.subtitulo}
        </p>

        {/* ── (B) BARRA DE ESTADO HONESTA ── */}
        <p className="mt-6 inline-block rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-gray-300">
          {LIVRO_RAZAO_COPY.estado(ativas, FICHAS.length)}
        </p>
      </header>

      {/* ── (C) GRADE DE FICHAS ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fichas.map((f) => (
          <FichaCard key={f.slug} ficha={f} />
        ))}
      </section>

      {/* ── (D) RODAPÉ METODOLÓGICO ── */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-4">
          {LIVRO_RAZAO_COPY.metodologia.titulo}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
          {LIVRO_RAZAO_COPY.metodologia.itens.map((item) => (
            <div key={item.rotulo}>
              <p className="text-white text-sm font-bold mb-1">{item.rotulo}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{item.texto}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-gray-500 text-sm leading-relaxed max-w-3xl">
          As fontes de cada projeto aparecem na ficha correspondente, com selo de
          proveniência linha a linha.
        </p>
        <Link
          href="/metodologia"
          className="mt-5 inline-block text-ibi-blue text-sm font-semibold hover:underline underline-offset-2"
        >
          Como o Observatório mede — metodologia completa →
        </Link>
      </section>
    </main>
  );
}
