import type { Metadata } from "next";
import Link from "next/link";
import AquaviarioEmbed from "@/components/AquaviarioEmbed";
import RelogioVivo from "@/components/RelogioVivo";
import SeloProveniencia from "@/components/SeloProveniencia";
import { getAquaviarioSnapshot } from "@/lib/modulos/aquaviario";
import {
  RELOGIO_COPY,
  decomposicao,
  formataReaisAprox,
  notaComponentes,
} from "@/lib/relogio";

// Mesma cadência do /aquaviario — a camada de contexto lê o snapshot ANA.
export const revalidate = 21600;

export const metadata: Metadata = {
  title: RELOGIO_COPY.meta.title,
  description: RELOGIO_COPY.meta.description,
  openGraph: {
    title: RELOGIO_COPY.meta.title,
    description: RELOGIO_COPY.meta.description,
    type: "article",
  },
};

const SEGUNDOS_DIA = 86_400;

export default async function RelogioPage() {
  // Camada de contexto (C): mesmo snapshot do /aquaviario — fonte única.
  const snapshot = await getAquaviarioSnapshot();
  const componentes = decomposicao();

  return (
    <main className="max-w-screen-lg mx-auto px-4 py-10 flex flex-col gap-14">
      {/* ── (A) O NÚMERO ── */}
      <header>
        <p className="text-ouro text-[11px] font-bold uppercase tracking-widest mb-2">
          {RELOGIO_COPY.eyebrow}
        </p>
        <h1 className="text-white text-4xl sm:text-5xl font-extrabold leading-[1.08] mb-3 max-w-3xl">
          {RELOGIO_COPY.titulo}
        </h1>
        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl mb-8">
          {RELOGIO_COPY.subtitulo}
        </p>
        <div className="max-w-2xl">
          <RelogioVivo variante="pagina" />
        </div>
      </header>

      {/* ── (B) A DECOMPOSIÇÃO ── */}
      <section>
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2">
          {RELOGIO_COPY.decomposicao.titulo}
        </p>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mb-6">
          {RELOGIO_COPY.decomposicao.descricao}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {componentes.map((c) => (
            <div
              key={c.modulo}
              className="bg-azul-medio rounded-lg p-5 border border-white/10 flex flex-col gap-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-white font-bold text-lg">{c.nome}</h2>
                <span className="text-ibi-green font-extrabold text-lg tabular-nums">
                  {Math.round(c.participacao)}%
                  <span className="text-gray-500 text-xs font-semibold"> do Relógio</span>
                </span>
              </div>
              <p className="text-gray-300 text-sm tabular-nums">
                ≈ R$ {Math.round(c.taxa).toLocaleString("pt-BR")} por segundo ·{" "}
                {formataReaisAprox(c.taxa * SEGUNDOS_DIA)} por dia
              </p>
              <SeloProveniencia tipo={c.tipoProveniencia} fonte={c.fonte} />
              <a
                href={c.rota}
                className="text-ibi-blue text-sm font-semibold hover:underline underline-offset-2"
              >
                Ver o módulo em profundidade →
              </a>
            </div>
          ))}
        </div>

        <p className="text-gray-500 text-sm leading-relaxed max-w-3xl mt-5">
          {notaComponentes(componentes.length)}
        </p>
      </section>

      {/* ── (C) CONTEXTO SEM SOMA ── */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <p className="text-ouro text-[11px] font-bold uppercase tracking-widest mb-2">
          {RELOGIO_COPY.contexto.titulo}
        </p>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mb-6">
          {RELOGIO_COPY.contexto.explicacao}
        </p>
        <AquaviarioEmbed snapshot={snapshot} />
        <a
          href="/aquaviario"
          className="inline-block mt-4 text-ibi-blue text-sm font-semibold hover:underline underline-offset-2"
        >
          Ver o módulo aquaviário em profundidade →
        </a>
      </section>

      {/* ── (D) METODOLOGIA ── */}
      <section>
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-4">
          {RELOGIO_COPY.metodologia.titulo}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
          {RELOGIO_COPY.metodologia.itens.map((item) => (
            <div key={item.rotulo}>
              <p className="text-white text-sm font-bold mb-1">{item.rotulo}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{item.texto}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <SeloProveniencia
            tipo={RELOGIO_COPY.proveniencia.tipo}
            fonte={RELOGIO_COPY.proveniencia.fonte}
          />
        </div>
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
