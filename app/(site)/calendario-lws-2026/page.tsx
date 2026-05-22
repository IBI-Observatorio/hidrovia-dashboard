// Rota dedicada — projeção forward do ciclo 2026 da descida de Manaus.
// Separada do /monitor (que é descritivo/atual) e do /calendario-severidade
// (que é histórico). Aqui é PURAMENTE FORWARD.

import type { Metadata } from "next";
import { fetchPrevisao2026 } from "@/lib/fetch-dados";
import { geraCalendarioLWS, formataDataCurta } from "@/lib/calendario-lws";
import CalendarioLWS2026 from "@/components/CalendarioLWS2026";
import { navigationCopy } from "@/lib/navigation-copy";

export const revalidate = 21600; // 6h

export const metadata: Metadata = {
  title:       navigationCopy.pageMeta.calendarioLws2026.title,
  description: navigationCopy.pageMeta.calendarioLws2026.description,
  openGraph: {
    title:       navigationCopy.pageMeta.calendarioLws2026.ogTitle,
    description: navigationCopy.pageMeta.calendarioLws2026.ogDescription,
  },
};

export default async function CalendarioLWSPage() {
  const previsao = await fetchPrevisao2026();
  const calendario = geraCalendarioLWS(previsao, 2026);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-10">
      {/* ── Lead ── */}
      <div className="max-w-3xl mb-8">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2">
          Projeção 2026 · Modelo IBI
        </p>
        <h1 className="text-white text-3xl font-extrabold mb-3 leading-tight">
          Calendário LWS 2026
        </h1>
        <p className="text-gray-300 text-base leading-relaxed mb-3">
          Quando o gatilho regulatório da ANTAQ (17,7m em Manaus) será acionado na
          descida do ciclo hidrológico 2026? Esta projeção combina a previsão de
          pico do SGB/CPRM com o modelo de recessão pós-pico calibrado em dados
          históricos de Manaus (2016–2023).
        </p>
        <p className="text-gray-500 text-sm leading-relaxed">
          O cruzamento de 17,7m abre a janela do <em>Low Water Surcharge</em> e tem
          impacto direto no calado operacional do canal de Tabocal (Itacoatiara).
          A banda IC80 cobre cenários de descida rápida e lenta a partir da
          variabilidade interanual observada em 8 anos de série completa.
        </p>
      </div>

      {/* ── Calendário ── */}
      <CalendarioLWS2026 calendario={calendario} />

      {/* ── Box de leitura rápida ── */}
      <div className="mt-8 bg-azul-medio rounded-lg p-5 border border-white/10 max-w-3xl">
        <h2 className="text-white font-bold text-base mb-3">Como ler este calendário</h2>
        <div className="space-y-2 text-gray-300 text-sm leading-relaxed">
          <p>
            <strong className="text-verde">Anel verde</strong> marca o pico de cheia
            previsto pelo SGB ({calendario.pico_cota_m.toFixed(2)} m, ~
            {formataDataCurta(calendario.pico_data)}).
          </p>
          <p>
            <strong className="text-white">Anel branco</strong> marca a data central
            de cruzamento do gatilho LWS (17,7m). Banda IC80 sombreada cobre o
            intervalo entre {formataDataCurta(calendario.data_cruzamento_pessimista)}
            {" "}(cenário rápido) e {formataDataCurta(calendario.data_cruzamento_otimista)}
            {" "}(cenário lento).
          </p>
          <p className="text-gray-500 text-[13px] mt-3">
            Após o cruzamento (células vermelhas), Manaus passa abaixo do parâmetro
            ANTAQ — mas, como documentado em <a href="/caso-2024" className="text-verde hover:underline">2024</a>,
            o Tabocal pode continuar caindo por semanas adicionais, gerando defasagem
            entre o que a régua de Manaus indica e a realidade operacional rio abaixo.
          </p>
        </div>
      </div>

      {/* ── Sobre o modelo ── */}
      <div className="mt-6 bg-azul-medio/50 rounded-lg p-5 text-xs text-gray-500 max-w-3xl">
        <p className="font-semibold text-gray-400 mb-1">Sobre o modelo de recessão</p>
        <p className="leading-relaxed">
          Modelo exponencial <code className="text-gray-300">h(t) = h_min + (h_pico - h_min) · exp(−k·t)</code>{" "}
          calibrado por mínimos quadrados em escala logarítmica sobre 8 anos completos
          de série histórica de Manaus (2016–2023). Parâmetros agregados: k = 0,0183 ± 0,0027 (1/d),
          h_min médio = 16,82 m. RMSE médio ~2,6 m em janela de 184 dias — adequado
          para projeção de DATA de cruzamento, sub-ótimo para reconstrução fidedigna
          da forma da curva. Recalibração via <code>scripts/calibra-recessao.mjs</code>.
        </p>
      </div>
    </div>
  );
}
