import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LinhaEixo from "@/components/pnl2050/LinhaEixo";
import { basePNL, getEixo, ORDEM_NIVEL, type CategoriaObjetivo } from "@/lib/pnl2050/dados";
import { CATEGORIA_CURTA, MODAL_LABEL, NIVEL_CLASSE, TIPO_EIXO_LABEL } from "@/lib/pnl2050/copy";

export function generateStaticParams() {
  return basePNL().eixos.map((e) => ({ codigo: e.codigo.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const e = getEixo(codigo);
  if (!e) return { title: "Eixo não encontrado · PNL 2050" };
  return {
    title: `${e.codigo} · ${e.nome} · PNL 2050 | Observatório IBI`,
    description: `Eixo ${e.codigo} do PNL 2050: ${e.qtd_extraida} intervenções estruturantes e ${e.objetivos.length} objetivos de atuação atendidos.`,
  };
}

export default async function EixoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const base = basePNL();
  const e = getEixo(codigo, base);
  if (!e) notFound();

  const enunciado = new Map(base.objetivos.map((o) => [o.chave, o]));
  const porCategoria = new Map<CategoriaObjetivo, typeof e.objetivos>();
  for (const c of e.objetivos) {
    const cat = enunciado.get(c.chave)!.categoria;
    porCategoria.set(cat, [...(porCategoria.get(cat) ?? []), c]);
  }
  const categorias = (Object.keys(base.categorias) as CategoriaObjetivo[]).filter((c) => porCategoria.has(c));

  return (
    <main className="w-full max-w-screen-md mx-auto px-4 py-10 flex flex-col gap-10">
      <div>
        <Link
          href="/pnl-2050"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> PNL 2050
        </Link>
      </div>

      <header>
        <p className="text-ouro text-[11px] font-bold uppercase tracking-widest mb-2">
          {e.cenario === "banco" ? "Banco de projetos do PIT" : `Eixo ${TIPO_EIXO_LABEL[e.tipo].toLowerCase()}`} ·{" "}
          {e.codigo}
        </p>
        <h1 className="text-white text-3xl sm:text-4xl font-extrabold leading-tight mb-3">{e.nome}</h1>
        <p className="text-gray-400 text-sm">
          {e.qtd_extraida} intervenções estruturantes · {e.objetivos.length} objetivos atendidos · ficha na pág.{" "}
          {e.pagina_pdf} do PDF
          {e.qtd_extraida !== e.qtd_declarada &&
            ` · a ficha declara ${e.qtd_declarada}; as tabelas listam ${e.qtd_extraida}`}
        </p>
      </header>

      {e.cenario === "meta" && (
        <section>
          <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-3">Degrau de aderência</p>
          <LinhaEixo eixo={e} />
          <p className="mt-2 text-gray-500 text-xs">
            Degraus 1 a 6 em apuração. Sem evidência pública registrada não significa obra parada.
          </p>
        </section>
      )}

      <section>
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-3">
          Objetivos que o eixo atende
        </p>
        <div className="flex flex-col gap-5">
          {categorias.map((cat) => (
            <div key={cat}>
              <p className="text-gray-400 text-xs font-semibold mb-2">{CATEGORIA_CURTA[cat]}</p>
              <ul className="flex flex-col gap-1.5">
                {porCategoria
                  .get(cat)!
                  .sort((a, b) => ORDEM_NIVEL.indexOf(b.nivel) - ORDEM_NIVEL.indexOf(a.nivel))
                  .map((c) => (
                    <li key={c.chave} className="flex items-start gap-3 text-sm">
                      <span
                        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold text-white ${NIVEL_CLASSE[c.nivel]}`}
                      >
                        {c.nivel}
                      </span>
                      <span className="text-gray-200 leading-snug">{c.descricao}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-3">Intervenções estruturantes</p>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-azul-medio text-left text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Intervenção</th>
                <th className="px-3 py-2 font-semibold">Modo</th>
                <th className="px-3 py-2 font-semibold">IDs do PNL</th>
                <th className="px-3 py-2 font-semibold">Degrau</th>
              </tr>
            </thead>
            <tbody>
              {e.intervencoes.map((iv) => (
                <tr key={iv.nome} className="border-t border-white/5 align-top">
                  <td className="px-3 py-2 text-gray-200">
                    {iv.nome}
                    <span className="block text-gray-500 text-xs">
                      {iv.jurisdicao}
                      {iv.empreendimentos.some((x) => x.detalhe) &&
                        " · " +
                          iv.empreendimentos
                            .map((x) => x.detalhe)
                            .filter(Boolean)
                            .join(" · ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{MODAL_LABEL[iv.modal]}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-400">
                    {iv.empreendimentos.map((x) => x.id).join(", ")}
                  </td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">0 · No PNL</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-gray-500 text-xs leading-relaxed">
        Fonte: {base.fonte.titulo} — {base.fonte.orgao} ({base.fonte.data}), ficha do eixo {e.codigo}. Níveis de
        contribuição como declarados na ficha.
      </p>
    </main>
  );
}
