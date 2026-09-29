// /metodologia — o "registro do banco central" do Observatório.
//
// Página pública e estática (Server Component). Explica o que entra e o que NÃO
// entra no Relógio, o critério de elegibilidade, o uso do PISO (conservador), o
// princípio de conversão (estudo público → fluxo, sem estimativa primária) e como
// ler o selo de proveniência. Sem número novo aqui — só doutrina.

import type { Metadata } from "next";
import Link from "next/link";
import SeloProveniencia from "@/components/SeloProveniencia";

export const metadata: Metadata = {
  title: "Metodologia — como o Observatório mede | Observatório IBI",
  description:
    "O que entra e o que não entra no Relógio da Infraestrutura, o critério de elegibilidade, o uso do piso conservador e o princípio de converter estudo público em fluxo — sem produzir estimativa primária.",
  openGraph: {
    title: "Metodologia — como o Observatório mede | Observatório IBI",
    description:
      "O registro do Observatório: o que entra no Relógio, como lemos o selo de proveniência e por que usamos sempre o piso do intervalo.",
    type: "article",
  },
};

// Seção de texto simples — título + parágrafos.
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-white">{titulo}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-gray-400">
        {children}
      </div>
    </section>
  );
}

export default function MetodologiaPage() {
  return (
    <main className="flex-1 bg-azul-marinho">
      <div className="container mx-auto max-w-[860px] px-6 py-12 sm:py-16">
        <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ibi-blue">
          Observatório IBI · Metodologia
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
          Como o Observatório mede
        </h1>
        <p className="mt-4 text-base leading-relaxed text-gray-400">
          Este é o registro do Observatório: a doutrina de medição por trás do
          Relógio da Infraestrutura e do Livro-Razão. O tom é deliberadamente
          contido — preferimos subestimar a exagerar, e declarar o que ainda não
          medimos a preencher a lacuna com suposição.
        </p>

        <Secao titulo="O princípio: converter estudo público em fluxo">
          <p>
            O Observatório <strong className="text-gray-200">não produz estimativa
            primária</strong>. Não modelamos o custo de um projeto por conta
            própria: transportamos o que fontes públicas já publicaram e o
            convertemos em um fluxo contínuo (reais por segundo), para que um
            número estático de relatório vire uma grandeza viva e comparável.
          </p>
          <p>
            Em uma frase: <em className="text-gray-300">convertemos estudo público
            em fluxo, não produzimos estimativa primária</em>. Toda a autoridade do
            número vem da fonte de origem — nunca de um cálculo nosso sem lastro.
          </p>
        </Secao>

        <Secao titulo="O que entra no Relógio">
          <p>
            Entram <strong className="text-gray-200">custos recorrentes e
            evitáveis</strong>, medidos a partir de dados públicos consolidados do
            setor e convertidos em taxa contínua. Cada componente tem página
            própria, com fonte e metodologia abertas, e soma um a um no total
            nacional. Módulo que não declara taxa e fonte fica de fora — sem
            exceção.
          </p>
        </Secao>

        <Secao titulo="O que NÃO entra">
          <p>
            Ficam de fora <strong className="text-gray-200">antecipação e
            risco</strong> — probabilidades, prazos projetados, alertas de
            descasamento. Enquanto o prejuízo não se materializa em despesa
            medida, ele contextualiza o Relógio, mas não entra no placar.
            Antecipação não é custo corrente.
          </p>
          <p>
            Também fica de fora qualquer estimativa sem base pública consolidada.
            Nenhum componente é criado para engordar o número.
          </p>
        </Secao>

        <Secao titulo="Critério de elegibilidade">
          <p>Um módulo só entra na soma quando cumpre, cumulativamente:</p>
          <ul className="mt-1 flex flex-col gap-2">
            {[
              "Fonte pública identificada e apontável (órgão, estudo, ano).",
              "Valor anual auditável de ponta a ponta — da fonte ao número exibido.",
              "Metodologia publicada na própria página do módulo.",
            ].map((item) => (
              <li
                key={item}
                className="rounded-lg border border-white/10 bg-azul-medio px-4 py-3 text-gray-300"
              >
                {item}
              </li>
            ))}
          </ul>
        </Secao>

        <Secao titulo="Por que usamos o PISO do intervalo">
          <p>
            Estudos costumam publicar um intervalo (piso–teto) para o custo. O
            Relógio e as fichas do Livro-Razão contam sempre pelo{" "}
            <strong className="text-gray-200">piso</strong> — o extremo
            conservador. O teto aparece apenas como faixa de contexto, nunca na
            soma. É uma escolha de credibilidade: se erramos, erramos para baixo.
          </p>
        </Secao>

        <Secao titulo="Como ler o selo de proveniência">
          <p>
            Todo número carrega um selo que diz de onde ele vem. São dois tipos:
          </p>
          <div className="mt-2 flex flex-col gap-3">
            <div className="rounded-lg border border-white/10 bg-azul-medio p-4">
              <SeloProveniencia tipo="oficial" fonte="Fonte oficial — órgão público, estudo ou base primária" />
              <p className="mt-2 text-gray-400">
                O valor vem direto de uma fonte oficial, sem transformação nossa
                além da conversão em fluxo.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-azul-medio p-4">
              <SeloProveniencia tipo="estimativa-ibi" fonte="Estimativa do Observatório IBI a partir de dado público" />
              <p className="mt-2 text-gray-400">
                O Observatório compôs o número a partir de dados públicos
                (ex.: somar módulos, ou converter um custo anual em taxa). A base é
                pública; a composição é nossa e está descrita na página do módulo.
              </p>
            </div>
          </div>
        </Secao>

        <Secao titulo="O Livro-Razão e a regra da ficha em validação">
          <p>
            Cada ficha de projeto nasce{" "}
            <strong className="text-gray-200">em validação</strong>: sem número e
            fora da soma nacional. Só passa a <strong className="text-gray-200">
            ativa</strong> quando tem CAPEX e custo diário de inação validados
            ponta a ponta, com fonte e URL pública. Métricas como o múltiplo de
            urgência são sempre <em className="text-gray-300">derivadas</em> na
            hora, nunca gravadas — o que um teste automatizado verifica a cada
            build.
          </p>
        </Secao>

        <div className="mt-14 flex flex-wrap gap-6 border-t border-white/10 pt-8">
          <Link
            href="/relogio"
            className="text-sm font-semibold text-gray-300 transition-colors hover:text-white"
          >
            ← Relógio da Infraestrutura
          </Link>
          <Link
            href="/livro-razao"
            className="text-sm font-semibold text-gray-300 transition-colors hover:text-white"
          >
            ← Livro-Razão
          </Link>
        </div>
      </div>
    </main>
  );
}
