// /agro/metodologia — como o IEE é calculado.
// Página estática (Server Component). Copy em lib/agro-copy.ts; pesos
// exibidos direto de lib/iee-params.ts (parâmetros declarados, não cálculo).

import type { Metadata } from "next";
import Link from "next/link";
import { agroCopy } from "@/lib/agro-copy";
import {
  COMPONENTES_POR_CORREDOR,
  PESOS_IEE,
  FAIXAS_IEE,
  type ComponenteIEE,
  type Corredor,
} from "@/lib/iee-params";
import preRegistro from "@/data/agro/pre-registro-iee-v4.json";

export const metadata: Metadata = {
  title: agroCopy.pageMeta.metodologia.title,
  description: agroCopy.pageMeta.metodologia.description,
  openGraph: {
    title: agroCopy.pageMeta.metodologia.ogTitle,
    description: agroCopy.pageMeta.metodologia.ogDescription,
  },
};

const CORREDORES: Corredor[] = ["santos", "paranagua", "arco-norte"];
const COMPONENTES: ComponenteIEE[] = ["F", "T", "S", "H"];

// classes estáticas por token (Tailwind não resolve classe dinâmica)
const TOKEN_TEXTO: Record<string, string> = {
  "ibi-green": "text-ibi-green",
  "ibi-blue": "text-ibi-blue",
  ouro: "text-ouro",
  vermelho: "text-vermelho",
};

function fmtPeso(p: number | undefined) {
  return p === undefined ? "—" : p.toFixed(2).replace(".", ",");
}

