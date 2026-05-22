// Rota de auth simples para tokens de assinante.
//
// GET /api/auth?token=ASS-CARGILL-2026  → valida token, seta cookie, redireciona
// GET /api/auth?logout=1                → limpa cookie e redireciona
//
// Cookie é httpOnly + sameSite=lax + 90 dias (vence; renovação manual no MVP).

import { NextRequest, NextResponse } from "next/server";
import { tokensValidos, COOKIE_ASSINANTE } from "@/lib/auth-assinante";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;   // 90 dias

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token  = url.searchParams.get("token");
  const logout = url.searchParams.get("logout");
  const dest   = url.searchParams.get("redirect") ?? "/monitor";

  // Logout
  if (logout) {
    const resp = NextResponse.redirect(new URL(dest, request.url));
    resp.cookies.delete(COOKIE_ASSINANTE);
    return resp;
  }

  if (!token) {
    return NextResponse.json({ erro: "Forneça ?token=ASS-... ou ?logout=1" }, { status: 400 });
  }

  const validos = tokensValidos();
  if (!validos.includes(token)) {
    return NextResponse.json({ erro: "Token inválido ou expirado." }, { status: 401 });
  }

  const resp = NextResponse.redirect(new URL(dest, request.url));
  resp.cookies.set({
    name:     COOKIE_ASSINANTE,
    value:    token,
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  });
  return resp;
}
