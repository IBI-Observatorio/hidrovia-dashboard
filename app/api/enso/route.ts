// GET /api/enso — devolve o último advisory ENSO (CPC/NOAA).
//
// Expõe via HTTP o mesmo objeto que lerENSOAdvisory() (lib/enso-cpc.ts) já
// entrega à UI, lido do cache no volume (DATA_DIR/enso_cpc_cache.json,
// alimentado mensalmente por /api/cron/refresh-enso). O leitor é consumidores
// que rodam FORA do servidor — ex.: o gerador do boletim de cabotagem no CI,
// onde o cache local não existe (é gitignored). Espelha o padrão de /api/ana:
// busca-se o dado fresco na API de produção em vez de depender do cache local.

import { NextResponse } from "next/server";
import { lerENSOAdvisory } from "@/lib/enso-cpc";

export const dynamic = "force-dynamic";

export async function GET() {
  const enso = lerENSOAdvisory();
  if (!enso) {
    return NextResponse.json({ erro: "ENSO advisory indisponível" }, { status: 404 });
  }
  return NextResponse.json(enso, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
