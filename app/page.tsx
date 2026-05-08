import GaugeCard from "@/components/GaugeCard";
import CotagramaChart from "@/components/CotagramaChart";
import DessincronizacaoGauge from "@/components/DessincronizacaoGauge";
import LagTimeline2024 from "@/components/LagTimeline2024";
import AlertaLWS from "@/components/AlertaLWS";
import InsightsPanel from "@/components/InsightsPanel";
import Tooltip from "@/components/Tooltip";
import LogoIBI, { LogoFPPA } from "@/components/LogoIBI";
import { PREVISAO_2026 } from "@/lib/dados-historicos";
import { fetchTodasEstacoes, fetchUltimoBoletimSEMA, aplicarBoletimSEMA } from "@/lib/fetch-dados";
import { geraInsights } from "@/lib/gera-insights";
import { RefreshCw, Waves } from "lucide-react";
import type { Estacao } from "@/lib/limiares";
import type { DadosEstacao } from "@/lib/dados-historicos";

export const revalidate = 21600;

const ESTACOES_ORDEM: Estacao[] = [
  "Manaus", "Itacoatiara", "Curicuriari", "Humaita",
  "Manacapuru", "PortoVelho", "Borba",
];

export default async function Home() {
  // Dados reais + fallback
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

  // Insights para o banner
  const insights = geraInsights(dados);
  const criticos = insights.filter((i) => i.tipo === "critico").length;

  return (
    <div className="min-h-screen bg-azul-marinho">

      {/* ── HEADER ── */}
      <header className="bg-azul-medio border-b border-white/10 sticky top-0 z-50 shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          {/* Logos */}
          <div className="flex items-center gap-4">
            <LogoIBI className="h-8 w-auto" />
            <div className="hidden sm:block w-px h-8 bg-white/10" />
            <LogoFPPA className="hidden sm:block h-7 w-auto" />
          </div>

          {/* Título central — oculto em mobile */}
          <div className="hidden lg:block text-center">
            <p className="text-white text-xs font-semibold leading-tight">
              Monitor Hidrológico — Bacia do Amazonas
            </p>
            <p className="text-gray-500 text-xs">
              Dessincronização Norte-Sul 2026 · Alertas LWS/ANTAQ
            </p>
          </div>

          {/* Controles direita */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Fonte dos dados */}
            <div className="hidden md:flex items-center gap-3 text-xs">
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

          </div>
        </div>
      </header>

      {/* ── BANNER DE ALERTA ANALÍTICO ── */}
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

      {/* ── BANNER INFORMATIVO DA DESSINCRONIZAÇÃO ── */}
      <div className="bg-ouro/10 border-b border-ouro/20">
        <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-start gap-2">
          <span className="text-ouro text-xs shrink-0 font-bold">2026</span>
          <p className="text-ouro text-xs">
            <strong>Dessincronização Norte-Sul sem precedente:</strong> Negro alto (Curicuriari) 927 cm abaixo de 2024;
            Madeira (Humaitá) 679 cm acima. IDN atual: +0,58 — padrão Driver Norte.{" "}
          </p>
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto px-4 py-6 flex flex-col gap-8">

        {/* ── PAINEL 1: RÉGUAS ATUAIS ── */}
        <section>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
            <h2 className="text-white font-bold text-xl">Réguas Atuais</h2>
            <span className="text-gray-400 text-sm">Posição relativa na faixa histórica P10–P90</span>
            <Tooltip
              conteudo="Cards com a cota atual de cada estação, sua posição relativa entre o P10 (mínimo histórico) e P90 (máximo), variação nas últimas 24h e comparativo com 2025 e 2024."
              posicao="bottom"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ESTACOES_ORDEM.map((estacao) => (
              <GaugeCard
                key={estacao}
                estacao={estacao}
                dados={dados[estacao]}
              />
            ))}
            {/* Snapshot analítico 17/mar/2026 */}
            <div className="bg-azul-medio rounded-lg p-4 border border-ouro/30 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-ouro font-bold text-sm uppercase tracking-wide">
                  Snapshot 17/mar/2026
                </h3>
                <Tooltip
                  conteudo="Dados do 11° Boletim SAH — SGB/CPRM, data de máxima dessincronização entre as bacias Norte (Negro alto) e Sul (Madeira)."
                  posicao="bottom"
                />
              </div>
              <p className="text-gray-400 text-xs">Pico de dessincronização 2026:</p>
              {[
                { nome: "SGC — Negro alto",  delta: "−927 vs 2024", cor: "text-vermelho" },
                { nome: "Porto Velho",        delta: "+679 vs 2024", cor: "text-verde"   },
                { nome: "Manaus",             delta: "+520 vs 2024", cor: "text-verde"   },
                { nome: "Itacoatiara",        delta: "+253 vs 2024", cor: "text-verde"   },
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
            <a href="/api/insights" target="_blank" rel="noopener" className="text-verde hover:underline">
              JSON de insights →
            </a>
          </p>
        </section>

        {/* ── PAINEL 2: MONITOR DE DESSINCRONIZAÇÃO ── */}
        <section>
          <DessincronizacaoGauge dados={dados} />
        </section>

        {/* ── PAINEL 5: ALERTA LWS ── */}
        <section>
          <AlertaLWS dados={dados} />
        </section>

        {/* ── PAINEL 3: COMPARAÇÃO HISTÓRICA ── */}
        <section>
          <CotagramaChart />
        </section>

        {/* ── PAINEL 4: LAG DE 22 DIAS ── */}
        <section>
          <LagTimeline2024 />
        </section>

        {/* ── PAINEL 6: PREVISÃO + INSIGHTS ── */}
        <section className="grid md:grid-cols-2 gap-5">

          {/* Previsão SGB */}
          <div className="bg-azul-medio rounded-lg p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <h2 className="text-white font-bold text-lg">Previsão 2026</h2>
              <Tooltip
                conteudo="Previsão do Sistema de Geração de Cenários Hidrológicos — SGB/CPRM. Atualizado toda terça-feira."
                posicao="bottom"
              />
            </div>
            <p className="text-gray-500 text-xs mb-4">
              SGB/CPRM — 18° Boletim SAH Amazonas · 05/mai/2026
            </p>
            <div className="space-y-3">
              <div className="bg-azul-marinho rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-0.5">Pico de cheia — Manaus</p>
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
                  Mínima estiagem Itacoatiara 2026
                  <Tooltip conteudo="Projeção do SGB considerando o El Niño emergente e o padrão Driver Norte de 2026. Em 2024 (Driver Sul) a mínima foi −0,17 m." posicao="top" />
                </p>
                <p className="text-white font-bold">4,10 – 5,15 m</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Muito acima de 2024 (−0,17 m). Driver Norte atenua a estiagem em Itacoatiara.
                </p>
              </div>
            </div>
          </div>

          <InsightsPanel dados={dados} />
        </section>

        {/* ── GLOSSÁRIO ── */}
        <section className="bg-azul-medio rounded-lg p-5">
          <h2 className="text-white font-bold text-base mb-4">Glossário</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs">
            {[
              ["P10 / P90",    "Percentis 10° e 90° da série histórica diária. Delimitam a 'faixa normal' de variação de cada estação."],
              ["IDN",          "Índice de Dessincronização Norte-Sul = posição relativa de Curicuriari − posição relativa de Humaitá. Varia de −1 a +1."],
              ["LWS",          "Low Water Season — protocolo da ANTAQ que impõe restrições de calado quando Manaus fica abaixo de 17,7 m."],
              ["Gatilho LWS",  "Cota de referência: Manaus ≥ 17,7 m → ANTAQ suspende restrições. Marcador laranja na barra de posição."],
              ["Tabocal",      "Ponto de controle operacional da calha navegável do Amazonas, próximo a Itacoatiara."],
              ["Driver Norte", "Regime em que o Negro alto (Curicuriari/SGC) é a bacia mais depleted. Padrão dominante em 2026."],
              ["Driver Sul",   "Regime em que o Madeira (Humaitá) é a bacia mais depleted. Padrão dominante em 2024."],
              ["Lag 22 dias",  "Defasagem observada em out/2024 entre a mínima de Manaus (09/out) e a de Itacoatiara (31/out). Evidencia insuficiência do parâmetro ANTAQ."],
              ["IC80",         "Intervalo de confiança de 80% da previsão do SGB/CPRM."],
              ["SAH",          "Sistema de Acompanhamento Hidrológico — boletins semanais do SGB/CPRM."],
            ].map(([termo, def]) => (
              <div key={termo} className="flex gap-2">
                <span className="text-verde font-bold shrink-0 w-28 leading-relaxed">{termo}</span>
                <span className="text-gray-400 leading-relaxed">{def}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CONTEXTO METODOLÓGICO ── */}
        <section className="bg-azul-medio/50 rounded-lg p-5 text-xs text-gray-500">
          <p className="font-semibold text-gray-400 mb-1">Sobre este dashboard</p>
          <p className="leading-relaxed">
            Desenvolvido pelo Observatório de Infraestrutura de Transportes do IBI com base em dados primários
            oficiais (SEMA-AM, SGB/CPRM, ANA/SNIRH, NOAA/CPC). Análise da dessincronização Norte-Sul 2026
            e do lag de 22 dias de 2024 produzida em 07–08/mai/2026.
            API ANA descontinuada em 30/jun/2026 — migração para nova API SGB prevista.
          </p>
          <div className="flex flex-wrap gap-4 mt-2 text-gray-600">
            <a href="/api/ana?estacao=Manaus" target="_blank" rel="noopener" className="hover:text-gray-400">API ANA →</a>
            <a href="/api/insights" target="_blank" rel="noopener" className="hover:text-gray-400">API Insights →</a>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-600 text-xs pb-6">
          <div className="flex items-center gap-3">
            <LogoIBI className="h-6 w-auto opacity-40" />
          </div>
          <div className="text-center sm:text-right">
            <p>Observatório de Infraestrutura de Transportes · IBI · mai/2026</p>
            <p className="mt-0.5">Fontes: SEMA-AM · SGB/CPRM · ANA/SNIRH · NOAA/CPC</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