export default function MetodologiaPage() {
  const m = agroCopy.metodologia;

  return (
    <main className="flex-1 bg-azul-marinho">
      <div className="container mx-auto max-w-[860px] px-6 py-12 sm:py-16">
        <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ibi-blue">
          {m.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">{m.titulo}</h1>
        <p className="mt-4 text-base leading-relaxed text-gray-400">{m.intro}</p>

        {/* Definição formal */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.definicao.titulo}</h2>
          <div className="mt-4 rounded-2xl border border-white/10 bg-azul-medio p-6 text-center">
            <span className="bg-gradient-to-r from-ibi-green to-ibi-blue bg-clip-text text-3xl font-black tracking-wide text-transparent">
              {m.secoes.definicao.formula}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">{m.secoes.definicao.texto}</p>
        </section>

        {/* Normalização */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.normalizacao.titulo}</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.normalizacao.texto}</p>
          <p className="mt-3 rounded-lg border border-ouro/30 bg-ouro/10 p-3.5 text-sm leading-relaxed text-gray-300">
            {m.secoes.normalizacao.fallback}
          </p>
        </section>

        {/* Pesos v0 */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.pesos.titulo}</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.pesos.texto}</p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="bg-azul-medio text-left">
                  <th className="px-4 py-3 font-bold text-white">{m.secoes.pesos.colCorredor}</th>
                  {COMPONENTES.map((c) => (
                    <th key={c} className="px-4 py-3 font-bold text-white">
                      {c} · {agroCopy.breakdown.componentes[c].nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CORREDORES.map((cor) => (
                  <tr key={cor} className="border-t border-white/10">
                    <td className="px-4 py-3 font-semibold text-gray-300">
                      {agroCopy.corredores[cor].nome}
                    </td>
                    {COMPONENTES.map((c) => (
                      <td key={c} className="px-4 py-3 tabular-nums text-gray-400">
                        {COMPONENTES_POR_CORREDOR[cor].includes(c)
                          ? fmtPeso(PESOS_IEE[cor][c])
                          : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-[0.75rem] text-gray-500">{m.secoes.pesos.nota}</p>
        </section>

        {/* Faixas */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.faixas.titulo}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FAIXAS_IEE.map((f) => (
              <div key={f.label} className="rounded-xl border border-white/10 bg-azul-medio px-4 py-3">
                <span className={`font-bold ${TOKEN_TEXTO[f.token]}`}>{f.label}</span>
                <span className="ml-2 text-sm tabular-nums text-gray-500">
                  {f.min}–{f.max}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Plano de calibração */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.calibracao.titulo}</h2>
          <ol className="mt-4 space-y-3">
            {m.secoes.calibracao.itens.map((item, i) => (
              <li key={i} className="flex gap-3.5 rounded-xl border border-white/10 bg-azul-medio p-4 text-sm leading-relaxed text-gray-300">
                <span className="font-black text-ibi-green">{i + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </section>

        {/* IEE+3 = cenários */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.cenarios.titulo}</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.cenarios.texto}</p>
        </section>

        {/* Componente S — dado real */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.componenteS.titulo}</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.componenteS.texto}</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.componenteS.proxy}</p>
          <p className="mt-3 rounded-lg border border-ibi-green/30 bg-ibi-green/10 p-3.5 text-sm leading-relaxed text-gray-300">
            {m.secoes.componenteS.fonte}
          </p>
        </section>

        {/* Componente T — custo modelado */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.componenteT.titulo}</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.componenteT.texto}</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.componenteT.coeficientes}</p>
          <p className="mt-3 rounded-lg border border-ibi-blue/30 bg-ibi-blue/10 p-3.5 text-sm leading-relaxed text-gray-300">
            {m.secoes.componenteT.validacao}
          </p>
        </section>

        {/* Componente H — hidrologia Tabocal */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.componenteH.titulo}</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.componenteH.texto}</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.componenteH.engine}</p>
          <p className="mt-3 rounded-lg border border-ouro/30 bg-ouro/10 p-3.5 text-sm leading-relaxed text-gray-300">
            {m.secoes.componenteH.pesos}
          </p>
        </section>

        {/* Pré-registro v0 (PASSO 8) */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.preRegistro.titulo}</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.preRegistro.intro}</p>
          <p className="mt-3 inline-block rounded-md border border-ibi-blue/30 bg-ibi-blue/10 px-3 py-1.5 font-mono text-[0.72rem] text-ibi-blue">
            {m.preRegistro.labelHash}: sha256 {preRegistro.hashParametros.slice(0, 16)}… · {m.preRegistro.labelCongelado} {preRegistro.congeladoEm.split("-").reverse().join("/")}
          </p>

          <h3 className="mt-6 text-base font-bold text-white">{m.preRegistro.compromissosTitulo}</h3>
          <ol className="mt-3 space-y-2.5">
            {preRegistro.compromissos.map((item, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-white/10 bg-azul-medio p-3.5 text-[0.83rem] leading-relaxed text-gray-300">
                <span className="font-black text-ibi-green">{i + 1}</span>
                {item}
              </li>
            ))}
          </ol>

          <h3 className="mt-6 text-base font-bold text-white">{m.preRegistro.episodiosTitulo}</h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[560px] text-[0.8rem]">
              <tbody>
                {preRegistro.episodiosAncora.map((e) => (
                  <tr key={e.id} className="border-t border-white/10 first:border-t-0">
                    <td className="px-4 py-2.5 font-semibold text-gray-300">{e.id}</td>
                    <td className="px-4 py-2.5 text-gray-500">{e.janela}</td>
                    <td className="px-4 py-2.5 text-gray-400">{e.criterio}</td>
                    <td className="px-4 py-2.5 text-gray-500">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.72rem] text-gray-500">{m.preRegistro.verVereditos}</p>

          <h3 className="mt-6 text-base font-bold text-white">{m.preRegistro.lacunasTitulo}</h3>
          <ul className="mt-3 space-y-1.5">
            {preRegistro.lacunasConhecidas.map((item, i) => (
              <li key={i} className="text-[0.83rem] leading-relaxed text-gray-400">— {item}</li>
            ))}
          </ul>

          <h3 className="mt-6 text-base font-bold text-white">{m.preRegistro.invalidaTitulo}</h3>
          <ul className="mt-3 space-y-1.5">
            {preRegistro.invalidaPublicacao.map((item, i) => (
              <li key={i} className="rounded-lg border border-vermelho/30 bg-vermelho/10 px-3.5 py-2 text-[0.83rem] leading-relaxed text-gray-300">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Estado dos dados */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">{m.secoes.dados.titulo}</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{m.secoes.dados.texto}</p>
        </section>

        <div className="mt-14 border-t border-white/10 pt-8">
          <Link
            href={m.voltarHref}
            className="group relative inline-block text-sm font-semibold text-gray-300 transition-colors hover:text-white"
          >
            {m.voltarCta}
            <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gradient-to-r from-ibi-green to-ibi-blue transition-all duration-300 group-hover:w-full" />
          </Link>
        </div>
      </div>
    </main>
  );
}
