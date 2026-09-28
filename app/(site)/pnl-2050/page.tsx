import type { Metadata } from "next";
import Link from "next/link";
import LinhaEixo from "@/components/pnl2050/LinhaEixo";
import MatrizCobertura, { type EixoMatriz } from "@/components/pnl2050/MatrizCobertura";
import {
  basePNL,
  coberturaFragil,
  eixosBanco,
  eixosMeta,
  orfaos,
  totaisCenarioMeta,
  type Nivel,
  type TipoEixo,
} from "@/lib/pnl2050/dados";
import { CATEGORIA_CURTA, PNL_COPY, TIPO_EIXO_LABEL } from "@/lib/pnl2050/copy";

export const metadata: Metadata = {
  title: PNL_COPY.meta.title,
  description: PNL_COPY.meta.description,
  openGraph: {
    title: PNL_COPY.meta.title,
    description: PNL_COPY.meta.description,
    type: "article",
  },
};

const ORDEM_TIPOS: TipoEixo[] = ["aquaviario", "intermodal", "ferroviario", "rodoviario"];

function Eyebrow({ children, cor = "text-verde" }: { children: React.ReactNode; cor?: string }) {
  return <p className={`${cor} text-[11px] font-bold uppercase tracking-widest mb-3`}>{children}</p>;
}

