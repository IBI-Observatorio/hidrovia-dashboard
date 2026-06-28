import { notFound } from "next/navigation";
import EmbedModulo from "@/components/EmbedModulo";
import EmbedButton from "@/components/EmbedButton";
import { EMBED_REGISTRY } from "@/lib/embed-registry";
import { EMBED_REGISTRY_HIDRO } from "@/lib/embed-registry-hidro";

export function generateStaticParams() {
  return [
    ...Object.keys(EMBED_REGISTRY),
    ...Object.keys(EMBED_REGISTRY_HIDRO),
  ].map((modulo) => ({ modulo }));
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;

  // ── Caminho CUSTO (Bloco A) — INTOCADO ──────────────────────────────────────
  if (EMBED_REGISTRY[modulo]) {
    return (
      <main className="p-4">
        <EmbedModulo modulo={modulo} />
      </main>
    );
  }

  // ── Caminho HIDRO (Bloco B) — server/async, não usa CustoMeter ──────────────
  const hidro = EMBED_REGISTRY_HIDRO[modulo];
  if (hidro) {
    return (
      <main className="p-4">
        <div className="mx-auto max-w-4xl">
          {await hidro.render()}
          <div className="mt-3">
            <EmbedButton modulo={modulo} altura={hidro.alturaEmbed} />
          </div>
        </div>
      </main>
    );
  }

  notFound();
}
