// Controle de acesso do Radar — produto exclusivo (piloto: Vale).
//
// Reusa o esquema de assinante existente (cookie `ibi_assinante` setado por
// /api/auth?token=ASS-VALE-...). O Radar é liberado apenas para clientes na
// allowlist (default: Vale + Ibi/admin). O token ASS-VALE-<segredo> mantém o
// prefixo p/ o nome do cliente resolver como "Vale" (ver nomeClienteDoToken).

import { tokenAssinanteAtual, nomeClienteDoToken } from "@/lib/auth-assinante";

/** Clientes liberados para o Radar (env `IBI_RADAR_CLIENTES`, default Vale+Ibi). */
export function clientesRadar(): string[] {
  const raw = process.env.IBI_RADAR_CLIENTES ?? "Vale,Ibi";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Nome do cliente logado SE ele puder ver o Radar; senão null.
 * (token de assinante válido + cliente na allowlist do Radar.)
 */
export async function clienteRadarAtual(): Promise<string | null> {
  const token = await tokenAssinanteAtual();
  const cliente = nomeClienteDoToken(token);
  return cliente && clientesRadar().includes(cliente) ? cliente : null;
}
