import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import SeloProveniencia from "@/components/SeloProveniencia";
import EmbedButton from "@/components/EmbedButton";
import AquaviarioEmbed from "@/components/AquaviarioEmbed";
import { getAquaviarioSnapshot, AQUAVIARIO_COPY } from "@/lib/modulos/aquaviario";
import { EMBED_REGISTRY_HIDRO } from "@/lib/embed-registry-hidro";

export const revalidate = 21600; // 6h — mesma cadência do /monitor

export const metadata: Metadata = {
  title: `${AQUAVIARIO_COPY.titulo} | Observatório IBI`,
  description: AQUAVIARIO_COPY.intro,
  openGraph: {
    title: `${AQUAVIARIO_COPY.titulo} | Observatório IBI`,
    description: AQUAVIARIO_COPY.intro,
    type: "article",
  },
};

export default async function AquaviarioPage() {
  // Fonte única: o MESMO snapshot do /embed/aquaviario (sem duplicar número).
  const snapshot = await getAquaviarioSnapshot();

  return (
    <main className="max-w-screen-lg mx-auto px-4 py-10 flex flex-col gap-10">
      {/* ── HEADER ── */}
      <header>
        <BackLink />
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2 mt-1">
          Bloco B · Risco hidrológico em tempo real
        </p>
        <h1 className="text-white text-4xl font-extrabold leading-tight mb-3 max-w-3xl">
          {AQUAVIARIO_COPY.titulo}
        </h1>
        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">
          {AQUAVIARIO_COPY.intro}
        </p>
      </header>

      {/* ── TRÍADE (mesmo componente do /embed/aquaviario) ── */}
      <section>
        <AquaviarioEmbed snapshot={snapshot} />
      </section>

      {/* ── METODOLOGIA + SELO + EMBED ── */}
      <section>
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2">
          Metodologia
        </p>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mb-5">
          {AQUAVIARIO_COPY.metodologia}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SeloProveniencia
            tipo={AQUAVIARIO_COPY.proveniencia.tipo}
            fonte={AQUAVIARIO_COPY.proveniencia.fonte}
          />
          <EmbedButton modulo="aquaviario" altura={EMBED_REGISTRY_HIDRO.aquaviario.alturaEmbed} />
        </div>
      </section>
    </main>
  );
}
