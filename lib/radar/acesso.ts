// Controle de acesso do Radar.
//
// Vitrine (maturação, risco, estresse DCF, notas) é pública. O Tabuleiro é
// exclusivo do assinante autenticado (cookie `ibi_assinante`, token
// ASS-<CLIENTE>-<segredo> ativado em /api/auth) cujo cliente esteja na allowlist
// `IBI_RADAR_CLIENTES`. O Copiloto está fechado para todos (decisão do Bruno,
// 14/10/2026); o código continua no repo.

import { tokenAssinanteAtual, nomeClienteDoToken } from "@/lib/auth-assinante";

/** Clientes liberados para o Radar (env `IBI_RADAR_CLIENTES`, default VLI+Ibi). */
export function clientesRadar(): string[] {
  const raw = process.env.IBI_RADAR_CLIENTES ?? "VLI,Ibi";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Nome canônico (como escrito na allowlist) se o cliente estiver liberado; senão
 * null. A comparação ignora maiúsculas/minúsculas: o token ASS-VLI-… vira "Vli"
 * em nomeClienteDoToken, e a allowlist (e as chaves do tabuleiro) usam "VLI".
 */
export function clienteLiberado(cliente: string | null): string | null {
  if (!cliente) return null;
  const alvo = cliente.toLowerCase();
  return clientesRadar().find((c) => c.toLowerCase() === alvo) ?? null;
}

/**
 * Nome canônico do cliente logado SE ele puder ver o Radar exclusivo; senão null.
 * (token de assinante válido + cliente na allowlist do Radar.) Lê cookie: quem
 * chama vira renderização dinâmica.
 */
export async function clienteRadarAtual(): Promise<string | null> {
  return clienteLiberado(nomeClienteDoToken(await tokenAssinanteAtual()));
}

/** Clientes com acesso ao Copiloto. Vazio = fechado para todos. */
export const CLIENTES_COPILOTO: readonly string[] = [];

export function copilotoLiberado(cliente: string | null): boolean {
  if (!cliente) return false;
  const alvo = cliente.toLowerCase();
  return CLIENTES_COPILOTO.some((c) => c.toLowerCase() === alvo);
}
