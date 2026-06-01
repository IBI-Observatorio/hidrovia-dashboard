// Rota /relatorio-antaq — peça institucional para análise regulatória.
//
// Estrutura:
//   1. Lead institucional
//   2. Tese do lag 2024 (LagTimeline2024 reusado)
//   3. Projeção do ciclo 2026 (Calendário LWS)
//   4. IRC histórico (gráfico + tabela de eventos âncora)
//   5. Metodologia
//   6. Conclusão regulatória
//
// Tom: sóbrio, técnico, otimizado para impressão (PDF via Ctrl+P).

import type { Metadata } from "next";
import LagTimeline2024 from "@/components/LagTimeline2024";
import IRCHistoricoChart from "@/components/IRCHistoricoChart";
import BackLink from "@/components/BackLink";
import { fetchPrevisao2026 } from "@/lib/fetch-dados";
import { projetaDataCruzamento17_7 } from "@/lib/recessao-modelo";
import { IRC_HISTORICO_RESUMO, IRC_HISTORICO_CALCULADO } from "@/lib/irc-historico-calculado";
import { navigationCopy } from "@/lib/navigation-copy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: navigationCopy.pageMeta.relatorioAntaq.title,
  description: navigationCopy.pageMeta.relatorioAntaq.description,
  openGraph: {
    title: navigationCopy.pageMeta.relatorioAntaq.ogTitle,
    description: navigationCopy.pageMeta.relatorioAntaq.ogDescription,
  },
};

function formataData(iso: string | null): string {
  if (!iso) return "—";
  const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const [a, m, d] = iso.split("-");
  return `${d}/${meses[parseInt(m, 10) - 1] ?? "?"}/${a}`;
}

