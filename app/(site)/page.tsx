import type { Metadata } from "next";
import { Plane } from "lucide-react";
import SubscribeForm from "@/components/home/SubscribeForm";
import AnticipationRibbon from "@/components/home/AnticipationRibbon";
import DynamicMetricCard from "@/components/home/DynamicMetricCard";
import PredictiveDraftCard from "@/components/home/PredictiveDraftCard";
import StudyCard from "@/components/home/StudyCard";
import {
  portoCard,
  portoModos,
  navegacaoCard,
  navegacaoModos,
  hidrologiaCard,
  aereoCard,
  estudos,
} from "@/lib/home-content";
import { computeHidrologiaDashboard } from "@/lib/compute-hidrologia";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Observatório IBI — Dados de infraestrutura de transportes",
  description:
    "Movimentação portuária, navegação, hidrovias e aviação lidas como sinais antecedentes. Indicadores próprios, dados oficiais e leitura para decisão. Mantido pelo Instituto Brasileiro de Infraestrutura (IBI).",
  openGraph: {
    title: "Observatório IBI — Dados de infraestrutura de transportes",
    description:
      "O número que o setor espera todo mês, com a leitura do que ele significa.",
  },
};

export default function HomePage() {
  const hidrologia = computeHidrologiaDashboard();

  return (
    <main>
      {/* ───────────── RIBBON ───────────── */}
      <section className="mx-auto max-w-screen-xl px-6 py-8">
        <AnticipationRibbon />
      </section>

      {/* ───────────── 4 CARDS ───────────── */}
      <section className="mx-auto max-w-screen-xl px-6 pb-20">
        <div className="mb-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ibi-blue">
            Painéis ao vivo
          </p>
          <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Quatro verticais. Um observatório.
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-gray-400">
            Porto, Navegação, Hidrologia e Aviação — cada card é uma janela para a base oficial com a leitura do IBI.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Porto */}
          <DynamicMetricCard
            tag={portoCard.tag}
            acento={portoCard.acento}
            periodo={portoCard.periodo}
            unidade={portoCard.unidade}
            modos={portoModos}
            insight={portoCard.insight}
            href={portoCard.href}
            hrefDados={portoCard.hrefDados}
            ilustrativo={false}
          />

          {/* Navegação */}
          <DynamicMetricCard
            tag={navegacaoCard.tag}
            acento={navegacaoCard.acento}
            periodo={navegacaoCard.periodo}
            unidade={navegacaoCard.unidade}
            modos={navegacaoModos}
            insight={navegacaoCard.insight}
            href={navegacaoCard.href}
            ilustrativo={false}
          />

          {/* Hidrologia — dados reais via compute-hidrologia */}
          <PredictiveDraftCard
            tag={hidrologiaCard.tag}
            periodo={hidrologiaCard.periodo}
            limiarM={hidrologiaCard.limiarM}
            diasParaLimiar={hidrologia.diasParaLimiar}
            dataLimiar={hidrologia.dataLimiar}
            janelaIC80={hidrologia.janelaIC80}
            caladoAtualM={hidrologia.cmrAtual_m}
            irc={hidrologia.irc}
            ircFaixa={hidrologia.ircFaixa}
            gaugePct={hidrologia.irc}
            insight={hidrologia.insight}
            href={hidrologiaCard.href}
            ilustrativo={false}
          />

          {/* Aéreo */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-azul-medio p-7 opacity-70">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-gray-600" />
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-gray-500" />
                <span className="text-sm font-bold uppercase tracking-[0.1em]">{aereoCard.tag}</span>
              </div>
              <div className="text-right text-[0.66rem] uppercase leading-[1.4] tracking-[0.04em] text-gray-500">
                {aereoCard.periodo.split(" · ").map((p, i, arr) => (
                  <span key={i}>{p}{i < arr.length - 1 && <br />}</span>
                ))}
              </div>
            </div>

            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-white/[0.06]">
              <Plane className="h-6 w-6 text-gray-500" strokeWidth={1.8} />
            </div>

            <h3 className="mt-4 text-[1.1rem] font-bold text-gray-300">{aereoCard.titulo}</h3>
            <p className="mt-1.5 text-[0.82rem] text-gray-500">{aereoCard.teaser}</p>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <span className="mt-0.5 shrink-0 rounded border border-gray-600 px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.1em] text-gray-500">
                Em breve
              </span>
              <p
                className="text-[0.84rem] leading-[1.45] text-gray-500 [&_b]:font-semibold [&_b]:text-gray-400"
                dangerouslySetInnerHTML={{ __html: aereoCard.insight }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* ───────────── ESTUDOS ───────────── */}
      <section className="mx-auto max-w-screen-xl px-6 py-20">
        <div className="mb-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-verde">
            Indicadores originais
          </p>
          <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Análises que ninguém mais publica.
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-gray-400">
            Construídos sobre a Estatística Aquaviária da ANTAQ e a base hidrológica da ANA — do antecedente do PIB ao risco de calado.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {estudos.map((e) => (
            <StudyCard key={e.titulo} estudo={e} />
          ))}
        </div>
      </section>

      {/* ───────────── CAPTURA ───────────── */}
      <section id="receber" className="mx-auto max-w-screen-xl px-6 py-20">
        <div
          className="overflow-hidden rounded-3xl border border-white/10 px-8 py-14 text-center"
          style={{
            background: "linear-gradient(120deg,rgba(0,153,216,.1),rgba(0,166,82,.08))",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ibi-blue">Boletim mensal</p>
          <h2 className="mx-auto mt-3 max-w-[620px] text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Receba a movimentação portuária assim que sair.
          </h2>
          <p className="mx-auto mt-4 mb-7 max-w-[480px] leading-relaxed text-gray-400">
            Todo mês, o número oficial da ANTAQ com a leitura do IBI — direto no seu e-mail, antes de você precisar procurar.
          </p>
          <SubscribeForm />
          <p className="mt-4 text-xs text-gray-500">Sem spam. Só dados e análise. Cancele quando quiser.</p>
        </div>
      </section>
    </main>
  );
}
