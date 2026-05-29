import type { Metadata } from "next";
import GaugeCard from "@/components/GaugeCard";
import CotagramaChart from "@/components/CotagramaChart";
import DessincronizacaoGauge from "@/components/DessincronizacaoGauge";
import IDNGrafico90Dias from "@/components/IDNGrafico90Dias";
import ErrorBoundary from "@/components/ErrorBoundary";
import BannerDefasagem from "@/components/BannerDefasagem";
import AlertaManausIta from "@/components/AlertaManausIta";
import InsightsPanel from "@/components/InsightsPanel";
import SidebarNav from "@/components/SidebarNav";
import Tooltip from "@/components/Tooltip";
import { fetchPrevisao2026 } from "@/lib/fetch-dados";
import { obterDadosDiariosANA } from "@/lib/cache-ana-diario";
import AlertaOndaBranco from "@/components/AlertaOndaBranco";
import IRCWidget from "@/components/IRCWidget";
import IRCDuploWidget from "@/components/IRCDuploWidget";
import IRCInterativo from "@/components/IRCInterativo";
import { tokenAssinanteAtual, nomeClienteDoToken } from "@/lib/auth-assinante";
import { detectaOndaBranco } from "@/lib/onda-branco";
import { calculaIDNSimples, classificaIDN, descreveIntensidadeIDN } from "@/lib/calcula-idn";
import { projetaDataCruzamento17_7 } from "@/lib/recessao-modelo";
import { detectaFaseCiclo, calculaIRC } from "@/lib/irc";
import { calculaIRCTabocal, divergenciaIRC } from "@/lib/irc-tabocal";
import { projetaCruzamentoTabocal } from "@/lib/recessao-itacoatiara";
import { geraInsights } from "@/lib/gera-insights";
import { lerInsightsAI } from "@/lib/insights-ai-cache";
import { dashboardCopy } from "@/lib/dashboard-copy";
import { navigationCopy } from "@/lib/navigation-copy";
import { lerSerieIDN } from "@/lib/ana-idn-series";
import { RefreshCw, Waves } from "lucide-react";
import type { Estacao } from "@/lib/limiares";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: navigationCopy.pageMeta.monitor.title,
  description: navigationCopy.pageMeta.monitor.description,
  openGraph: {
    title: navigationCopy.pageMeta.monitor.ogTitle,
    description: navigationCopy.pageMeta.monitor.ogDescription,
  },
};

// SGC removido em mai/2026 — sem telemetria ANA viva.
const ESTACOES_ORDEM: Estacao[] = [
  // Negro / Norte
  "Manaus", "Curicuriari",
  // Solimões / central
  "Itacoatiara", "Manacapuru",
  // Madeira / Sul
  "PortoVelho", "Humaita", "Manicore",
  // Purus
  "Labrea",
];

