import { notFound } from "next/navigation";
import RelogioCompacto from "@/components/livro-razao/RelogioCompacto";
import {
  fichaAtiva,
  multiploUrgencia,
  taxaPorSegundoFicha,
  valorAnualPiso,
} from "@/lib/livro-razao/schema";
import { FICHAS, getFicha } from "@/lib/livro-razao/registry";
import { MODAL_LABEL, multiploFmt } from "@/lib/livro-razao/formato";

// Embed compacto (≤420px) por ficha — SÓ fichas ativas. Em validação → 404.
export function generateStaticParams() {
  return FICHAS.filter(fichaAtiva).map((f) => ({ slug: f.slug }));
}

export default async function EmbedFichaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = getFicha(slug);
  // Só ficha ativa tem embed; em_validacao (ou inexistente) → 404.
  if (!f || !fichaAtiva(f)) notFound();

  const valorAnual = valorAnualPiso(f)!;
  const taxa = taxaPorSegundoFicha(f)!;
  const multiplo = multiploUrgencia(f);

  return (
    <main className="p-4">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-azul-medio to-gray-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {MODAL_LABEL[f.modal]} · {f.uf.join(" ")}
            </p>
            <h1 className="text-white font-bold text-lg leading-tight mt-0.5">{f.nome}</h1>
          </div>
          {multiplo != null ? (
            <span className="shrink-0 rounded-full border border-ibi-green/40 bg-ibi-green/10 px-2.5 py-1 text-sm font-extrabold text-ibi-green tabular-nums">
              {multiploFmt(multiplo)}
            </span>
          ) : null}
        </div>

        <RelogioCompacto valorAnual={valorAnual} taxaSegundo={taxa} />

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ouro">
            Estimativa IBI · custo de inação (piso)
          </span>
          <a
            href={`/livro-razao/${f.slug}`}
            target="_blank"
            rel="noopener"
            className="text-xs font-semibold text-ibi-blue hover:underline underline-offset-2"
          >
            Ver a ficha →
          </a>
        </div>
      </div>
    </main>
  );
}
