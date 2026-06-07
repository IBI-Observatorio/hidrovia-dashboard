// Next 16 Proxy (ex-"middleware"). Fecha o /radar no servidor antes do render:
// sem o cookie de assinante, redireciona para a landing pública /radar/acesso.
//
// Aqui só checamos a PRESENÇA do cookie (auto-contido, como a doc do Proxy pede —
// nada de env/módulos compartilhados). A validação autoritativa (token válido +
// cliente na allowlist) acontece server-side nas páginas via lib/radar/acesso.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "ibi_assinante";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A landing de acesso é pública (evita loop de redirect).
  if (pathname.startsWith("/radar/acesso")) return NextResponse.next();

  if (!request.cookies.get(COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/radar/acesso";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/radar", "/radar/:path*"],
};
