// Rota on-demand do Calendário de Severidade Hidrológica.
//
// Monta o JSON na hora, via lib/severity-calendar-engine.mjs (mesmo cálculo do job mensal):
//   • CSVs históricos  → process.cwd()/data/*_hidroweb.csv   (assets do build)
//   • percentis        → process.cwd()/public/data/percentis-doy.json (asset do build)
//   • feed live        → DATA_DIR/ana-cotas-series.json       (volume, atualizado em runtime)
//
// Resultado: o calendário SEMPRE reflete o último dia que o feed live tem, sem cron,
// sem deploy, sem passo manual. O cálculo é memoizado por 6h (unstable_cache) e o edge
// também cacheia 6h — então não recomputa a cada request.

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { computeSeverityCalendar } from "@/lib/severity-calendar-engine.mjs";

export const runtime = "nodejs";          // precisa de fs (não roda no edge)
export const dynamic = "force-dynamic";   // controlamos o cache manualmente (unstable_cache + headers)

const SEIS_HORAS = 6 * 60 * 60; // segundos

// Memoiza o cálculo pesado por 6h. Inclui a data do dia na chave para garantir
// rotação diária mesmo que o unstable_cache persista além do esperado.
const calcular = unstable_cache(
  async (_diaChave: string) => {
    return computeSeverityCalendar({
      rootDir: process.cwd(),
      dataDir: process.env.DATA_DIR || undefined,
    });
  },
  ["severity-calendar"],
  { revalidate: SEIS_HORAS, tags: ["severity-calendar"] },
);

export async function GET() {
  try {
    const dia = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const payload = await calcular(dia);

    return NextResponse.json(payload, {
      headers: {
        // Edge/CDN cacheia 6h; serve stale enquanto revalida em background.
        "Cache-Control": `public, s-maxage=${SEIS_HORAS}, stale-while-revalidate=${SEIS_HORAS}`,
      },
    });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ erro }, { status: 500 });
  }
}
