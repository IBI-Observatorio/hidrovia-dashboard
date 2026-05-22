// Auth simples por token de assinante.
//
// Modelo:
//   - Lista de tokens válidos em env: IBI_ASSINANTES_TOKENS=ASS-CARGILL-2026,ASS-AMAGGI-2026,...
//   - Usuário ativa com /api/auth?token=ASS-XYZ → seta cookie ibi_assinante
//   - Componentes server-side leem cookie e devolvem isAssinante boolean
//   - Sem JWT/refresh por enquanto — produção real precisará evoluir
//
// Para MVP comercial, esse esquema é suficiente: o token vai por email após
// pagamento (Stripe webhook, manual, etc), e o cliente cola a URL que ativa.

import { cookies } from "next/headers";

const COOKIE_NAME = "ibi_assinante";

/**
 * Lista de tokens válidos. Em produção vem de env; em dev, lê de .env.local.
 * Formato: "TOKEN1,TOKEN2,TOKEN3"
 */
export function tokensValidos(): string[] {
  const raw = process.env.IBI_ASSINANTES_TOKENS ?? "";
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

/**
 * Lê o cookie de assinante (server-side). Retorna o token se válido, null caso
 * contrário.
 */
export async function tokenAssinanteAtual(): Promise<string | null> {
  try {
    const ck = await cookies();
    const v = ck.get(COOKIE_NAME)?.value;
    if (!v) return null;
    const validos = tokensValidos();
    return validos.includes(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Versão boolean para uso direto em props de componentes.
 */
export async function isAssinante(): Promise<boolean> {
  return (await tokenAssinanteAtual()) !== null;
}

/**
 * Nome canônico do cliente a partir do token (para mostrar no UI).
 * Convenção: TOKEN começa com ASS-NOMECLIENTE-...
 */
export function nomeClienteDoToken(token: string | null): string | null {
  if (!token) return null;
  const m = token.match(/^ASS-([A-Z]+)/);
  return m ? m[1].charAt(0) + m[1].slice(1).toLowerCase() : null;
}

// Nome do cookie (re-exportado para uso na rota /api/auth)
export const COOKIE_ASSINANTE = COOKIE_NAME;
