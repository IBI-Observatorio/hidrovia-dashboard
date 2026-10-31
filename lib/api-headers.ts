// Helpers das APIs públicas (Relógio + Livro-Razão).
//
// São rotas de LEITURA, sem autenticação: CORS liberado para leitura de
// qualquer origem e cache curto na borda. Centralizado aqui para as três rotas
// responderem com os mesmos cabeçalhos (e um único lugar para ajustar).

/** CORS liberado p/ leitura + cache curto (borda). Só GET/OPTIONS. */
export const API_READ_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Cache curto: 5 min na borda + SWR, para não recomputar a cada request
  // mantendo o número "vivo" o suficiente.
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
};

/** Resposta JSON de leitura com CORS + cache curto. */
export function jsonRead(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: API_READ_HEADERS });
}

/** Preflight CORS (OPTIONS). */
export function preflightRead(): Response {
  return new Response(null, { status: 204, headers: API_READ_HEADERS });
}
