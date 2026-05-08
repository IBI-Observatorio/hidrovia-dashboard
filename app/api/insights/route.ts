import { NextResponse } from "next/server";
import { fetchTodasEstacoes, fetchUltimoBoletimSEMA, aplicarBoletimSEMA } from "@/lib/fetch-dados";
import { geraInsights } from "@/lib/gera-insights";

// GET /api/insights
// Retorna os insights analíticos atuais em JSON — útil para integrações externas,
// alertas automatizados e monitoramento via script.
export const revalidate = 21600; // cache 6h

export async function GET() {
  try {
    let dados = await fetchTodasEstacoes();
    const boletim = await fetchUltimoBoletimSEMA();
    if (boletim) dados = aplicarBoletimSEMA(dados, boletim);

    const insights = geraInsights(dados);

    // Resumo executivo das estações
    const resumo = Object.fromEntries(
      Object.entries(dados).map(([k, d]) => [
        k,
        {
          cota_m:             d.cota_m,
          variacao_24h_cm:    d.variacao_24h,
          delta_2025_cm:      d.delta_2025,
          ultima_atualizacao: d.ultima_atualizacao,
        },
      ])
    );

    return NextResponse.json(
      {
        gerado_em:    new Date().toISOString(),
        fonte_sema:   !!boletim,
        data_sema:    boletim?.data ?? null,
        total_insights: insights.length,
        criticos:     insights.filter((i) => i.tipo === "critico").length,
        insights,
        estacoes:     resumo,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