export default function PNL2050Page() {
  const base = basePNL();
  const meta = eixosMeta(base);
  const banco = eixosBanco(base);
  const todos = [...meta, ...banco];
  const totais = totaisCenarioMeta(base);
  const semEixo = orfaos(todos, base);
  const frageis = coberturaFragil(meta, base);

  const eixosMatriz: EixoMatriz[] = todos.map((e) => ({
    codigo: e.codigo,
    nome: e.nome,
    banco: e.cenario === "banco",
    niveis: Object.fromEntries(e.objetivos.map((o) => [o.chave, o.nivel])) as Record<string, Nivel>,
  }));

  const numeros = [
    { valor: totais.objetivos, rotulo: "objetivos de atuação" },
    { valor: totais.eixos, rotulo: "eixos no cenário-meta" },
    { valor: totais.intervencoes, rotulo: "intervenções estruturantes" },
    { valor: semEixo.length, rotulo: "objetivos sem nenhum eixo" },
  ];

  return (
    <main className="w-full max-w-screen-lg mx-auto px-4 py-10 flex flex-col gap-14">
      {/* ── CABEÇALHO ── */}
      <header>
        <Eyebrow cor="text-ouro">{PNL_COPY.eyebrow}</Eyebrow>
        <h1 className="text-white text-3xl sm:text-5xl font-extrabold leading-[1.08] mb-4 max-w-3xl">
          {PNL_COPY.titulo}
        </h1>
        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">{PNL_COPY.subtitulo}</p>
        <p className="mt-6 inline-block rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-gray-300">
          {PNL_COPY.estado(totais.intervencoes)}
        </p>

        <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {numeros.map((n) => (
            <div key={n.rotulo} className="flex flex-col rounded-xl border border-white/10 bg-azul-medio px-4 py-4">
              <dt className="order-2 text-gray-400 text-xs leading-snug">{n.rotulo}</dt>
              <dd className="text-white text-3xl font-extrabold tabular-nums">{n.valor}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ── MARCOS DO PIT (antecipação primeiro) ── */}
      <section>
        <Eyebrow>{PNL_COPY.marcos.titulo}</Eyebrow>
        <ol className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {PNL_COPY.marcos.etapas.map((e, i) => (
            <li
              key={e.rotulo}
              className={`rounded-xl border px-4 py-3 ${
                e.feito ? "border-ibi-green/40 bg-ibi-green/10" : "border-white/10 bg-azul-medio"
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                Etapa {i + 1} {e.feito ? "· concluída" : i === 1 ? "· próxima" : ""}
              </p>
              <p className="text-white font-semibold">{e.rotulo}</p>
              <p className="text-gray-400 text-xs leading-snug">{e.detalhe}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-3xl">{PNL_COPY.marcos.nota}</p>
        <p className="mt-2 text-gray-500 text-sm leading-relaxed max-w-3xl">{PNL_COPY.marcos.tcu}</p>
      </section>

      {/* ── ESCADA DE ADERÊNCIA ── */}
      <section>
        <Eyebrow>{PNL_COPY.escada.titulo}</Eyebrow>
        <p className="text-gray-300 leading-relaxed max-w-3xl mb-5">{PNL_COPY.escada.texto}</p>
        <ol className="grid grid-cols-2 sm:grid-cols-7 gap-2">
          {PNL_COPY.escada.degraus.map((d) => (
            <li
              key={d.n}
              className={`rounded-lg border px-3 py-2 ${
                d.n === 0 ? "border-ibi-green/40 bg-ibi-green/10" : "border-white/10 bg-azul-medio"
              }`}
            >
              <p className="text-gray-500 text-[11px] font-mono">{d.n}</p>
              <p className="text-white text-sm font-semibold leading-tight">{d.rotulo}</p>
              <p className="text-gray-500 text-[11px] leading-snug">{d.fonte}</p>
              <p className="mt-1 text-xs font-semibold tabular-nums text-gray-300">
                {d.n === 0 ? totais.intervencoes : "em apuração"}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── OS 31 EIXOS ── */}
      <section>
        <Eyebrow>{PNL_COPY.eixos.titulo}</Eyebrow>
        <p className="text-gray-300 leading-relaxed max-w-3xl mb-6">{PNL_COPY.eixos.texto}</p>
        <div className="flex flex-col gap-8">
          {ORDEM_TIPOS.map((tipo) => (
            <div key={tipo}>
              <h3 className="text-white text-sm font-bold mb-3">
                {TIPO_EIXO_LABEL[tipo]}{" "}
                <span className="text-gray-500 font-normal">· {totais.porTipo[tipo]} eixos</span>
              </h3>
              <div className="flex flex-col gap-2">
                {meta
                  .filter((e) => e.tipo === tipo)
                  .map((e) => (
                    <LinhaEixo key={e.codigo} eixo={e} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OS ÓRFÃOS DO PNL ── */}
      <section id="orfaos" className="scroll-mt-24">
        <Eyebrow cor="text-ouro">{PNL_COPY.orfaos.titulo}</Eyebrow>
        <p className="text-gray-300 leading-relaxed max-w-3xl mb-6">{PNL_COPY.orfaos.texto}</p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {semEixo.map((o) => (
            <li key={o.chave} className="rounded-xl border border-white/10 bg-azul-medio p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                {CATEGORIA_CURTA[o.categoria]} · {o.chave} · pág. {o.pagina_pdf} do PDF
              </p>
              <p className="text-white font-semibold leading-snug mt-1">{o.enunciado}</p>
              {PNL_COPY.orfaos.leitura[o.chave] && (
                <p className="text-gray-400 text-sm leading-relaxed mt-2">
                  {PNL_COPY.orfaos.leitura[o.chave]}
                </p>
              )}
            </li>
          ))}
        </ul>

        <h3 className="text-white font-bold mt-10 mb-2">{PNL_COPY.orfaos.fragilTitulo}</h3>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mb-4">{PNL_COPY.orfaos.fragilTexto}</p>
        <ul className="flex flex-col gap-2">
          {frageis.map(({ objetivo, codigo, nivel }) => (
            <li
              key={objetivo.chave}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-white/10 bg-azul-medio px-4 py-3"
            >
              <span className="text-gray-200 text-sm">
                <span className="font-mono text-gray-500">{objetivo.chave}</span> {objetivo.enunciado}
              </span>
              <Link
                href={`/pnl-2050/eixo/${codigo.toLowerCase()}`}
                className="text-ibi-blue text-sm font-semibold hover:underline underline-offset-2"
              >
                só {codigo} · {nivel}
              </Link>
            </li>
          ))}
        </ul>

        <h3 className="text-white font-bold mt-10 mb-2">{PNL_COPY.orfaos.matrizTitulo}</h3>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mb-4">{PNL_COPY.orfaos.matrizTexto}</p>
        <MatrizCobertura
          objetivos={base.objetivos.map(({ chave, categoria, enunciado }) => ({ chave, categoria, enunciado }))}
          eixos={eixosMatriz}
        />
      </section>

      {/* ── METODOLOGIA ── */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <Eyebrow>{PNL_COPY.metodologia.titulo}</Eyebrow>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PNL_COPY.metodologia.itens.map((item) => (
            <div key={item.rotulo}>
              <p className="text-white text-sm font-bold mb-1">{item.rotulo}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{item.texto}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-gray-500 text-xs leading-relaxed">
          Fonte: {base.fonte.titulo} — {base.fonte.orgao} ({base.fonte.data}). Base extraída em{" "}
          {base.gerado_em} · SHA-256 do PDF {base.fonte.sha256.slice(0, 12)}…
        </p>
        <Link
          href="/metodologia"
          className="mt-4 inline-block text-ibi-blue text-sm font-semibold hover:underline underline-offset-2"
        >
          Como o Observatório mede — metodologia completa →
        </Link>
      </section>
    </main>
  );
}