export default async function RelatorioANTAQPage() {
  const previsao = await fetchPrevisao2026();
  const ano = new Date().getUTCFullYear();
  const cruz = projetaDataCruzamento17_7(previsao.manaus_pico_cheia.media, `${ano}-06-15`);

  // 4 eventos âncora retroativos com IRC histórico
  const eventos = [
    { rotulo: "Mega-seca 2024",       data: "2024-10-15", contexto: "Manaus cruzou 17,7m em 10/set; Itacoatiara só atingiu mínima em 31/out (22d depois)" },
    { rotulo: "Cheia 2025",           data: "2025-05-15", contexto: "Pico Manaus em ~28m; sistema saudável, sem dessincronização" },
    { rotulo: "Dessinc Norte 2026",   data: "2026-03-17", contexto: "SGC em 6,20m (colapso histórico); IDN +0,52 (Driver Norte)" },
    { rotulo: "Boletim SGB 20°",      data: "2026-05-19", contexto: "Rio Branco +2,5m em 7d em Caracaraí — onda chega Manaus em jun" },
  ];

  const eventosComIRC = eventos.map((e) => {
    const ponto = IRC_HISTORICO_CALCULADO.find((p) => p.data === e.data) ||
                  IRC_HISTORICO_CALCULADO.reduce((best, p) =>
                    Math.abs(new Date(p.data).getTime() - new Date(e.data).getTime()) <
                    Math.abs(new Date(best.data).getTime() - new Date(e.data).getTime()) ? p : best,
                    IRC_HISTORICO_CALCULADO[0]);
    return { ...e, irc: ponto?.irc ?? null, faixa: ponto?.faixa ?? "—" };
  });

  return (
    <article className="max-w-screen-md mx-auto px-4 py-10 print:py-2 prose-invert">
      <div className="print:hidden mb-4">
        <BackLink />
      </div>
      {/* ── Cabeçalho institucional ── */}
      <header className="border-b border-white/10 pb-6 mb-8">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2">
          Observatório IBI · Infraestrutura de Transportes
        </p>
        <h1 className="text-white text-3xl md:text-4xl font-extrabold mb-3 leading-tight">
          Relatório de Risco ANTAQ — Bacia do Amazonas
        </h1>
        <p className="text-gray-400 text-sm">
          Documento técnico para análise regulatória do parâmetro LWS/ANTAQ aplicado à
          navegação na bacia do Amazonas. Sustentado pelo IRC (Índice de Risco de Calado)
          e pelo modelo próprio de recessão do Observatório IBI.
        </p>
        <p className="text-gray-500 text-xs mt-3">
          Edição corrente: maio/{ano} · {previsao.fonte}
        </p>
      </header>

      {/* ── 1. Resumo executivo ── */}
      <section className="mb-10">
        <h2 className="text-white text-xl font-bold mb-3">1. Resumo executivo</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          O parâmetro regulatório LWS aplicado pela ANTAQ utiliza como referência a cota
          de 17,7m na estação de Manaus. Esta referência foi calibrada num contexto
          hidrológico onde Manaus servia como proxy razoável da condição operacional
          de toda a bacia. O ciclo de 2024 demonstrou empiricamente que essa premissa
          falha: Manaus atingiu a mínima em 09/out/2024, mas Itacoatiara — ponto de
          controle real do canal de Tabocal — continuou caindo por mais{" "}
          <strong className="text-white">22 dias</strong>, atingindo a mínima histórica
          de −0,17m apenas em 31/out/2024.
        </p>
        <p className="text-gray-300 text-sm leading-relaxed">
          Este relatório (1) documenta a defasagem 2024, (2) projeta o ciclo {ano} com
          banda de incerteza, e (3) propõe o IRC como métrica complementar ao gatilho
          de 17,7m, incorporando dessincronização Norte–Sul e sinais antecipados de
          subida atípica em afluentes.
        </p>
      </section>

      {/* ── 2. Tese do lag 2024 ── */}
      <section className="mb-10 page-break-inside-avoid">
        <h2 className="text-white text-xl font-bold mb-3">2. A defasagem de 22 dias — ciclo 2024</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          A timeline abaixo mostra a evolução das cotas em Manaus e em Itacoatiara
          durante a estiagem de 2024. Quando o parâmetro ANTAQ (17,7m em Manaus)
          sinalizou normalização, o Tabocal ainda impunha restrições crescentes de
          calado.
        </p>
        <LagTimeline2024 />
      </section>

      {/* ── 3. Projeção do ciclo corrente ── */}
      <section className="mb-10 page-break-inside-avoid">
        <h2 className="text-white text-xl font-bold mb-3">3. Projeção do ciclo {ano}</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Aplicando o modelo de recessão calibrado em dados históricos de Manaus
          (2016–2023, k = 0,018 ± 15%) sobre o pico previsto pelo SGB para {ano} de{" "}
          <strong className="text-white">{previsao.manaus_pico_cheia.media.toFixed(2)} m</strong>{" "}
          (IC80: {previsao.manaus_pico_cheia.ic80_min}–{previsao.manaus_pico_cheia.ic80_max} m),
          o cruzamento esperado do gatilho regulatório de 17,7m na descida ocorre em{" "}
          torno de{" "}
          <strong className="text-vermelho">{formataData(cruz.central)}</strong>.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-azul-medio rounded p-3 border border-vermelho/30">
            <p className="text-vermelho text-[10px] uppercase tracking-wider font-bold mb-0.5">
              ETA central
            </p>
            <p className="text-white font-bold">{formataData(cruz.central)}</p>
          </div>
          <div className="bg-azul-medio rounded p-3 border border-ouro/30">
            <p className="text-ouro text-[10px] uppercase tracking-wider font-bold mb-0.5">
              Banda precoce
            </p>
            <p className="text-white font-bold">{formataData(cruz.max)}</p>
          </div>
          <div className="bg-azul-medio rounded p-3 border border-verde/30">
            <p className="text-verde text-[10px] uppercase tracking-wider font-bold mb-0.5">
              Banda tardia
            </p>
            <p className="text-white font-bold">{formataData(cruz.min)}</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">
          Considerando a referência empírica do lag de 22 dias observado em 2024, a
          janela crítica para o calado em Itacoatiara/Tabocal pode se estender até{" "}
          <strong className="text-white">22-30 dias após</strong> a data central
          projetada acima — i.e., entre {formataData(cruz.central)} e final de{" "}
          {cruz.central ? new Date(new Date(cruz.central).getTime() + 30*86400000).toISOString().slice(5,7) === "01" ? "janeiro" : "novembro/dezembro" : "—"} de {ano}.
        </p>
      </section>

      {/* ── 4. IRC histórico ── */}
      <section className="mb-10 page-break-inside-avoid">
        <h2 className="text-white text-xl font-bold mb-3">
          4. IRC — Índice de Risco de Calado · histórico 2016-2025
        </h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          O IRC é um score 0–100 que sintetiza o risco operacional para a navegação
          na bacia. Combina (a) distância projetada ao gatilho 17,7m, (b) probabilidade
          HMM de regime extremo Norte/Sul em 7 dias, (c) severidade da Onda Branco
          (subidas atípicas em Caracaraí) e (d) anomalia de precipitação 30 dias.
          A série histórica abaixo mostra o comportamento do índice em uma década
          de dados consolidados.
        </p>

        <IRCHistoricoChart />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="bg-azul-medio rounded p-2">
            <p className="text-gray-400 text-[10px]">IRC médio</p>
            <p className="text-white font-bold text-lg">{IRC_HISTORICO_RESUMO.irc_medio}</p>
          </div>
          <div className="bg-azul-medio rounded p-2">
            <p className="text-gray-400 text-[10px]">IRC máximo</p>
            <p className="text-vermelho font-bold text-lg">{IRC_HISTORICO_RESUMO.irc_max}</p>
          </div>
          <div className="bg-azul-medio rounded p-2">
            <p className="text-gray-400 text-[10px]">Dias em laranja</p>
            <p className="text-orange-500 font-bold text-lg">{IRC_HISTORICO_RESUMO.distribuicao.laranja}</p>
          </div>
          <div className="bg-azul-medio rounded p-2">
            <p className="text-gray-400 text-[10px]">Dias em vermelho</p>
            <p className="text-vermelho font-bold text-lg">{IRC_HISTORICO_RESUMO.distribuicao.vermelho}</p>
          </div>
        </div>

        <h3 className="text-white font-bold text-base mt-6 mb-2">Eventos âncora retroativos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="text-left py-2 px-1 font-semibold">Evento</th>
                <th className="text-left py-2 px-1 font-semibold">Data</th>
                <th className="text-right py-2 px-1 font-semibold">IRC</th>
                <th className="text-left py-2 px-1 font-semibold">Faixa</th>
                <th className="text-left py-2 px-1 font-semibold">Contexto</th>
              </tr>
            </thead>
            <tbody>
              {eventosComIRC.map((e) => (
                <tr key={e.data} className="border-b border-white/5">
                  <td className="py-2 px-1 text-white">{e.rotulo}</td>
                  <td className="py-2 px-1 text-gray-300">{e.data}</td>
                  <td className="py-2 px-1 text-right font-bold tabular-nums text-white">{e.irc?.toFixed(0) ?? "—"}</td>
                  <td className="py-2 px-1 text-gray-300">{e.faixa}</td>
                  <td className="py-2 px-1 text-gray-400 max-w-md">{e.contexto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. Metodologia ── */}
      <section className="mb-10 page-break-inside-avoid">
        <h2 className="text-white text-xl font-bold mb-3">5. Metodologia</h2>
        <h3 className="text-white font-bold text-base mt-3 mb-1">5.1 Modelo de recessão</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          Exponencial decrescente <code className="text-gray-300 bg-azul-medio px-1.5 py-0.5 rounded">h(t) = h_min + (h_pico − h_min) · exp(−k·t)</code>{" "}
          ajustada por mínimos quadrados em escala logarítmica sobre 8 anos completos
          de série de Manaus (2016–2023). Parâmetros agregados: k = 0,0183 ± 0,0027 (1/d),
          h_min médio = 16,82 m. Banda IC80 propagada por cenários k ± 1,28σ
          combinados com h_min ± σ.
        </p>
        <h3 className="text-white font-bold text-base mt-4 mb-1">5.2 IDN e HMM</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          O Índice de Dessincronização Norte–Sul (IDN) é um agregado ponderado das
          posições relativas das estações do Negro alto (SGC, Curicuriari, Serrinha,
          Moura, Caracaraí) versus Madeira/Purus (Porto Velho, Humaitá, Manicoré,
          Borba, Lábrea, Abuná). Limiares de regime calibrados via GMM-3 sobre 2916
          dias (2016–2023); transições entre regimes modeladas por HMM gaussiano K=3
          com matrizes de transição em 7d e 30d.
        </p>
        <h3 className="text-white font-bold text-base mt-4 mb-1">5.3 Fórmula do IRC</h3>
        <pre className="text-xs bg-azul-medio p-3 rounded border border-white/10 overflow-x-auto">
{`IRC = 0.40 × LWS + 0.25 × HMM_extremo + 0.20 × Onda_Branco + 0.15 × Anomalia_PP

LWS         = distância ao gatilho 17,7m (0..100+, atual ou projetado pelo modelo de recessão)
HMM_extremo = P(estado Sul ou Norte em 7d | estado atual) × 100
Onda_Branco = severidade discreta da subida 7d em Caracaraí (nenhuma=0, alta=65, extrema=100)
Anomalia_PP = |anomalia categorizada de precipitação 30d| / 3 × 100

Faixa: 0-25 verde · 25-50 amarelo · 50-75 laranja · 75-100 vermelho`}
        </pre>
      </section>

      {/* ── 6. Conclusão ── */}
      <section className="mb-8 page-break-inside-avoid">
        <h2 className="text-white text-xl font-bold mb-3">6. Conclusão regulatória</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          O parâmetro LWS atual (17,7m em Manaus) é um excelente indicador de baixa
          em condições onde toda a bacia opera de forma sincronizada. Em ciclos de
          dessincronização Norte–Sul — fenômeno cuja frequência tende a aumentar
          sob cenário de El Niño emergente segundo CPC/NOAA — ele se torna um
          indicador atrasado da realidade operacional rio abaixo.
        </p>
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          O Observatório IBI propõe a adoção do IRC como métrica complementar para
          análise regulatória. Suas vantagens: (a) incorpora antecipadamente
          sinais upstream (Caracaraí, sub-bacia do Branco), (b) considera o estado
          do regime via HMM probabilístico, (c) projeta a janela LWS com banda de
          incerteza calibrada em dados históricos, e (d) entrega um único score
          rastreável e auditável.
        </p>
        <p className="text-gray-300 text-sm leading-relaxed">
          O monitor em tempo real, com o IRC atualizado, está disponível em{" "}
          <a href="/monitor" className="text-verde hover:underline">/monitor</a>.
          A projeção do ciclo {ano} em forma de calendário visual em{" "}
          <a href="/calendario-lws-2026" className="text-verde hover:underline">/calendario-lws-2026</a>.
        </p>
      </section>

      {/* ── Rodapé institucional ── */}
      <footer className="border-t border-white/10 pt-4 text-xs text-gray-500">
        <p>
          Observatório IBI — Infraestrutura de Transportes · Instituto Brasileiro de Infraestrutura.
          Dados: ANA HidroWebService, SGB/CPRM, CPC/NOAA. Metodologia auditável via repositório
          público. Versão impressa: Ctrl+P.
        </p>
      </footer>

      {/* CSS para impressão */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          .page-break-inside-avoid { break-inside: avoid; }
        }
      ` }} />
    </article>
  );
}
