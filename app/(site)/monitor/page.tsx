import type { Metadata } from "next";
import GaugeCard from "@/components/GaugeCard";
import CotagramaChart from "@/components/CotagramaChart";
import DessincronizacaoGauge from "@/components/DessincronizacaoGauge";
import AlertaManausIta from "@/components/AlertaManausIta";
import InsightsPanel from "@/components/InsightsPanel";
import SidebarNav from "@/components/SidebarNav";
import Tooltip from "@/components/Tooltip";
import { PREVISAO_2026 } from "@/lib/dados-historicos";
import { fetchTodasEstacoes, fetchUltimoBoletimSEMA, aplicarBoletimSEMA } from "@/lib/fetch-dados";
import { geraInsights } from "@/lib/gera-insights";
import { dashboardCopy } from "@/lib/dashboard-copy";
import { navigationCopy } from "@/lib/navigation-copy";
import { RefreshCw, Waves } from "lucide-react";
import type { Estacao } from "@/lib/limiares";
import type { DadosEstacao } from "@/lib/dados-historicos";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: navigationCopy.pageMeta.monitor.title,
  description: navigationCopy.pageMeta.monitor.description,
  openGraph: {
    title: navigationCopy.pageMeta.monitor.ogTitle,
    description: navigationCopy.pageMeta.monitor.ogDescription,
  },
};

const ESTACOES_ORDEM: Estacao[] = [
  "Manaus", "Itacoatiara", "Curicuriari", "Humaita",
  "Manacapuru", "PortoVelho", "Borba",
];

