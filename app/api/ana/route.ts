import { NextRequest, NextResponse } from "next/server";
import { ultimasLeituras, resumeLeituras, ESTACOES, type EstacaoKey } from "@/lib/ana-client";

// GET /api/ana?estacao=Manaus&dias=2
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const estacao = searchParams.get("estacao") as EstacaoKey | null;
  const dias    = parseInt(searchParams.get("dias") ?? "2", 10);

  if (!estacao || !(estacao in ESTACOES)) {
    return NextResponse.json(
      { erro: `Estação inválida. Válidas: ${Object.keys(ESTACOES).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const leituras = await ultimasLeituras(estacao, Math.min(dias, 7));
    const resumo   = resumeLeituras(leituras);

    return NextResponse.json(
      { estacao, leituras, resumo },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ANA proxy] ${estacao}:`, msg);
    return NextResponse.json(
      { erro: msg, estacao },
      { status: 502 }
    );
  }
}
