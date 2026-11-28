import Link from "next/link";
import { FlaskConical } from "lucide-react";
import RelogioCompacto from "@/components/livro-razao/RelogioCompacto";
import {
  multiploUrgencia,
  taxaPorSegundoFicha,
  valorAnualPiso,
  type FichaProjeto,
} from "@/lib/livro-razao/schema";
import { MODAL_LABEL, multiploFmt } from "@/lib/livro-razao/formato";
import { LIVRO_RAZAO_COPY } from "@/lib/livro-razao/copy";

// Card de uma ficha na grade. Ativa: relógio compacto + múltiplo. Em validação:
// selo "aguardando validação metodológica", sem número.
export default function FichaCard({ ficha }: { ficha: FichaProjeto }) {
  const ativa = ficha.status === "ativa";
  const multiplo = multiploUrgencia(ficha);
  const valorAnual = valorAnualPiso(ficha);
  const taxa = taxaPorSegundoFicha(ficha);

  return (
    <Link
      href={`/livro-razao/${ficha.slug}`}
      className="group flex flex-col gap-4 rounded-lg border border-white/10 bg-azul-medio p-5 transition-colors hover:border-white/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg leading-tight group-hover:text-white">
            {ficha.nome}
          </h2>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {MODAL_LABEL[ficha.modal]} · {ficha.uf.join(" ")}
          </p>
        </div>
        {ativa && multiplo != null ? (
          <span
            title={LIVRO_RAZAO_COPY.grade.tooltipMultiplo}
            className="shrink-0 cursor-help rounded-full border border-ibi-green/40 bg-ibi-green/10 px-2.5 py-1 text-sm font-extrabold text-ibi-green tabular-nums"
          >
            {multiploFmt(multiplo)}
          </span>
        ) : null}
      </div>

      {ativa && valorAnual != null && taxa != null ? (
        <RelogioCompacto valorAnual={valorAnual} taxaSegundo={taxa} />
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-ouro/40 bg-ouro/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-ouro">
          <FlaskConical size={13} aria-hidden />
          {LIVRO_RAZAO_COPY.grade.seloEmValidacao}
        </div>
      )}

      <p className="text-sm leading-relaxed text-gray-400 line-clamp-3">{ficha.contexto}</p>
    </Link>
  );
}
