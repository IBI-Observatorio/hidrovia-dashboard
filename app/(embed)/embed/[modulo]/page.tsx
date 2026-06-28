import { notFound } from "next/navigation";
import EmbedModulo from "@/components/EmbedModulo";
import { EMBED_REGISTRY } from "@/lib/embed-registry";

export function generateStaticParams() {
  return Object.keys(EMBED_REGISTRY).map((modulo) => ({ modulo }));
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  if (!EMBED_REGISTRY[modulo]) notFound();

  return (
    <main className="p-4">
      <EmbedModulo modulo={modulo} />
    </main>
  );
}