export default async function MonitorPage() {
  // ANA: chamada 1x por dia, cache em disco (data/ana-diario-cache.json).
  // O cache "vira" à meia-noite de Manaus, não UTC. Detalhe e fallbacks em
  // lib/cache-ana-diario.ts.
  // Previsão 2026 é lida do cache SGB (fonte dinâmica) ou cai para hardcoded.
  const previsao = await fetchPrevisao2026();
  const serieIDN = lerSerieIDN();
  const diario = await obterDadosDiariosANA();
  let { dados } = diario;
  const { cotasIDN, vazoesIDN, serieCaracarai } = diario;
  if (Object.keys(dados).length === 0) {
    const { DADOS_ATUAIS } = await import("@/lib/dados-historicos");
    dados = { ...DADOS_ATUAIS };
  }
  // "Vivas" = estações cuja última leitura é de hoje (fuso da bacia).
  // Usa fuso da bacia (Manaus) — evita falso "dados estáticos" no Railway (UTC).
  const hojeBacia = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });
  const estacoesVivas = Object.values(dados).filter(
    (d) => d.ultima_atualizacao >= hojeBacia
  ).length;
  const fonteANA = estacoesVivas > 0;

  const ultimaAtualizacao = Object.values(dados)
    .map((d) => d.ultima_atualizacao)
    .sort().reverse()[0] ?? "—";

  const insights = geraInsights(dados);
  const criticos = insights.filter((i) => i.tipo === "critico").length;
  const insightsAICache = lerInsightsAI();

  // ─── IRC snapshot — IDN com todas as estações Norte+Sul (renormaliza se SGC faltar)
  // IMPORTANTE: usar APENAS cotasIDN (fetchCotasIDN, MA-7d) para o IDN.
  // NÃO injetar dados.SGC aqui — SGC não tem telemetria ANA; a última leitura
  // estática tem semanas de defasagem e produz pos_SGC absurda (ex: −3.10 em mai/26).
  // posicaoSubBacia() renormaliza automaticamente os pesos quando SGC está ausente.
  // Humaita, PortoVelho e Borba já estão em ESTACOES_IDN_COTA e chegam via cotasIDN.
  const cotasIDNCompletas: Record<string, number> = {};
  for (const [k, v] of Object.entries(cotasIDN)) cotasIDNCompletas[k] = v.cota_m;
  const dataIDN = Object.values(cotasIDN).map(v => v.ultima_atualizacao).sort().reverse()[0]
    ?? dados.Humaita?.ultima_atualizacao ?? new Date().toISOString().slice(0, 10);
  const idnAtual = Object.keys(cotasIDNCompletas).length > 0
    ? calculaIDNSimples(cotasIDNCompletas, dataIDN)
    : 0;
  const ondaBranco = serieCaracarai.length >= 8
    ? detectaOndaBranco(serieCaracarai, 7, idnAtual)   // v2: lag por regime
    : null;
  const cruzamento17_7 = projetaDataCruzamento17_7(
    previsao.manaus_pico_cheia.media,
    `${new Date().getUTCFullYear()}-06-15`,
  );
  const etaDiasCruz = cruzamento17_7.central
    ? Math.round(
        (new Date(cruzamento17_7.central).getTime() - Date.now()) / 86400000,
      )
    : null;
  const hojeISO = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });
  const ircSnapshot = {
    cotaManaus_m:        dados.Manaus?.cota_m ?? 0,
    idn:                 idnAtual,
    severidade_onda:     ondaBranco?.severidade ?? "nenhuma" as const,
    severidade_onda_continua: ondaBranco?.severidade_continua,
    var_onda_m:          ondaBranco?.var_total_m ?? 0,
    anomalia_pp:         previsao.anomalia_pp_negro,
    eta_dias_cruzamento: etaDiasCruz,
    fase_ciclo:          detectaFaseCiclo(hojeISO),
  };

  // ─── IRC-Tabocal v3 (ancorado em Itacoatiara) ─────────────────────────────
  const cruzTabocal = previsao.itacoatiara_pico
    ? projetaCruzamentoTabocal(previsao.itacoatiara_pico, `${new Date().getUTCFullYear()}-06-15`)
    : { central: null, min: null, max: null };
  const etaDiasTabocal = cruzTabocal.central
    ? Math.round((new Date(cruzTabocal.central).getTime() - Date.now()) / 86400000)
    : null;
  const ircTabocalSnap = {
    cotaItacoatiara_m:           dados.Itacoatiara?.cota_m ?? 0,
    cotaManaus_m:                dados.Manaus?.cota_m ?? 0,
    idn:                         idnAtual,
    severidade_onda:             ondaBranco?.severidade ?? "nenhuma" as const,
    severidade_onda_continua:    ondaBranco?.severidade_continua,
    var_onda_m:                  ondaBranco?.var_total_m ?? 0,
    anomalia_pp:                 previsao.anomalia_pp_negro,
    eta_dias_cruzamento_tabocal: etaDiasTabocal,
  };
  const rTabocal = calculaIRCTabocal(ircTabocalSnap);
  const rManaus  = calculaIRC(ircSnapshot);
  const divergencia = divergenciaIRC(rManaus.irc, rTabocal.irc);

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

      {/* ── BANNER DESSINCRONIZAÇÃO — condicional e calibrado pela posição histórica ── */}
      {classificaIDN(idnAtual).regime !== "Sincronizado" && (
        <div className={`border-b ${
          classificaIDN(idnAtual).regime === "Driver Norte"
            ? "bg-ouro/10 border-ouro/20"
            : "bg-vermelho/10 border-vermelho/20"
        }`}>
          <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-start gap-2">
            <span className={`text-xs shrink-0 font-bold ${
              classificaIDN(idnAtual).regime === "Driver Norte" ? "text-ouro" : "text-vermelho"
            }`}>IDN</span>
            <p className={`text-xs ${
              classificaIDN(idnAtual).regime === "Driver Norte" ? "text-ouro" : "text-vermelho"
            }`}>
              <strong>Dessincronização Norte-Sul:</strong>{" "}
              {descreveIntensidadeIDN(idnAtual)}
            </p>
          </div>
        </div>
      )}

      {/* ── LEAD ── */}
      <div className="bg-azul-medio/50 border-b border-white/5">
        <div className="max-w-screen-xl mx-auto px-4 py-5">
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </a>
            <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-1">
              {dashboardCopy.pageHeader.eyebrow}
            </p>
            <h1 className="text-white text-xl font-extrabold mb-1">
              {dashboardCopy.pageHeader.title}
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
              {dashboardCopy.pageHeader.lead}
            </p>

            {/* Status ANA / timestamp */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
              {/* Badge API ANA */}
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                fonteANA
                  ? "bg-verde/10 border-verde/30 text-verde"
                  : "bg-gray-800 border-gray-700 text-gray-500"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${fonteANA ? "bg-verde animate-pulse" : "bg-gray-600"}`} />
                {fonteANA
                  ? `API ANA · ${estacoesVivas}/${ESTACOES_ORDEM.length} ao vivo`
                  : "API ANA · dados estáticos"}
              </span>

              {/* Última atualização */}
              <span className="inline-flex items-center gap-1 text-gray-500 text-[11px]">
                <RefreshCw size={10} /> {ultimaAtualizacao}
              </span>
            </div>

            {/* Alerta Onda Branco — só renderiza se detector dispara */}
            <div className="mt-3">
              <AlertaOndaBranco serieCaracarai={serieCaracarai} />
            </div>

            {/* Banner de status dos dados */}
            <div className="mt-3">
              <BannerDefasagem
                ultimaAtualizacao={ultimaAtualizacao}
                fonteANA={fonteANA}
              />
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

      {/* ── NAV HORIZONTAL ── */}
      <SidebarNav />

      {/* ── CORPO: painéis ── */}
      <div className="max-w-screen-xl mx-auto px-4 py-8">

        {/* Painéis */}
        <main className="flex flex-col gap-16 min-w-0">

          {/* ── IRC v3.3 — Interativo (assinantes parametrizam calado-alvo) ── */}
          <section id="irc" className="scroll-mt-20">
            {await (async () => {
              const tokenAss = await tokenAssinanteAtual();
              return (
                <IRCInterativo
                  snapshotBase={ircTabocalSnap}
                  irc_manaus={rManaus.irc}
                  irc_manaus_faixa={rManaus.faixa}
                  isAssinante={tokenAss !== null}
                  nomeAssinante={nomeClienteDoToken(tokenAss)}

                />
              );
            })()}
          </section>

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

            </div>

            <p className="text-gray-600 text-xs mt-2">
              {fonteANA
                ? "Cotas via API ANA (cache 1×/dia, fuso Manaus). Deltas: dados IBI/mai·2026."
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
            <ErrorBoundary titulo="O índice de dessincronização">
              <DessincronizacaoGauge dados={dados} cotasIDN={cotasIDN} vazoesIDN={vazoesIDN} serieIDN={serieIDN.serie} />
            </ErrorBoundary>
            <div className="mt-6">
              <ErrorBoundary titulo="A trajetória recente do IDN">
                <IDNGrafico90Dias serieIDN={serieIDN.serie} />
              </ErrorBoundary>
            </div>
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
            <AlertaManausIta dados={dados} idn={idnAtual} previsao={previsao} />

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
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <p className="text-gray-500 text-xs">{previsao.fonte}</p>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    previsao.fonte_dinamica
                      ? "bg-verde/15 text-verde border border-verde/30"
                      : "bg-gray-800 text-gray-500 border border-gray-700"
                  }`}>
                    {previsao.fonte_dinamica ? "ao vivo" : "fallback"}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="bg-azul-marinho rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-0.5">
                      {dashboardCopy.panel5.forecast.items[0].label}
                    </p>
                    <p className="text-verde text-3xl font-extrabold tabular-nums">
                      {previsao.manaus_pico_cheia.media} m
                    </p>
                    <p className="text-gray-400 text-xs">
                      IC80: {previsao.manaus_pico_cheia.ic80_min}–{previsao.manaus_pico_cheia.ic80_max} m
                      &nbsp;·&nbsp; P(≥ 27,5 m) = {(previsao.manaus_pico_cheia.prob_27_5 * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-azul-marinho rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Pico Manacapuru</p>
                      <p className="text-white font-bold text-xl">{previsao.manacapuru_pico} m</p>
                    </div>
                    <div className="bg-azul-marinho rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Pico Itacoatiara</p>
                      <p className="text-white font-bold text-xl">{previsao.itacoatiara_pico} m</p>
                    </div>
                  </div>

                  <div className="bg-ouro/10 border border-ouro/30 rounded-lg p-3">
                    <p className="text-ouro text-xs font-semibold">
                      ENSO{previsao.enso_data_emissao ? (() => {
                        const m = previsao.enso_data_emissao.match(/^(\d{4})-(\d{2})-/);
                        if (!m) return "";
                        const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
                        return ` — ${meses[parseInt(m[2], 10) - 1]}/${m[1]}`;
                      })() : ""}
                    </p>
                    <p className="text-white text-sm">{previsao.enso}</p>
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

              <InsightsPanel
                dados={dados}
                insightsAI={insightsAICache?.insights}
                insightsAIGeradoEm={insightsAICache?.gerado_em}
              />
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
              dados primários oficiais (SGB/CPRM, ANA/SNIRH, NOAA/CPC). Análise da
              dessincronização Norte-Sul 2026 produzida em 07–08/mai/2026.
              API ANA descontinuada em 30/jun/2026 — migração para nova API SGB prevista.
            </p>
          </section>

        </main>
      </div>
    </>
  );
}
