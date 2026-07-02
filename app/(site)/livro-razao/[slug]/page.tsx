import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RelogioCompacto from "@/components/livro-razao/RelogioCompacto";
import SeloProveniencia from "@/components/SeloProveniencia";
import EmbedButton from "@/components/EmbedButton";
import {
  multiploUrgencia,
  taxaPorSegundoFicha,
  valorAnualPiso,
  type Fonte,
} from "@/lib/livro-razao/schema";
import { FICHAS, getFicha } from "@/lib/livro-razao/registry";
import { MODAL_LABEL, multiploFmt, reaisAprox } from "@/lib/livro-razao/formato";
import { LIVRO_RAZAO_COPY } from "@/lib/livro-razao/copy";

export function generateStaticParams() {
  return FICHAS.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = getFicha(slug);
  if (!f) return { title: "Ficha não encontrada · Livro-Razão" };
  return {
    title: `${f.nome} · Livro-Razão da Infraestrutura | Observatório IBI`,
    description: f.contexto,
  };
}

const DIAS_ANO = 365;

// Linha de fonte com selo de proveniência. URL pendente vira aviso honesto.
function LinhaFonte({ fonte }: { fonte: Fonte }) {
  const rotulo = `${fonte.titulo} — ${fonte.orgao} (${fonte.ano})`;
  return (
    <li className="flex flex-col gap-1 border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
      <SeloProveniencia tipo="oficial" fonte={rotulo} />
      {fonte.url ? (
        <a
          href={fonte.url}
          target="_blank"
          rel="noopener"
          className="text-ibi-blue text-xs font-semibold hover:underline underline-offset-2"
        >
          {fonte.url}
        </a>
      ) : (
        <span className="text-gray-500 text-xs italic">URL pública pendente</span>
      )}
    </li>
  );
}

export default async function FichaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = getFicha(slug);
  if (!f) notFound();

  const ativa = f.status === "ativa";
  const multiplo = multiploUrgencia(f);
  const valorAnual = valorAnualPiso(f);
  const taxa = taxaPorSegundoFicha(f);

  return (
    <main className="max-w-screen-md mx-auto px-4 py-10 flex flex-col gap-10">
      <div>
        <Link
          href="/livro-razao"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={15} aria-hidden /> Livro-Razão
        </Link>
      </div>

      {/* ── CABEÇALHO ── */}
      <header>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          {MODAL_LABEL[f.modal]} · {f.uf.join(" ")}
        </p>
        <h1 className="text-white text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
          {f.nome}
        </h1>
        <p className="text-gray-300 text-lg leading-relaxed">{f.contexto}</p>
      </header>

      {ativa && valorAnual != null && taxa != null && f.custoInacaoDiario && f.capex ? (
        <>
          {/* ── RELÓGIO INDIVIDUAL (PISO) + FAIXA ── */}
          <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-azul-medio to-gray-900 p-6 shadow-2xl">
            <RelogioCompacto valorAnual={valorAnual} taxaSegundo={taxa} />
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">
              Custo diário de este projeto não existir, contado pelo piso desde as
              00h de hoje (horário de Brasília).
            </p>
            <div className="mt-4 border-t border-white/10 pt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                  {LIVRO_RAZAO_COPY.ficha.faixaRotulo} · por dia
                </p>
                <p className="text-white font-bold tabular-nums mt-1">
                  {reaisAprox(f.custoInacaoDiario.piso)} – {reaisAprox(f.custoInacaoDiario.teto)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                  {LIVRO_RAZAO_COPY.ficha.faixaRotulo} · por ano
                </p>
                <p className="text-white font-bold tabular-nums mt-1">
                  {reaisAprox(f.custoInacaoDiario.piso * DIAS_ANO)} –{" "}
                  {reaisAprox(f.custoInacaoDiario.teto * DIAS_ANO)}
                </p>
              </div>
            </div>
          </section>

          {/* ── CAPEX + MÚLTIPLO ── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-azul-medio p-5">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                {LIVRO_RAZAO_COPY.ficha.capexTitulo}
              </p>
              <p className="text-white text-2xl font-extrabold tabular-nums">
                {reaisAprox(f.capex.valor)}
              </p>
              <p className="text-gray-500 text-xs mt-1">Ano-base {f.capex.ano_base}</p>
            </div>
            <div className="rounded-lg border border-ibi-green/30 bg-ibi-green/5 p-5">
              <p
                className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1 cursor-help"
                title={LIVRO_RAZAO_COPY.grade.tooltipMultiplo}
              >
                {LIVRO_RAZAO_COPY.ficha.multiploTitulo}
              </p>
              <p className="text-ibi-green text-2xl font-extrabold tabular-nums">
                {multiplo != null ? multiploFmt(multiplo) : "—"}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                custo anual de inação ÷ CAPEX
              </p>
            </div>
          </section>

          {/* ── MEMÓRIA DE CÁLCULO ── */}
          <section>
            <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-3">
              {LIVRO_RAZAO_COPY.ficha.memoriaTitulo}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {f.custoInacaoDiario.memoria}
            </p>
            <div className="mt-4">
              <SeloProveniencia
                tipo="estimativa-ibi"
                fonte={`${f.custoInacaoDiario.fonte.titulo} — ${f.custoInacaoDiario.fonte.orgao} (${f.custoInacaoDiario.fonte.ano})`}
              />
            </div>
          </section>

          <div>
            <EmbedButton modulo={`ficha/${f.slug}`} altura={420} />
          </div>
        </>
      ) : (
        /* ── EM VALIDAÇÃO — mesma página, sem números ── */
        <section className="rounded-xl border border-ouro/30 bg-ouro/[0.04] p-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-ouro/40 bg-ouro/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ouro mb-4">
            {LIVRO_RAZAO_COPY.grade.seloEmValidacao}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">
            {LIVRO_RAZAO_COPY.ficha.emValidacaoNota}
          </p>
        </section>
      )}

      {/* ── FONTES (linha a linha) ── */}
      <section>
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-4">
          {LIVRO_RAZAO_COPY.ficha.fontesTitulo}
        </p>
        <ul className="flex flex-col gap-3">
          {f.fontes.map((fonte, i) => (
            <LinhaFonte key={`${fonte.titulo}-${i}`} fonte={fonte} />
          ))}
        </ul>
      </section>
    </main>
  );
}
