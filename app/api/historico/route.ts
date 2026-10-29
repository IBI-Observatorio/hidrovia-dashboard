import { NextRequest } from "next/server";
import { serieHistorica } from "@/lib/historico-series";

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const estacao = searchParams.get("estacao") ?? "Manaus";
  const anosStr = searchParams.get("anos") ?? "2024,2025,2026";
  const anos = new Set(anosStr.split(",").map(Number).filter(Boolean));
  const resultado = serieHistorica(estacao, anos);

  return Response.json(resultado, {
    headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate" },
  });
}