export default async function MonitorPage() {
  let dados: Record<string, DadosEstacao>;
  let fonteANA = false;
  let fonteSEMA = false;
  let boletimSEMA: Awaited<ReturnType<typeof fetchUltimoBoletimSEMA>> = null;

  try {
    dados = await fetchTodasEstacoes();
    fonteANA = Object.values(dados).some(
      (d) => d.ultima_atualizacao >= new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
    );
  } catch {
    const { DADOS_ATUAIS } = await import("@/lib/dados-historicos");
    dados = { ...DADOS_ATUAIS };
  }

  boletimSEMA = await fetchUltimoBoletimSEMA();
  if (boletimSEMA) {
    dados = aplicarBoletimSEMA(dados, boletimSEMA);
    fonteSEMA = true;
  }

  const ultimaAtualizacao = Object.values(dados)
    .map((d) => d.ultima_atualizacao)
    .sort().reverse()[0] ?? "—";

  const insights = geraInsights(dados);
  const criticos = insights.filter((i) => i.tipo === "critico").length;

  return (
    <>
      {/* ── BANNER ALERTA CRÍTICO ── */}
      {criticos > 0 && (
        <div className="bg-vermelho/10 border-b border-vermelho/30">
          <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-start gap-2">
            <Waves size={15} className="text-vermelho mt-0.5 shrink-0" />
            <p className="text-vermelho text-xs">
              <strong>{criticos} alerta{criticos > 1 ? "s" : ""} crítico{criticos > 1 ? "s" : ""}:</strong>{" "}
              {insights.filter((i) => i.tipo === "critico").map((i) => i.titulo).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* ── BANNER DESSINCRONIZAÇÃO ── */}
      <div className="bg-ouro/10 border-b border-ouro/20">
        <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-start gap-2">
          <span className="text-ouro text-xs shrink-0 font-bold">2026</span>
          <p className="text-ouro text-xs">
            <strong>Dessincronização Norte-Sul sem precedente:</strong> Negro alto (Curicuriari) 927 cm
            abaixo de 2024; Madeira (Humaitá) 679 cm acima. IDN atual: +0,58 — padrão Driver Norte.
          </p>
        </div>
      </div>

      {/* ── LEAD ── */}
      <div className="bg-azul-medio/50 border-b border-white/5">
        <div className="max-w-screen-xl mx-auto px-4 py-5 lg:grid lg:grid-cols-[220px_1fr] lg:gap-x-10">
          <div className="hidden lg:block" />
          <div>
            <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-1">
              {dashboardCopy.pageHeader.eyebrow}
            </p>
            <h1 className="text-white text-xl font-extrabold mb-1">
              {dashboardCopy.pageHeader.title}
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
              {dashboardCopy.pageHeader.lead}
            </p>

            {/* Status ANA / SEMA / timestamp */}
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className={`flex items-center gap-1.5 ${fonteANA ? "text-verde" : "text-gray-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${fonteANA ? "bg-verde animate-pulse" : "bg-gray-600"}`} />
                ANA
              </span>
              <span className={`flex items-center gap-1.5 ${fonteSEMA ? "text-verde" : "text-gray-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${fonteSEMA ? "bg-verde" : "bg-gray-600"}`} />
                SEMA
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <RefreshCw size={10} /> {ultimaAtualizacao}
              </span>
            </div>

            {/* Como ler */}
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              {dashboardCopy.howToRead.items.map((item) => (
                <div key={item.label} className="bg-azul-medio rounded-lg p-3 border border-white/5">
                  <p className="font-semibold text-white text-xs mb-0.5">
                    {item.marker} {item.label}
                  </p>
                  <p className="text-verde text-[10px] font-medium mb-1">{item.stations}</p>
                  <p className="text-gray-500 text-[11px] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CORPO: sidebar + painéis ── */}
      <div className="max-w-screen-xl mx-auto px-4 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-x-10">

        {/* Sidebar sticky — altura usa h-14 (56px) do GlobalHeader */}
        <aside className="hidden lg:block">
          <div className="sticky top-14 pt-2 h-[calc(100vh-56px)] overflow-y-auto pb-10 pr-2">
            <SidebarNav />
          </div>
        </aside>

        {/* Painéis */}
        <main className="flex flex-col gap-16 min-w-0">

          {/* ── PAINEL 1: RÉGUAS ATUAIS ── */}
          <section id="reguas-atuais" className="scroll-mt-20">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
              <h2 className="text-white font-bold text-lg">{dashboardCopy.panel1.title}</h2>
              <span className="text-gray-400 text-sm">{dashboardCopy.panel1.subtitle}</span>
              <Tooltip
                conteudo={dashboardCopy.panel1.tooltips.relativePosition}
                posicao="bottom"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ESTACOES_ORDEM.map((estacao) => (
                <GaugeCard key={estacao} estacao={estacao} dados={dados[estacao]} />
              ))}

              {/* Snapshot analítico 17/mar/2026 */}
              <div className="bg-azul-medio rounded-lg p-4 border border-ouro/30 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-ouro font-bold text-sm uppercase tracking-wide">
                    {dashboardCopy.panel1.snapshotCard.title}
                  </h3>
                  <Tooltip
                    conteudo="Dados do 11° Boletim SAH — SGB/CPRM, data de máxima dessincronização entre as bacias Norte (Negro alto) e Sul (Madeira)."
                    posicao="bottom"
                  />
                </div>
                <p className="text-gray-400 text-xs">
                  {dashboardCopy.panel1.snapshotCard.description}
                </p>
                {[
                  { nome: "SGC — Negro alto",   delta: "−927 vs 2024", cor: "text-vermelho" },
                  { nome: "Porto Velho",         delta: "+679 vs 2024", cor: "text-verde"   },
                  { nome: "Manaus",              delta: "+520 vs 2024", cor: "text-verde"   },
                  { nome: "Itacoatiara",         delta: "+253 vs 2024", cor: "text-verde"   },
                ].map((e) => (
                  <div key={e.nome} className="flex justify-between text-xs">
                    <span className="text-gray-400">{e.nome}</span>
                    <span className={`${e.cor} font-semibold`}>{e.delta}</span>
                  </div>
                ))}
                <p className="text-gray-600 text-xs mt-auto">Fonte: SGB/CPRM, 11° Boletim SAH</p>
              </div>
            </div>

            <p className="text-gray-600 text-xs mt-2">
              {fonteSEMA
                ? `Cotas do Boletim SEMA-AM (${boletimSEMA?.data}).`
                : fonteANA
                ? "Cotas via API ANA (cache 6h). Deltas: dados IBI/mai·2026."
                : "Dados estáticos IBI/mai·2026."
              }{" "}
              {dashboardCopy.panel1.sources}
            </p>
          </section>

          {/* ── PAINEL 2: ÍNDICE DESSINCRONIZAÇÃO ── */}
          <section id="indice-dessincronizacao" className="scroll-mt-20">
            <div className="mb-3">
              <h2 className="text-white font-bold text-lg">{dashboardCopy.panel2.title}</h2>
              <p className="text-gray-400 text-sm mt-0.5 max-w-2xl">{dashboardCopy.panel2.subtitle}</p>
            </div>
            <DessincronizacaoGauge dados={dados} />
            <p className="text-gray-500 text-xs mt-3 max-w-2xl">
              {dashboardCopy.panel2.interpretation}
            </p>
          </section>

          {/* ── PAINEL 3: MANAUS × ITACOATIARA ── */}
          <section id="manaus-itacoatiara" className="scroll-mt-20">
            <div className="mb-3">
              <h2 className="text-white font-bold text-lg">{dashboardCopy.panel3.title}</h2>
              <p className="text-gray-400 text-sm mt-0.5 max-w-2xl">{dashboardCopy.panel3.subtitle}</p>
            </div>
            <AlertaManausIta dados={dados} />

            {/* Cross-link → /caso-2024 */}
            <div className="mt-3 bg-azul-medio/50 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-gray-400 text-xs font-semibold">
                  {navigationCopy.crossLinks.monitorToCase.eyebrow}
                </p>
                <p className="text-white text-sm font-semibold mt-0.5">
                  {navigationCopy.crossLinks.monitorToCase.title}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {navigationCopy.crossLinks.monitorToCase.caption}
                </p>
              </div>
              <a
                href={navigationCopy.crossLinks.monitorToCase.href}
                className="text-verde text-xs font-semibold whitespace-nowrap hover:underline"
              >
                {navigationCopy.crossLinks.monitorToCase.cta}
              </a>
            </div>
          </section>

          {/* ── PAINEL 4: COTAGRAMAS ── */}
          <section id="cotagramas" className="scroll-mt-20">
            <div className="mb-3">
              <h2 className="text-white font-bold text-lg">{dashboardCopy.panel4.title}</h2>
              <p className="text-gray-400 text-sm mt-0.5 max-w-2xl">{dashboardCopy.panel4.subtitle}</p>
            </div>
            <CotagramaChart />
          </section>

          {/* ── PAINEL 5: PREVISÃO + ALERTAS ── */}
          <section id="previsao-alertas" className="scroll-mt-20">
            <div className="mb-3">
              <h2 className="text-white font-bold text-lg">
                {dashboardCopy.panel5.forecast.title}
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">
                {dashboardCopy.panel5.forecast.subtitle}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-azul-medio rounded-lg p-5">
                <p className="text-gray-500 text-xs mb-4">
                  SGB/CPRM — 18° Boletim SAH Amazonas · 05/mai/2026
                </p>
                <div className="space-y-3">
                  <div className="bg-azul-marinho rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-0.5">
                      {dashboardCopy.panel5.forecast.items[0].label}
                    </p>
                    <p className="text-verde text-3xl font-extrabold tabular-nums">
                      {PREVISAO_2026.manaus_pico_cheia.media} m
                    </p>
                    <p className="text-gray-400 text-xs">
                      IC80: {PREVISAO_2026.manaus_pico_cheia.ic80_min}–{PREVISAO_2026.manaus_pico_cheia.ic80_max} m
                      &nbsp;·&nbsp; P(≥ 27,5 m) = {(PREVISAO_2026.manaus_pico_cheia.prob_27_5 * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-azul-marinho rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Pico Manacapuru</p>
                      <p className="text-white font-bold text-xl">{PREVISAO_2026.manacapuru_pico} m</p>
                    </div>
                    <div className="bg-azul-marinho rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Pico Itacoatiara</p>
                      <p className="text-white font-bold text-xl">{PREVISAO_2026.itacoatiara_pico} m</p>
                    </div>
                  </div>

                  <div className="bg-ouro/10 border border-ouro/30 rounded-lg p-3">
                    <p className="text-ouro text-xs font-semibold">ENSO — mai/2026</p>
                    <p className="text-white text-sm">{PREVISAO_2026.enso}</p>
                  </div>

                  <div className="bg-azul-marinho rounded-lg p-3">
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      {dashboardCopy.panel5.forecast.items[1].label}
                      <Tooltip
                        conteudo={dashboardCopy.panel5.forecast.items[1].context}
                        posicao="top"
                      />
                    </p>
                    <p className="text-white font-bold">4,10 – 5,15 m</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Muito acima de 2024 (−0,17 m). Driver Norte atenua a estiagem em Itacoatiara.
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 text-xs mt-3">{dashboardCopy.panel5.forecast.source}</p>
              </div>

              <InsightsPanel dados={dados} />
            </div>
          </section>

          {/* ── FAQ ── */}
          <section id="faq" className="scroll-mt-20">
            <h2 className="text-white font-bold text-xl mb-5">{dashboardCopy.faq.title}</h2>
            <div className="space-y-4">
              {dashboardCopy.faq.items.map((item) => (
                <details
                  key={item.q}
                  className="bg-azul-medio rounded-lg border border-white/5 group"
                >
                  <summary className="px-5 py-4 cursor-pointer text-sm font-semibold text-white list-none flex justify-between items-center gap-4 hover:text-verde transition-colors">
                    {item.q}
                    <span className="text-gray-500 group-open:rotate-180 transition-transform shrink-0">▾</span>
                  </summary>
                  <p className="px-5 pb-4 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-3">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* ── GLOSSÁRIO ── */}
          <section id="glossario" className="scroll-mt-20 bg-azul-medio rounded-lg p-5">
            <h2 className="text-white font-bold text-base mb-4">{dashboardCopy.glossary.title}</h2>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
              {dashboardCopy.glossary.items.map(({ term, definition }) => (
                <div key={term} className="flex gap-2">
                  <span className="text-verde font-bold shrink-0 w-40 leading-relaxed">{term}</span>
                  <span className="text-gray-400 leading-relaxed">{definition}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── SOBRE ESTE MONITOR ── */}
          <section className="bg-azul-medio/50 rounded-lg p-5 text-xs text-gray-500">
            <p className="font-semibold text-gray-400 mb-1">Sobre este monitor</p>
            <p className="leading-relaxed">
              Desenvolvido pelo Observatório de Infraestrutura de Transportes do IBI com base em
              dados primários oficiais (SEMA-AM, SGB/CPRM, ANA/SNIRH, NOAA/CPC). Análise da
              dessincronização Norte-Sul 2026 produzida em 07–08/mai/2026.
              API ANA descontinuada em 30/jun/2026 — migração para nova API SGB prevista.
            </p>
            <div className="flex flex-wrap gap-4 mt-2 text-gray-600">
              <a href="/api/ana?estacao=Manaus" target="_blank" rel="noopener" className="hover:text-gray-400">
                API ANA →
              </a>
              <a href="/api/insights" target="_blank" rel="noopener" className="hover:text-gray-400">
                API Insights →
              </a>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
